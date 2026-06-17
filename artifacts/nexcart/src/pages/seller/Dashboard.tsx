import { useQuery } from "@tanstack/react-query";
import {
  Package, ShoppingBag, TrendingUp, DollarSign, AlertTriangle, Clock,
  ShieldCheck, Plus, Store, Settings, Bell, BarChart2, ArrowRight,
  CheckCircle, Lock, Zap, ArrowUpRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E" },
  paid:       { bg: "#DBEAFE", color: "#1E40AF" },
  processing: { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:    { bg: "#E0E7FF", color: "#3730A3" },
  delivered:  { bg: "#D1FAE5", color: "#065F46" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B" },
};

function StatCard({ label, value, icon: Icon, gradient, sub, to }: {
  label: string; value: string | number; icon: React.ElementType;
  gradient: string; sub?: string; to?: string;
}) {
  const inner = (
    <div style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: "16px 14px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)", transition: "all 0.15s",
      cursor: to ? "pointer" : "default",
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 13, background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}>
        <Icon style={{ width: 21, height: 21, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.1em", color: "#9CA3AF", marginBottom: 3,
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22,
          color: "#0D0D0D", letterSpacing: "-0.03em", lineHeight: 1,
        }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{sub}</p>}
      </div>
      {to && <ArrowUpRight style={{ width: 14, height: 14, color: "#D1D5DB", flexShrink: 0 }} />}
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: "none" }}>{inner}</Link>;
  return inner;
}

