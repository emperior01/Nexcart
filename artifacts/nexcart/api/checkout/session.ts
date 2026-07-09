import { validateSession } from "../_lib/session.js";
import { createCheckoutSession, getCheckoutSession, completeCheckoutSession } from "../_lib/checkoutSession.js";
import { SESSION_COOKIE, GUEST_CART_COOKIE, parseCookies } from "../_lib/cookies.js";
import { enforceRateLimit } from "../_lib/rateLimit.js";

export default async function handler(req: any, res: any) {
  // Applies across GET/POST/PATCH alike. IP-based — logged-in and guest
  // checkouts both hit this, so user_id isn't always available. Checkout
  // is on the sensitive list, so this now fails CLOSED (503) if Redis is
  // unreachable rather than the previous always-fail-open behavior — an
  // unprotected checkout path is a bigger risk than a brief 503 during an
  // outage.
  if (await enforceRateLimit(req, res, "checkout:session")) return;

  const cookies = parseCookies(req.headers.cookie);

  if (req.method === "POST") {
    const { cartSnapshot } = (req.body ?? {}) as { cartSnapshot?: unknown };
    if (!cartSnapshot) {
      res.status(400).json({ error: "cartSnapshot is required." });
      return;
    }

    const sessionToken = cookies[SESSION_COOKIE];
    const session = sessionToken ? await validateSession(sessionToken) : null;
    const guestToken = !session ? cookies[GUEST_CART_COOKIE] ?? null : null;

    const { id, expiresAt } = await createCheckoutSession({
      userId: session?.user_id ?? null,
      guestToken,
      cartSnapshot,
    });

    res.status(200).json({ checkoutSessionId: id, expiresAt });
    return;
  }

  if (req.method === "GET") {
    const id = req.query?.id as string | undefined;
    if (!id) {
      res.status(400).json({ error: "id query param is required." });
      return;
    }
    const checkoutSession = await getCheckoutSession(id);
    if (!checkoutSession) {
      res.status(404).json({ error: "Checkout session not found." });
      return;
    }
    res.status(200).json({
      status: checkoutSession.status,
      expiresAt: checkoutSession.expires_at,
      cartSnapshot: checkoutSession.cart_snapshot,
    });
    return;
  }

  if (req.method === "PATCH") {
    const { id } = (req.body ?? {}) as { id?: string };
    if (!id) {
      res.status(400).json({ error: "id is required." });
      return;
    }
    // Marking complete is a courtesy/observability signal — it does NOT
    // gate order creation or payment verification in any way. Those stay
    // entirely owned by verifyAndCreateOrder() / the Paystack edge
    // function, untouched. If this call fails, the checkout still
    // succeeded from the shopper's perspective; the session just lazily
    // flips to "abandoned" on its own 120-minute expiry instead, which is
    // a harmless bookkeeping difference, not a functional one.
    await completeCheckoutSession(id);
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
