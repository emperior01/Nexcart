import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, Store, ShoppingBag, Package, TrendingUp, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Input, Select, Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";

// Same fixed seller_id used everywhere admin-created products are
// attributed to the Nexcart Official Store — excluded from this directory
// since it's not a third-party marketplace seller.
const NEXCART_OFFICIAL_STORE_SELLER_ID = "4e88f29a-9bb5-43af-9421-f142f375fcff";

type SellerRow = {
  id: string;
  store_name: string;
  store_logo: string | null;
  verification_status: string;
  created_at: string;
};

type SellerStats = {
  productCount: number;
  orderCount: number;
  salesVolume: number;
};

const statusConfig: Record<string, { bg: string; color: string; label: string; icon: typeof ShieldCheck }> = {
  verified:  { bg: "#D1FAE5", color: "#065F46", label: "Verified",  icon: ShieldCheck },
  basic:     { bg: "#E0E7FF", color: "#3730A3", label: "Basic",     icon: Store },
  pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending",   icon: Clock },
  suspended: { bg: "#FEE2E2", color: "#991B1B", label: "Suspended", icon: ShieldAlert },
  rejected:  { bg: "#F3F4F6", color: "#6B7280", label: "Rejected",  icon: ShieldAlert },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { bg: "#F3F4F6", color: "#6B7280", label: status, icon: Store };
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50,
      background: cfg.bg, color: cfg.color,
    }}>
      <Icon style={{ width: 11, height: 11 }} /> {cfg.label}
    </span>
  );
}

export default function AdminMarketplaceSellers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: sellers, isLoading: sellersLoading } = useQuery({
    queryKey: ["marketplace-sellers"],
    queryFn: async (): Promise<SellerRow[]> => {
      // Nexcart Official Store has a sellers row too (needed for the FK
      // that attributes admin-created products to it), but it's not a
      // third-party marketplace seller — it must not appear in this
      // directory alongside real sellers.
      const { data, error } = await supabase
        .from("sellers")
        .select("id,store_name,store_logo,verification_status,created_at")
        .neq("id", NEXCART_OFFICIAL_STORE_SELLER_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SellerRow[];
    },
  });

  // Per-seller aggregate stats. Computed in one pass over products and
  // order_items rather than N separate queries per seller, so this stays
  // reasonably fast even as the seller count grows — the directory itself
  // is the thing that scales (a list of sellers), not a giant combined
  // products table.
  const { data: statsMap, isLoading: statsLoading } = useQuery({
    queryKey: ["marketplace-seller-stats"],
    queryFn: async (): Promise<Map<string, SellerStats>> => {
      const [productsRes, sellersRes, itemsRes] = await Promise.all([
        supabase.from("products").select("id,seller_id"),
        supabase.from("sellers").select("id,user_id"),
        supabase.from("order_items").select("quantity,unit_price,product_id,orders(user_id),products(seller_id)"),
      ]);

      const products = (productsRes.data ?? []) as { id: string; seller_id: string | null }[];
      const map = new Map<string, SellerStats>();

      for (const p of products) {
        if (!p.seller_id) continue;
        const entry = map.get(p.seller_id) ?? { productCount: 0, orderCount: 0, salesVolume: 0 };
        entry.productCount += 1;
        map.set(p.seller_id, entry);
      }

      const sellerUserIdById = new Map(
        ((sellersRes.data ?? []) as { id: string; user_id: string }[]).map((s) => [s.id, s.user_id])
      );

      type ItemRow = {
        quantity: number; unit_price: number; product_id: string;
        orders: { user_id: string } | null;
        products: { seller_id: string | null } | null;
      };
      const items = (itemsRes.data ?? []) as unknown as ItemRow[];
      for (const item of items) {
        const sellerId = item.products?.seller_id;
        if (!sellerId) continue;
        // Exclude a seller buying their own product as a customer — not a
        // real sale, must not inflate their order/sales numbers here either.
        const sellerUserId = sellerUserIdById.get(sellerId);
        const buyerUserId = item.orders?.user_id;
        if (sellerUserId && buyerUserId && sellerUserId === buyerUserId) continue;

        const entry = map.get(sellerId) ?? { productCount: 0, orderCount: 0, salesVolume: 0 };
        entry.orderCount += 1;
        entry.salesVolume += Number(item.quantity) * Number(item.unit_price);
        map.set(sellerId, entry);
      }

      return map;
    },
  });

  const isLoading = sellersLoading || statsLoading;

  const filtered = useMemo(() => {
    let list = sellers ?? [];
    if (statusFilter !== "all") list = list.filter((s) => s.verification_status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.store_name.toLowerCase().includes(q));
    return list;
  }, [sellers, statusFilter, search]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Marketplace Sellers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sellers?.length ?? 0} sellers · tap a store to manage its products, orders, and status.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9CA3AF" }} />
          <Input
            placeholder="Search store name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-48">
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="basic">Basic</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "52px 24px", textAlign: "center" as const }} className="rounded-2xl border border-border/50 bg-card">
          <Store style={{ width: 28, height: 28, color: "#C8C8C8", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No sellers match</p>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const stats = statsMap?.get(s.id) ?? { productCount: 0, orderCount: 0, salesVolume: 0 };
            return (
              <Link
                key={s.id}
                to="/admin/marketplace/sellers/$sellerId"
                params={{ sellerId: s.id }}
                className="rounded-2xl border border-border/50 bg-card shadow-sm p-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {s.store_logo ? (
                      <img src={s.store_logo} alt={s.store_name} className="h-full w-full object-cover" />
                    ) : (
                      <Store style={{ width: 18, height: 18, color: "#9CA3AF" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{s.store_name}</p>
                    <StatusBadge status={s.verification_status} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
                      <Package style={{ width: 10, height: 10 }} /> Products
                    </p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">{stats.productCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
                      <ShoppingBag style={{ width: 10, height: 10 }} /> Orders
                    </p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">{stats.orderCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
                      <TrendingUp style={{ width: 10, height: 10 }} /> Sales
                    </p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">
                      ${stats.salesVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
