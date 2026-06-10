import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Skeleton } from "@/components/ui/index";

function EarningCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "20px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#6B7280" }}>{label}</p>
      </div>
      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 26, color: "#0D0D0D", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

export default function SellerEarnings() {
  const { seller } = useSeller();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-earnings", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return null;
      const productRes = await supabase.from("products").select("id").eq("seller_id", seller.id);
      const productIds = (productRes.data ?? []).map((p: { id: string }) => p.id);
      if (productIds.length === 0) return { totalRevenue: 0, availableBalance: 0, pendingBalance: 0, withdrawnAmount: 0, transactions: [] };

      const [itemsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("order_items")
          .select("id,quantity,unit_price,currency,orders!inner(id,status,created_at)")
          .in("product_id", productIds),
        supabase.from("withdrawals").select("*").eq("seller_id", seller.id).eq("status", "approved"),
      ]);

      type OI = { id: string; quantity: number; unit_price: number; currency: string; orders: { id: string; status: string; created_at: string } };
      const items = (itemsRes.data ?? []) as OI[];

      const orderMap = new Map<string, { id: string; status: string; date: string; amount: number }>();
      for (const oi of items) {
        const amount = Number(oi.unit_price) * Number(oi.quantity);
        if (!orderMap.has(oi.orders.id)) {
          orderMap.set(oi.orders.id, { id: oi.orders.id, status: oi.orders.status, date: oi.orders.created_at, amount: 0 });
        }
        orderMap.get(oi.orders.id)!.amount += amount;
      }

      const allOrderTotals = Array.from(orderMap.values());
      const totalRevenue = allOrderTotals.filter(o => o.status === "delivered").reduce((s, o) => s + o.amount, 0);
      const pendingBalance = allOrderTotals.filter(o => ["pending","paid","processing","shipped"].includes(o.status)).reduce((s, o) => s + o.amount, 0);

      const withdrawnAmount = ((withdrawalsRes.data ?? []) as { amount: number }[]).reduce((s, w) => s + Number(w.amount), 0);
      const availableBalance = Math.max(0, totalRevenue - withdrawnAmount);

      const transactions = allOrderTotals
        .filter(o => o.status === "delivered")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

      return { totalRevenue, availableBalance, pendingBalance, withdrawnAmount, transactions };
    },
  });

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your revenue overview</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <EarningCard label="Total Revenue"    value={fmt(data?.totalRevenue ?? 0)}    icon={TrendingUp}  color="#E8611A" sub="From delivered orders" />
            <EarningCard label="Available Balance" value={fmt(data?.availableBalance ?? 0)} icon={DollarSign}  color="#10B981" sub="Ready to withdraw" />
            <EarningCard label="Pending Balance"   value={fmt(data?.pendingBalance ?? 0)}   icon={Clock}       color="#F59E0B" sub="In transit orders" />
            <EarningCard label="Withdrawn"         value={fmt(data?.withdrawnAmount ?? 0)}  icon={Wallet}      color="#8B5CF6" sub="Approved payouts" />
          </>
        )}
      </div>

      <div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D", marginBottom: 12 }}>Transaction History</p>
        <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : (data?.transactions ?? []).length === 0 ? (
            <div className="p-16 text-center">
              <TrendingUp style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 12px" }} />
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Revenue from delivered orders will appear here.</p>
            </div>
          ) : (
            data!.transactions.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F3F4F6" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: "monospace" }}>#{t.id.slice(0, 8).toUpperCase()}</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{new Date(t.date).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#16A34A" }}>+{fmt(t.amount)}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: "#D1FAE5", color: "#065F46" }}>Delivered</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
