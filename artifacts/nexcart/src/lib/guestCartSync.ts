// Best-effort background sync between the existing client-side cart store
// and the server-side guest cart (nex_guest_cart cookie). Deliberately
// fire-and-forget: the client cart (cart.ts) remains the source of truth
// for what the shopper sees and stays instant/optimistic exactly as
// before. These calls just keep the server's copy current so it has
// validated, tamper-resistant data if this guest logs in later.
//
// Only fires for guests — once a Supabase session exists in localStorage,
// this app's cart is purely client-side for logged-in users (no server
// "user cart" table exists yet), so there's nothing to sync to.

function isLoggedInLocally(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
  } catch {
    return false;
  }
}

function post(body: unknown) {
  fetch("/api/cart/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).catch(() => {});
}

function patch(body: unknown) {
  fetch("/api/cart/guest", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).catch(() => {});
}

function del(body: unknown) {
  fetch("/api/cart/guest", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function syncGuestCartAdd(productId: string, quantity: number) {
  if (isLoggedInLocally()) return;
  post({ productId, quantity });
}

export function syncGuestCartUpdate(productId: string, quantity: number) {
  if (isLoggedInLocally()) return;
  patch({ productId, quantity });
}

export function syncGuestCartRemove(productId: string) {
  if (isLoggedInLocally()) return;
  del({ productId });
}

export function syncGuestCartClear() {
  if (isLoggedInLocally()) return;
  del({});
}
