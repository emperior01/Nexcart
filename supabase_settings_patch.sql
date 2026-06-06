-- ============================================================
-- Nexcart — Site Settings Patch
-- Run this in Supabase SQL Editor AFTER the main migration
-- ============================================================

create table if not exists site_settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Only admins can write; everyone can read
alter table site_settings enable row level security;
create policy "site_settings: public read" on site_settings
  for select using (true);
create policy "site_settings: admin write" on site_settings
  for all using (is_admin());

-- Seed default values
insert into site_settings (key, value) values
(
  'announcement_bar',
  '"Fast delivery · Secure encrypted checkout"'
),
(
  'hero',
  '{
    "heading_line1": "Shop Smarter.",
    "heading_line2": "Live Better with Nexcart",
    "subtext": "Quality goods, easy ordering, and reliable service.",
    "cta_primary": "Shop the collection",
    "cta_secondary": "Browse new tech",
    "images": []
  }'
),
(
  'promo_banner',
  '{
    "heading": "Shop Smarter.\nLive Better with Nexcart",
    "subtext": "Quality goods, easy ordering, and reliable service.",
    "code": "NEXCART10",
    "cta": "Start shopping"
  }'
),
(
  'trust_badges',
  '[
    { "icon": "truck",   "title": "Fast delivery",     "sub": "Fast fulfillment and dependable shipping on every order." },
    { "icon": "shield",  "title": "Secure checkout",   "sub": "Encrypted payments via Paystack." },
    { "icon": "refresh", "title": "30-day returns",    "sub": "No-fuss return policy." },
    { "icon": "chat",    "title": "Real support",      "sub": "Humans, not bots." }
  ]'
)
on conflict (key) do nothing;
