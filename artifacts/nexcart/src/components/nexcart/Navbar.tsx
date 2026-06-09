import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Search, ShoppingCart, User, LogIn, Menu, Home, Store, LogOut, X } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  announcementText?: string;
}

const navLinks = [
  { to: "/",     label: "Home",  icon: Home },
  { to: "/shop", label: "Shop",  icon: Store },
];

export function Navbar({ announcementText = "Fast delivery · Secure encrypted checkout" }: NavbarProps) {
  const { user, loading } = useAuth();
  const { count, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, navigate] = useLocation();

  const isActive = (to: string) => to === "/" ? location === "/" : location.startsWith(to);

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
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
            style={{ color: "#3A3A3A" }}
            aria-label="Search"
            onClick={() => navigate("/shop")}
          >
            <Search className="h-5 w-5" strokeWidth={1.8} />
          </button>

          {loading ? null : user ? (
            <Link
              to="/account"
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
              style={{ color: "#3A3A3A" }}
              aria-label="Account"
            >
              <User className="h-5 w-5" strokeWidth={1.8} />
            </Link>
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

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[#F4F4F4]"
            style={{ color: "#3A3A3A" }}
            aria-label="Menu"
            onClick={() => setMobileOpen(v => !v)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-40 w-72 bg-white flex flex-col shadow-2xl">
            <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
              <button onClick={() => setMobileOpen(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>

            <nav style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              {navLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none",
                    color: isActive(l.to) ? "#E8611A" : "#3A3A3A",
                    background: isActive(l.to) ? "#FEF0E8" : "transparent",
                  }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <l.icon style={{ width: 16, height: 16 }} />
                  </span>
                  {l.label}
                </Link>
              ))}

              {user && (
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#3A3A3A", textDecoration: "none" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User style={{ width: 16, height: 16 }} />
                  </span>
                  My Account
                </Link>
              )}
            </nav>

            <div style={{ padding: "12px", borderTop: "1px solid #F3F4F6" }}>
              {user ? (
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    await supabase.auth.signOut();
                    navigate("/");
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "#EF4444", background: "#FEF2F2", border: "none", width: "100%", cursor: "pointer" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LogOut style={{ width: 16, height: 16 }} />
                  </span>
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", background: "#E8611A", textDecoration: "none" }}
                >
                  <LogIn style={{ width: 16, height: 16 }} />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
