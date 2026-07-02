import { db } from "../_lib/db";
import { validateSession } from "../_lib/session";
import { SESSION_COOKIE, parseCookies, clearCookie, appendSetCookie } from "../_lib/cookies";

// This replaces the client-side supabase.auth.getUser()/getSession() calls
// that use-auth.ts previously relied on. The frontend should call this on
// load (and after any auth action) instead of reading a local Supabase
// session, since there no longer is one — the nex_session cookie is the
// only source of truth now.
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  const session = await validateSession(token);

  if (!session) {
    // Clean up a dead cookie proactively if one was sent but didn't validate.
    if (token) appendSetCookie(res, clearCookie(SESSION_COOKIE));
    res.status(200).json({ user: null });
    return;
  }

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    db.auth.admin.getUserById(session.user_id),
    db.from("profiles").select("full_name, avatar_url").eq("id", session.user_id).maybeSingle(),
  ]);

  res.status(200).json({
    user: {
      id: session.user_id,
      email: authUser?.user?.email ?? null,
      role: session.role,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  });
}
