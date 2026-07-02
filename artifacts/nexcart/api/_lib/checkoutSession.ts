import { db } from "./db.js";
import { hashToken } from "./session.js";

const CHECKOUT_SESSION_MINUTES = 120;

export interface CheckoutSessionRecord {
  id: string;
  user_id: string | null;
  guest_token_hash: string | null;
  cart_snapshot: unknown;
  status: "active" | "completed" | "abandoned" | "expired";
  reserved_items: unknown;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
}

export async function createCheckoutSession(params: {
  userId: string | null;
  guestToken: string | null;
  cartSnapshot: unknown;
}): Promise<{ id: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("checkout_sessions")
    .insert({
      user_id: params.userId,
      guest_token_hash: params.guestToken ? hashToken(params.guestToken) : null,
      cart_snapshot: params.cartSnapshot,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create checkout session: ${error?.message}`);
  }

  return { id: data.id, expiresAt: data.expires_at };
}

/**
 * Reads a checkout session and lazily flips it to 'abandoned' if it's past
 * expires_at and still marked 'active'. This is intentionally checked at
 * read-time rather than relying solely on a cron sweep — correctness of
 * "is this checkout still valid" doesn't depend on a scheduled job having
 * run recently.
 *
 * NOTE on "release reserved items": this app doesn't currently decrement
 * product stock at checkout-session-creation time anywhere (stock changes
 * happen at order creation / Paystack webhook verification, outside this
 * system). `reserved_items` is provided as a slot for future use if you
 * add real inventory holds later — right now there's nothing to release,
 * so this just marks the session abandoned.
 */
export async function getCheckoutSession(id: string): Promise<CheckoutSessionRecord | null> {
  const { data } = await db.from("checkout_sessions").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const session = data as CheckoutSessionRecord;
  if (session.status === "active" && new Date(session.expires_at) <= new Date()) {
    const now = new Date().toISOString();
    await db
      .from("checkout_sessions")
      .update({ status: "abandoned", abandoned_at: now })
      .eq("id", id);
    return { ...session, status: "abandoned", abandoned_at: now };
  }

  return session;
}

export async function completeCheckoutSession(id: string): Promise<void> {
  await db
    .from("checkout_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
}
