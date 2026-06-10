-- ============================================================
-- Nexcart — Profiles table column patch
-- Run this in Supabase Dashboard → SQL Editor
--
-- Safe to run even if some columns already exist — every
-- statement uses ADD COLUMN IF NOT EXISTS / ALTER COLUMN ... SET DEFAULT.
-- ============================================================

-- Add any columns that may be missing from the profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name        text,
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

-- Back-fill preferred_currency for any rows that were inserted before the column existed
UPDATE profiles
  SET preferred_currency = 'USD'
  WHERE preferred_currency IS NULL;

-- Ensure the NOT NULL constraint is present (no-op if already set)
ALTER TABLE profiles
  ALTER COLUMN preferred_currency SET NOT NULL,
  ALTER COLUMN preferred_currency SET DEFAULT 'USD';
