import { db } from "../_lib/db.js";
import { validateSession, hasFreshStepUp } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies } from "../_lib/cookies.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

// Covers both "toggle active/inactive" and "update config" from
// use-payment-methods.ts — both were direct client-side updates to
// payment_methods, now routed through here so step-up can be enforced.
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

  // Backstop against a compromised/stolen admin session being hammered.
  // Keyed by user_id, not IP. Fails CLOSED — this changes how payments are
  // accepted platform-wide, so it must not run unthrottled during a Redis
  // outage.
  if (await enforceRateLimit(req, res, "admin:payment-method", session.user_id)) return;

  if (!hasFreshStepUp(session)) {
    res.status(403).json({ error: "step_up_required" });
    return;
  }

  const { id, patch } = (req.body ?? {}) as { id?: string; patch?: Record<string, unknown> };
  if (!id || !patch || typeof patch !== "object") {
    res.status(400).json({ error: "id and patch are required." });
    return;
  }

  const { error } = await db.from("payment_methods").update(patch).eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
