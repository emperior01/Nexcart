import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,
  Star, Settings, Bell, LogOut, Home, Menu, X, ShieldCheck, Store, ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";
import { Logo } from "@/components/nexcart/Logo";

type VerifStatus = "not_started" | "documents_submitted" | "under_review" | "verified" | "rejected";

const navItems = [
  { to: "",               label: "Dashboard",      icon: LayoutDashboard },
  { to: "/products",      label: "Products",       icon: Package },
  { to: "/orders",        label: "Orders",         icon: ShoppingBag },
  { to: "/earnings",      label: "Earnings",       icon: TrendingUp },
  { to: "/withdrawals",   label: "Withdrawals",    icon: Wallet },
  { to: "/reviews",       label: "Reviews",        icon: Star },
  { to: "/verification",  label: "Verification",   icon: ShieldAlert },
  { to: "/settings",      label: "Store Settings", icon: Settings },
  { to: "/notifications", label: "Notifications",  icon: Bell },
] as const;

function StatusPill({ sellerStatus, verifStatus }: { sellerStatus: string; verifStatus: VerifStatus }) {
  // Verified via verifications table takes priority
  if (verifStatus === "verified" || sellerStatus === "verified") {
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
  if (verifStatus === "under_review" || verifStatus === "documents_submitted") {
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        background: "#DBEAFE", color: "#1E40AF",
        padding: "3px 8px", borderRadius: 50,
        border: "1px solid #BFDBFE",
        display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        <ShieldAlert style={{ width: 9, height: 9 }} /> Under Review
      </span>
    );
  }
  // Basic / not_started / rejected
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
  onClose, signOut, storeName, sellerStatus, verifStatus, sellerId, unreadCount,
}: {
  onClose: () => void;
  signOut: () => void;
  storeName: string;
  sellerStatus: string;
  verifStatus: VerifStatus;
  sellerId: string;
  unreadCount: number;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerified = sellerStatus === "verified" || verifStatus === "verified";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <div style={{
        padding: "20px 18px 16px",
        borderBottom: "1px solid #F3F4F6",
        background: "linear-gradient(135deg, #fff 0%, #FFF8F5 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Logo height={48} />
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#9CA3AF",
          }}>
            Seller Hub
          </span>
        </div>

        {/* Store info card */}
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 10,
          padding: "10px 12px",
        }}>
          <p style={{
            fontSize: 12, color: "#0D0D0D", fontWeight: 700,
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const, marginBottom: 5,
          }}>
            {storeName}
          </p>
          <StatusPill sellerStatus={sellerStatus} verifStatus={verifStatus} />
        </div>
      </div>

      {/* Nav links */}
      <nav style={{
        flex: 1, padding: "10px 10px",
        display: "flex", flexDirection: "column", gap: 1,
        overflowY: "auto" as const,
      }}>
        <p style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase" as const, color: "#D1D5DB",
          padding: "8px 10px 4px",
        }}>
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/seller" + to;
          const isActive = to === ""
            ? pathname === "/seller" || pathname === "/seller/"
            : pathname.startsWith("/seller" + to);
          const isWithdrawals = to === "/withdrawals";
          const isNotifications = to === "/notifications";
          const locked = isWithdrawals && !isVerified;

          return (
            <Link
              key={to}
              to={locked ? "/seller" : fullPath}
              onClick={locked ? (e) => { e.preventDefault(); } : onClose}
              title={locked ? "Only Verified sellers can request withdrawals" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                textDecoration: "none",
                transition: "all 0.15s",
                color: isActive ? "#E8611A" : locked ? "#D1D5DB" : "#4B5563",
                background: isActive
                  ? "linear-gradient(135deg, rgba(232,97,26,0.12), rgba(232,97,26,0.06))"
                  : "transparent",
                borderLeft: isActive ? "3px solid #E8611A" : "3px solid transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.5 : 1,
                position: "relative" as const,
              }}
            >
              <Icon style={{
                width: 16, height: 16, flexShrink: 0,
                color: isActive ? "#E8611A" : locked ? "#D1D5DB" : "#6B7280",
              }} />
              <span style={{ flex: 1 }}>{label}</span>

              {/* Notification badge */}
              {isNotifications && unreadCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 50,
                  background: "#E8611A", color: "#fff",
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}

              {locked && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: "#FEF3C7", color: "#92400E",
                  padding: "2px 6px", borderRadius: 50,
                  whiteSpace: "nowrap" as const,
                  border: "1px solid #FDE68A",
                }}>
                  Verified only
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: "10px 10px 14px",
        borderTop: "1px solid #F3F4F6",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        <p style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
          textTransform: "uppercase" as const, color: "#D1D5DB",
          padding: "4px 10px 4px",
        }}>
          Quick Links
        </p>

        {/* View My Store */}
        <Link
          to="/store/$sellerId"
          params={{ sellerId }}
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            color: "#E8611A", textDecoration: "none",
            background: "rgba(232,97,26,0.07)",
            borderLeft: "3px solid transparent",
            transition: "background 0.15s",
          }}
        >
          <Store style={{ width: 16, height: 16 }} />
          View My Store
        </Link>

        {/* Storefront */}
        <Link
          to="/"
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            color: "#6B7280", textDecoration: "none",
            borderLeft: "3px solid transparent",
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
            padding: "9px 12px", borderRadius: 10,
            fontSize: 13, fontWeight: 500, color: "#9CA3AF",
            background: "none", border: "none", cursor: "pointer",
            width: "100%", textAlign: "left" as const,
            borderLeft: "3px solid transparent",
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Fetch unread notification count for badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["seller-unread-count", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return 0;
      const { count } = await supabase
        .from("seller_notifications")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id)
        .eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  // Fetch verification status from seller_verifications table
  const { data: verifRow } = useQuery({
    queryKey: ["seller-verification", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return null;
      const { data } = await (supabase as any)
        .from("seller_verifications")
        .select("status")
        .eq("seller_id", seller.id)
        .maybeSingle();
      return data as { status: VerifStatus } | null;
    },
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (authLoading || sellerLoading) return;
    if (!user) { void navigate({ to: "/auth" }); return; }
    if (!seller) { void navigate({ to: "/become-seller" }); return; }
    const status = seller.verification_status as string;
    if (status === "suspended") {
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
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>Loading dashboard…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || !seller) return null;

  const storeName = seller?.store_name ?? "My Store";
  const sellerStatus = (seller?.verification_status as string) ?? "basic";
  const verifStatus: VerifStatus = (verifRow?.status as VerifStatus) ?? "not_started";
  const sellerId = seller?.id ?? "";

  const sidebarProps = {
    onClose: () => setSidebarOpen(false),
    signOut,
    storeName,
    sellerStatus,
    verifStatus,
    sellerId,
    unreadCount: unreadCount as number,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .seller-sidebar-desktop { display: flex; }
        .seller-mobile-header   { display: none; }
        @media (max-width: 1023px) {
          .seller-sidebar-desktop { display: none !important; }
          .seller-mobile-header   { display: flex !important; }
        }
        .seller-nav-link:hover { background: rgba(232,97,26,0.05) !important; }
      `}</style>

      {/* Desktop sidebar */}
      <aside
        className="seller-sidebar-desktop"
        style={{
          width: 232, background: "#FFFFFF",
          borderRight: "1px solid #F3F4F6",
          flexShrink: 0, flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
          overflowY: "auto",
        }}
      >
        <SidebarContent {...sidebarProps} onClose={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40, backdropFilter: "blur(2px)",
            }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{
            position: "fixed", left: 0, top: 0, bottom: 0, width: 272,
            background: "#FFFFFF", borderRight: "1px solid #F3F4F6",
            zIndex: 50, display: "flex", flexDirection: "column",
            animation: "slideIn 0.22s ease-out",
            overflowY: "auto",
          }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "absolute", top: 14, right: 14,
                width: 30, height: 30, background: "#F3F4F6",
                border: "none", borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}
            >
              <X style={{ width: 14, height: 14, color: "#6B7280" }} />
            </button>
            <SidebarContent {...sidebarProps} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Mobile header */}
        <div
          className="seller-mobile-header"
          style={{
            alignItems: "center", gap: 10,
            padding: "10px 14px", background: "#FFFFFF",
            borderBottom: "1px solid #F3F4F6",
            position: "sticky", top: 0, zIndex: 30,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 38, height: 38, background: "#F3F4F6",
              border: "none", borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Menu style={{ width: 18, height: 18, color: "#3A3A3A" }} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Logo height={40} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9CA3AF" }}>
              Seller
            </span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <StatusPill sellerStatus={sellerStatus} verifStatus={verifStatus} />
            {/* Bell with badge on mobile */}
            <Link
              to="/seller/notifications"
              style={{ position: "relative", display: "flex", alignItems: "center", color: "#6B7280", textDecoration: "none" }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: "#F3F4F6",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell style={{ width: 16, height: 16 }} />
              </div>
              {(unreadCount as number) > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#E8611A", color: "#fff",
                  fontSize: 9, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid #fff",
                }}>
                  {(unreadCount as number) > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
