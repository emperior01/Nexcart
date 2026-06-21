import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Package, Tags, ShoppingBag, Users, LogOut, Home, Settings, Menu, X, Store, Wallet, CreditCard, ShieldAlert, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/nexcart/Logo";

const navItems = [
  { to: "",             label: "Dashboard",         icon: LayoutDashboard },
  { to: "/products",    label: "Products",          icon: Package },
  { to: "/categories",  label: "Categories",        icon: Tags },
  { to: "/orders",      label: "Orders",            icon: ShoppingBag },
  { to: "/users",       label: "Users",             icon: Users },
  { to: "/sellers",     label: "Sellers",           icon: Store },
  { to: "/marketplace/sellers", label: "Marketplace", icon: TrendingUp },
  { to: "/verifications",label: "Verifications",     icon: ShieldAlert },
  { to: "/withdrawals", label: "Withdrawals",       icon: Wallet },
  { to: "/payments",    label: "Payment Settings",  icon: CreditCard },
  { to: "/settings",    label: "Homepage Settings", icon: Settings },
] as const;

function SidebarContent({
  onClose,
  signOut,
  pendingSellers,
  pendingVerifications,
}: {
  onClose: () => void;
  signOut: () => void;
  pendingSellers: number;
  pendingVerifications: number;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Logo height={34} showTagline={false} />
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(232,97,26,0.12)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.25)" }}>Admin</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: "#E8611A",
        }}>
          Shop the future
        </span>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" as const }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/admin" + to;
          const isActive = to === "" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith("/admin" + to);
          const badge = (to === "/sellers" && pendingSellers > 0) ? pendingSellers
                       : (to === "/verifications" && pendingVerifications > 0) ? pendingVerifications
                       : 0;
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
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 50,
                  background: "#E8611A", color: "#fff",
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 5px",
                }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
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

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { void navigate({ to: "/auth" }); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      if (!data) void navigate({ to: "/" });
    });
  }, [user, loading, navigate]);

  const { data: pendingSellers = 0 } = useQuery({
    queryKey: ["admin-pending-sellers-count"],
    enabled: !!user && !loading,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("sellers")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "basic");
      return count ?? 0;
    },
  });

  const { data: pendingVerifications = 0 } = useQuery({
    queryKey: ["admin-pending-verifications-count"],
    enabled: !!user && !loading,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("seller_verifications")
        .select("id", { count: "exact", head: true })
        .eq("status", "documents_submitted");
      return count ?? 0;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Responsive styles */}
      <style>{`
        .admin-sidebar-desktop { display: flex; }
        .admin-mobile-header   { display: none; }
        @media (max-width: 1023px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-header   { display: flex !important; }
        }
        /* Make all tables inside admin horizontally scrollable on mobile */
        .admin-content table {
          min-width: 600px;
        }
        .admin-content .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
        /* Prevent text overflow in admin content */
        .admin-content {
          min-width: 0;
          overflow-x: hidden;
        }
        /* Responsive cards stack on mobile */
        @media (max-width: 639px) {
          .admin-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .admin-content-padding {
            padding: 16px !important;
          }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside
        className="admin-sidebar-desktop"
        style={{ width: 220, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", flexShrink: 0, flexDirection: "column" }}
      >
        <SidebarContent onClose={() => {}} signOut={signOut} pendingSellers={pendingSellers} pendingVerifications={pendingVerifications} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", zIndex: 50, display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, background: "#F3F4F6", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 16, height: 16, color: "#6B7280" }} />
            </button>
            <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} pendingSellers={pendingSellers} pendingVerifications={pendingVerifications} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Mobile header */}
        <div
          className="admin-mobile-header"
          style={{ alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", borderBottom: "1px solid #EBEBEB", position: "sticky", top: 0, zIndex: 30 }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, background: "#F3F4F6", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Menu style={{ width: 18, height: 18, color: "#3A3A3A" }} />
          </button>
          <Logo height={32} showTagline={false} />
          {(pendingSellers + pendingVerifications) > 0 && (
            <span style={{
              minWidth: 20, height: 20, borderRadius: 50,
              background: "#E8611A", color: "#fff",
              fontSize: 10, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 6px", marginLeft: "auto", whiteSpace: "nowrap",
            }}>
              {(pendingSellers + pendingVerifications) > 99 ? "99+" : pendingSellers + pendingVerifications} new
            </span>
          )}
        </div>

        <div className="admin-content" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
