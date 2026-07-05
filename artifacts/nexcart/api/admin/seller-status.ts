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

  const { sellerId, status, storeName } = (req.body ?? {}) as {
    sellerId?: string;
    status?: "basic" | "verified" | "suspended" | "pending" | "rejected";
    storeName?: string;
  };

  if (!sellerId || !status) {
    res.status(400).json({ error: "sellerId and status are required." });
    return;
  }

  const { error } = await db
    .from("sellers")
    .update({ verification_status: status, reviewed_at: new Date().toISOString(), reviewed_by: session.user_id })
    .eq("id", sellerId);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Same notification behavior as the original client-side handler.
  if (status === "verified" || status === "suspended") {
    const title = status === "verified" ? "Account Upgraded to Verified 🎉" : "Seller Account Suspended";
    const message =
      status === "verified"
        ? `Congratulations! Your store "${storeName ?? ""}" has been verified. You now have full access including withdrawal requests.`
        : `Your seller account for "${storeName ?? ""}" has been suspended. Please contact support for assistance.`;
    await db.from("seller_notifications").insert({ seller_id: sellerId, title, message });
  }

  res.status(200).json({ success: true });
}
