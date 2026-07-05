// Best-effort call to clear the server-side session (nex_session cookie +
// its DB record) whenever the app signs out of Supabase. Non-fatal by
// design: Supabase's own signOut() is what actually matters for the user's
// experience — if this fails, the nex_session cookie is still HttpOnly and
// tied to a session row with its own expiry, so nothing stays open
// indefinitely even if this particular cleanup call doesn't land.
export async function clearServerSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (_) {
    // Non-fatal — see comment above.
  }
}
