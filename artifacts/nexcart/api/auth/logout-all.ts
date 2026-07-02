import { validateSession, revokeAllSessionsForUser } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies, clearCookie, appendSetCookie } from "../_lib/cookies.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  const session = await validateSession(token);

  if (!session) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  await revokeAllSessionsForUser(session.user_id);

  // The current session was just revoked too (it's included in "all"), so
  // clear the cookie on this device as well — the user is fully logged out
  // everywhere, including here.
  appendSetCookie(res, clearCookie(SESSION_COOKIE));
  res.status(200).json({ success: true });
}
