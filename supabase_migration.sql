-- ============================================================
-- Nexcart — Full Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Profiles (extends auth.users) ──────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  preferred_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 2. User Roles ──────────────────────────────────────────
create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'customer')),
  unique(user_id, role)
);

-- ── 3. Categories ──────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── 4. Products ────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null,
  compare_at_price numeric(12,2),
  currency text not null default 'USD',
  stock integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute procedure set_updated_at();

-- ── 5. Product Images ──────────────────────────────────────
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── 6. Orders ──────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','delivered','cancelled')),
  total numeric(12,2) not null,
  currency text not null default 'USD',
  paystack_ref text unique,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute procedure set_updated_at();

-- ── 7. Order Items ─────────────────────────────────────────
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  currency text not null default 'USD'
);

-- ── 8. Row Level Security ──────────────────────────────────

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- profiles
alter table profiles enable row level security;
create policy "profiles: own read/write" on profiles
  for all using (auth.uid() = id);
create policy "profiles: admin read all" on profiles
  for select using (is_admin());

-- user_roles
alter table user_roles enable row level security;
create policy "user_roles: admin all" on user_roles
  for all using (is_admin());
create policy "user_roles: own read" on user_roles
  for select using (auth.uid() = user_id);

-- categories: public read
alter table categories enable row level security;
create policy "categories: public read" on categories
  for select using (true);
create policy "categories: admin write" on categories
  for all using (is_admin());

-- products: public read active, admin all
alter table products enable row level security;
create policy "products: public read active" on products
  for select using (is_active = true);
create policy "products: admin all" on products
  for all using (is_admin());

-- product_images: public read
alter table product_images enable row level security;
create policy "product_images: public read" on product_images
  for select using (true);
create policy "product_images: admin write" on product_images
  for all using (is_admin());

-- orders: user sees own, admin sees all
alter table orders enable row level security;
create policy "orders: own read/insert" on orders
  for select using (auth.uid() = user_id);
create policy "orders: insert authenticated" on orders
  for insert with check (true);
create policy "orders: admin all" on orders
  for all using (is_admin());

-- order_items: via order ownership
alter table order_items enable row level security;
create policy "order_items: own read" on order_items
  for select using (
    exists (select 1 from orders where id = order_id and user_id = auth.uid())
  );
create policy "order_items: insert" on order_items
  for insert with check (true);
create policy "order_items: admin all" on order_items
  for all using (is_admin());

-- ── 9. Seed default categories ─────────────────────────────
insert into categories (name, slug, sort_order) values
  ('Electronics', 'electronics', 1),
  ('Fashion', 'fashion', 2),
  ('Home & Kitchen', 'home-kitchen', 3),
  ('Beauty', 'beauty', 4),
  ('Sports', 'sports', 5),
  ('Books', 'books', 6)
on conflict (slug) do nothing;
