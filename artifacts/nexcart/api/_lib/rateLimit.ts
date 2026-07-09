// Rate limiting via Upstash Redis's REST API. Deliberately dependency-free
// (plain fetch, no @upstash/redis package) so this never touches
// package.json or pnpm-lock.yaml.
//
// Algorithm: fixed-window counter, same as before. Each window gets its
// own Redis key (`ratelimit:{routeKey}:{identifier}:{windowIndex}`), so a
// fresh window always starts at count 0 with no separate cleanup logic —
// old window keys just expire on their own via the TTL set alongside
// every INCR.
//
// What's new in this version: every route now declares itself once, by
// name, in ROUTE_POLICIES below — classification (public/normal/sensitive)
// plus its limit and window live in one place instead of being passed in
// at every call site. Classification decides what happens if Redis is
// unreachable: public/normal routes keep working (fail open, logged);
// sensitive routes (auth, checkout, payments, admin, seller withdrawals)
// return 503 rather than silently let money or auth flows run unprotected.
// A circuit breaker (see ./redisHealth.ts) stops this module from
// re-hitting a known-dead Redis on every single request during an outage.

import { shouldAttemptRedis, recordRedisSuccess, recordRedisFailure } from "./redisHealth.js";
import { logSecurityEvent, getRequestId } from "./securityLog.js";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error(
    "[api/_lib/rateLimit] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars. " +
      "Every route now falls back to its own classification's unavailable-Redis behavior " +
      "(public/normal routes stay open, sensitive routes return 503) until these are set."
  );
}

export type Classification = "public" | "normal" | "sensitive";

