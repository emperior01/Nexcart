import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, Home, Settings, Menu, X } from "lucide-react";
import { Logo } from "@/components/nexcart/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin/",          label: "Dashboard",          icon: LayoutDashboard },
  { to: "/admin/products",  label: "Products",           icon: Package },
  { to: "/admin/orders",    label: "Orders",             icon: ShoppingBag },
  { to: "/admin/users",     label: "Users",              icon: Users },
  { to: "/admin/settings",  label: "Homepage Settings",  icon: Settings },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-5">
        <Logo />
        <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-bold" }}
            inactiveProps={{ className: "text-sidebar-foreground" }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Store
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background md:hidden">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(v => !v)} className="rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 bottom-0 flex w-64 flex-col bg-sidebar shadow-xl" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/50 bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden pt-[56px] md:pt-0">
        <Outlet />
      </div>
    </div>
  );
}
