# Nexcart

**Shop Smarter. Live Better.**  
A full-stack e-commerce storefront built with Vite + TanStack Router + Supabase + Paystack.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + TanStack Router |
| Styling | Tailwind CSS v4 + custom design system |
| State | Zustand (cart) + TanStack Query (server state) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | Paystack |
| Runtime | Bun |

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Run the Supabase migration

Open your Supabase dashboard → **SQL Editor** → paste and run the contents of `supabase_migration.sql`.

This creates all tables, RLS policies, triggers, and seeds 6 default categories.

### 3. Enable Google OAuth (optional)

In Supabase dashboard → **Authentication → Providers → Google** → add your Google OAuth credentials.

### 4. Set your first admin

After signing up, run this in Supabase SQL Editor:

```sql
insert into user_roles (user_id, role)
values ('<your-user-id>', 'admin');
```

Find your user ID in **Supabase → Authentication → Users**.

### 5. Start the dev server

```bash
bun dev
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Homepage — hero, featured products, promo |
| `/shop` | Product listing with search, filter, sort, pagination |
| `/products/:slug` | Product detail with images, qty, add to cart |
| `/auth` | Sign in / Sign up (email + Google) |
| `/account` | Order history + profile settings + currency |
| `/checkout` | Checkout form + Paystack payment |
| `/admin` | Admin dashboard (stats) |
| `/admin/products` | Add / edit / delete products + CSV import |
| `/admin/orders` | View & update order statuses |
| `/admin/users` | View users & grant/revoke admin role |

---

## CSV Import Format

Use the admin panel → Products → **Import CSV** with these columns:

```
title,slug,description,price,compare_at_price,currency,stock,is_featured,is_active
Wireless Headphones,wireless-headphones,Great sound quality,129.99,199.99,USD,50,true,true
```

---

## Currency

Users can select from 30+ major world currencies in the navbar or account settings. Prices are converted using approximate exchange rates. For production, swap `EXCHANGE_RATES` in `src/lib/products.ts` with a live rates API.

---

## Project Structure

```
src/
├── components/
│   ├── nexcart/       # App-specific components
│   │   ├── Logo.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartDrawer.tsx
│   │   └── CurrencySelector.tsx
│   └── ui/            # Base UI primitives
├── contexts/
│   └── CurrencyContext.tsx
├── hooks/
│   └── use-auth.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── products.ts    # Types, formatPrice, currencies
│   ├── cart.ts        # Zustand cart store
│   └── utils.ts
├── routes/
│   ├── __root.tsx
│   ├── index.tsx      # Homepage
│   ├── shop.tsx
│   ├── auth.tsx
│   ├── account.tsx
│   ├── checkout.tsx
│   ├── admin.tsx      # Admin layout
│   ├── admin/
│   │   ├── index.tsx  # Dashboard
│   │   ├── products.tsx
│   │   ├── orders.tsx
│   │   └── users.tsx
│   └── products/
│       └── $slug.tsx
├── main.tsx
└── styles.css
```
