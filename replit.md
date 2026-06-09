# Nexcart — Shop Smarter. Live Better.

A production-grade e-commerce storefront with full Supabase auth/DB integration, Paystack payments, TanStack React Query data fetching, Zustand cart, and an admin panel.

## Run & Operate

- `pnpm --filter @workspace/nexcart run dev` — run the storefront (reads `PORT` + `BASE_PATH` env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Environment Variables

Credentials go in `artifacts/nexcart/.env.local` — **never committed** (gitignored).

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

Find Supabase values in: Project → Settings → API.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind v4
- Routing: **TanStack Router v1** (code-based, `src/router.ts`)
- Data: TanStack React Query v5 + Supabase JS v2
- Auth: Supabase Auth
- Payments: Paystack (inline JS popup)
- Cart: Zustand v5 (persisted to localStorage)
- Admin: full CRUD for products, orders, users, settings
- Build: Vite (ESM)

## Where things live

```
artifacts/nexcart/src/
  router.ts               ← all routes defined here (TanStack Router code-based)
  main.tsx                ← providers + RouterProvider entry point
  pages/                  ← page components (Index, Shop, ProductDetail, Auth, Account, Checkout, not-found)
  pages/admin/            ← admin layout + Dashboard, Products, Orders, Users, Settings
  components/nexcart/     ← Navbar, Logo, ProductCard, CartDrawer, Footer, CurrencySelector
  integrations/supabase/  ← client.ts + types.ts (generated from Supabase)
  lib/                    ← cart.ts (Zustand), products.ts (helpers), site-settings.ts
  contexts/               ← CurrencyContext
  hooks/                  ← use-auth.ts
```

## Architecture decisions

- **TanStack Router code-based API** (`createRootRoute`, `createRoute`, `createRouter`) — no Vite plugin or `routeTree.gen.ts` needed; all routes explicit in `src/router.ts`
- **Admin protected by `user_roles` table** — route checks if `role = 'admin'` exists in Supabase before rendering
- **Supabase client graceful fallback** — uses placeholder URL if env vars not set so app renders without crashing during dev setup
- **Paystack inline popup** — script lazy-loaded on checkout, no server-side required for payment init
- **CartDrawer in root route** — rendered at `RootComponent` level so it persists across all page navigations

## Product

- Public storefront: home, shop (filter/search/paginate), product detail, cart drawer
- Auth: sign-up, sign-in, forgot password
- Checkout: Paystack payment popup → order creation via Supabase Edge Function `verify-payment`
- Account: order history, profile settings, currency preference
- Admin panel (`/admin`): product CRUD (+ CSV import), order management, user list, homepage settings

## User preferences

- Do NOT use wouter or any simplified router — always TanStack Router
- Do NOT simplify project architecture
- Credentials/secrets always in `.env.local`, never hardcoded
- Confirm before structural changes

## Gotchas

- `.env.local` must be in `artifacts/nexcart/` (Vite loads it from the project root)
- TanStack Router `navigate()` returns a Promise — use `void navigate({to: '/path'})` in event handlers
- Admin routes use nested TanStack Router layout: `adminRoute.addChildren([...])`
- `searchStr` from `useRouterState` includes the leading `?` — `new URLSearchParams(searchStr)` handles this correctly
