import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, Clock, Wallet, Globe } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCIES, convertPrice } from "@/lib/products";
import { Skeleton } from "@/components/ui/index";

function EarningCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
      padding: "18px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 17, height: 17, color }} />
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#6B7280" }}>
          {label}
        </p>
      </div>
      <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, color: "#0D0D0D", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

export default function SellerEarnings() {
  const { seller } = useSeller();
  const { currency, currencyList } = useCurrency();

  const currencySymbol = CURRENCIES[currency]?.symbol ?? currency;

  // Format a USD-stored amount into the seller's display currency
  function fmt(usdAmount: number): string {
    // All stored amounts are treated as USD for conversion purposes
    const converted = convertPrice(usdAmount, "USD", currency);
    const noDecimals = ["JPY", "KES", "UGX", "XOF", "TZS", "RWF", "ETB"].includes(currency);
    const formatted = noDecimals
      ? Math.round(converted).toLocaleString()
      : converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currencySymbol}${formatted}`;
  }

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
          .select("id,quantity,unit_price,currency,orders!inner(id,status,created_at,user_id)")
          .in("product_id", productIds),
        supabase.from("withdrawals").select("*").eq("seller_id", seller.id).eq("status", "approved"),
      ]);

      type OI = { id: string; quantity: number; unit_price: number; currency: string; orders: { id: string; status: string; created_at: string; user_id: string } };
      // Exclude orders the seller placed buying their own product as a customer —
      // that revenue isn't a real external sale and must not count toward earnings.
      const items = ((itemsRes.data ?? []) as OI[]).filter(
        (oi) => oi.orders.user_id !== seller.user_id
      );

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

  return (
    <div style={{ padding: "16px", maxWidth: 720, margin: "0 auto", boxSizing: "border-box" as const }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
            Earnings
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>Your revenue overview</p>
        </div>
        {/* Currency indicator with settings link */}
        <Link
          to="/seller/settings"
          hash="currency"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#F3F4F6", border: "1px solid #E5E7EB",
            borderRadius: 9, padding: "7px 11px",
            fontSize: 12, fontWeight: 700, color: "#4B5563",
            textDecoration: "none", flexShrink: 0,
          }}
        >
          <Globe style={{ width: 13, height: 13 }} />
          {currency}
        </Link>
      </div>

      {/* Currency note */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(232,97,26,0.05)", border: "1px solid rgba(232,97,26,0.15)",
        borderRadius: 10, padding: "9px 12px", marginBottom: 16,
        fontSize: 12, color: "#B45309",
      }}>
        <Globe style={{ width: 13, height: 13, color: "#E8611A", flexShrink: 0 }} />
        Displaying in <strong style={{ color: "#E8611A" }}>{currency} — {CURRENCIES[currency]?.name ?? currency}</strong>.
        {" "}Figures are converted from stored USD values.{" "}
        <Link to="/seller/settings" hash="currency" style={{ color: "#E8611A", fontWeight: 700, textDecoration: "none" }}>
          Change
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 110, borderRadius: 16, background: "#F3F4F6" }} />
          ))
        ) : (
          <>
            <EarningCard label="Total Revenue"     value={fmt(data?.totalRevenue ?? 0)}    icon={TrendingUp}  color="#E8611A" sub="From delivered orders" />
            <EarningCard label="Available Balance" value={fmt(data?.availableBalance ?? 0)} icon={DollarSign}  color="#10B981" sub="Ready to withdraw" />
            <EarningCard label="Pending Balance"   value={fmt(data?.pendingBalance ?? 0)}   icon={Clock}       color="#F59E0B" sub="In-transit orders" />
            <EarningCard label="Withdrawn"         value={fmt(data?.withdrawnAmount ?? 0)}  icon={Wallet}      color="#8B5CF6" sub="Approved payouts" />
          </>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D", marginBottom: 12 }}>
          Transaction History
        </p>
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          {isLoading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6" }} />
              ))}
            </div>
          ) : (data?.transactions ?? []).length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" as const }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg,#FEF3C7,#FDE68A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <TrendingUp style={{ width: 22, height: 22, color: "#D97706" }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
                Revenue from delivered orders will appear here.
              </p>
            </div>
          ) : (
            data!.transactions.map((t, idx) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 16px",
                borderBottom: idx < data!.transactions.length - 1 ? "1px solid #F9FAFB" : "none",
              }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: "monospace" }}>
                    #{t.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 15, color: "#059669" }}>
                    +{fmt(t.amount)}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 50, background: "#D1FAE5", color: "#065F46",
                  }}>
                    Delivered
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
