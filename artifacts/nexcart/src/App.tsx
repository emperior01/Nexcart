import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CartDrawer } from "@/components/nexcart/CartDrawer";
import IndexPage from "@/pages/Index";
import ShopPage from "@/pages/Shop";
import ProductDetailPage from "@/pages/ProductDetail";
import CheckoutPage from "@/pages/Checkout";
import AuthPage from "@/pages/Auth";
import AccountPage from "@/pages/Account";
import AdminLayout from "@/pages/admin/Layout";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={IndexPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/products/:slug" component={ProductDetailPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/admin" nest component={AdminLayout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}>
      <Router />
      <CartDrawer />
    </WouterRouter>
  );
}

export default App;
