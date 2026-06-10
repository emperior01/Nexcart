import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Select, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

const SELLER_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];

const statusColors: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  paid:       "bg-blue-100 text-blue-800",
  shipped:    "bg-indigo-100 text-indigo-800",
  delivered:  "bg-green-100 text-green-800",
  cancelled:  "bg-red-100 text-red-800",
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

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{uniqueOrders.length} total</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : uniqueOrders.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-muted-foreground font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">Orders will appear here once customers purchase your products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Order ID","Products","Total","Date","Status",""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {uniqueOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{order.orderId.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {order.items.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-xs text-foreground line-clamp-1">
                          {item.quantity}× {item.title}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">+{order.items.length - 2} more</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {order.currency} {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[order.status] ?? "bg-secondary text-muted-foreground"}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={order.status}
                        onChange={(e) => updateStatus(order.orderId, e.target.value as SellerOrderStatus)}
                        className="text-xs h-8 w-32 rounded-lg"
                      >
                        {SELLER_ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
