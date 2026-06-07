import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingCart, User, LogIn, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";

interface NavbarProps {
  announcementText?: string;
}

const navLinks = [
  { to: "/",     label: "Home" },
  { to: "/shop", label: "Shop" },
] as const;

export function Navbar({ announcementText = "Fast delivery · Secure encrypted checkout" }: NavbarProps) {
  const { user, loading } = useAuth();
  const { count, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement bar */}
      <div
        className="text-white text-center py-2.5 px-4 text-[13px] font-medium tracking-[0.02em]"
        style={{ background: "#0D0D0D" }}
      >
        {announcementText}
      </div>

      {/* Main nav */}
      <div
        className="px-6 h-[60px] flex items-center justify-between"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #EFEFEF" }}
      >
        <div className="flex items-center">
          <Logo />
          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "#6B6B6B" }}
                activeProps={{ style: { color: "#E8611A", background: "#FEF0E8" } }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right icons — NO admin pill */}
        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
            style={{ color: "#3A3A3A" }}
            aria-label="Search"
            onClick={() => navigate({ to: "/shop" })}
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

          {/* Cart */}
          <button
            onClick={openCart}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4] relative"
            style={{ color: "#3A3A3A" }}
            aria-label="Cart"
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

          {/* Mobile menu */}
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

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden fixed top-[96px] left-0 right-0 z-40 bg-white border-b border-[#EFEFEF] shadow-lg px-6 py-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ color: "#3A3A3A" }}
              activeProps={{ style: { color: "#E8611A", background: "#FEF0E8" } }}
            >
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link to="/auth" onClick={() => setMobileOpen(false)}
              className="mt-2 px-4 py-3 rounded-xl text-sm font-semibold text-white text-center"
              style={{ background: "#E8611A" }}>
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
