import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { createElement } from "react";
import { CartDrawer } from "@/components/nexcart/CartDrawer";
import IndexPage from "@/pages/Index";
import ShopPage from "@/pages/Shop";
import ProductDetailPage from "@/pages/ProductDetail";
import CheckoutPage from "@/pages/Checkout";
import AuthPage from "@/pages/Auth";
import AccountPage from "@/pages/Account";
import WishlistPage from "@/pages/Wishlist";
import AdminLayout from "@/pages/admin/Layout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminOrders from "@/pages/admin/Orders";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";
import NotFound from "@/pages/not-found";

function RootComponent() {
  return createElement(
    "div",
    null,
    createElement(Outlet, null),
    createElement(CartDrawer, null),
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

const shopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shop",
  component: ShopPage,
});

const productDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/products/$slug",
  component: ProductDetailPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: CheckoutPage,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
});

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wishlist",
  component: WishlistPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: AdminDashboard,
});

const adminProductsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/products",
  component: AdminProducts,
});

const adminOrdersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/orders",
  component: AdminOrders,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: AdminUsers,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: AdminSettings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  shopRoute,
  productDetailRoute,
  checkoutRoute,
  authRoute,
  accountRoute,
  wishlistRoute,
  adminRoute.addChildren([
    adminIndexRoute,
    adminProductsRoute,
    adminOrdersRoute,
    adminUsersRoute,
    adminSettingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
