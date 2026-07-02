import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types.js";

// SERVER-ONLY. This file must never be imported from client code (anything
// under src/). It uses the Supabase service-role key, which bypasses RLS
// entirely — that's intentional, since these serverless functions are the
// trusted server boundary for the session system, but it means this key
// must NEVER be prefixed VITE_ (which would bundle it into the browser
// build) and must only be set as a Vercel server environment variable.

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // Fail loudly at cold start rather than silently returning null sessions.
  console.error(
    "[api/_lib/db] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
  );
}

// NOTE: deliberately untyped (no <Database> generic) here. The generated
// types.ts doesn't know about sessions/guest_carts/checkout_sessions yet —
// those are new tables from the migration SQL, not regenerated via the
// Supabase CLI (which you've hit workspace limitations with on Termux
// before). Once you do regenerate types, feel free to switch this to
// createClient<Database>(...) for full type safety.
export const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A second client using the anon key, used only to verify a password against
// Supabase Auth (signInWithPassword) during login. We deliberately don't
// keep the session it returns — we immediately discard the Supabase-issued
// JWT/localStorage-style session and mint our own nex_session instead.
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";
export const authClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
