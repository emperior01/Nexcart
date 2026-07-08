// Rate limiting via Upstash Redis's REST API. Deliberately dependency-free
// (plain fetch, no @upstash/redis package) so adding this never touches
// package.json or pnpm-lock.yaml.
//
// Algorithm: fixed-window counter. Each window gets its own Redis key
// (`ratelimit:{routeKey}:{identifier}:{windowIndex}`), so a fresh window
// always starts at count 0 with no separate cleanup logic — old window
// keys just expire on their own via the TTL set alongside every INCR.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  // Fails OPEN, not closed — see checkRateLimit below. This log is just so
  // a missing env var is visible in Vercel logs rather than silently
  // disabling protection forever.
  console.error(
    "[api/_lib/rateLimit] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars. Rate limiting is disabled (fails open) until these are set."
  );
}

export interface RateLimitTier {
  limit: number;
  windowSeconds: number;
}

// Tiers named by intent, not by route — makes it obvious *why* a given
// route got a given ceiling when reading the call site.
export const RATE_LIMIT_TIERS = {
  // Password/credential-guessing surface. Tight on purpose.
  AUTH_STRICT: { limit: 5, windowSeconds: 300 },
  // Auth-adjacent but not credential-guessing (OAuth exchange, logout,
  // logout-everywhere, session heartbeat).
  AUTH_MODERATE: { limit: 20, windowSeconds: 60 },
  // Real money leaving the platform.
  FINANCIAL: { limit: 5, windowSeconds: 3600 },
  // Admin mutations — already gated behind login + step-up; this is a
  // backstop against a compromised/stolen admin session being hammered.
  ADMIN_ACTION: { limit: 30, windowSeconds: 60 },
  // Everything else (guest cart, checkout session creation).
  GENERAL: { limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitTier>;

export function getClientIp(req: any): string {
  const fwd = req.headers?.["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

async function upstashPipeline(commands: (string | number)[][]): Promise<any[]> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Upstash pipeline failed: ${res.status}`);
  }
  const data = (await res.json()) as { result: any; error?: string }[];
  return data.map((entry) => entry.result);
}

/**
 * Checks and increments a fixed-window rate-limit counter for one call.
 *
 * `routeKey` is a short constant identifying the endpoint (e.g.
 * "auth:login"). `identifier` should be the caller's IP for routes with no
 * session yet, or the authenticated user's id for routes that already
 * validated a session — IP-based limiting on shared/NAT'd IPs would
 * otherwise throttle unrelated legitimate users together.
 *
 * Fails OPEN if Upstash is unreachable or unconfigured: a rate-limiter
 * outage should never take down the whole API. Deliberate
 * availability-over-strictness tradeoff.
 */
export async function checkRateLimit(
  routeKey: string,
  identifier: string,
  tier: RateLimitTier
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSeconds / tier.windowSeconds);
  const key = `ratelimit:${routeKey}:${identifier}:${windowIndex}`;

  try {
    const [count] = await upstashPipeline([
      ["INCR", key],
      ["EXPIRE", key, tier.windowSeconds],
    ]);

    if (count > tier.limit) {
      const secondsIntoWindow = nowSeconds % tier.windowSeconds;
      return { allowed: false, retryAfterSeconds: tier.windowSeconds - secondsIntoWindow };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error(`[rateLimit] Upstash error for ${key}:`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Convenience wrapper for route handlers: checks the limit and, if
 * exceeded, writes the 429 response itself. Returns true if the caller
 * should stop (response already sent), false if the request should
 * proceed normally.
 *
 * Usage:
 *   if (await enforceRateLimit(req, res, "auth:login", RATE_LIMIT_TIERS.AUTH_STRICT)) return;
 *
 * Pass `identifierOverride` (usually `session.user_id`) for routes that
 * already validated a session before calling this.
 */
export async function enforceRateLimit(
  req: any,
  res: any,
  routeKey: string,
  tier: RateLimitTier,
  identifierOverride?: string | null
): Promise<boolean> {
  const identifier = identifierOverride || getClientIp(req);
  const { allowed, retryAfterSeconds } = await checkRateLimit(routeKey, identifier, tier);
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
    return true;
  }
  return false;
}
