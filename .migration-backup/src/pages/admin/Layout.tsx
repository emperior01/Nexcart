import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Package, ShoppingBag, Users, Settings, Home, LogOut, Menu, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/use-auth";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Homepage Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    }
  });

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) navigate("/auth");
      else if (isAdmin === false) navigate("/");
    }
  }, [user, loading, isAdmin, roleLoading]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (loading || roleLoading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:32, height:32, border:"4px solid #E8611A", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!isAdmin) return null;

  async function signOut() { await supabase.auth.signOut(); navigate("/"); }
  const isActivePath = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname === to;

  const NavLinks = () => (
    <>
      {navItems.map(({ to, label, icon: Icon, exact }) => {
        const active = isActivePath(to, exact);
        return (
          <Link key={to} to={to} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, background:active?"#fff":"transparent", color:active?"#E8611A":"#6B6B6B", fontWeight:600, fontSize:14, textDecoration:"none", marginBottom:3, boxShadow:active?"0 1px 4px rgba(0,0,0,.06)":"none" }}>
            <Icon size={17} />{label}
          </Link>
        );
      })}
      <div style={{ borderTop:"1px solid #E5E5E5", paddingTop:8, marginTop:8 }}>
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, color:"#6B6B6B", fontWeight:600, fontSize:14, textDecoration:"none", marginBottom:3 }}><Home size={17} />Back to Store</Link>
        <button onClick={signOut} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:10, color:"#6B6B6B", fontWeight:600, fontSize:14, background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left" }}><LogOut size={17} />Sign Out</button>
      </div>
    </>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#fafafa" }}>
      <aside style={{ width:240, background:"#F4F4F4", borderRight:"1px solid #EFEFEF", padding:"16px 12px", flexShrink:0, display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        <div style={{ padding:"0 4px 16px", borderBottom:"1px solid #E5E5E5", marginBottom:8 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:"#E8611A" }}>Nexcart</div>
          <div style={{ marginTop:4, display:"inline-block", background:"#FEF0E8", color:"#E8611A", fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:".08em", padding:"2px 8px", borderRadius:6 }}>Admin Panel</div>
        </div>
        <nav style={{ flex:1 }}><NavLinks /></nav>
      </aside>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:100 }} />
          <aside style={{ position:"fixed", left:0, top:0, height:"100%", width:280, background:"#F4F4F4", padding:"16px 12px", zIndex:101, display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, paddingBottom:16, borderBottom:"1px solid #E5E5E5" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:"#E8611A" }}>Nexcart</div>
              <button onClick={() => setOpen(false)} style={{ width:32, height:32, borderRadius:"50%", border:"none", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16} /></button>
            </div>
            <nav style={{ flex:1 }}><NavLinks /></nav>
          </aside>
        </>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#fff", borderBottom:"1px solid #EFEFEF", position:"sticky", top:0, zIndex:50 }}>
          <button onClick={() => setOpen(true)} style={{ width:36, height:36, borderRadius:9, border:"1px solid #EFEFEF", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Menu size={18} />
          </button>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16 }}>
            {navItems.find(n => isActivePath(n.to, n.exact))?.label ?? "Admin"}
          </span>
          <Link to="/" style={{ marginLeft:"auto", fontSize:13, color:"#E8611A", fontWeight:600, textDecoration:"none" }}>← Store</Link>
        </div>
        <main style={{ flex:1, overflowY:"auto", padding:16 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
