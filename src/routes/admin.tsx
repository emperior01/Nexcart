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
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(232,97,26,0.2)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.3)" }}>Admin</span>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none", transition: "all .15s" }}
            activeProps={{ style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#E8611A", textDecoration: "none", background: "rgba(232,97,26,0.18)" } }}
            inactiveProps={{ style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" } }}
          >
            <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 2 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
          <Home style={{ width: 16, height: 16 }} /> Back to Store
        </Link>
        <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#FF6B6B", background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
          <LogOut style={{ width: 16, height: 16 }} /> Sign Out
        </button>
      </div>
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
        .from("user_roles").select("role")
        .eq("user_id", user!.id).eq("role", "admin").maybeSingle();
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
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAdmin) return null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .admin-shell{display:flex;min-height:100vh;background:#F7F7F8;}
        .admin-sidebar{
          width:220px;flex-shrink:0;background:#0D0D0D;
          display:flex;flex-direction:column;
          position:fixed;top:0;left:0;bottom:0;z-index:50;
          transition:transform .3s cubic-bezier(.4,0,.2,1);
        }
        .admin-main{
          flex:1;display:flex;flex-direction:column;min-height:100vh;
          margin-left:220px;min-width:0;
        }
        .admin-topbar{
          position:sticky;top:0;z-index:40;
          background:rgba(247,247,248,0.95);backdrop-filter:blur(12px);
          border-bottom:1px solid #EBEBEB;
          padding:0 16px;height:52px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .admin-hamburger{
          display:none;width:36px;height:36px;border-radius:8px;
          background:none;border:none;cursor:pointer;
          align-items:center;justify-content:center;color:#0D0D0D;
        }
        .admin-overlay{
          display:none;position:fixed;inset:0;
          background:rgba(0,0,0,0.65);z-index:49;
        }
        @media(max-width:768px){
          .admin-sidebar{transform:translateX(-100%);}
          .admin-sidebar.open{transform:translateX(0);}
          .admin-main{margin-left:0;}
          .admin-hamburger{display:flex;}
          .admin-overlay.open{display:block;}
        }
      `}</style>

      <div className="admin-shell">
        {/* Overlay */}
        <div className={`admin-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
          <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} />
        </aside>

        {/* Main */}
        <div className="admin-main">
          {/* Topbar */}
          <div className="admin-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="admin-hamburger" onClick={() => setSidebarOpen(v => !v)}>
                {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
              </button>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>Admin Panel</span>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8611A", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {(user?.email?.[0] ?? "A").toUpperCase()}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
