import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { Navbar } from "../components/nexcart/Navbar";
import { Footer } from "../components/nexcart/Footer";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/use-auth";
import { formatPrice } from "../lib/products";
import { useCurrency } from "../contexts/CurrencyContext";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [tab, setTab] = useState("orders");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); }
    });
  }, [user]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    }
  });

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, phone });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile updated!");
  }

  async function signOut() { await supabase.auth.signOut(); navigate("/"); }

  if (loading || !user) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, border:"3px solid #E8611A", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const statusColor: any = { pending:"#ca8a04", paid:"#3b82f6", shipped:"#8b5cf6", delivered:"#16a34a", cancelled:"#dc2626" };
  const statusBg: any = { pending:"rgba(234,179,8,.1)", paid:"rgba(59,130,246,.1)", shipped:"rgba(139,92,246,.1)", delivered:"rgba(34,197,94,.1)", cancelled:"rgba(239,68,68,.1)" };

  const inp = { width:"100%", padding:"10px 13px", borderRadius:9, border:"1px solid #EFEFEF", background:"#F4F4F4", fontSize:14, outline:"none", fontFamily:"inherit" };
  const lbl = { fontSize:11, fontWeight:700 as any, color:"#6B6B6B", display:"block" as any, marginBottom:5, textTransform:"uppercase" as any, letterSpacing:".05em" };

  return (
    <div style={{ minHeight:"100vh", background:"#fff" }}>
      <Navbar />
      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"#E8611A", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#fff", flexShrink:0 }}>
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#0D0D0D" }}>{fullName || "My Account"}</div>
              <div style={{ fontSize:13, color:"#6B6B6B" }}>{user.email}</div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {isAdmin && (
              <Link to="/admin" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:999, background:"#FEF0E8", color:"#E8611A", fontWeight:700, fontSize:13, textDecoration:"none", border:"1px solid rgba(232,97,26,.25)" }}>
                <Shield size={14} />Admin Dashboard
              </Link>
            )}
            <button onClick={signOut} style={{ padding:"9px 16px", borderRadius:999, border:"1px solid #EFEFEF", background:"#fff", fontSize:13, cursor:"pointer", color:"#6B6B6B", fontWeight:600 }}>Sign out</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, border:"1px solid #EFEFEF", borderRadius:12, background:"#F4F4F4", padding:4, width:"fit-content", marginBottom:24 }}>
          {["orders","settings"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"9px 20px", borderRadius:9, background:tab===t?"#fff":"transparent", color:tab===t?"#0D0D0D":"#6B6B6B", fontWeight:600, fontSize:13, border:"none", cursor:"pointer", fontFamily:"inherit", boxShadow:tab===t?"0 1px 6px rgba(0,0,0,.08)":"none" }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div style={{ borderRadius:16, border:"1px dashed #EFEFEF", background:"#F4F4F4", padding:"48px 24px", textAlign:"center" }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:"#0D0D0D" }}>No orders yet</p>
                <p style={{ fontSize:13, color:"#6B6B6B", marginTop:4 }}>Your orders will appear here once you shop.</p>
                <Link to="/shop" style={{ display:"inline-block", marginTop:16, background:"#E8611A", color:"#fff", padding:"10px 20px", borderRadius:999, fontSize:13, fontWeight:600, textDecoration:"none" }}>Start Shopping</Link>
              </div>
            ) : orders.map((order: any) => (
              <div key={order.id} style={{ background:"#fff", border:"1px solid #EFEFEF", borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:12, boxShadow:"0 2px 12px rgba(0,0,0,.07)", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:11, color:"#6B6B6B", fontFamily:"monospace" }}>#{order.id.slice(0,8).toUpperCase()}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, marginTop:4 }}>{formatPrice(order.total, order.currency, currency)}</div>
                  <div style={{ fontSize:12, color:"#6B6B6B", marginTop:3 }}>{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:700, background:statusBg[order.status], color:statusColor[order.status] }}>
                  {order.status.charAt(0).toUpperCase()+order.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Settings tab */}
        {tab === "settings" && (
          <div style={{ background:"#fff", border:"1px solid #EFEFEF", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, marginBottom:16 }}>Profile</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div><label style={lbl}>Full Name</label><input style={inp} value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0000" /></div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Email</label>
              <input style={{ ...inp, opacity:.5 }} value={user.email ?? ""} disabled />
            </div>
            <button onClick={saveProfile} disabled={saving} style={{ background:"#E8611A", color:"#fff", padding:"10px 24px", borderRadius:999, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}
      </div>
      <Footer />
      <div style={{ height:70 }} />
    </div>
  );
}
