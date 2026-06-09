---
name: TanStack Router code-based setup
description: How TanStack Router is wired in this project — code-based API, no Vite plugin
---

## Rule
Use TanStack Router's code-based API (`createRootRoute`, `createRoute`, `createRouter`). All routes live in `artifacts/nexcart/src/router.ts`. No `@tanstack/router-plugin`, no `routeTree.gen.ts`.

**Why:** The Vite plugin creates a chicken-and-egg problem (main.tsx can't import routeTree.gen.ts until the plugin runs once). Code-based routing avoids this entirely and is equally production-grade.

**How to apply:**
- Add routes in `src/router.ts` using `createRoute({ getParentRoute, path, component })`
- Nested layouts: `parentRoute.addChildren([childRoute, ...])`
- In components: `import { Link, useNavigate, useRouterState, useParams, Outlet } from "@tanstack/react-router"`
- Navigate: `void navigate({ to: "/path" })` (returns Promise — void in event handlers)
- Current path: `useRouterState({ select: s => s.location.pathname })`
- Search string: `useRouterState({ select: s => s.location.searchStr })` — includes leading `?`
- Dynamic params: `useParams({ strict: false })` for loose access
- Register router type for typed `Link to` prop: `declare module "@tanstack/react-router" { interface Register { router: typeof router } }`
