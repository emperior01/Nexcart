import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Search, ShoppingCart, User, LogIn, Menu, Home, Store,
  LogOut, X, ShoppingBag, Heart, MapPin, Settings, LayoutDashboard,
  TrendingUp, ChevronRight, Phone,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  announcementText?: string;
}

const navLinks = [
  { to: "/",     label: "Home",  icon: Home },
  { to: "/shop", label: "Shop",  icon: Store },
] as const;

const accountMenuItems = [
  { label: "My Profile",  icon: User,        to: "/account/profile"   },
  { label: "My Orders",   icon: ShoppingBag, to: "/account/orders"    },
  { label: "Wishlist",    icon: Heart,       to: "/account/wishlist"  },
  { label: "Addresses",   icon: MapPin,      to: "/account/addresses" },
  { label: "Settings",    icon: Settings,    to: "/account/settings"  },
] as const;

const sectionLabel = (text: string) => (
  <div style={{ margin: "12px 14px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#9B9B9B" }}>
    {text}
  </div>
);

const menuItemStyle = (active: boolean) => ({
  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
  borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none",
  color: active ? "#E8611A" : "#3A3A3A",
  background: active ? "#FEF0E8" : "transparent",
} as const);

const iconWrap = (active = false, danger = false) => ({
  width: 30, height: 30, borderRadius: 8,
  background: danger ? "#FEE2E2" : active ? "rgba(232,97,26,0.15)" : "#F3F4F6",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 as const,
});

