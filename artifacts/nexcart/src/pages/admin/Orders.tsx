import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

const statusColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  paid:      "bg-blue-100 text-blue-800",
  shipped:   "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id, quantity, unit_price, currency, products(title))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function updateStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order status updated.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{orders?.length ?? 0} total</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (orders ?? []).length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Order", "Items", "Total", "Paystack Ref", "Date", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orders!.map((order) => {
                  const items = (order as { order_items?: { quantity: number; products?: { title: string } }[] }).order_items ?? [];
                  return (
                    <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px]">
                        <ul className="space-y-0.5">
                          {items.slice(0, 2).map((item, i) => (
                            <li key={i} className="line-clamp-1">
                              {item.quantity}× {item.products?.title ?? "—"}
                            </li>
                          ))}
                          {items.length > 2 && <li className="text-muted-foreground">+{items.length - 2} more</li>}
                        </ul>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {order.currency} {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {order.paystack_ref ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                          className={`text-xs font-bold h-8 w-32 rounded-full border-0 ${statusColors[order.status] ?? ""}`}
                        >
                          {ORDER_STATUSES.map((s) => (
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
        )}
      </div>
    </div>
  );
}
