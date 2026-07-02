-- ============================================================================
-- Nexcart: Secure Session System — Phase 2 migration
-- Run this in the Supabase SQL Editor, same as Phase 1's migration.
-- ============================================================================

-- Guest carts: server-side truth for unauthenticated shoppers. The
-- nex_guest_cart cookie holds only an opaque token — item prices/stock are
-- always re-validated against `products` server-side on every write, so a
-- guest can't tamper with price or bypass a stock limit by editing the
-- cookie or client state.
create table if not exists public.guest_carts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists guest_carts_token_hash_idx on public.guest_carts (token_hash);
create index if not exists guest_carts_expires_at_idx on public.guest_carts (expires_at);

alter table public.guest_carts enable row level security;
drop policy if exists "guest_carts_no_client_access" on public.guest_carts;
create policy "guest_carts_no_client_access" on public.guest_carts
  for all using (false) with check (false);

-- Checkout sessions: tracks a checkout attempt from either a guest or a
-- logged-in user. Expires 120 minutes after creation; once expired it's
-- lazily flipped to 'abandoned' the next time it's read (no cron
-- dependency — correctness doesn't rely on a sweep job running on time).
create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_token_hash text,
  cart_snapshot jsonb not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned', 'expired')),
  reserved_items jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '120 minutes'),
  completed_at timestamptz,
  abandoned_at timestamptz
);

create index if not exists checkout_sessions_user_id_idx on public.checkout_sessions (user_id);
create index if not exists checkout_sessions_expires_at_idx on public.checkout_sessions (expires_at);
create index if not exists checkout_sessions_status_idx on public.checkout_sessions (status);

alter table public.checkout_sessions enable row level security;
drop policy if exists "checkout_sessions_no_client_access" on public.checkout_sessions;
create policy "checkout_sessions_no_client_access" on public.checkout_sessions
  for all using (false) with check (false);

comment on table public.guest_carts is
  'Server-side truth for guest (unauthenticated) shopping carts. Service-role access only.';
comment on table public.checkout_sessions is
  'Tracks in-progress checkout attempts with a 120-minute expiry. Service-role access only.';
