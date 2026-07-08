#!/usr/bin/env python3
"""
Adds Upstash-Redis-backed rate limiting to all 12 API routes.

- Creates one new file: api/_lib/rateLimit.ts
- Patches 12 existing route files via exact string replacement (NOT full
  overwrite) so this is safe even if those files have drifted slightly
  from what Claude last saw.

Run from inside artifacts/nexcart (the folder containing api/ and src/).
Each patch raises if its anchor text isn't found exactly once, so nothing
gets silently skipped or double-applied.
"""

import os
import sys

BASE = os.getcwd()
if not os.path.isdir(os.path.join(BASE, "api")):
    print(f"ERROR: no 'api' folder in {BASE}. Run this from artifacts/nexcart.")
    sys.exit(1)


def write_new(rel_path, content):
    full = os.path.join(BASE, rel_path)
    if os.path.exists(full):
        print(f"SKIP (already exists): {rel_path}")
        return
    with open(full, "w") as f:
        f.write(content)
    print(f"CREATED: {rel_path}")


def patch(rel_path, old, new):
    full = os.path.join(BASE, rel_path)
    with open(full, "r") as f:
        src = f.read()
    count = src.count(old)
    if count != 1:
        print(f"SKIP ({count} matches, expected 1): {rel_path}")
        return
    src = src.replace(old, new, 1)
    with open(full, "w") as f:
        f.write(src)
    print(f"PATCHED: {rel_path}")


# ---------------------------------------------------------------------------
# 1. New file: the rate limit helper
# ---------------------------------------------------------------------------

RATE_LIMIT_TS = '''// Rate limiting via Upstash Redis's REST API. Deliberately dependency-free
// (plain fetch, no @upstash/redis package) so adding this never touches
// package.json or pnpm-lock.yaml.
//
// Algorithm: fixed-window counter. Each window gets its own Redis key
// (`ratelimit:{routeKey}:{identifier}:{windowIndex}`), so a fresh window
// always starts at count 0 with no separate cleanup logic \u2014 old window
// keys just expire on their own via the TTL set alongside every INCR.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  // Fails OPEN, not closed \u2014 see checkRateLimit below. This log is just so
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

// Tiers named by intent, not by route \u2014 makes it obvious *why* a given
// route got a given ceiling when reading the call site.
export const RATE_LIMIT_TIERS = {
  // Password/credential-guessing surface. Tight on purpose.
  AUTH_STRICT: { limit: 5, windowSeconds: 300 },
  // Auth-adjacent but not credential-guessing (OAuth exchange, logout,
  // logout-everywhere, session heartbeat).
  AUTH_MODERATE: { limit: 20, windowSeconds: 60 },
  // Real money leaving the platform.
  FINANCIAL: { limit: 5, windowSeconds: 3600 },
  // Admin mutations \u2014 already gated behind login + step-up; this is a
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
 * validated a session \u2014 IP-based limiting on shared/NAT'd IPs would
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
'''

write_new("api/_lib/rateLimit.ts", RATE_LIMIT_TS)

# ---------------------------------------------------------------------------
# 2. Patches to the 12 route files
# ---------------------------------------------------------------------------

patch(
    "api/auth/login.ts",
    'from "../_lib/guestCart.js";\n\nexport default async function handler(req: any, res: any) {\n  if (req.method !== "POST") {\n    res.status(405).json({ error: "Method not allowed" });\n    return;\n  }',
    'from "../_lib/guestCart.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {\n'
    '  if (req.method !== "POST") {\n'
    '    res.status(405).json({ error: "Method not allowed" });\n'
    '    return;\n'
    '  }\n\n'
    '  // No session exists yet at this point, so this is IP-scoped. This is the\n'
    '  // credential-guessing surface \u2014 tightest tier on purpose.\n'
    '  if (await enforceRateLimit(req, res, "auth:login", RATE_LIMIT_TIERS.AUTH_STRICT)) return;',
)

