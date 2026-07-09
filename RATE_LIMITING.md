# Nexcart Rate Limiting — Resilience Upgrade

## 1. Files changed

**New:**
- `api/_lib/redisHealth.ts` — circuit breaker + health state singleton
- `api/_lib/securityLog.ts` — structured security event logging
- `api/health.ts` — `GET /api/health`

**Rewritten:**
- `api/_lib/rateLimit.ts` — policy table (`ROUTE_POLICIES`), classification-driven fail-open/fail-closed, circuit breaker integration, rate limit headers

**Edited (import + rate-limit call site only — no other logic touched):**
- `api/auth/login.ts`, `oauth-session.ts`, `verify-step-up.ts`, `logout.ts`, `logout-all.ts`, `session.ts`
- `api/admin/seller-status.ts`, `payment-method.ts`, `user-ban.ts`
- `api/seller/withdraw.ts`
- `api/cart/guest.ts`
- `api/checkout/session.ts`

**One behavior change to flag explicitly:** `checkout:session` moved from the old always-fail-open `GENERAL` tier to **sensitive / fail-closed**, per your spec listing checkout as a protected endpoint. Everything else keeps its prior effective behavior (auth-strict routes were already tightly limited; they just fail closed on a Redis outage now instead of open).

## 2. Architecture

**Policy table.** Every route declares itself once in `ROUTE_POLICIES` (`api/_lib/rateLimit.ts`) as `{ classification, limit, windowSeconds }`. Route handlers just call `enforceRateLimit(req, res, "auth:login")` — no tier object passed at the call site anymore.

**Classification → Redis-outage behavior:**
- 🟢 `public` / 🟡 `normal` → fail **open**, request proceeds, a `redis_unavailable` warning is logged.
- 🔴 `sensitive` → fail **closed**, `503` with `Retry-After: 30`.

Currently: `auth:login`, `auth:oauth-session`, `auth:verify-step-up`, `checkout:session`, `seller:withdraw`, `admin:*` are sensitive. `auth:logout`, `auth:logout-all`, `auth:session`, `cart:guest` are normal (blocking these during an outage would itself be a bad security/UX tradeoff). `public:search` / `public:browse` are reserved policies for future public API routes — nothing under `api/` is unauthenticated browsing today since product listing/search still goes straight to Supabase from the client under RLS.

**Circuit breaker** (`redisHealth.ts`): after 3 consecutive Upstash failures, the circuit opens and every subsequent rate-limit check skips the Redis call entirely for 30s (configurable), going straight to the classification-based decision. After the cooldown it goes half-open and lets one real call through; success closes the circuit, failure reopens it and restarts the cooldown. State lives in module scope, so it's per-warm-lambda-instance, not global — see the "Limitations" note below.

**Timeouts.** Every Upstash call is aborted at 1.5s. Without this, an unreachable Redis would hang on the OS-level TCP timeout (tens of seconds), stalling login/checkout regardless of the fail-open/closed policy.

## 3. Environment variables

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

RATE_LIMIT_LOGIN=5          # requests per 5-minute window for auth:login
RATE_LIMIT_SEARCH=60        # reserved for future public:search route
RATE_LIMIT_CART=60          # requests per minute for cart:guest
RATE_LIMIT_CHECKOUT=20      # requests per minute for checkout:session

REDIS_FAILURE_MODE=auto     # auto | fail-open | fail-closed (emergency override, all routes)
REDIS_CIRCUIT_TIMEOUT=30    # seconds the circuit stays open before a half-open trial
REDIS_CIRCUIT_FAILURE_THRESHOLD=3   # consecutive failures before opening
```

All are optional — everything has a sane default and nothing is hardcoded in a way that requires a code change to retune.

## 4. Testing guide

Normal operation, from the deployed app or via curl:
```bash
curl -i https://nexcartonline.vercel.app/api/health
```
Expect `200`, `"status":"healthy"`, `redis.status:"connected"`, `redis.circuitState:"closed"`.

Rate limit enforcement — hit `auth:login` 6 times in under 5 minutes with a bad password:
```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://nexcartonline.vercel.app/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"nobody@example.com","password":"wrong"}'
done
```
Expect five `401`s then a `429` with `Retry-After` and `X-RateLimit-Remaining: 0` headers.

## 5. Failure simulation guide

The cleanest way to simulate an outage without touching Upstash itself: temporarily set `UPSTASH_REDIS_REST_TOKEN` to a bad value in Vercel's env vars for a preview deployment (not production), redeploy, and observe:

- `GET /api/health` → `"status":"degraded"`, `redis.status:"disconnected"`, `database.status:"connected"`.
- Hit `cart:guest` or `auth:logout` → still `200`, request succeeds normally.
- Hit `auth:login` or `checkout:session` → `503` with `{"error":"This action is temporarily unavailable..."}`.
- Check Vercel function logs for `[security] {"type":"redis_unavailable",...}` entries, and after 3 consecutive failures, a `[security] {"type":"circuit_breaker_opened",...}` entry.

Revert the token change to end the simulation.

## 6. Recovery verification

Restore the correct token and redeploy (or, if testing within the same warm instance, just fix the env var and wait for the next cold start). Then:
```bash
curl -s https://nexcartonline.vercel.app/api/health | jq '.redis'
```
Expect `status:"connected"`, `circuitState:"closed"` within one `REDIS_CIRCUIT_TIMEOUT` window (30s default) of Redis becoming reachable again. A `circuit_breaker_closed` event should appear in the logs.

## 7. Limitations & recommended improvements

- **Circuit breaker state is per-instance, not global.** Vercel can spin up multiple concurrent lambda instances, each with its own independent breaker; there's no shared state without adding an external store (which would defeat the "keep working when Redis is down" goal if that store were Redis itself). In practice this just means a cold start briefly re-learns that Redis is down before opening its own circuit — a few seconds of extra Redis calls, not a correctness problem.
- **Fixed-window counting**, not sliding-window — same tradeoff as before (allows a short burst at window boundaries). Fine for this threat model; a sliding-window or token-bucket algorithm would be a future upgrade if that boundary burst ever becomes a real issue.
- **IP identification** uses `x-forwarded-for`'s first entry, which is standard on Vercel but spoofable if you ever put another proxy in front of Vercel — not a concern with the current deployment setup.
- **Consider adding** a lightweight IP-reputation/suspicious-IP log rule (e.g. N distinct 401s from one IP across different accounts within a window) if credential-stuffing becomes a real pattern in your logs — the `suspicious_ip` and `excessive_login_attempts` event types are already defined in `securityLog.ts` for this, just not wired to a detector yet.
