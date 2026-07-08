import { db, authClient } from "../_lib/db.js";
import { createSession, resolveRole, revokeSession } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies, serializeCookie, appendSetCookie } from "../_lib/cookies.js";
import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";

// Used for OAuth (Google) sign-ins, which are redirect-based — there's no
// password to re-verify here like in login.ts. Instead, this trusts an
// access token Supabase already issued: verifying that token against
// Supabase's own auth server is proof enough that the user is who they say
// they are, since only Supabase could have issued a token that validates.
//
// Safe to call on EVERY sign-in event, including password logins (see
// use-auth.ts) — it's idempotent in effect (always mints a fresh session,
// same as login.ts), just occasionally redundant with login.ts's own call
// for the password path. That's a harmless extra session row, not a bug.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // No nex_session exists yet at this point, so this is IP-scoped.
  if (await enforceRateLimit(req, res, "auth:oauth-session", RATE_LIMIT_TIERS.AUTH_MODERATE)) return;

  const { accessToken } = (req.body ?? {}) as { accessToken?: string };
  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required." });
    return;
  }

  const authAny = authClient.auth as any;
  const { data, error } = await authAny.getUser(accessToken);

  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired access token." });
    return;
  }

  const userId = data.user.id;

  // Same session-fixation defense as login.ts: never reuse a pre-existing
  // nex_session cookie, always revoke it and mint a fresh one.
  const existingCookies = parseCookies(req.headers.cookie);
  const staleToken = existingCookies[SESSION_COOKIE];
  if (staleToken) {
    await revokeSession(staleToken).catch(() => {});
  }

  const role = await resolveRole(userId);
  const ipAddress =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    null;
  const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

  const { token } = await createSession({
    userId,
    role,
    rememberMe: false, // OAuth has no "remember me" checkbox — customer default sliding window applies
    ipAddress,
    userAgent,
  });

  const cookieMaxAge = 30 * 24 * 60 * 60;
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: cookieMaxAge }));

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  res.status(200).json({
    user: { id: userId, email: data.user.email, role, fullName: profile?.full_name ?? null },
  });
}
