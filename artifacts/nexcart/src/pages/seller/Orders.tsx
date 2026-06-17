import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Package, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Select, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

const SELLER_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E",  border: "#FDE68A" },
  processing: { bg: "#EDE9FE", color: "#5B21B6",  border: "#DDD6FE" },
  paid:       { bg: "#DBEAFE", color: "#1E40AF",  border: "#BFDBFE" },
  shipped:    { bg: "#E0E7FF", color: "#3730A3",  border: "#C7D2FE" },
  delivered:  { bg: "#D1FAE5", color: "#065F46",  border: "#A7F3D0" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B",  border: "#FCA5A5" },
};

type SellerOrderRow = {
  orderId: string;
  orderStatus: string;
  orderCreatedAt: string;
  orderCurrency: string;
  itemId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  currency: string;
};

export default function SellerOrders() {
  const { seller } = useSeller();
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["seller-orders", seller?.id],
    enabled: !!seller?.id,
    queryFn: async (): Promise<SellerOrderRow[]> => {
      if (!seller?.id) return [];
      const productRes = await supabase.from("products").select("id,title").eq("seller_id", seller.id);
      const productIds = (productRes.data ?? []).map((p: { id: string }) => p.id);
      if (productIds.length === 0) return [];

      const productTitles = new Map((productRes.data ?? []).map((p: { id: string; title: string }) => [p.id, p.title]));

      const { data } = await supabase
        .from("order_items")
        .select("id,product_id,quantity,unit_price,currency,orders!inner(id,status,created_at,currency)")
        .in("product_id", productIds)
        .order("id", { ascending: false });

      return ((data ?? []) as any[]).map((oi) => ({
        orderId: oi.orders.id,
        orderStatus: oi.orders.status,
        orderCreatedAt: oi.orders.created_at,
        orderCurrency: oi.orders.currency,
        itemId: oi.id,
        productTitle: productTitles.get(oi.product_id) ?? "Unknown Product",
        quantity: Number(oi.quantity),
        unitPrice: Number(oi.unit_price),
        currency: oi.currency,
      }));
    },
  });

  async function updateStatus(orderId: string, status: SellerOrderStatus) {
    const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success("Order status updated.");
      qc.invalidateQueries({ queryKey: ["seller-orders", seller?.id] });
    }
  }

  const uniqueOrders = orders
    ? Array.from(
        orders.reduce((map, row) => {
          if (!map.has(row.orderId)) {
            map.set(row.orderId, {
              orderId: row.orderId,
              status: row.orderStatus,
              createdAt: row.orderCreatedAt,
              currency: row.orderCurrency,
              items: [],
              total: 0,
            });
          }
          const entry = map.get(row.orderId)!;
          entry.items.push({ title: row.productTitle, quantity: row.quantity, price: row.unitPrice });
          entry.total += row.quantity * row.unitPrice;
          return map;
        }, new Map<string, { orderId: string; status: string; createdAt: string; currency: string; items: { title: string; quantity: number; price: number }[]; total: number }>())
      ).map(([, v]) => v).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const pendingCount = uniqueOrders.filter(o => o.status === "pending").length;

  return (
    <div style={{ padding: "16px", maxWidth: 900, margin: "0 auto", boxSizing: "border-box" as const }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @media (max-width: 639px) {
          .orders-table-wrap { display: none !important; }
          .orders-cards { display: flex !important; }
        }
        @media (min-width: 640px) {
          .orders-table-wrap { display: block !important; }
          .orders-cards { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
              Orders
            </h1>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
              {uniqueOrders.length} total order{uniqueOrders.length !== 1 ? "s" : ""}
              {pendingCount > 0 && (
                <span style={{ marginLeft: 8, background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 50, border: "1px solid #FDE68A" }}>
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Summary pills */}
      {!isLoading && uniqueOrders.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 16 }}>
          {(["pending","processing","shipped","delivered","cancelled"] as const).map((s) => {
            const count = uniqueOrders.filter(o => o.status === s).length;
            if (count === 0) return null;
            const style = statusStyles[s] ?? { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
            return (
              <span key={s} style={{
                fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50,
                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 14, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && uniqueOrders.length === 0 && (
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 20,
          padding: "52px 24px", textAlign: "center" as const,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <ShoppingBag style={{ width: 30, height: 30, color: "#3B82F6" }} />
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D", marginBottom: 8 }}>
            No orders yet
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 20px" }}>
            When customers purchase your products, their orders will appear here for you to manage.
          </p>
          <Link
            to="/seller/products"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg,#E8611A,#C4511A)",
              color: "#fff", padding: "10px 20px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 12px rgba(232,97,26,0.3)",
            }}
          >
            <Package style={{ width: 14, height: 14 }} />
            Go to Products
            <ArrowRight style={{ width: 13, height: 13 }} />
          </Link>
        </div>
      )}

      {/* Mobile card list (hidden on sm+) */}
      {!isLoading && uniqueOrders.length > 0 && (
        <div className="orders-cards" style={{ flexDirection: "column" as const, gap: 10, display: "none" }}>
          {uniqueOrders.map((order) => {
            const s = statusStyles[order.status] ?? { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
            return (
              <div key={order.orderId} style={{
                background: "#fff", border: "1px solid #F3F4F6", borderRadius: 14,
                padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: "monospace" }}>
                    #{order.orderId.slice(0, 8).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 50,
                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  }}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 10 }}>
                  {order.items.slice(0, 2).map((item, i) => (
                    <p key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {item.quantity}× {item.title}
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p style={{ fontSize: 11, color: "#9CA3AF" }}>+{order.items.length - 2} more items</p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#0D0D0D" }}>
                      {order.currency} {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontSize: 10, color: "#9CA3AF" }}>{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Select
                    value={order.status}
                    onChange={(e) => updateStatus(order.orderId, e.target.value as SellerOrderStatus)}
                    style={{ fontSize: 12, height: 34, borderRadius: 8, minWidth: 120 }}
                  >
                    {SELLER_ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop table (hidden on mobile) */}
      {!isLoading && uniqueOrders.length > 0 && (
        <div className="orders-table-wrap" style={{ display: "none" }}>
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 16,
            overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" as const, minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F3F4F6", background: "#F9FAFB" }}>
                    {["Order ID", "Products", "Total", "Date", "Status", "Update"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left" as const,
                        fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const,
                        letterSpacing: "0.1em", color: "#9CA3AF",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueOrders.map((order, idx) => {
                    const s = statusStyles[order.status] ?? { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
                    return (
                      <tr key={order.orderId} style={{ borderBottom: idx < uniqueOrders.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                        <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: 11, color: "#9CA3AF" }}>
                          #{order.orderId.slice(0, 8).toUpperCase()}
                        </td>
                        <td style={{ padding: "13px 16px", maxWidth: 200 }}>
                          {order.items.slice(0, 2).map((item, i) => (
                            <p key={i} style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginBottom: 1 }}>
                              {item.quantity}× {item.title}
                            </p>
                          ))}
                          {order.items.length > 2 && (
                            <p style={{ fontSize: 11, color: "#9CA3AF" }}>+{order.items.length - 2} more</p>
                          )}
                        </td>
                        <td style={{ padding: "13px 16px", fontWeight: 800, color: "#0D0D0D", whiteSpace: "nowrap" as const }}>
                          {order.currency} {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#6B7280", whiteSpace: "nowrap" as const, fontSize: 12 }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50,
                            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                          }}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <Select
                            value={order.status}
                            onChange={(e) => updateStatus(order.orderId, e.target.value as SellerOrderStatus)}
                            style={{ fontSize: 12, height: 32, borderRadius: 8, minWidth: 120 }}
                          >
                            {SELLER_ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
