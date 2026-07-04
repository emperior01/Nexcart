import { db, authClient } from "../_lib/db.js";
import { createSession, resolveRole, revokeSession } from "../_lib/session.js";
import { SESSION_COOKIE, GUEST_CART_COOKIE, parseCookies, serializeCookie, clearCookie, appendSetCookie } from "../_lib/cookies.js";
import { consumeGuestCartForMerge } from "../_lib/guestCart.js";

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
  //
  // NOTE: cast to `any` here. This monorepo's tsc --build project-reference
  // setup resolves two different type declarations for @supabase/supabase-js
  // across workspace packages (a duplicate/hoisted version conflict), which
  // makes the real, correct-at-runtime methods below appear "missing" to
  // the type checker even though they exist. This is a type-checking
  // artifact, not a runtime bug — casting avoids fighting the workspace's
  // dependency resolution just to satisfy tsc.
  const authAny = authClient.auth as any;
  const { data: authData, error: authError } = await authAny.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData.user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const userId = authData.user.id;
  // scope: "local" is critical here. Without it, signOut() defaults to
  // "global" scope, which revokes this user's refresh token on Supabase's
  // server for ALL sessions — including the browser's own session that was
  // just legitimately created by signInWithPassword a moment ago. That was
  // silently killing every real login: the browser would sign in fine,
  // then this call would immediately revoke it server-side, and the next
  // getUser() check would correctly (but tragically) see a genuinely
  // invalidated token and log the person straight back out.
  await authAny.signOut({ scope: "local" });

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

  // Merge any guest cart into this login: hand the validated (server-truth)
  // items back to the client so it can fold them into its own cart store,
  // then delete the server-side guest cart row and clear the cookie. The
  // client's existing cart items are left alone here — merging them with
  // what's returned is the client's job (same "add" semantics it already
  // uses for its own items), since that logic already exists there.
  const guestToken = existingCookies[GUEST_CART_COOKIE];
  let guestCartItems: Awaited<ReturnType<typeof consumeGuestCartForMerge>> = [];
  if (guestToken) {
    guestCartItems = await consumeGuestCartForMerge(guestToken).catch(() => []);
    appendSetCookie(res, clearCookie(GUEST_CART_COOKIE));
  }

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  res.status(200).json({
    user: { id: userId, email: authData.user.email, role, fullName: profile?.full_name ?? null },
    guestCartItems,
  });
}
