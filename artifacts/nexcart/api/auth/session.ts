import { db } from "../_lib/db.js";
import { validateSession } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies, clearCookie, appendSetCookie } from "../_lib/cookies.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

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

  // This gets called on every page load / auth-state change, so it's the
  // loosest, fail-open tier — not a sensitive action, just needs a ceiling
  // against a runaway client-side retry loop. Must never 503 just because
  // Redis is briefly unavailable, or the whole site would appear broken.
  if (await enforceRateLimit(req, res, "auth:session")) return;

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  const session = await validateSession(token);

  if (!session) {
    // Clean up a dead cookie proactively if one was sent but didn't validate.
    if (token) appendSetCookie(res, clearCookie(SESSION_COOKIE));
    res.status(200).json({ user: null });
    return;
  }

  // See the comment in api/auth/login.ts for why this cast is here — same
  // workspace-level duplicate @supabase/supabase-js type declaration issue.
  const [{ data: authUser }, { data: profile }] = await Promise.all([
    (db.auth as any).admin.getUserById(session.user_id),
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
