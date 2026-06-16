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
import AccountLayout from "@/pages/account/Layout";
import AccountHub from "@/pages/account/Hub";
import AccountProfile from "@/pages/account/Profile";
import AccountOrders from "@/pages/account/Orders";
import AccountWishlist from "@/pages/account/Wishlist";
import AccountAddresses from "@/pages/account/Addresses";
import AccountSettings from "@/pages/account/Settings";
import WishlistPage from "@/pages/Wishlist";
import AdminLayout from "@/pages/admin/Layout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProducts from "@/pages/admin/Products";
import AdminOrders from "@/pages/admin/Orders";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";
import AdminSellers from "@/pages/admin/Sellers";
import AdminWithdrawals from "@/pages/admin/Withdrawals";
import SellerLayout from "@/pages/seller/Layout";
import SellerDashboard from "@/pages/seller/Dashboard";
import SellerProducts from "@/pages/seller/Products";
import SellerOrders from "@/pages/seller/Orders";
import SellerEarnings from "@/pages/seller/Earnings";
import SellerWithdrawals from "@/pages/seller/Withdrawals";
import SellerReviews from "@/pages/seller/Reviews";
import SellerSettings from "@/pages/seller/Settings";
import SellerNotifications from "@/pages/seller/Notifications";
import BecomeSellerPage from "@/pages/BecomeSeller";
import OrderSuccessPage from "@/pages/OrderSuccess";
import StorePage from "@/pages/Store";
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

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wishlist",
  component: WishlistPage,
});

const becomeSellerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/become-seller",
  component: BecomeSellerPage,
});

// Alias: /sell-on-nexcart → same page as /become-seller
const sellOnNexcartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sell-on-nexcart",
  component: BecomeSellerPage,
});

// Alias: /seller/dashboard → redirect to /seller (index)
const sellerDashboardAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/dashboard",
  component: () => {
    const navigate = useNavigate();
    useEffect(() => { void navigate({ to: "/seller" }); }, []);
    return null;
  },
});

const orderSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/order-success",
  component: OrderSuccessPage,
});

const storeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/store/$sellerId",
  component: StorePage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountLayout,
});

const accountIndexRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/",
  component: AccountHub,
});

const accountProfileRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/profile",
  component: AccountProfile,
});

const accountOrdersRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/orders",
  component: AccountOrders,
});

const accountWishlistRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/wishlist",
  component: AccountWishlist,
});

const accountAddressesRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/addresses",
  component: AccountAddresses,
});

const accountSettingsRoute = createRoute({
  getParentRoute: () => accountRoute,
  path: "/settings",
  component: AccountSettings,
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

const adminSellersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/sellers",
  component: AdminSellers,
});

const adminWithdrawalsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/withdrawals",
  component: AdminWithdrawals,
});

const sellerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller",
  component: SellerLayout,
});

const sellerIndexRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/",
  component: SellerDashboard,
});

const sellerProductsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/products",
  component: SellerProducts,
});

const sellerOrdersRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/orders",
  component: SellerOrders,
});

const sellerEarningsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/earnings",
  component: SellerEarnings,
});

const sellerWithdrawalsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/withdrawals",
  component: SellerWithdrawals,
});

const sellerReviewsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/reviews",
  component: SellerReviews,
});

const sellerSettingsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/settings",
  component: SellerSettings,
});

const sellerNotificationsRoute = createRoute({
  getParentRoute: () => sellerRoute,
  path: "/notifications",
  component: SellerNotifications,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  shopRoute,
  productDetailRoute,
  checkoutRoute,
  authRoute,
  wishlistRoute,
  becomeSellerRoute,
  sellOnNexcartRoute,
  sellerDashboardAliasRoute,
  orderSuccessRoute,
  storeRoute,
  accountRoute.addChildren([
    accountIndexRoute,
    accountProfileRoute,
    accountOrdersRoute,
    accountWishlistRoute,
    accountAddressesRoute,
    accountSettingsRoute,
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminProductsRoute,
    adminOrdersRoute,
    adminUsersRoute,
    adminSettingsRoute,
    adminSellersRoute,
    adminWithdrawalsRoute,
  ]),
  sellerRoute.addChildren([
    sellerIndexRoute,
    sellerProductsRoute,
    sellerOrdersRoute,
    sellerEarningsRoute,
    sellerWithdrawalsRoute,
    sellerReviewsRoute,
    sellerSettingsRoute,
    sellerNotificationsRoute,
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
