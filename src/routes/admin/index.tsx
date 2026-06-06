import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/index";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm flex items-center gap-4">
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: gradient }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, users] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id,total", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (orders.data ?? []).reduce((sum, o) => sum + Number(o.total), 0);
      return {
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        users: users.count ?? 0,
        revenue,
      };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,status,total,currency,created_at,user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total Products" value={stats!.products} icon={Package} gradient="var(--gradient-brand)" />
            <StatCard label="Total Orders" value={stats!.orders} icon={ShoppingBag} gradient="var(--gradient-gold)" />
            <StatCard label="Total Users" value={stats!.users} icon={Users} gradient="var(--gradient-brand)" />
            <StatCard
              label="Total Revenue"
              value={`$${stats!.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              gradient="var(--gradient-gold)"
            />
          </>
        )}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="mb-4 text-base font-extrabold text-foreground">Recent Orders</h2>
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {ordersLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
            </div>
          ) : (recentOrders ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Order ID", "Status", "Total", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentOrders!.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {order.currency} {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
