import { validateSession } from "../_lib/session.js";
import { createCheckoutSession, getCheckoutSession } from "../_lib/checkoutSession.js";
import { SESSION_COOKIE, GUEST_CART_COOKIE, parseCookies } from "../_lib/cookies.js";

export default async function handler(req: any, res: any) {
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

  res.status(405).json({ error: "Method not allowed" });
}
