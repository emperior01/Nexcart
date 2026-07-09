import { db } from "../_lib/db.js";
import { validateSession, hasFreshStepUp } from "../_lib/session.js";
import { SESSION_COOKIE, parseCookies } from "../_lib/cookies.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

// Moves withdrawal creation server-side specifically so step-up
// verification can actually be enforced. The previous client-side direct
// insert (RLS-protected only) had no way to check "did this seller
// recently re-confirm their password" — RLS can check row ownership, not
// session freshness. This endpoint owns that check now.
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

  // Real money leaving the platform — tightest non-auth tier, keyed by
  // user_id so this can't be dodged by switching IPs. Fails CLOSED: a
  // withdrawal must never be allowed to proceed unthrottled just because
  // Redis is down.
  if (await enforceRateLimit(req, res, "seller:withdraw", session.user_id)) return;

  if (!hasFreshStepUp(session)) {
    res.status(403).json({ error: "step_up_required" });
    return;
  }

  const { data: seller } = await db
    .from("sellers")
    .select("id, verification_status")
    .eq("user_id", session.user_id)
    .maybeSingle();

  if (!seller) {
    res.status(403).json({ error: "Not a seller account." });
    return;
  }
  if (seller.verification_status !== "verified") {
    res.status(403).json({ error: "Only verified sellers can request withdrawals." });
    return;
  }

  const { amount, bank_name, account_name, account_number } = (req.body ?? {}) as {
    amount?: number;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Enter a valid amount." });
    return;
  }
  if (!bank_name?.trim() || !account_name?.trim() || !account_number?.trim()) {
    res.status(400).json({ error: "All bank details are required." });
    return;
  }

  // Recompute available balance server-side — the same logic Withdrawals.tsx
  // uses client-side, but re-derived here from trusted data rather than
  // trusting whatever the client claims its balance is.
  const { data: products } = await db.from("products").select("id").eq("seller_id", seller.id);
  const productIds = (products ?? []).map((p: { id: string }) => p.id);

  let availableBalance = 0;
  if (productIds.length > 0) {
    const [itemsRes, withdrawalsRes] = await Promise.all([
      db.from("order_items").select("quantity,unit_price,orders!inner(status)").in("product_id", productIds),
      db.from("withdrawals").select("amount").eq("seller_id", seller.id).eq("status", "approved"),
    ]);
    type OI = { quantity: number; unit_price: number; orders: { status: string } };
    const totalRevenue = ((itemsRes.data ?? []) as OI[])
      .filter((oi) => oi.orders.status === "delivered")
      .reduce((s, oi) => s + Number(oi.unit_price) * Number(oi.quantity), 0);
    const withdrawn = ((withdrawalsRes.data ?? []) as { amount: number }[]).reduce((s, w) => s + Number(w.amount), 0);
    availableBalance = Math.max(0, totalRevenue - withdrawn);
  }

  if (amount > availableBalance) {
    res.status(400).json({ error: `Amount exceeds your available balance of ${availableBalance.toFixed(2)}.` });
    return;
  }

  const { error } = await db.from("withdrawals").insert({
    seller_id: seller.id,
    amount,
    bank_name: bank_name.trim(),
    account_name: account_name.trim(),
    account_number: account_number.trim(),
    status: "pending",
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ success: true });
}