function SkeletonCard() {
  return (
    <div style={{
      height: 86, borderRadius: 16, background: "#F3F4F6",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  );
}

function VerificationBanner({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)",
        border: "1px solid #6EE7B7", borderRadius: 14, padding: "14px 16px", marginBottom: 20,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ShieldCheck style={{ width: 20, height: 20, color: "#059669" }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#065F46" }}>Verified Seller</p>
          <p style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
            You have full access — including withdrawals and advanced features.
          </p>
        </div>
        <CheckCircle style={{ width: 20, height: 20, color: "#059669", marginLeft: "auto", flexShrink: 0 }} />
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
      border: "1px solid #FDE68A", borderRadius: 14, padding: "16px",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "#FEF3C7", border: "1px solid #FDE68A",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock style={{ width: 18, height: 18, color: "#D97706" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>
            Complete Your Verification
          </p>
          <p style={{ fontSize: 12, color: "#B45309", lineHeight: 1.6, marginBottom: 12 }}>
            You're on the <strong>Basic plan</strong>. Verify your store to unlock withdrawals, 
            priority support, and the Verified badge on your listings.
          </p>
          {/* Locked features */}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 14 }}>
            {["Withdrawals", "Verified Badge", "Priority Support"].map((f) => (
              <span key={f} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 600, color: "#92400E",
                background: "#fff", border: "1px solid #FDE68A",
                padding: "3px 8px", borderRadius: 50,
              }}>
                <Lock style={{ width: 9, height: 9 }} /> {f}
              </span>
            ))}
          </div>
          <Link
            to="/seller/settings"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg,#D97706,#B45309)",
              color: "#fff", padding: "8px 16px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 2px 8px rgba(217,119,6,0.35)",
            }}
          >
            <ShieldCheck style={{ width: 13, height: 13 }} />
            Complete Verification
            <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function QuickActions({ sellerId }: { sellerId: string }) {
  const actions = [
    { label: "Add Product",     icon: Plus,      to: "/seller/products",      color: "#E8611A", bg: "rgba(232,97,26,0.08)" },
    { label: "View Store",      icon: Store,     to: `/store/${sellerId}`,     color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
    { label: "Manage Orders",   icon: ShoppingBag, to: "/seller/orders",       color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
    { label: "Store Settings",  icon: Settings,  to: "/seller/settings",      color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14,
        color: "#0D0D0D", marginBottom: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Zap style={{ width: 14, height: 14, color: "#E8611A" }} />
        Quick Actions
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
        {actions.map(({ label, icon: Icon, to, color, bg }) => (
          <Link
            key={label}
            to={to}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#fff", border: "1px solid #F3F4F6",
              borderRadius: 12, padding: "11px 13px",
              textDecoration: "none", transition: "all 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon style={{ width: 15, height: 15, color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1F2937" }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PerformanceSection({ stats }: {
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
  } | null | undefined;
}) {
  const convRate = stats && stats.totalOrders > 0
    ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
    : "0.0";

  const metrics = [
    {
      label: "Products Listed", value: stats?.totalProducts ?? 0,
      unit: "", icon: Package, color: "#E8611A",
    },
    {
      label: "Total Orders", value: stats?.totalOrders ?? 0,
      unit: "", icon: ShoppingBag, color: "#3B82F6",
    },
    {
      label: "Revenue", value: `$${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
      unit: "", icon: DollarSign, color: "#8B5CF6",
    },
    {
      label: "Completion Rate", value: `${convRate}%`,
      unit: "", icon: TrendingUp, color: "#10B981",
    },
  ];

  return (
    <div style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: "#0D0D0D", display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart2 style={{ width: 15, height: 15, color: "#E8611A" }} />
          Store Performance
        </p>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, background: "#F9FAFB", padding: "3px 8px", borderRadius: 50, border: "1px solid #F3F4F6" }}>
          All time
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: "#F9FAFB", borderRadius: 12, padding: "12px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${color}15`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon style={{ width: 14, height: 14, color }} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#9CA3AF" }}>
                {label}
              </p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 18, fontWeight: 800, color: "#0D0D0D", letterSpacing: "-0.02em" }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Growth placeholder bars */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F3F4F6" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 10 }}>
          Weekly trend (placeholder)
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40 }}>
          {[35, 55, 40, 70, 50, 80, 65].map((h, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 4, background: i === 6 ? "#E8611A" : "#F3F4F6", height: `${h}%` }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <span key={d} style={{ fontSize: 9, color: "#D1D5DB", fontWeight: 600, flex: 1, textAlign: "center" as const }}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { seller } = useSeller();
  const sellerStatus = (seller?.verification_status as string) ?? "basic";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["seller-stats", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return null;
      const [products, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id,stock,title", { count: "exact" }).eq("seller_id", seller.id),
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
      const productRows = (products.data ?? []) as { id: string; stock: number; title: string }[];

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
        productRows,
      };
    },
  });

  // Fetch recent notifications
  const { data: recentNotifs } = useQuery({
    queryKey: ["seller-recent-notifs", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return [];
      const { data } = await supabase
        .from("seller_notifications")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []) as { id: string; title: string; message: string; is_read: boolean; created_at: string }[];
    },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "16px", maxWidth: 768, margin: "0 auto", boxSizing: "border-box" as const }}>
      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (min-width: 640px) {
          .dash-pad { padding: 24px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 3 }}>{greeting} 👋</p>
        <h1 style={{
          fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24,
          letterSpacing: "-0.03em", color: "#0D0D0D", marginBottom: 4,
        }}>
          {seller?.store_name ?? "Dashboard"}
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280" }}>
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Verification banner */}
      <VerificationBanner status={sellerStatus} />

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 20 }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Products"       value={stats?.totalProducts ?? 0}  icon={Package}     gradient="linear-gradient(135deg,#E8611A,#C4511A)" to="/seller/products" />
            <StatCard label="Total Orders"   value={stats?.totalOrders ?? 0}    icon={ShoppingBag} gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)" to="/seller/orders" />
            <StatCard label="Pending Orders" value={stats?.pendingOrders ?? 0}  icon={Clock}       gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
            <StatCard label="Completed"      value={stats?.completedOrders ?? 0}icon={TrendingUp}  gradient="linear-gradient(135deg,#10B981,#059669)" />
            <div style={{ gridColumn: "span 2" }}>
              <StatCard
                label="Total Revenue"
                value={`$${(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)"
                sub="From delivered orders only"
              />
            </div>
            {(stats?.lowStock?.length ?? 0) + (stats?.outOfStock?.length ?? 0) > 0 && (
              <div style={{ gridColumn: "span 2" }}>
                <StatCard
                  label="Stock Alerts"
                  value={(stats?.lowStock?.length ?? 0) + (stats?.outOfStock?.length ?? 0)}
                  icon={AlertTriangle}
                  gradient="linear-gradient(135deg,#EF4444,#DC2626)"
                  sub={`${stats?.outOfStock?.length ?? 0} out of stock · ${stats?.lowStock?.length ?? 0} low`}
                  to="/seller/products"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <QuickActions sellerId={seller?.id ?? ""} />

      {/* Store Performance */}
      {!isLoading && <PerformanceSection stats={stats} />}

      {/* Bottom two-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>

        {/* Recent Orders */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: "#0D0D0D", display: "flex", alignItems: "center", gap: 6 }}>
              <ShoppingBag style={{ width: 14, height: 14, color: "#3B82F6" }} />
              Recent Orders
            </p>
            <Link to="/seller/orders" style={{ fontSize: 11, color: "#E8611A", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
            overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            {isLoading ? (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 52, borderRadius: 10, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (stats?.recentOrders ?? []).length === 0 ? (
              <div style={{ padding: "36px 16px", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                  <ShoppingBag style={{ width: 22, height: 22, color: "#D1D5DB" }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>No orders yet</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
                  Orders from customers will appear here.
                </p>
                <Link to="/seller/products" style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 700, color: "#E8611A",
                  background: "rgba(232,97,26,0.08)", padding: "7px 14px",
                  borderRadius: 8, textDecoration: "none",
                }}>
                  <Package style={{ width: 12, height: 12 }} /> Add products to start selling
                </Link>
              </div>
            ) : (
              stats!.recentOrders.map((order, idx) => {
                const s = statusColors[order.status] ?? { bg: "#F3F4F6", color: "#374151" };
                return (
                  <div key={order.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: idx < stats!.recentOrders.length - 1 ? "1px solid #F9FAFB" : "none",
                    gap: 10,
                  }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: "monospace", marginBottom: 2 }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#0D0D0D" }}>
                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "4px 10px",
                      borderRadius: 50, background: s.bg, color: s.color,
                      whiteSpace: "nowrap" as const, border: `1px solid ${s.bg}`,
                    }}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: "#0D0D0D", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#F59E0B" }} />
              Stock Alerts
            </p>
            <Link to="/seller/products" style={{ fontSize: 11, color: "#E8611A", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              Manage <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
            overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            {isLoading ? (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (stats?.outOfStock ?? []).length === 0 && (stats?.lowStock ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  <CheckCircle style={{ width: 22, height: 22, color: "#059669" }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>All products well-stocked</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>No stock alerts at the moment.</p>
              </div>
            ) : (
              <>
                {(stats?.outOfStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 16px", borderBottom: "1px solid #FFF8F8", background: "#FFFBFB",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: "#DC2626" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 600 }}>
                        {(p as any).title ?? `Product #${p.id.slice(0, 6)}`}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 50, background: "#FEE2E2", color: "#991B1B", whiteSpace: "nowrap" as const }}>
                      Out of stock
                    </span>
                  </div>
                ))}
                {(stats?.lowStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 16px", borderBottom: "1px solid #FFFBF0", background: "#FFFDF5",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: "#D97706" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 600 }}>
                        {(p as any).title ?? `Product #${p.id.slice(0, 6)}`}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 50, background: "#FEF3C7", color: "#92400E", whiteSpace: "nowrap" as const }}>
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: "#0D0D0D", display: "flex", alignItems: "center", gap: 6 }}>
              <Bell style={{ width: 14, height: 14, color: "#E8611A" }} />
              Recent Notifications
            </p>
            <Link to="/seller/notifications" style={{ fontSize: 11, color: "#E8611A", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
              View all <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          </div>
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
            overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            {(recentNotifs ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", background: "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  <Bell style={{ width: 20, height: 20, color: "#D1D5DB" }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>No notifications yet</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                  You'll be notified about orders, withdrawals, and alerts.
                </p>
              </div>
            ) : (
              recentNotifs!.map((n, idx) => (
                <div key={n.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px",
                  borderBottom: idx < recentNotifs!.length - 1 ? "1px solid #F9FAFB" : "none",
                  background: n.is_read ? "#fff" : "rgba(232,97,26,0.025)",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: n.is_read ? "#F3F4F6" : "rgba(232,97,26,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bell style={{ width: 13, height: 13, color: n.is_read ? "#9CA3AF" : "#E8611A" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0D0D0D", marginBottom: 1 }}>{n.title}</p>
                    <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {n.message}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8611A", marginTop: 6, flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
