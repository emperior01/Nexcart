import { Link } from "@tanstack/react-router";
import { Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  paid:      "bg-blue-100 text-blue-800",
  shipped:   "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AccountOrders() {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      type OrderItem = { id: string; quantity: number; unit_price: number; currency: string; products?: { title: string } | null };
      type Order = { id: string; status: string; total: number; currency: string; created_at: string; order_items?: OrderItem[] };
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id, quantity, unit_price, currency, products(title))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Order[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <Package className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Order History</h2>
          {orders && orders.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-[#9B9B9B]">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (orders ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-3">
                <ShoppingBag className="h-6 w-6 text-[#E8611A]" />
              </div>
              <h3 className="font-extrabold text-[#0D0D0D] mb-1">No orders yet</h3>
              <p className="text-sm text-[#9B9B9B] mb-5">Your purchases will appear here.</p>
              <Button className="text-white rounded-full px-6" style={{ background: "#E8611A" }} asChild>
                <Link to="/shop">Start shopping</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders!.map((order) => {
                const items = (order as { order_items?: { quantity: number; products?: { title: string } }[] }).order_items ?? [];
                const statusClass = STATUS_COLORS[order.status] ?? "bg-[#F3F4F6] text-[#374151]";
                return (
                  <div key={order.id} className="rounded-xl border border-[#F0F0F0] p-4 hover:border-[#E8611A]/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-mono text-xs text-[#9B9B9B]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="font-extrabold text-[#0D0D0D] mt-0.5">
                          {order.currency}{" "}
                          {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-[#9B9B9B] mt-0.5">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusClass}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    {items.length > 0 && (
                      <ul className="space-y-0.5 mt-2 border-t border-[#F0F0F0] pt-2">
                        {items.slice(0, 3).map((item, i) => (
                          <li key={i} className="text-xs text-[#6B7280]">
                            {item.quantity}× {item.products?.title ?? "—"}
                          </li>
                        ))}
                        {items.length > 3 && (
                          <li className="text-xs text-[#9B9B9B]">+{items.length - 3} more item{items.length - 3 !== 1 ? "s" : ""}</li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
