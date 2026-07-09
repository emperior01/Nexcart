import { revokeSession } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies, clearCookie, appendSetCookie } from "../_lib/cookies.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Normal tier, fails open — a Redis outage should never be the reason
  // someone can't log out.
  if (await enforceRateLimit(req, res, "auth:logout")) return;

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];

  if (token) {
    await revokeSession(token);
  }

  appendSetCookie(res, clearCookie(SESSION_COOKIE));
  res.status(200).json({ success: true });
}
