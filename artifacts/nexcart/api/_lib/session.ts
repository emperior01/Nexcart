import { randomBytes, createHash } from "crypto";
import { db } from "./db";

export type SessionRole = "customer" | "seller" | "admin";

export interface SessionRecord {
  id: string;
  user_id: string;
  role: SessionRole;
  remember_me: boolean;
  created_at: string;
  last_active_at: string;
  expires_at: string;
  absolute_expires_at: string | null;
  step_up_verified_at: string | null;
}

// ---------------------------------------------------------------------------
// Per-role session policy.
//
// Customers: long-lived, sliding, no absolute ceiling — "stay logged in"
//   is the expected e-commerce UX. Remember Me stretches it further.
// Sellers: shorter sliding window + an absolute ceiling (forces a fresh
//   login periodically even if active), and sensitive actions additionally
//   require a recent password re-confirmation ("step-up").
// Admins: short sliding window, short absolute ceiling, and step-up is
//   required much more aggressively.
// ---------------------------------------------------------------------------
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const SESSION_POLICY: Record<
  SessionRole,
  {
    slidingSeconds: number;
    rememberMeSlidingSeconds?: number;
    absoluteSeconds: number | null;
    stepUpMaxAgeSeconds: number;
  }
> = {
  customer: {
    slidingSeconds: 7 * DAY,
    rememberMeSlidingSeconds: 60 * DAY,
    absoluteSeconds: null,
    stepUpMaxAgeSeconds: 30 * MIN,
  },
  seller: {
    slidingSeconds: DAY,
    absoluteSeconds: 7 * DAY,
    stepUpMaxAgeSeconds: 15 * MIN,
  },
  admin: {
    slidingSeconds: 2 * HOUR,
    absoluteSeconds: 8 * HOUR,
    stepUpMaxAgeSeconds: 10 * MIN,
  },
};

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolves a user's role for session purposes. Admin takes precedence over
 * seller, which takes precedence over the customer default. A user can be
 * a customer AND have a seller application (any verification_status) — that
 * still gets the seller session policy, since seller-only surfaces (the
 * seller dashboard) are what need the extra protection.
 */
export async function resolveRole(userId: string): Promise<SessionRole> {
  const { data: adminRow } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRow) return "admin";

  const { data: sellerRow } = await db
    .from("sellers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (sellerRow) return "seller";

  return "customer";
}

/**
 * Creates a brand-new session row and returns the raw token to set in the
 * cookie. Always generates a fresh token — this IS the "regenerate session
 * ID after login" behavior; there is no code path that reuses or extends an
 * old token across an authentication event.
 */
export async function createSession(params: {
  userId: string;
  role: SessionRole;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ token: string; session: SessionRecord }> {
  const policy = SESSION_POLICY[params.role];
  const slidingSeconds =
    params.rememberMe && policy.rememberMeSlidingSeconds
      ? policy.rememberMeSlidingSeconds
      : policy.slidingSeconds;

  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + slidingSeconds * 1000);
  const absoluteExpiresAt = policy.absoluteSeconds
    ? new Date(now.getTime() + policy.absoluteSeconds * 1000)
    : null;

  const { data, error } = await db
    .from("sessions")
    .insert({
      user_id: params.userId,
      role: params.role,
      token_hash: hashToken(token),
      remember_me: params.rememberMe,
      expires_at: expiresAt.toISOString(),
      absolute_expires_at: absoluteExpiresAt?.toISOString() ?? null,
      step_up_verified_at: now.toISOString(), // login itself counts as verification
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`);
  }

  return { token, session: data as SessionRecord };
}

/**
 * Validates a raw token from the cookie. Returns null if missing, unknown,
 * revoked, or expired (sliding or absolute). On success, refreshes the
 * sliding expiry and last_active_at ("touch").
 */
export async function validateSession(token: string | undefined): Promise<SessionRecord | null> {
  if (!token) return null;

  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("token_hash", hashToken(token))
    .eq("revoked", false)
    .maybeSingle();

  if (error || !data) return null;

  const session = data as SessionRecord;
  const now = new Date();

  if (new Date(session.expires_at) <= now) return null;
  if (session.absolute_expires_at && new Date(session.absolute_expires_at) <= now) return null;

  // Sliding renewal
  const policy = SESSION_POLICY[session.role];
  const slidingSeconds =
    session.remember_me && policy.rememberMeSlidingSeconds
      ? policy.rememberMeSlidingSeconds
      : policy.slidingSeconds;
  const newExpiresAt = new Date(now.getTime() + slidingSeconds * 1000);
  // Never slide past the absolute ceiling.
  const cappedExpiresAt =
    session.absolute_expires_at && newExpiresAt > new Date(session.absolute_expires_at)
      ? new Date(session.absolute_expires_at)
      : newExpiresAt;

  await db
    .from("sessions")
    .update({ last_active_at: now.toISOString(), expires_at: cappedExpiresAt.toISOString() })
    .eq("id", session.id);

  return { ...session, expires_at: cappedExpiresAt.toISOString(), last_active_at: now.toISOString() };
}

/** Whether this session has a recent-enough password re-confirmation for a sensitive action. */
export function hasFreshStepUp(session: SessionRecord): boolean {
  if (!session.step_up_verified_at) return false;
  const maxAgeSeconds = SESSION_POLICY[session.role].stepUpMaxAgeSeconds;
  const ageMs = Date.now() - new Date(session.step_up_verified_at).getTime();
  return ageMs <= maxAgeSeconds * 1000;
}

export async function markStepUpVerified(sessionId: string): Promise<void> {
  await db
    .from("sessions")
    .update({ step_up_verified_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function revokeSession(token: string): Promise<void> {
  await db
    .from("sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token));
}

/** "Log out everywhere" — invalidates every session for a user, including the current one. */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .from("sessions")
    .update({ revoked: true, revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("revoked", false);
}
