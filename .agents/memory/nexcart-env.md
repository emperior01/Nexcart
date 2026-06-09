---
name: Nexcart environment credentials
description: Where Supabase and Paystack keys live for the Nexcart artifact
---

## Rule
Nexcart credentials go in `artifacts/nexcart/.env.local` — Vite picks this up automatically as a local override. The file is gitignored.

**Why:** VITE_ prefixed env vars are baked into the client bundle at build time. They must come from Vite's env system (`.env.local`), not Replit Secrets (which only apply to server-side processes). Using Replit Secrets/requestEnvVar for VITE_ vars will NOT work for the frontend.

**How to apply:**
- Keys needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`
- Tell user to edit `artifacts/nexcart/.env.local` with their real values from Supabase dashboard (Settings → API)
- The Supabase client has a graceful placeholder fallback so the app renders without crashing during setup
