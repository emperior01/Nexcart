import { randomBytes, createHash } from "crypto";
import { db } from "./db.js";

export interface GuestCartItem {
  productId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  quantity: number;
  maxStock: number;
}

export function generateGuestToken(): string {
  return randomBytes(24).toString("base64url");
}

function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Re-fetches a product's current price/stock/title/image from the database
 * and returns a validated cart item, or null if the product no longer
 * exists or is inactive. This is what actually prevents cart tampering —
 * whatever the client sends for price is ignored; only productId and the
 * requested quantity are taken from client input.
 */
async function validateProduct(
  productId: string,
  requestedQuantity: number
): Promise<GuestCartItem | null> {
  const { data: product } = await db
    .from("products")
    .select("id, slug, title, price, currency, stock, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_active) return null;

  const { data: image } = await db
    .from("product_images")
    .select("url")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle();

  const quantity = Math.max(1, Math.min(requestedQuantity, product.stock));

  return {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    price: product.price,
    currency: product.currency,
    image: image?.url ?? null,
    quantity,
    maxStock: product.stock,
  };
}

export async function getGuestCart(token: string | undefined): Promise<{
  items: GuestCartItem[];
  rowId: string | null;
}> {
  if (!token) return { items: [], rowId: null };

  const { data } = await db
    .from("guest_carts")
    .select("id, items, expires_at")
    .eq("token_hash", hashGuestToken(token))
    .maybeSingle();

  if (!data || new Date(data.expires_at) <= new Date()) {
    return { items: [], rowId: null };
  }

  return { items: (data.items as GuestCartItem[]) ?? [], rowId: data.id };
}

/**
 * Adds (or increments) a product in the guest cart. Always re-validates
 * against the live product record. Returns the updated cart and the token
 * to set in the cookie (generates a new one if this is the first item).
 */
export async function addToGuestCart(
  existingToken: string | undefined,
  productId: string,
  requestedQuantity: number
): Promise<{ token: string; items: GuestCartItem[] } | null> {
  const validated = await validateProduct(productId, requestedQuantity);
  if (!validated) return null;

  const { items: current } = await getGuestCart(existingToken);
  const existingIdx = current.findIndex((i) => i.productId === productId);

  let items: GuestCartItem[];
  if (existingIdx >= 0) {
    const newQty = Math.min(current[existingIdx].quantity + validated.quantity, validated.maxStock);
    items = current.map((i, idx) => (idx === existingIdx ? { ...validated, quantity: newQty } : i));
  } else {
    items = [...current, validated];
  }

  const token = existingToken ?? generateGuestToken();
  await upsertGuestCart(token, items);
  return { token, items };
}

export async function updateGuestCartItem(
  token: string,
  productId: string,
  quantity: number
): Promise<GuestCartItem[]> {
  const { items: current } = await getGuestCart(token);

  if (quantity < 1) {
    const items = current.filter((i) => i.productId !== productId);
    await upsertGuestCart(token, items);
    return items;
  }

  const validated = await validateProduct(productId, quantity);
  if (!validated) {
    const items = current.filter((i) => i.productId !== productId);
    await upsertGuestCart(token, items);
    return items;
  }

  const items = current.map((i) => (i.productId === productId ? validated : i));
  await upsertGuestCart(token, items);
  return items;
}

export async function removeFromGuestCart(token: string, productId: string): Promise<GuestCartItem[]> {
  const { items: current } = await getGuestCart(token);
  const items = current.filter((i) => i.productId !== productId);
  await upsertGuestCart(token, items);
  return items;
}

async function upsertGuestCart(token: string, items: GuestCartItem[]): Promise<void> {
  const tokenHash = hashGuestToken(token);
  const { data: existing } = await db
    .from("guest_carts")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (existing) {
    await db
      .from("guest_carts")
      .update({ items, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db.from("guest_carts").insert({ token_hash: tokenHash, items });
  }
}

/** Called from the login endpoint. Returns the guest cart's items (for the
 * client to merge into its own cart state) and deletes the server-side row.
 * Doesn't touch the cookie — the caller (login.ts) clears that. */
export async function consumeGuestCartForMerge(token: string): Promise<GuestCartItem[]> {
  const { items, rowId } = await getGuestCart(token);
  if (rowId) {
    await db.from("guest_carts").delete().eq("id", rowId);
  }
  return items;
}
