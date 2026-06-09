import { useEffect, useState } from "react";
import { useLocation, Link, Switch, Route } from "wouter";
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, Home, Settings, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import AdminDashboard from "./Dashboard";
import AdminProducts from "./Products";
import AdminOrders from "./Orders";
import AdminUsers from "./Users";
import AdminSettings from "./Settings";

const navItems = [
  { to: "",          label: "Dashboard",         icon: LayoutDashboard },
  { to: "/products", label: "Products",          icon: Package },
  { to: "/orders",   label: "Orders",            icon: ShoppingBag },
  { to: "/users",    label: "Users",             icon: Users },
  { to: "/settings", label: "Homepage Settings", icon: Settings },
] as const;

function SidebarContent({ onClose, signOut }: { onClose: () => void; signOut: () => void }) {
  const [location] = useLocation();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(232,97,26,0.2)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.3)" }}>Admin</span>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/admin" + to;
          const isActive = to === "" ? location === "/" || location === "" : location.startsWith(to);
          return (
            <Link
              key={to}
              to={fullPath}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s",
                color: isActive ? "#E8611A" : "rgba(255,255,255,0.65)",
                background: isActive ? "rgba(232,97,26,0.15)" : "transparent",
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link
          to="/"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
        >
          <Home style={{ width: 16, height: 16 }} /> Storefront
        </Link>
        <button
          onClick={signOut}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" as const }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      if (!data) navigate("/");
    });
  }, [user, loading, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      {/* Desktop sidebar */}
      <aside style={{ width: 220, background: "#0D0D0D", flexShrink: 0, display: "flex", flexDirection: "column" }} className="hidden md:flex">
        <SidebarContent onClose={() => {}} signOut={signOut} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
          <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, background: "#0D0D0D", zIndex: 50, display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 14, height: 14, color: "#fff" }} />
            </button>
            <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.08)" }} className="flex md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu style={{ width: 18, height: 18, color: "#fff" }} />
          </button>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#E8611A" }}>Nexcart Admin</span>
        </div>

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/products" component={AdminProducts} />
            <Route path="/orders" component={AdminOrders} />
            <Route path="/users" component={AdminUsers} />
            <Route path="/settings" component={AdminSettings} />
          </Switch>
        </div>
      </div>
    </div>
  );
}
