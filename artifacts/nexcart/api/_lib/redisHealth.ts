// Redis health monitor + circuit breaker for Upstash-backed rate limiting.
//
// State lives in module scope, which on Vercel Serverless Functions means
// it persists across warm invocations of the SAME lambda instance but is
// NOT shared across instances/regions. That's an accepted tradeoff here:
// the goal of the circuit breaker is "stop hammering a dead Redis on every
// request within this instance," not global consensus. Each cold start
// begins closed (optimistic) and will reopen quickly if Redis is actually
// down, since a fresh instance still runs the same failure-counting logic
// against real traffic within seconds.

import { logSecurityEvent } from "./securityLog.js";

export type CircuitState = "closed" | "open" | "half-open";

interface HealthState {
  consecutiveFailures: number;
  circuitState: CircuitState;
  circuitOpenedAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastLatencyMs: number | null;
}

const state: HealthState = {
  consecutiveFailures: 0,
  circuitState: "closed",
  circuitOpenedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastLatencyMs: null,
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// After this many consecutive failures, stop attempting Redis calls and
// go straight to the classification-based fallback until the cooldown
// elapses. 3 is enough to absorb a single blip without opening, but fast
// enough that a real outage doesn't cost more than 3 slow/timed-out calls.
const FAILURE_THRESHOLD = envInt("REDIS_CIRCUIT_FAILURE_THRESHOLD", 3);
// How long the circuit stays open before allowing a half-open trial call.
const CIRCUIT_TIMEOUT_MS = envInt("REDIS_CIRCUIT_TIMEOUT", 30) * 1000;

/**
 * Whether a rate-limit check should even attempt to reach Redis right now.
 * false means "skip Redis, go straight to the fail-open/fail-closed
 * decision for this route's classification" — this is what stops every
 * request from re-hitting a known-dead Redis.
 */
export function shouldAttemptRedis(): boolean {
  if (state.circuitState === "closed") return true;

  if (state.circuitState === "open") {
    if (state.circuitOpenedAt !== null && Date.now() - state.circuitOpenedAt >= CIRCUIT_TIMEOUT_MS) {
      state.circuitState = "half-open";
      return true; // allow a trial call through
    }
    return false;
  }

  // half-open: let trial calls through; recordRedisSuccess/Failure below
  // decide whether to fully close or snap back open.
  return true;
}

export function recordRedisSuccess(latencyMs: number): void {
  const wasDegraded = state.circuitState !== "closed";
  state.consecutiveFailures = 0;
  state.lastSuccessAt = Date.now();
  state.lastLatencyMs = latencyMs;

  if (wasDegraded) {
    state.circuitState = "closed";
    state.circuitOpenedAt = null;
    logSecurityEvent({ type: "circuit_breaker_closed", reason: "redis_recovered" });
  }
}

export function recordRedisFailure(): void {
  state.consecutiveFailures += 1;
  state.lastFailureAt = Date.now();

  if (state.circuitState === "half-open") {
    // Trial call failed — Redis still isn't healthy. Reopen and restart
    // the cooldown rather than hammering it again immediately.
    state.circuitState = "open";
    state.circuitOpenedAt = Date.now();
    logSecurityEvent({ type: "circuit_breaker_opened", reason: "half_open_trial_failed" });
    return;
  }

  if (state.circuitState === "closed" && state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.circuitState = "open";
    state.circuitOpenedAt = Date.now();
    logSecurityEvent({
      type: "circuit_breaker_opened",
      reason: `consecutive_failures:${state.consecutiveFailures}`,
    });
  }
}

export function getHealthSnapshot() {
  return {
    connected: state.circuitState !== "open",
    circuitState: state.circuitState,
    consecutiveFailures: state.consecutiveFailures,
    lastSuccessfulConnection: state.lastSuccessAt ? new Date(state.lastSuccessAt).toISOString() : null,
    lastFailureAt: state.lastFailureAt ? new Date(state.lastFailureAt).toISOString() : null,
    lastLatencyMs: state.lastLatencyMs,
  };
}

/**
 * Direct, standalone Redis health probe for GET /api/health. Deliberately
 * bypasses shouldAttemptRedis() (a health check should always try to get a
 * real answer) but still feeds its result into the same success/failure
 * counters, so a probe can help close the circuit sooner after recovery.
 */
export async function pingRedis(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!url || !token) return { ok: false, latencyMs: null };

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res: any = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) throw new Error(`ping failed: ${res.status}`);
    recordRedisSuccess(latencyMs);
    return { ok: true, latencyMs };
  } catch {
    recordRedisFailure();
    return { ok: false, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}
