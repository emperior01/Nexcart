import { GUEST_CART_COOKIE, parseCookies, serializeCookie, clearCookie, appendSetCookie } from "../_lib/cookies.js";
import { getGuestCart, addToGuestCart, updateGuestCartItem, removeFromGuestCart } from "../_lib/guestCart.js";
import { enforceRateLimit, RATE_LIMIT_TIERS } from "../_lib/rateLimit.js";

const GUEST_CART_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches guest_carts.expires_at default

export default async function handler(req: any, res: any) {
  // Applies across GET/POST/PATCH/DELETE alike — this route has no auth,
  // so IP is the only identifier available.
  if (await enforceRateLimit(req, res, "cart:guest", RATE_LIMIT_TIERS.GENERAL)) return;

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[GUEST_CART_COOKIE];

  if (req.method === "GET") {
    const { items } = await getGuestCart(token);
    res.status(200).json({ items });
    return;
  }

  if (req.method === "POST") {
    const { productId, quantity } = (req.body ?? {}) as { productId?: string; quantity?: number };
    if (!productId) {
      res.status(400).json({ error: "productId is required." });
      return;
    }
    const result = await addToGuestCart(token, productId, quantity && quantity > 0 ? quantity : 1);
    if (!result) {
      res.status(404).json({ error: "Product not found or unavailable." });
      return;
    }
    appendSetCookie(res, serializeCookie(GUEST_CART_COOKIE, result.token, { maxAgeSeconds: GUEST_CART_MAX_AGE }));
    res.status(200).json({ items: result.items });
    return;
  }

  if (req.method === "PATCH") {
    if (!token) {
      res.status(200).json({ items: [] });
      return;
    }
    const { productId, quantity } = (req.body ?? {}) as { productId?: string; quantity?: number };
    if (!productId || quantity === undefined) {
      res.status(400).json({ error: "productId and quantity are required." });
      return;
    }
    const items = await updateGuestCartItem(token, productId, quantity);
    res.status(200).json({ items });
    return;
  }

  if (req.method === "DELETE") {
    if (!token) {
      res.status(200).json({ items: [] });
      return;
    }
    const { productId } = (req.body ?? {}) as { productId?: string };
    if (!productId) {
      // No productId — treat as "clear whole guest cart".
      appendSetCookie(res, clearCookie(GUEST_CART_COOKIE));
      res.status(200).json({ items: [] });
      return;
    }
    const items = await removeFromGuestCart(token, productId);
    res.status(200).json({ items });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
