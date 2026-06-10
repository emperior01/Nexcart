import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, TrendingUp, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF3C7", color: "#92400E" },
  paid:      { bg: "#DBEAFE", color: "#1E40AF" },
  processing:{ bg: "#EDE9FE", color: "#5B21B6" },
  shipped:   { bg: "#E0E7FF", color: "#3730A3" },
  delivered: { bg: "#D1FAE5", color: "#065F46" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B" },
};

function StatCard({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: string | number; icon: React.ElementType; gradient: string; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "16px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#6B7280", marginBottom: 3 }}>{label}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#0D0D0D", letterSpacing: "-0.02em" }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { seller } = useSeller();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["seller-stats", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return null;
      const [products, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id,stock", { count: "exact" }).eq("seller_id", seller.id),
        supabase
          .from("order_items")
          .select("id,quantity,unit_price,currency,orders!inner(id,status,created_at)")
          .in("product_id",
            await supabase.from("products").select("id").eq("seller_id", seller.id)
              .then(r => (r.data ?? []).map((p: { id: string }) => p.id))
          ),
      ]);

      type OI = { id: string; quantity: number; unit_price: number; currency: string; orders: { id: string; status: string; created_at: string } };
      const orderItems = (orderItemsRes.data ?? []) as OI[];
      const productRows = (products.data ?? []) as { id: string; stock: number }[];

      const orderMap = new Map<string, { status: string; created_at: string; total: number }>();
      for (const oi of orderItems) {
        const ord = oi.orders;
        if (!orderMap.has(ord.id)) {
          orderMap.set(ord.id, { status: ord.status, created_at: ord.created_at, total: 0 });
        }
        orderMap.get(ord.id)!.total += Number(oi.unit_price) * Number(oi.quantity);
      }

      const allOrders = Array.from(orderMap.entries()).map(([id, v]) => ({ id, ...v }));
      const totalRevenue = allOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
      const pending = allOrders.filter(o => o.status === "pending").length;
      const completed = allOrders.filter(o => o.status === "delivered").length;
      const lowStock = productRows.filter(p => p.stock > 0 && p.stock <= 5);
      const outOfStock = productRows.filter(p => p.stock === 0);

      return {
        totalProducts: products.count ?? 0,
        totalOrders: allOrders.length,
        pendingOrders: pending,
        completedOrders: completed,
        totalRevenue,
        recentOrders: allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
        lowStock,
        outOfStock,
      };
    },
  });

  return (
    <div style={{ padding: "16px", maxWidth: "100%" }} className="sm:p-6">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#0D0D0D" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          Welcome back, <span style={{ fontWeight: 700, color: "#E8611A" }}>{seller?.store_name}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 82, borderRadius: 16, background: "#EBEBEB" }} />
          ))
        ) : (
          <>
            <StatCard label="Products"        value={stats?.totalProducts ?? 0}  icon={Package}     gradient="linear-gradient(135deg,#E8611A,#C4511A)" />
            <StatCard label="Total Orders"    value={stats?.totalOrders ?? 0}    icon={ShoppingBag} gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)" />
            <StatCard label="Pending Orders"  value={stats?.pendingOrders ?? 0}  icon={Clock}       gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
            <StatCard label="Completed"       value={stats?.completedOrders ?? 0}icon={TrendingUp}  gradient="linear-gradient(135deg,#10B981,#065F46)" />
            <div style={{ gridColumn: "span 2" }}>
              <StatCard
                label="Total Revenue"
                value={`$${(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)"
                sub="From delivered orders"
              />
            </div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="lg:grid-cols-2">
        {/* Recent Orders */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>Recent Orders</p>
            <Link to="/seller/orders" style={{ fontSize: 12, color: "#E8611A", fontWeight: 600, textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {isLoading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6" }} />)}
              </div>
            ) : (stats?.recentOrders ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <ShoppingBag style={{ width: 28, height: 28, color: "#D1D5DB", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>No orders yet</p>
              </div>
            ) : (
              stats!.recentOrders.map((order) => {
                const s = statusColors[order.status] ?? { bg: "#F3F4F6", color: "#374151" };
                return (
                  <div key={order.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6", gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: "monospace" }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D" }}>
                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: s.bg, color: s.color, whiteSpace: "nowrap" as const }}>
                      {order.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>Stock Alerts</p>
            <Link to="/seller/products" style={{ fontSize: 12, color: "#E8611A", fontWeight: 600, textDecoration: "none" }}>Manage</Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {isLoading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6" }} />)}
              </div>
            ) : (stats?.outOfStock ?? []).length === 0 && (stats?.lowStock ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>All products are well-stocked</p>
              </div>
            ) : (
              <>
                {(stats?.outOfStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 500 }}>Product #{p.id.slice(0, 6)}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: "#FEE2E2", color: "#991B1B" }}>Out of stock</span>
                  </div>
                ))}
                {(stats?.lowStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: "#D97706", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 500 }}>Product #{p.id.slice(0, 6)}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: "#FEF3C7", color: "#92400E" }}>{p.stock} left</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
