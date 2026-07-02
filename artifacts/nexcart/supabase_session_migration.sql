-- ============================================================================
-- Nexcart: Secure Session System — Phase 1 migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run once. Uses IF NOT EXISTS guards so re-running won't error.
-- ============================================================================

-- Sessions are looked up by a SHA-256 hash of the opaque token that lives in
-- the nex_session cookie. We never store the raw token server-side, so a DB
-- read (via leak, dump, or misconfigured query) can't be replayed as a
-- working session.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'seller', 'admin')),
  token_hash text not null unique,
  remember_me boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null,          -- sliding expiry, recalculated on activity
  absolute_expires_at timestamptz,          -- hard ceiling regardless of activity (seller/admin)
  step_up_verified_at timestamptz,          -- last time password was re-confirmed this session
  ip_address text,
  user_agent text,
  revoked boolean not null default false,
  revoked_at timestamptz
);

create index if not exists sessions_token_hash_idx on public.sessions (token_hash) where revoked = false;
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- Lock the table down completely at the RLS layer. Only the service-role key
-- (used exclusively by our Vercel serverless functions, never shipped to the
-- browser) can touch this table. No anon/authenticated client access, ever.
alter table public.sessions enable row level security;

drop policy if exists "sessions_no_client_access" on public.sessions;
create policy "sessions_no_client_access" on public.sessions
  for all
  using (false)
  with check (false);

comment on table public.sessions is
  'Server-side session store for nex_session cookie. Service-role access only — never exposed to anon/authenticated clients.';
