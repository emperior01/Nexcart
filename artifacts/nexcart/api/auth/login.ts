import { db, authClient } from "../_lib/db";
import { createSession, resolveRole, revokeSession } from "../_lib/session";
import { SESSION_COOKIE, GUEST_CART_COOKIE, parseCookies, serializeCookie, appendSetCookie } from "../_lib/cookies";

// Phase 2 (guest cart) plugs in here: import mergeGuestCartIntoUser from
// "../_lib/guestCart" and call it where the TODO below is, then delete
// this comment. Left as a clean seam so Phase 1 ships and builds standalone.

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, password, rememberMe } = (req.body ?? {}) as {
    email?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  // Session-fixation defense: never trust/reuse any nex_session cookie the
  // caller already had before this login attempt. If one exists, it's
  // proactively revoked below (best-effort) and always overwritten with a
  // freshly generated token regardless of what happens here.
  const existingCookies = parseCookies(req.headers.cookie);
  const staleToken = existingCookies[SESSION_COOKIE];

  // Verify credentials against Supabase Auth. We only use this to confirm
  // the password is correct and get the user id — the session it returns
  // is immediately discarded, never persisted, never sent to the client.
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData.user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const userId = authData.user.id;
  await authClient.auth.signOut(); // discard Supabase's own client-style session immediately

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
    rememberMe: Boolean(rememberMe) && role === "customer", // remember-me only applies to customers
    ipAddress,
    userAgent,
  });

  // maxAge on the cookie itself just needs to be generous enough to cover
  // the sliding window; actual expiry truth lives server-side in `sessions`.
  const cookieMaxAge = role === "customer" && rememberMe ? 60 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, { maxAgeSeconds: cookieMaxAge }));

  // TODO (Phase 2): merge guest cart into user cart here, then clear the
  // GUEST_CART_COOKIE. Left as a no-op for now — guest cart doesn't exist
  // yet, so there's nothing to merge, and we deliberately don't touch the
  // cookie until the merge logic that's supposed to consume it exists.
  void GUEST_CART_COOKIE;
  void existingCookies;

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  res.status(200).json({
    user: { id: userId, email: authData.user.email, role, fullName: profile?.full_name ?? null },
  });
}
