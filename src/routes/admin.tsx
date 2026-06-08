import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, Home, Settings, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin/",         label: "Dashboard",         icon: LayoutDashboard },
  { to: "/admin/products", label: "Products",          icon: Package },
  { to: "/admin/orders",   label: "Orders",            icon: ShoppingBag },
  { to: "/admin/users",    label: "Users",             icon: Users },
  { to: "/admin/settings", label: "Homepage Settings", icon: Settings },
] as const;

function SidebarContent({ onClose, signOut }: { onClose: () => void; signOut: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(232,97,26,0.2)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.3)" }}>Admin</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="admin-nav-item"
            activeProps={{ className: "admin-nav-item admin-nav-active" }}
          >
            <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 2 }}>
        <Link to="/" className="admin-nav-item">
          <Home style={{ width: 16, height: 16 }} /> Back to Store
        </Link>
        <button onClick={signOut} className="admin-nav-item" style={{ background: "none", border: "none", width: "100%", textAlign: "left", color: "#FF6B6B", cursor: "pointer" }}>
          <LogOut style={{ width: 16, height: 16 }} /> Sign Out
        </button>
      </div>

      <style>{`
        .admin-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.55);
          text-decoration: none; transition: all .15s;
        }
        .admin-nav-item:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
        .admin-nav-active { background: rgba(232,97,26,0.18) !important; color: #E8611A !important; font-weight: 600 !important; }
      `}</style>
    </div>
  );
}

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) navigate({ to: "/auth" });
      else if (isAdmin === false) navigate({ to: "/" });
    }
  }, [user, loading, isAdmin, roleLoading, navigate]);

  if (loading || roleLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "4px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        :root { --admin-ml: 220px; }
        @media (max-width: 768px) { :root { --admin-ml: 0px; } aside { transform: translateX(-100%); } }`}</style>
      </div>
    );
  }

  if (!isAdmin) return null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const sidebarBg = "#0D0D0D";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F7F8" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: sidebarBg,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : undefined,
        transition: "transform .3s cubic-bezier(.4,0,.2,1)",
      }}
        className={`max-md:${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} />
      </aside>

      {/* Main */}
      <div style={{ marginLeft: "var(--admin-ml, 220px)", flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }} className="max-md:ml-0">

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(247,247,248,0.92)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #EBEBEB",
          padding: "0 20px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden"
              style={{ width: 36, height: 36, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>
              Admin Panel
            </span>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8611A", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(user?.email?.[0] ?? "A").toUpperCase()}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside { transform: ${sidebarOpen ? "translateX(0)" : "translateX(-100%)"}; }
          .main-content { margin-left: 0 !important; }
        }
        @media (min-width: 769px) {
          aside { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
