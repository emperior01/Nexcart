import { db } from "../_lib/db.js";
import { validateSession, hasFreshStepUp } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies } from "../_lib/cookies.js";

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
  if (session.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  if (!hasFreshStepUp(session)) {
    res.status(403).json({ error: "step_up_required" });
    return;
  }

  const { userId, banned } = (req.body ?? {}) as { userId?: string; banned?: boolean };
  if (!userId || typeof banned !== "boolean") {
    res.status(400).json({ error: "userId and banned are required." });
    return;
  }

  const { error } = await db.from("profiles").update({ banned }).eq("id", userId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