export interface RoutePolicy {
  classification: Classification;
  limit: number;
  windowSeconds: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// A handful of limits are individually overridable via env vars per the
// spec (section 7) without touching code. Everything else can still be
// tuned by editing the table below — these four are just the ones called
// out by name.
const LOGIN_LIMIT = envInt("RATE_LIMIT_LOGIN", 5);
const SEARCH_LIMIT = envInt("RATE_LIMIT_SEARCH", 60);
const CART_LIMIT = envInt("RATE_LIMIT_CART", 60);
const CHECKOUT_LIMIT = envInt("RATE_LIMIT_CHECKOUT", 20);

/**
 * One entry per routeKey used anywhere in api/. A route "declares its
 * policy" just by calling `enforceRateLimit(req, res, "auth:login")` — the
 * limit, window, and fail-open/fail-closed behavior all come from here.
 *
 * 🔴 sensitive = fail CLOSED (503) if Redis is unreachable.
 * 🟡 normal / 🟢 public = fail OPEN (request proceeds, logged as a warning).
 */
export const ROUTE_POLICIES: Record<string, RoutePolicy> = {
  // 🔴 Sensitive — credential-guessing, money movement, admin, checkout.
  "auth:login": { classification: "sensitive", limit: LOGIN_LIMIT, windowSeconds: 300 },
  "auth:oauth-session": { classification: "sensitive", limit: 20, windowSeconds: 60 },
  "auth:verify-step-up": { classification: "sensitive", limit: 5, windowSeconds: 300 },
  "checkout:session": { classification: "sensitive", limit: CHECKOUT_LIMIT, windowSeconds: 60 },
  "seller:withdraw": { classification: "sensitive", limit: 5, windowSeconds: 3600 },
  "admin:seller-status": { classification: "sensitive", limit: 30, windowSeconds: 60 },
  "admin:payment-method": { classification: "sensitive", limit: 30, windowSeconds: 60 },
  "admin:user-ban": { classification: "sensitive", limit: 30, windowSeconds: 60 },
  "admin:user-role": { classification: "sensitive", limit: 20, windowSeconds: 60 },

  // 🟡 Normal — authenticated but not credential-guessing or money-moving.
  // Blocking these during a Redis outage would itself be a bad security
  // tradeoff (e.g. a user unable to log out or check their own session).
  "auth:logout": { classification: "normal", limit: 20, windowSeconds: 60 },
  "auth:logout-all": { classification: "normal", limit: 20, windowSeconds: 60 },
  "auth:session": { classification: "normal", limit: 60, windowSeconds: 60 },
  "cart:guest": { classification: "normal", limit: CART_LIMIT, windowSeconds: 60 },
  "admin:user-detail": { classification: "normal", limit: 60, windowSeconds: 60 },

  // 🟢 Public — reserved for browse/search/listing routes. None of these
  // exist as serverless functions yet (product listing etc. currently
  // query Supabase directly from the client under RLS), but the policy is
  // defined now so any future public API route just declares
  // `enforceRateLimit(req, res, "public:search")` and inherits fail-open
  // behavior and the RATE_LIMIT_SEARCH env var automatically.
  "public:search": { classification: "public", limit: SEARCH_LIMIT, windowSeconds: 60 },
  "public:browse": { classification: "public", limit: 120, windowSeconds: 60 },
};

// Emergency override switch, off by default. "auto" (default) uses each
// route's own classification below. "fail-open" / "fail-closed" force one
// behavior across every route regardless of classification — an incident
// escape hatch (e.g. "Redis is down and login being unavailable is worse
// than the risk," or the reverse), not something to leave set long-term.
const FAILURE_MODE = (process.env.REDIS_FAILURE_MODE ?? "auto").toLowerCase();

export function getClientIp(req: any): string {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

async function upstashPipeline(commands: (string | number)[][]): Promise<any[]> {
  // Without a timeout, a genuinely unreachable Upstash (network partition,
  // DNS failure) would hang this fetch on the OS-level TCP/TLS timeout —
  // tens of seconds — stalling every protected route, including login and
  // checkout. 1.5s is generous for a same-region Redis REST call but short
  // enough that a real outage fails fast and the circuit breaker above can
  // start skipping subsequent attempts.
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    // Typed `any` deliberately: api/tsconfig.json compiles with
    // `lib: ["es2022"]` (no "dom"), so the ambient global `Response` type
    // in scope here is an incomplete fallback missing `.ok`/`.status`/
    // `.json()`. Rather than adding "dom" to the shared api/tsconfig.json
    // (which would affect all routes for one file's sake), this keeps the
    // workaround local to the one place that needs it.
    const res: any = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstash pipeline failed: ${res.status}`);
    }
    const data = (await res.json()) as { result: any; error?: string }[];
    recordRedisSuccess(Date.now() - start);
    return data.map((entry) => entry.result);
  } catch (err) {
    recordRedisFailure();
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export type RateLimitOutcome =
  | { decision: "allow"; limit: number; remaining: number; resetSeconds: number }
  | { decision: "rate_limited"; limit: number; retryAfterSeconds: number }
  | { decision: "redis_unavailable_fail_open"; limit: number; reason: string }
  | { decision: "redis_unavailable_fail_closed"; retryAfterSeconds: number; reason: string };

function resolveUnavailable(
  policy: RoutePolicy,
  reason: "unconfigured" | "circuit_open" | "redis_error"
): RateLimitOutcome {
  const failOpen =
    FAILURE_MODE === "fail-open" ? true : FAILURE_MODE === "fail-closed" ? false : policy.classification !== "sensitive";

  if (failOpen) {
    return { decision: "redis_unavailable_fail_open", limit: policy.limit, reason };
  }
  // 30s is a deliberately short, fixed retry hint — not tied to the
  // route's own window — since this isn't "you hit the limit," it's
  // "come back once the dependency is healthy again."
  return { decision: "redis_unavailable_fail_closed", retryAfterSeconds: 30, reason };
}

/**
 * Checks and increments a fixed-window rate-limit counter for one call,
 * resolving Redis-unavailable behavior per the route's declared policy.
 *
 * `routeKey` must be a key registered in ROUTE_POLICIES above.
 * `identifier` should be the caller's IP for routes with no session yet,
 * or the authenticated user's id for routes that already validated a
 * session — IP-based limiting on shared/NAT'd IPs would otherwise throttle
 * unrelated legitimate users together.
 */
export async function checkRateLimit(routeKey: string, identifier: string): Promise<RateLimitOutcome> {
  const policy = ROUTE_POLICIES[routeKey];
  if (!policy) {
    // A missing policy is a code bug (a route calling enforceRateLimit
    // with a typo'd or unregistered key), not a runtime condition to
    // degrade gracefully from — surface it loudly instead of silently
    // picking a classification that might be wrong for the route.
    throw new Error(`[rateLimit] No policy registered in ROUTE_POLICIES for routeKey "${routeKey}".`);
  }

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return resolveUnavailable(policy, "unconfigured");
  }

  if (!shouldAttemptRedis()) {
    return resolveUnavailable(policy, "circuit_open");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSeconds / policy.windowSeconds);
  const key = `ratelimit:${routeKey}:${identifier}:${windowIndex}`;
  const secondsIntoWindow = nowSeconds % policy.windowSeconds;
  const resetSeconds = policy.windowSeconds - secondsIntoWindow;

  try {
    const [count] = await upstashPipeline([
      ["INCR", key],
      ["EXPIRE", key, policy.windowSeconds],
    ]);

    if (count > policy.limit) {
      return { decision: "rate_limited", limit: policy.limit, retryAfterSeconds: resetSeconds };
    }
    return { decision: "allow", limit: policy.limit, remaining: Math.max(0, policy.limit - count), resetSeconds };
  } catch (err) {
    console.error(`[rateLimit] Upstash error for ${key}:`, err);
    return resolveUnavailable(policy, "redis_error");
  }
}

/**
 * Convenience wrapper for route handlers: checks the limit and, if
 * exceeded or (for sensitive routes) unavailable, writes the response
 * itself. Returns true if the caller should stop (response already sent),
 * false if the request should proceed normally.
 *
 * Usage:
 *   if (await enforceRateLimit(req, res, "auth:login")) return;
 *   if (await enforceRateLimit(req, res, "seller:withdraw", session.user_id)) return;
 *
 * Pass `identifierOverride` (usually `session.user_id`) for routes that
 * already validated a session before calling this.
 */
export async function enforceRateLimit(
  req: any,
  res: any,
  routeKey: string,
  identifierOverride?: string | null
): Promise<boolean> {
  const identifier = identifierOverride || getClientIp(req);
  const ip = getClientIp(req);
  const requestId = getRequestId(req);
  const outcome = await checkRateLimit(routeKey, identifier);

  if (outcome.decision === "allow") {
    res.setHeader("X-RateLimit-Limit", String(outcome.limit));
    res.setHeader("X-RateLimit-Remaining", String(outcome.remaining));
    res.setHeader("X-RateLimit-Reset", String(outcome.resetSeconds));
    return false;
  }

  if (outcome.decision === "rate_limited") {
    res.setHeader("Retry-After", String(outcome.retryAfterSeconds));
    res.setHeader("X-RateLimit-Limit", String(outcome.limit));
    res.setHeader("X-RateLimit-Remaining", "0");
    logSecurityEvent({
      type: "rate_limit_exceeded",
      endpoint: routeKey,
      ip,
      userId: identifierOverride ?? null,
      requestId,
      reason: `limit of ${outcome.limit} exceeded`,
    });
    res.status(429).json({ error: "Too many requests. Please try again shortly.", retryAfter: outcome.retryAfterSeconds });
    return true;
  }

  if (outcome.decision === "redis_unavailable_fail_open") {
    logSecurityEvent({
      type: "redis_unavailable",
      endpoint: routeKey,
      ip,
      userId: identifierOverride ?? null,
      requestId,
      reason: `${outcome.reason}; fail-open (non-sensitive endpoint)`,
    });
    return false;
  }

  // redis_unavailable_fail_closed
  res.setHeader("Retry-After", String(outcome.retryAfterSeconds));
  logSecurityEvent({
    type: "redis_unavailable",
    endpoint: routeKey,
    ip,
    userId: identifierOverride ?? null,
    requestId,
    reason: `${outcome.reason}; fail-closed (sensitive endpoint)`,
  });
  res.status(503).json({
    error: "This action is temporarily unavailable. Please try again in a moment.",
    retryAfter: outcome.retryAfterSeconds,
  });
  return true;
}