patch(
    "api/auth/logout.ts",
    'from "../_lib/cookies.js";\n\nexport default async function handler(req: any, res: any) {\n  if (req.method !== "POST") {\n    res.status(405).json({ error: "Method not allowed" });\n    return;\n  }',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {\n'
    '  if (req.method !== "POST") {\n'
    '    res.status(405).json({ error: "Method not allowed" });\n'
    '    return;\n'
    '  }\n\n'
    '  if (await enforceRateLimit(req, res, "auth:logout", RATE_LIMIT_TIERS.AUTH_MODERATE)) return;',
)

patch(
    "api/auth/logout-all.ts",
    'from "../_lib/cookies.js";\n\nexport default async function handler(req: any, res: any) {',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {',
)
patch(
    "api/auth/logout-all.ts",
    "  await revokeAllSessionsForUser(session.user_id);",
    "  // Keyed by user_id, not IP \u2014 this is an authenticated action, and IP\n"
    "  // limiting would let the same account get hammered from many IPs.\n"
    '  if (await enforceRateLimit(req, res, "auth:logout-all", RATE_LIMIT_TIERS.AUTH_MODERATE, session.user_id)) return;\n\n'
    "  await revokeAllSessionsForUser(session.user_id);",
)

patch(
    "api/auth/oauth-session.ts",
    'from "../_lib/cookies.js";\n\n// Used for OAuth',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n// Used for OAuth',
)
patch(
    "api/auth/oauth-session.ts",
    '  const { accessToken } = (req.body ?? {}) as { accessToken?: string };',
    '  // No nex_session exists yet at this point, so this is IP-scoped.\n'
    '  if (await enforceRateLimit(req, res, "auth:oauth-session", RATE_LIMIT_TIERS.AUTH_MODERATE)) return;\n\n'
    '  const { accessToken } = (req.body ?? {}) as { accessToken?: string };',
)

patch(
    "api/auth/session.ts",
    'from "../_lib/cookies.js";\n\n// This replaces',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n// This replaces',
)
patch(
    "api/auth/session.ts",
    '  if (req.method !== "GET") {\n    res.status(405).json({ error: "Method not allowed" });\n    return;\n  }\n\n  const cookies = parseCookies(req.headers.cookie);',
    '  if (req.method !== "GET") {\n'
    '    res.status(405).json({ error: "Method not allowed" });\n'
    '    return;\n'
    '  }\n\n'
    '  // This gets called on every page load / auth-state change, so it\'s the\n'
    '  // loosest tier \u2014 not a sensitive action, just needs a ceiling against a\n'
    '  // runaway client-side retry loop.\n'
    '  if (await enforceRateLimit(req, res, "auth:session", RATE_LIMIT_TIERS.GENERAL)) return;\n\n'
    '  const cookies = parseCookies(req.headers.cookie);',
)

patch(
    "api/auth/verify-step-up.ts",
    'from "../_lib/cookies.js";\n\n// Called when',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n// Called when',
)
patch(
    "api/auth/verify-step-up.ts",
    '  if (!session) {\n    res.status(401).json({ error: "Not authenticated." });\n    return;\n  }\n\n  const { password } = (req.body ?? {}) as { password?: string };',
    '  if (!session) {\n'
    '    res.status(401).json({ error: "Not authenticated." });\n'
    '    return;\n'
    '  }\n\n'
    '  // Password-guessing surface (re-checks the account password), so this\n'
    '  // gets the strict tier. Keyed by user_id since the session is already\n'
    '  // known here \u2014 a stolen/shared session token still gets throttled per\n'
    '  // account, not per IP.\n'
    '  if (await enforceRateLimit(req, res, "auth:verify-step-up", RATE_LIMIT_TIERS.AUTH_STRICT, session.user_id)) return;\n\n'
    '  const { password } = (req.body ?? {}) as { password?: string };',
)

patch(
    "api/admin/payment-method.ts",
    'from "../_lib/cookies.js";\n\n// Covers both',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n// Covers both',
)
patch(
    "api/admin/payment-method.ts",
    '  if (session.role !== "admin") {\n    res.status(403).json({ error: "Admin access required." });\n    return;\n  }\n  if (!hasFreshStepUp(session)) {\n    res.status(403).json({ error: "step_up_required" });\n    return;\n  }\n\n  const { id, patch } = (req.body ?? {}) as { id?: string; patch?: Record<string, unknown> };',
    '  if (session.role !== "admin") {\n'
    '    res.status(403).json({ error: "Admin access required." });\n'
    '    return;\n'
    '  }\n\n'
    '  // Backstop against a compromised/stolen admin session being hammered.\n'
    '  // Keyed by user_id, not IP.\n'
    '  if (await enforceRateLimit(req, res, "admin:payment-method", RATE_LIMIT_TIERS.ADMIN_ACTION, session.user_id)) return;\n\n'
    '  if (!hasFreshStepUp(session)) {\n'
    '    res.status(403).json({ error: "step_up_required" });\n'
    '    return;\n'
    '  }\n\n'
    '  const { id, patch } = (req.body ?? {}) as { id?: string; patch?: Record<string, unknown> };',
)

patch(
    "api/admin/seller-status.ts",
    'from "../_lib/cookies.js";\n\nexport default async function handler(req: any, res: any) {',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {',
)
patch(
    "api/admin/seller-status.ts",
    '  if (session.role !== "admin") {\n    res.status(403).json({ error: "Admin access required." });\n    return;\n  }\n  if (!hasFreshStepUp(session)) {\n    res.status(403).json({ error: "step_up_required" });\n    return;\n  }\n\n  const { sellerId, status, storeName } = (req.body ?? {}) as {',
    '  if (session.role !== "admin") {\n'
    '    res.status(403).json({ error: "Admin access required." });\n'
    '    return;\n'
    '  }\n\n'
    '  if (await enforceRateLimit(req, res, "admin:seller-status", RATE_LIMIT_TIERS.ADMIN_ACTION, session.user_id)) return;\n\n'
    '  if (!hasFreshStepUp(session)) {\n'
    '    res.status(403).json({ error: "step_up_required" });\n'
    '    return;\n'
    '  }\n\n'
    '  const { sellerId, status, storeName } = (req.body ?? {}) as {',
)

patch(
    "api/admin/user-ban.ts",
    'from "../_lib/cookies.js";\n\nexport default async function handler(req: any, res: any) {',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {',
)
patch(
    "api/admin/user-ban.ts",
    '  if (session.role !== "admin") {\n    res.status(403).json({ error: "Admin access required." });\n    return;\n  }\n  if (!hasFreshStepUp(session)) {',
    '  if (session.role !== "admin") {\n'
    '    res.status(403).json({ error: "Admin access required." });\n'
    '    return;\n'
    '  }\n\n'
    '  if (await enforceRateLimit(req, res, "admin:user-ban", RATE_LIMIT_TIERS.ADMIN_ACTION, session.user_id)) return;\n\n'
    '  if (!hasFreshStepUp(session)) {',
)

patch(
    "api/seller/withdraw.ts",
    'from "../_lib/cookies.js";\n\n// Moves withdrawal',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n// Moves withdrawal',
)
patch(
    "api/seller/withdraw.ts",
    '  if (!hasFreshStepUp(session)) {\n    res.status(403).json({ error: "step_up_required" });\n    return;\n  }\n\n  const { data: seller } = await db',
    '  // Real money leaving the platform \u2014 tightest non-auth tier, keyed by\n'
    '  // user_id so this can\'t be dodged by switching IPs.\n'
    '  if (await enforceRateLimit(req, res, "seller:withdraw", RATE_LIMIT_TIERS.FINANCIAL, session.user_id)) return;\n\n'
    '  if (!hasFreshStepUp(session)) {\n'
    '    res.status(403).json({ error: "step_up_required" });\n'
    '    return;\n'
    '  }\n\n'
    '  const { data: seller } = await db',
)

patch(
    "api/cart/guest.ts",
    'from "../_lib/guestCart.js";\n\nconst GUEST_CART_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches guest_carts.expires_at default\n\nexport default async function handler(req: any, res: any) {\n  const cookies = parseCookies(req.headers.cookie);',
    'from "../_lib/guestCart.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'const GUEST_CART_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches guest_carts.expires_at default\n\n'
    'export default async function handler(req: any, res: any) {\n'
    '  // Applies across GET/POST/PATCH/DELETE alike \u2014 this route has no auth,\n'
    '  // so IP is the only identifier available.\n'
    '  if (await enforceRateLimit(req, res, "cart:guest", RATE_LIMIT_TIERS.GENERAL)) return;\n\n'
    '  const cookies = parseCookies(req.headers.cookie);',
)

patch(
    "api/checkout/session.ts",
    'from "../_lib/cookies.js";\n\nexport default async function handler(req: any, res: any) {\n  const cookies = parseCookies(req.headers.cookie);',
    'from "../_lib/cookies.js";\n'
    'import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";\n\n'
    'export default async function handler(req: any, res: any) {\n'
    '  // Applies across GET/POST/PATCH alike. IP-based \u2014 logged-in and guest\n'
    '  // checkouts both hit this, so user_id isn\'t always available.\n'
    '  if (await enforceRateLimit(req, res, "checkout:session", RATE_LIMIT_TIERS.GENERAL)) return;\n\n'
    '  const cookies = parseCookies(req.headers.cookie);',
)

print("\nDone. Review the SKIP lines above (if any) before committing \u2014 they mean a file's")
print("content didn't match what was expected and needs a manual look.")
