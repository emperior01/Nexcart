import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, TrendingUp, Store, Wallet, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSiteSettings, DEFAULT_SETTINGS } from "@/lib/site-settings";

// Same fixed seller_id used everywhere admin-created products are attributed
// to the Nexcart Official Store, so its sales count as direct Nexcart revenue
// rather than seller revenue.
const NEXCART_OFFICIAL_STORE_SELLER_ID = "4e88f29a-9bb5-43af-9421-f142f375fcff";

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
      const [adminProducts, sellerProducts, orders, users, sellers, pendingWithdrawals, settings, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("seller_id", NEXCART_OFFICIAL_STORE_SELLER_ID),
        supabase.from("products").select("id", { count: "exact", head: true }).neq("seller_id", NEXCART_OFFICIAL_STORE_SELLER_ID),
        supabase.from("orders").select("id,total", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id,verification_status", { count: "exact" }),
        supabase.from("withdrawals").select("id,amount").eq("status", "pending"),
        fetchSiteSettings(),
        // Pull every line item with its product's seller_id and the
        // order's buyer user_id, so we can tell Nexcart's own product
        // sales apart from seller product sales, and exclude a seller
        // buying their own product (not a real external sale) from the
        // commission base — consistent with the seller dashboard's rule.
        supabase
          .from("order_items")
          .select("quantity,unit_price,orders(user_id),products(seller_id,sellers(user_id))"),
      ]);

      const totalMarketplaceVolume = ((orders.data ?? []) as { id: string; total: number }[])
        .reduce((sum, o) => sum + Number(o.total), 0);

      const sellerRows = (sellers.data ?? []) as { id: string; verification_status: string }[];
      const verifiedSellers = sellerRows.filter((s) => s.verification_status === "verified").length;
      const pendingWithdrawalsTotal = ((pendingWithdrawals.data ?? []) as { id: string; amount: number }[]).reduce((s, w) => s + Number(w.amount), 0);

      type OrderItemRow = {
        quantity: number;
        unit_price: number;
        orders: { user_id: string } | null;
        products: { seller_id: string | null; sellers: { user_id: string } | null } | null;
      };
      const items = (orderItemsRes.data ?? []) as unknown as OrderItemRow[];

      let nexcartDirectRevenue = 0;
      let sellerSalesVolume = 0;
      for (const item of items) {
        const lineTotal = Number(item.quantity) * Number(item.unit_price);
        const sellerId = item.products?.seller_id;
        const sellerUserId = item.products?.sellers?.user_id;
        const buyerUserId = item.orders?.user_id;

        if (sellerId === NEXCART_OFFICIAL_STORE_SELLER_ID) {
          nexcartDirectRevenue += lineTotal;
        } else if (sellerUserId && buyerUserId && sellerUserId === buyerUserId) {
          // Seller bought their own product — not a real external sale,
          // excluded from the commission base entirely.
          continue;
        } else {
          sellerSalesVolume += lineTotal;
        }
      }
      const commissionRate = settings.commission_rate ?? DEFAULT_SETTINGS.commission_rate;
      const commissionEarnings = sellerSalesVolume * (commissionRate / 100);
      // Nexcart's true earnings: its own product sales, plus the cut it
      // takes from seller sales. NOT the same as total marketplace volume,
      // since most of that volume is sellers' own money passing through.
      const nexcartEarnings = nexcartDirectRevenue + commissionEarnings;

      return {
        adminProductsCount: adminProducts.count ?? 0,
        sellerProductsCount: sellerProducts.count ?? 0,
        totalProductsCount: (adminProducts.count ?? 0) + (sellerProducts.count ?? 0),
        orders: orders.count ?? 0,
        users: users.count ?? 0,
        totalMarketplaceVolume,
        nexcartDirectRevenue,
        sellerSalesVolume,
        commissionRate,
        commissionEarnings,
        nexcartEarnings,
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
            <StatCard label="Total Products" value={stats!.totalProductsCount} icon={Package}     gradient="linear-gradient(135deg,#E8611A,#C4511A)" />
            <StatCard label="Orders"      value={stats!.orders}   icon={ShoppingBag} gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)" />
            <StatCard label="Users"       value={stats!.users}    icon={Users}       gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" />
            <StatCard
              label="Nexcart Earnings"
              value={`$${stats!.nexcartEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg,#10B981,#065F46)"
            />
          </>
        )}
      </div>

      {/* Product ownership breakdown */}
      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Product Ownership</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 16, background: "#EBEBEB" }} />)
        ) : (
          <>
            <StatCard
              label="Admin Products"
              value={stats!.adminProductsCount}
              icon={Store}
              gradient="linear-gradient(135deg,#0EA5E9,#0369A1)"
            />
            <StatCard
              label="Marketplace Products"
              value={stats!.sellerProductsCount}
              icon={Package}
              gradient="linear-gradient(135deg,#6366F1,#4338CA)"
            />
          </>
        )}
      </div>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: -16, marginBottom: 24, lineHeight: 1.5 }}>
        "Admin Products" are Nexcart's own catalogue, managed under Products. "Marketplace Products" are
        seller-owned listings, managed per-seller under Marketplace. Together they make up Total Products above.
      </p>

      {/* Earnings breakdown */}
      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Nexcart Earnings Breakdown</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 16, background: "#EBEBEB" }} />)
        ) : (
          <>
            <StatCard
              label="Direct Product Sales"
              value={`$${stats!.nexcartDirectRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Store}
              gradient="linear-gradient(135deg,#0EA5E9,#0369A1)"
            />
            <StatCard
              label={`Commission (${stats!.commissionRate}%)`}
              value={`$${stats!.commissionEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={Percent}
              gradient="linear-gradient(135deg,#F59E0B,#B45309)"
            />
            <StatCard
              label="Seller Sales Volume"
              value={`$${stats!.sellerSalesVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={ShoppingBag}
              gradient="linear-gradient(135deg,#6366F1,#4338CA)"
            />
            <StatCard
              label="Total Marketplace Volume"
              value={`$${stats!.totalMarketplaceVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg,#64748B,#334155)"
            />
          </>
        )}
      </div>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: -16, marginBottom: 20, lineHeight: 1.5 }}>
        "Seller Sales Volume" is sellers' own revenue passing through the platform — not Nexcart's money.
        "Total Marketplace Volume" is every order, including seller and Nexcart sales combined.
        Only "Nexcart Earnings" (direct sales + commission) is actually Nexcart's.
      </p>

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
