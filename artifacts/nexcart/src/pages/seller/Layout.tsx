import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,
  Star, Settings, Bell, LogOut, Home, Store, Menu, X, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";

const navItems = [
  { to: "",              label: "Dashboard",      icon: LayoutDashboard },
  { to: "/products",     label: "Products",       icon: Package },
  { to: "/orders",       label: "Orders",         icon: ShoppingBag },
  { to: "/earnings",     label: "Earnings",       icon: TrendingUp },
  { to: "/withdrawals",  label: "Withdrawals",    icon: Wallet },
  { to: "/reviews",      label: "Reviews",        icon: Star },
  { to: "/settings",     label: "Store Settings", icon: Settings },
  { to: "/notifications",label: "Notifications",  icon: Bell },
] as const;

function SidebarContent({ onClose, signOut, storeName }: { onClose: () => void; signOut: () => void; storeName: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(232,97,26,0.12)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.25)" }}>Seller</span>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{storeName}</p>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" as const }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/seller" + to;
          const isActive = to === "" ? pathname === "/seller" || pathname === "/seller/" : pathname.startsWith("/seller" + to);
          return (
            <Link
              key={to}
              to={fullPath}
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                transition: "background 0.15s",
                color: isActive ? "#E8611A" : "#6B7280",
                background: isActive ? "rgba(232,97,26,0.10)" : "transparent",
              }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 10px", borderTop: "1px solid #EBEBEB", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link
          to="/"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", textDecoration: "none" }}
        >
          <Home style={{ width: 16, height: 16 }} /> Storefront
        </Link>
        <button
          onClick={signOut}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" as const }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function SellerLayout() {
  const { user, loading: authLoading } = useAuth();
  const { seller, isLoading: sellerLoading } = useSeller();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading || sellerLoading) return;
    if (!user) { void navigate({ to: "/auth" }); return; }
    if (!seller) { void navigate({ to: "/become-seller" }); return; }
    if (seller.verification_status === "pending") {
      void navigate({ to: "/become-seller" });
    }
    if (seller.verification_status === "rejected" || seller.verification_status === "suspended") {
      void navigate({ to: "/" });
    }
  }, [user, seller, authLoading, sellerLoading, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (authLoading || sellerLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const storeName = seller?.store_name ?? "My Store";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Desktop sidebar */}
      <aside style={{ width: 224, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", flexShrink: 0, display: "flex", flexDirection: "column" }} className="hidden md:flex">
        <SidebarContent onClose={() => {}} signOut={signOut} storeName={storeName} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
          <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 248, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", zIndex: 50, display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, background: "#F3F4F6", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 14, height: 14, color: "#6B7280" }} />
            </button>
            <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} storeName={storeName} />
          </aside>
        </>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", borderBottom: "1px solid #EBEBEB" }} className="flex md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, background: "#F3F4F6", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu style={{ width: 18, height: 18, color: "#3A3A3A" }} />
          </button>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#E8611A" }}>Seller Dashboard</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
