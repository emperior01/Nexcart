// Structured security logging. Every event is a single-line JSON blob on
// console.warn/console.error so Vercel's log pipeline (or any drain pointed
// at it) can parse and filter these without scraping free-text messages.
//
// NEVER pass passwords, cookies, session tokens, or API keys into `reason`
// or any other field here — this file doesn't redact, callers are
// responsible for only ever passing safe, already-scrubbed values.

import { randomBytes } from "crypto";

export type SecurityEventType =
  | "rate_limit_exceeded"
  | "redis_unavailable"
  | "circuit_breaker_opened"
  | "circuit_breaker_closed"
  | "suspicious_ip"
  | "excessive_login_attempts";

export interface SecurityEvent {
  type: SecurityEventType;
  endpoint?: string;
  ip?: string | null;
  userId?: string | null;
  requestId?: string;
  reason?: string;
}

/** Vercel stamps every invocation with x-vercel-id; fall back to a random id locally. */
export function getRequestId(req: any): string {
  return (req?.headers?.["x-vercel-id"] as string) || randomBytes(8).toString("hex");
}

export function logSecurityEvent(event: SecurityEvent): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level: "security",
    type: event.type,
    endpoint: event.endpoint ?? null,
    ip: event.ip ?? null,
    userId: event.userId ?? null,
    requestId: event.requestId ?? null,
    reason: event.reason ?? null,
  };
  console.warn(`[security] ${JSON.stringify(payload)}`);
}
