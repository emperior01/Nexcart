import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, TrendingUp, Store, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function StatCard({ label, value, icon: Icon, gradient }: {
  label: string; value: string | number;
  icon: React.ElementType; gradient: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "14px 12px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#6B7280", marginBottom: 3 }}>{label}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: "#0D0D0D", letterSpacing: "-0.02em" }}>{value}</p>
      </div>
    </div>
  );
}

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF3C7", color: "#92400E" },
  paid:      { bg: "#DBEAFE", color: "#1E40AF" },
  shipped:   { bg: "#EDE9FE", color: "#5B21B6" },
  delivered: { bg: "#D1FAE5", color: "#065F46" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B" },
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, users, sellers, pendingWithdrawals] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id,total", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id,verification_status", { count: "exact" }),
        supabase.from("withdrawals").select("id,amount").eq("status", "pending"),
      ]);
      const revenue = ((orders.data ?? []) as { id: string; total: number }[]).reduce((sum, o) => sum + Number(o.total), 0);
      const sellerRows = (sellers.data ?? []) as { id: string; verification_status: string }[];
      const verifiedSellers = sellerRows.filter((s) => s.verification_status === "verified").length;
      const pendingWithdrawalsTotal = ((pendingWithdrawals.data ?? []) as { id: string; amount: number }[]).reduce((s, w) => s + Number(w.amount), 0);
      return {
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        users: users.count ?? 0,
        revenue,
        totalSellers: sellers.count ?? 0,
        verifiedSellers,
        pendingWithdrawalsTotal,
      };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      type RecentOrder = { id: string; status: string; total: number; currency: string; created_at: string };
      const { data } = await supabase
        .from("orders")
        .select("id,status,total,currency,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as RecentOrder[];
    },
  });

  return (
    <div style={{ padding: "12px", maxWidth: "100%" }} className="sm:p-4">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#0D0D0D" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>Welcome back, Admin. Here's what's happening.</p>
      </div>

      {/* Main stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, width: "100%", marginBottom: 16 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 16, background: "#EBEBEB" }} />
          ))
        ) : (
          <>
            <StatCard label="Products"    value={stats!.products} icon={Package}     gradient="linear-gradient(135deg,#E8611A,#C4511A)" />
            <StatCard label="Orders"      value={stats!.orders}   icon={ShoppingBag} gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)" />
            <StatCard label="Users"       value={stats!.users}    icon={Users}       gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" />
            <StatCard
              label="Revenue"
              value={`$${stats!.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg,#10B981,#065F46)"
            />
          </>
        )}
      </div>

      {/* Marketplace stats */}
      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Marketplace</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 16, background: "#EBEBEB" }} />)
        ) : (
          <>
            <StatCard label="Sellers" value={`${stats!.verifiedSellers}/${stats!.totalSellers}`} icon={Store} gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
            <StatCard
              label="Pending Payouts"
              value={`$${stats!.pendingWithdrawalsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Wallet}
              gradient="linear-gradient(135deg,#06B6D4,#0891B2)"
            />
          </>
        )}
      </div>

      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D", marginBottom: 12 }}>Recent Orders</p>
      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {ordersLoading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 56, borderRadius: 12, background: "#F3F4F6" }} />
            ))}
          </div>
        ) : (recentOrders ?? []).length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, background: "#FEF0E8", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <ShoppingBag style={{ width: 22, height: 22, color: "#E8611A" }} />
            </div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: "#0D0D0D", marginBottom: 4 }}>No orders yet</p>
            <p style={{ fontSize: 13, color: "#6B7280" }}>Orders will appear here once customers start buying.</p>
          </div>
        ) : (
          recentOrders!.map((order) => {
            const s = statusStyles[order.status] ?? { bg: "#F3F4F6", color: "#374151" };
            return (
              <div key={order.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #F3F4F6", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: "monospace", marginBottom: 3 }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>
                    {order.currency} {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50, background: s.bg, color: s.color, whiteSpace: "nowrap" as const }}>
                  {order.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
