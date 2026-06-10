import { useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { User, Package, Heart, MapPin, Settings, LogOut, LayoutDashboard, ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/account/profile",   label: "My Profile",  icon: User },
  { to: "/account/orders",    label: "My Orders",   icon: Package },
  { to: "/account/wishlist",  label: "Wishlist",    icon: Heart },
  { to: "/account/addresses", label: "Addresses",   icon: MapPin },
  { to: "/account/settings",  label: "Settings",    icon: Settings },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/account/profile":   "My Profile",
  "/account/orders":    "My Orders",
  "/account/wishlist":  "Wishlist",
  "/account/addresses": "Addresses",
  "/account/settings":  "Settings",
};

export default function AccountLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  const isOnSubRoute = pathname !== "/account" && pathname !== "/account/";
  const currentTitle = PAGE_TITLES[pathname] ?? "Account";
  const initials = ((user?.email ?? "?")[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <Navbar />

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
              {/* User identity */}
              <div className="px-4 py-4 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{user?.email}</p>
                    <p className="text-[11px] text-[#9B9B9B] mt-0.5">My Account</p>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="p-2">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to || pathname.startsWith(to + "/");
                  return (
                    <Link
                      key={to}
                      to={to}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                        transition: "background 0.12s",
                        color: active ? "#E8611A" : "#6B7280",
                        background: active ? "rgba(232,97,26,0.08)" : "transparent",
                      }}
                    >
                      <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer links */}
              <div className="p-2 border-t border-[#F0F0F0]">
                {isAdmin && (
                  <Link
                    to="/admin"
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                      color: "#E8611A", background: "transparent",
                    }}
                  >
                    <LayoutDashboard style={{ width: 15, height: 15, flexShrink: 0 }} />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={signOut}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#EF4444",
                    background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                  }}
                >
                  <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
                  Sign Out
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile back navigation (shown on sub-routes) */}
            {isOnSubRoute && (
              <div className="md:hidden flex items-center gap-3 mb-4 px-1">
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#E8611A] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Account
                </Link>
                <span className="text-[#D1D5DB]">/</span>
                <span className="text-sm font-semibold text-[#0D0D0D]">{currentTitle}</span>
              </div>
            )}

            <Outlet />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
