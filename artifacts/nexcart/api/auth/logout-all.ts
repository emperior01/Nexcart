import { validateSession, revokeAllSessionsForUser } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies, clearCookie, appendSetCookie } from "../_lib/cookies.js";
import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";

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

  // Keyed by user_id, not IP — this is an authenticated action, and IP
  // limiting would let the same account get hammered from many IPs.
  if (await enforceRateLimit(req, res, "auth:logout-all", RATE_LIMIT_TIERS.AUTH_MODERATE, session.user_id)) return;

  await revokeAllSessionsForUser(session.user_id);

  // The current session was just revoked too (it's included in "all"), so
  // clear the cookie on this device as well — the user is fully logged out
  // everywhere, including here.
  appendSetCookie(res, clearCookie(SESSION_COOKIE));
  res.status(200).json({ success: true });
}
