import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,
  Star, Settings, Bell, LogOut, Home, Menu, X, ShieldCheck, Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";

const navItems = [
  { to: "",               label: "Dashboard",      icon: LayoutDashboard },
  { to: "/products",      label: "Products",       icon: Package },
  { to: "/orders",        label: "Orders",         icon: ShoppingBag },
  { to: "/earnings",      label: "Earnings",       icon: TrendingUp },
  { to: "/withdrawals",   label: "Withdrawals",    icon: Wallet },
  { to: "/reviews",       label: "Reviews",        icon: Star },
  { to: "/settings",      label: "Store Settings", icon: Settings },
  { to: "/notifications", label: "Notifications",  icon: Bell },
] as const;

function StatusPill({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        background: "#D1FAE5", color: "#065F46",
        padding: "3px 8px", borderRadius: 50,
        border: "1px solid #A7F3D0",
        display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        <ShieldCheck style={{ width: 9, height: 9 }} /> Verified
      </span>
    );
  }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      background: "#FEF3C7", color: "#92400E",
      padding: "3px 8px", borderRadius: 50,
      border: "1px solid #FDE68A",
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      Basic
    </span>
  );
}

function SidebarContent({
  onClose, signOut, storeName, sellerStatus, sellerId,
}: {
  onClose: () => void;
  signOut: () => void;
  storeName: string;
  sellerStatus: string;
  sellerId: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerified = sellerStatus === "verified";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#E8611A", letterSpacing: "-0.03em" }}>
            Nexcart
          </span>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            background: "rgba(232,97,26,0.12)", color: "#E8611A",
            padding: "3px 8px", borderRadius: 50,
            border: "1px solid rgba(232,97,26,0.25)",
          }}>
            Seller
          </span>
        </div>
        <p style={{
          fontSize: 12, color: "#6B7280", fontWeight: 500,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const, marginBottom: 6,
        }}>
          {storeName}
        </p>
        <StatusPill status={sellerStatus} />
      </div>

      {/* Nav links */}
      <nav style={{
        flex: 1, padding: "12px 10px",
        display: "flex", flexDirection: "column", gap: 2,
        overflowY: "auto" as const,
      }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/seller" + to;
          const isActive = to === ""
            ? pathname === "/seller" || pathname === "/seller/"
            : pathname.startsWith("/seller" + to);
          const isWithdrawals = to === "/withdrawals";
          const locked = isWithdrawals && !isVerified;

          return (
            <Link
              key={to}
              to={locked ? "/seller" : fullPath}
              onClick={locked ? (e) => { e.preventDefault(); } : onClose}
              title={locked ? "Only Verified sellers can request withdrawals" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                transition: "background 0.15s",
                color: isActive ? "#E8611A" : locked ? "#C4C4C4" : "#6B7280",
                background: isActive ? "rgba(232,97,26,0.10)" : "transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.6 : 1,
              }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {locked && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: "#FEF3C7", color: "#92400E",
                  padding: "2px 6px", borderRadius: 50,
                  whiteSpace: "nowrap" as const,
                }}>
                  Verified only
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #EBEBEB", display: "flex", flexDirection: "column", gap: 4 }}>
        {/* View My Store */}
        <Link
          to="/store/$sellerId"
          params={{ sellerId }}
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 700,
            color: "#E8611A", textDecoration: "none",
            background: "rgba(232,97,26,0.08)",
          }}
        >
          <Store style={{ width: 16, height: 16 }} />
          View My Store
        </Link>

        {/* Storefront (homepage) */}
        <Link
          to="/"
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            color: "#6B7280", textDecoration: "none",
          }}
        >
          <Home style={{ width: 16, height: 16 }} />
          Storefront
        </Link>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: "#6B7280",
            background: "none", border: "none", cursor: "pointer",
            width: "100%", textAlign: "left" as const,
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Sign Out
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
    const status = seller.verification_status as string;
    if (status === "suspended" || status === "rejected") {
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Redirect is already firing in the useEffect above.
  // Render nothing while it resolves to prevent the seller layout
  // from flashing on top of other pages (e.g. /account).
  if (!user || !seller) return null;

  const storeName = seller?.store_name ?? "My Store";
  const sellerStatus = (seller?.verification_status as string) ?? "basic";
  const sellerId = seller?.id ?? "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Responsive styles */}
      <style>{`
        .seller-sidebar-desktop { display: flex; }
        .seller-mobile-header   { display: none; }
        @media (max-width: 767px) {
          .seller-sidebar-desktop { display: none !important; }
          .seller-mobile-header   { display: flex !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside
        className="seller-sidebar-desktop"
        style={{
          width: 224, background: "#FFFFFF",
          borderRight: "1px solid #EBEBEB",
          flexShrink: 0, flexDirection: "column",
        }}
      >
        <SidebarContent
          onClose={() => {}}
          signOut={signOut}
          storeName={storeName}
          sellerStatus={sellerStatus}
          sellerId={sellerId}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            position: "fixed", left: 0, top: 0, bottom: 0, width: 260,
            background: "#FFFFFF", borderRight: "1px solid #EBEBEB",
            zIndex: 50, display: "flex", flexDirection: "column",
          }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "absolute", top: 16, right: 16,
                width: 32, height: 32, background: "#F3F4F6",
                border: "none", borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X style={{ width: 16, height: 16, color: "#6B7280" }} />
            </button>
            <SidebarContent
              onClose={() => setSidebarOpen(false)}
              signOut={signOut}
              storeName={storeName}
              sellerStatus={sellerStatus}
              sellerId={sellerId}
            />
          </aside>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Mobile header */}
        <div
          className="seller-mobile-header"
          style={{
            alignItems: "center", gap: 12,
            padding: "12px 16px", background: "#FFFFFF",
            borderBottom: "1px solid #EBEBEB",
            position: "sticky", top: 0, zIndex: 30,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 36, height: 36, background: "#F3F4F6",
              border: "none", borderRadius: 8, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Menu style={{ width: 18, height: 18, color: "#3A3A3A" }} />
          </button>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#E8611A" }}>
            Seller Dashboard
          </span>
          <div style={{ marginLeft: "auto" }}>
            <StatusPill status={sellerStatus} />
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
