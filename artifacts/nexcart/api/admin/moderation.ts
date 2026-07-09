import { db } from "../_lib/db.js";
import { validateSession, hasFreshStepUp } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies } from "../_lib/cookies.js";
import { enforceRateLimit, getClientIp } from "../_lib/rateLimit.js";
import { getRequestId } from "../_lib/securityLog.js";

// Merges the former api/admin/user-ban.ts and api/admin/seller-status.ts
// into one file, purely to fit under Vercel Hobby's 12-serverless-function
// limit (adding api/health.ts pushed the project to 13). Each action keeps
// its OWN rate-limit routeKey — merging the files doesn't merge their
// limits, a stolen admin session hammering user bans still can't "spend"
// its budget on seller actions instead, or vice versa.
//
// Extended to add full seller moderation: suspend-seller, reactivate-seller,
// approve-seller, reject-seller — all sharing the "admin:seller-status"
// rate-limit tier since they're all the same class of action (an admin
// changing one seller's standing). Every seller-moderation action writes a
// row to seller_audit_logs for traceability.
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
  // Sellers and customers can never reach any branch below, regardless of
  // whose sellerId/userId they pass in the body — this check alone is why
  // a seller can't touch their own status by calling this endpoint directly.
  if (session.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const { action } = (req.body ?? {}) as { action?: string };

  if (action === "ban-user") {
    if (await enforceRateLimit(req, res, "admin:user-ban", session.user_id)) return;
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
    return;
  }

  if (action === "seller-status") {
    // Generic status setter, kept for backward compatibility with any
    // other caller. NOTE: this no longer writes reviewed_at/reviewed_by —
    // those columns don't actually exist on the live `sellers` table
    // (confirmed via information_schema) despite being present in the
    // generated types.ts, and writing them was crashing every call with
    // "Could not find the 'reviewed_at' column of 'sellers' in the schema
    // cache." The admin UI now uses the four specific actions below
    // instead, which is the supported path going forward.
    if (await enforceRateLimit(req, res, "admin:seller-status", session.user_id)) return;
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

    const { error } = await db.from("sellers").update({ verification_status: status }).eq("id", sellerId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (status === "verified" || status === "suspended") {
      const title = status === "verified" ? "Account Upgraded to Verified 🎉" : "Seller Account Suspended";
      const message =
        status === "verified"
          ? `Congratulations! Your store "${storeName ?? ""}" has been verified. You now have full access including withdrawal requests.`
          : `Your seller account for "${storeName ?? ""}" has been suspended. Please contact support for assistance.`;
      await db.from("seller_notifications").insert({ seller_id: sellerId, title, message });
    }

    res.status(200).json({ success: true });
    return;
  }

  if (action === "suspend-seller") {
    if (await enforceRateLimit(req, res, "admin:seller-status", session.user_id)) return;
    if (!hasFreshStepUp(session)) {
      res.status(403).json({ error: "step_up_required" });
      return;
    }

    const { sellerId, reason, notes } = (req.body ?? {}) as {
      sellerId?: string;
      reason?: string;
      notes?: string;
    };
    if (!sellerId || !reason?.trim()) {
      res.status(400).json({ error: "sellerId and a suspension reason are required." });
      return;
    }

    const { data: seller, error: fetchError } = await db
      .from("sellers")
      .select("store_name, verification_status")
      .eq("id", sellerId)
      .maybeSingle();
    if (fetchError || !seller) {
      res.status(404).json({ error: "Seller not found." });
      return;
    }
    if (seller.verification_status === "suspended") {
      res.status(400).json({ error: "This seller is already suspended." });
      return;
    }

    const { error } = await db
      .from("sellers")
      .update({
        verification_status: "suspended",
        // Remembers what the seller could do before this, so
        // reactivate-seller can restore the same access level rather
        // than blanket-granting verified/withdrawal access they may
        // never have had.
        pre_suspension_status: seller.verification_status,
        suspended_at: new Date().toISOString(),
        suspended_by: session.user_id,
        suspension_reason: reason.trim(),
        suspension_notes: notes?.trim() || null,
      })
      .eq("id", sellerId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await db.from("seller_notifications").insert({
      seller_id: sellerId,
      title: "Seller Account Suspended",
      message: `Your seller account for "${seller.store_name}" has been suspended. Reason: ${reason.trim()}. Please contact support for assistance.`,
    });

    await writeAuditLog(req, {
      adminId: session.user_id,
      sellerId,
      sellerName: seller.store_name,
      action: "suspend",
      reason: reason.trim(),
    });

    res.status(200).json({ success: true });
    return;
  }

  if (action === "reactivate-seller") {
    if (await enforceRateLimit(req, res, "admin:seller-status", session.user_id)) return;
    if (!hasFreshStepUp(session)) {
      res.status(403).json({ error: "step_up_required" });
      return;
    }

    const { sellerId } = (req.body ?? {}) as { sellerId?: string };
    if (!sellerId) {
      res.status(400).json({ error: "sellerId is required." });
      return;
    }

    const { data: seller, error: fetchError } = await db
      .from("sellers")
      .select("store_name, verification_status, pre_suspension_status")
      .eq("id", sellerId)
      .maybeSingle();
    if (fetchError || !seller) {
      res.status(404).json({ error: "Seller not found." });
      return;
    }
    if (seller.verification_status !== "suspended") {
      res.status(400).json({ error: "This seller isn't currently suspended." });
      return;
    }

    // Falls back to "basic" (the default post-signup access level) if
    // pre_suspension_status is somehow unset — e.g. a suspension that
    // happened before this migration ran. Never falls back to "verified":
    // that would silently hand out withdrawal access nobody explicitly
    // granted.
    const restoredStatus = seller.pre_suspension_status ?? "basic";

    const { error } = await db
      .from("sellers")
      .update({
        verification_status: restoredStatus,
        reactivated_at: new Date().toISOString(),
        reactivated_by: session.user_id,
        pre_suspension_status: null,
      })
      .eq("id", sellerId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await db.from("seller_notifications").insert({
      seller_id: sellerId,
      title: "Seller Account Reactivated",
      message: `Your seller account for "${seller.store_name}" has been reactivated. You may continue selling on Nexcart.`,
    });

    await writeAuditLog(req, {
      adminId: session.user_id,
      sellerId,
      sellerName: seller.store_name,
      action: "reactivate",
    });

    res.status(200).json({ success: true, restoredStatus });
    return;
  }

  if (action === "approve-seller" || action === "reject-seller") {
    if (await enforceRateLimit(req, res, "admin:seller-status", session.user_id)) return;
    if (!hasFreshStepUp(session)) {
      res.status(403).json({ error: "step_up_required" });
      return;
    }

    const { sellerId, reason } = (req.body ?? {}) as { sellerId?: string; reason?: string };
    if (!sellerId) {
      res.status(400).json({ error: "sellerId is required." });
      return;
    }

    const { data: seller, error: fetchError } = await db
      .from("sellers")
      .select("store_name")
      .eq("id", sellerId)
      .maybeSingle();
    if (fetchError || !seller) {
      res.status(404).json({ error: "Seller not found." });
      return;
    }

    const newStatus = action === "approve-seller" ? "verified" : "rejected";
    const { error } = await db.from("sellers").update({ verification_status: newStatus }).eq("id", sellerId);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const title = newStatus === "verified" ? "Application Approved 🎉" : "Application Rejected";
    const message =
      newStatus === "verified"
        ? `Congratulations! Your store "${seller.store_name}" has been approved. You now have full access including withdrawal requests.`
        : `Your application for "${seller.store_name}" was rejected.${reason ? ` Reason: ${reason.trim()}` : ""}`;
    await db.from("seller_notifications").insert({ seller_id: sellerId, title, message });

    await writeAuditLog(req, {
      adminId: session.user_id,
      sellerId,
      sellerName: seller.store_name,
      action: newStatus === "verified" ? "approve" : "reject",
      reason: reason?.trim(),
    });

    res.status(200).json({ success: true });
    return;
  }

  res.status(400).json({
    error: "action must be one of: ban-user, seller-status, suspend-seller, reactivate-seller, approve-seller, reject-seller.",
  });
}

async function writeAuditLog(
  req: any,
  entry: {
    adminId: string;
    sellerId: string;
    sellerName: string;
    action: "suspend" | "reactivate" | "approve" | "reject";
    reason?: string;
  }
): Promise<void> {
  // Best-effort: a logging failure should never roll back or block the
  // moderation action itself (the seller's status change already
  // committed above) — it's recorded to the console so it's still
  // visible in Vercel's logs even if the audit-log insert itself failed.
  const { error } = await db.from("seller_audit_logs").insert({
    admin_id: entry.adminId,
    seller_id: entry.sellerId,
    seller_name: entry.sellerName,
    action: entry.action,
    reason: entry.reason ?? null,
    request_id: getRequestId(req),
    ip_address: getClientIp(req),
  });
  if (error) {
    console.error("[seller_audit_logs] insert failed:", error.message);
  }
}