export function Navbar({ announcementText = "Fast delivery · Secure encrypted checkout" }: NavbarProps) {
  const { user, loading } = useAuth();
  const { isSeller, isVerified, isActiveSeller, isLoading: sellerLoading } = useSeller();
  const { count, openCart, clearCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) => to === "/" ? pathname === "/" : pathname.startsWith(to);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        clearCart();
    setMenuOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") clearCart();
    setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    clearCart();
    clearCart();
    setMenuOpen(false);
    setMobileOpen(false);
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  const showSellerReady = !loading && !sellerLoading;
  const isVerifiedSeller = showSellerReady && !!user && isSeller && isVerified;
  const showBecomeSeller = showSellerReady && (!user || (!!user && !isSeller));

  return (
    <header className="sticky top-0 z-40 w-full">
      <div
        className="text-white text-center py-2.5 px-4 text-[13px] font-medium tracking-[0.02em]"
        style={{ background: "#0D0D0D" }}
      >
        {announcementText}
      </div>

      <div
        className="px-6 h-[60px] flex items-center justify-between"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #EFEFEF" }}
      >
        <div className="flex items-center">
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[#F4F4F4] mr-2"
            style={{ color: "#3A3A3A" }}
            aria-label="Menu"
            onClick={() => setMobileOpen(v => !v)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive(l.to) ? "#E8611A" : "#6B6B6B",
                  background: isActive(l.to) ? "#FEF0E8" : "transparent",
                }}
              >
                {l.label}
              </Link>
            ))}

            {showSellerReady && (
              isVerifiedSeller ? (
                <Link
                  to="/seller"
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                  style={{
                    color: isActive("/seller") ? "#E8611A" : "#6B6B6B",
                    background: isActive("/seller") ? "#FEF0E8" : "transparent",
                  }}
                >
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
                  Seller Dashboard
                </Link>
              ) : showBecomeSeller ? (
                <Link
                  to="/become-seller"
                  className="ml-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-px flex items-center gap-1.5"
                  style={{ background: "#E8611A", color: "#fff" }}
                >
                  <Store className="h-3.5 w-3.5" strokeWidth={2} />
                  Sell on Nexcart
                </Link>
              ) : null
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
            style={{ color: "#3A3A3A" }}
            aria-label="Search"
            onClick={() => void navigate({ to: "/shop" })}
          >
            <Search className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {loading ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
                style={{ color: menuOpen ? "#E8611A" : "#3A3A3A", background: menuOpen ? "#FEF0E8" : undefined }}
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                <User className="h-5 w-5" strokeWidth={1.8} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-[#F0F0F0] overflow-hidden z-50"
                  style={{ top: "calc(100% + 6px)" }}
                >
                  <div className="px-4 py-3 border-b border-[#F5F5F5]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                      >
                        {(user.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1A1A1A] truncate">{user.email}</p>
                        <p className="text-[11px] text-[#9B9B9B] mt-0.5">My Account</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5">
                    {accountMenuItems.map(({ label, icon: Icon, to }) => (
                      <Link
                        key={label}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#3A3A3A] hover:bg-[#F9F9F9] transition-colors"
                      >
                        <Icon className="h-4 w-4 text-[#9B9B9B] flex-shrink-0" strokeWidth={1.8} />
                        <span className="font-medium">{label}</span>
                      </Link>
                    ))}
                  </div>

                  {showSellerReady && (
                    <div className="border-t border-[#F5F5F5] py-1.5">
                      {isVerifiedSeller ? (
                        <Link
                          to="/seller"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[#FEF0E8]"
                          style={{ color: "#E8611A" }}
                        >
                          <TrendingUp className="h-4 w-4 flex-shrink-0" strokeWidth={1.8} />
                          <span className="font-semibold">Seller Dashboard</span>
                        </Link>
                      ) : (
                        <Link
                          to="/become-seller"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[#FEF0E8]"
                          style={{ color: "#E8611A" }}
                        >
                          <Store className="h-4 w-4 flex-shrink-0" strokeWidth={1.8} />
                          <span className="font-semibold">Become a Seller</span>
                        </Link>
                      )}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="border-t border-[#F5F5F5] py-1.5">
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[#FEF0E8]"
                        style={{ color: "#E8611A" }}
                      >
                        <LayoutDashboard className="h-4 w-4 flex-shrink-0" strokeWidth={1.8} />
                        <span className="font-semibold">Admin Dashboard</span>
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-[#F5F5F5] py-1.5">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors hover:bg-[#FFF5F5]"
                      style={{ color: "#EF4444" }}
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.8} />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors hover:bg-[#F4F4F4]"
              style={{ color: "#3A3A3A" }}
            >
              <LogIn className="h-4 w-4" strokeWidth={1.8} />
              Sign in
            </Link>
          )}

          <button
            onClick={openCart}
            aria-label="Cart"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4] relative"
            style={{ color: "#3A3A3A" }}
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={1.8} />
            {count > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: "#E8611A" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-white flex flex-col shadow-2xl">

            {/* Header */}
            <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Logo />
              <button onClick={() => setMobileOpen(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>

            <nav style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}>

              {/* SHOPPING */}
              {sectionLabel("Shopping")}

              <Link to="/" onClick={() => setMobileOpen(false)} style={menuItemStyle(isActive("/"))}>
                <span style={iconWrap(isActive("/"))}><Home style={{ width: 15, height: 15, color: isActive("/") ? "#E8611A" : "#6B6B6B" }} /></span>
                Home
              </Link>

              <Link to="/shop" onClick={() => setMobileOpen(false)} style={menuItemStyle(isActive("/shop"))}>
                <span style={iconWrap(isActive("/shop"))}><Store style={{ width: 15, height: 15, color: isActive("/shop") ? "#E8611A" : "#6B6B6B" }} /></span>
                Shop
              </Link>

              <Link to="/account/orders" onClick={() => setMobileOpen(false)} style={menuItemStyle(isActive("/account/orders"))}>
                <span style={iconWrap(isActive("/account/orders"))}><ShoppingBag style={{ width: 15, height: 15, color: isActive("/account/orders") ? "#E8611A" : "#6B6B6B" }} /></span>
                Orders
              </Link>

              <Link to="/account/wishlist" onClick={() => setMobileOpen(false)} style={menuItemStyle(isActive("/account/wishlist"))}>
                <span style={iconWrap(isActive("/account/wishlist"))}><Heart style={{ width: 15, height: 15, color: isActive("/account/wishlist") ? "#E8611A" : "#6B6B6B" }} /></span>
                Wishlist
              </Link>

              {/* SELLER — approved sellers only */}
              {showSellerReady && isActiveSeller && (
                <>
                  {sectionLabel("Seller")}
                  <Link
                    to="/seller/dashboard"
                    onClick={() => setMobileOpen(false)}
                    style={menuItemStyle(isActive("/seller"))}
                  >
                    <span style={iconWrap(isActive("/seller"))}><TrendingUp style={{ width: 15, height: 15, color: isActive("/seller") ? "#E8611A" : "#6B6B6B" }} /></span>
                    Seller Dashboard
                  </Link>
                </>
              )}

              {/* ACCOUNT */}
              {sectionLabel("Account")}

              {user ? (
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  style={{ ...menuItemStyle(isActive("/account")), justifyContent: "space-between" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={iconWrap(isActive("/account"))}><User style={{ width: 15, height: 15, color: isActive("/account") ? "#E8611A" : "#6B6B6B" }} /></span>
                    Account
                  </span>
                  <ChevronRight style={{ width: 15, height: 15, color: "#9B9B9B" }} />
                </Link>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "#E8611A", textDecoration: "none" }}
                >
                  <LogIn style={{ width: 16, height: 16 }} />
                  Sign In
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  style={menuItemStyle(isActive("/admin"))}
                >
                  <span style={iconWrap(isActive("/admin"))}><LayoutDashboard style={{ width: 15, height: 15, color: isActive("/admin") ? "#E8611A" : "#6B6B6B" }} /></span>
                  Admin Dashboard
                </Link>
              )}

              {/* SUPPORT */}
              {sectionLabel("Support")}

              <Link to="/contact" onClick={() => setMobileOpen(false)} style={menuItemStyle(isActive("/contact"))}>
                <span style={iconWrap(isActive("/contact"))}><Phone style={{ width: 15, height: 15, color: isActive("/contact") ? "#E8611A" : "#6B6B6B" }} /></span>
                Contact Us
              </Link>

              {/* SESSION */}
              {user && (
                <>
                  {sectionLabel("Session")}
                  <button
                    onClick={handleSignOut}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#EF4444", background: "transparent", border: "none", width: "100%", cursor: "pointer" }}
                  >
                    <span style={iconWrap(false, true)}><LogOut style={{ width: 15, height: 15, color: "#EF4444" }} /></span>
                    Logout
                  </button>
                </>
              )}

            </nav>
          </div>
        </>
      )}
    </header>
  );
}
