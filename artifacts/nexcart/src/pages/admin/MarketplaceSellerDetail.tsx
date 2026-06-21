import { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Store, Phone, MapPin, Package, ShoppingBag, TrendingUp,
  Star, EyeOff, Eye, Ban, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

type Seller = {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  store_logo: string | null;
  phone: string | null;
  address: string | null;
  verification_status: string;
  created_at: string;
};

type SellerProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  is_active: boolean;
  product_images: { url: string; is_primary: boolean }[];
};

type SellerOrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  orders: { id: string; status: string; created_at: string; user_id: string } | null;
};

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  verified:  { bg: "#D1FAE5", color: "#065F46", label: "Verified"  },
  basic:     { bg: "#E0E7FF", color: "#3730A3", label: "Basic"     },
  pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending"   },
  suspended: { bg: "#FEE2E2", color: "#991B1B", label: "Suspended" },
  rejected:  { bg: "#F3F4F6", color: "#6B7280", label: "Rejected"  },
};

export default function AdminMarketplaceSellerDetail() {
  const { sellerId } = useParams({ strict: false }) as { sellerId: string };
  const qc = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["marketplace-seller", sellerId],
    queryFn: async (): Promise<Seller | null> => {
      const { data, error } = await supabase.from("sellers").select("*").eq("id", sellerId).maybeSingle();
      if (error) throw error;
      return data as Seller | null;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["marketplace-seller-products", sellerId],
    queryFn: async (): Promise<SellerProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,price,currency,stock,is_active,product_images(url,is_primary)")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SellerProduct[];
    },
  });

  const { data: orderItems, isLoading: ordersLoading } = useQuery({
    queryKey: ["marketplace-seller-orders", sellerId],
    queryFn: async (): Promise<SellerOrderItem[]> => {
      const productIds = (products ?? []).map((p) => p.id);
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("id,quantity,unit_price,currency,orders!inner(id,status,created_at,user_id)")
        .in("product_id", productIds)
        .order("id", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as SellerOrderItem[];
      // Exclude orders the seller placed buying their own product as a
      // customer — that's not a real sale and must not count toward this
      // seller's order count or revenue, consistent with their own
      // dashboard's rule.
      return rows.filter((oi) => oi.orders?.user_id !== seller?.user_id);
    },
    enabled: !!products && !!seller,
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["marketplace-seller-reviews", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("rating").eq("seller_id", sellerId);
      if (error) throw error;
      const rows = (data ?? []) as { rating: number }[];
      const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null;
      return { count: rows.length, average: avg };
    },
  });

  const salesVolume = (orderItems ?? []).reduce((sum, oi) => sum + Number(oi.quantity) * Number(oi.unit_price), 0);
  const activeProductCount = (products ?? []).filter((p) => p.is_active).length;
  const allProductsHidden = (products ?? []).length > 0 && activeProductCount === 0;

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["marketplace-seller", sellerId] });
    qc.invalidateQueries({ queryKey: ["marketplace-seller-products", sellerId] });
    qc.invalidateQueries({ queryKey: ["marketplace-sellers"] });
    qc.invalidateQueries({ queryKey: ["marketplace-seller-stats"] });
  }

  async function hideAllProducts() {
    if (!confirm(`Hide all ${products?.length ?? 0} products from "${seller?.store_name}"? They'll disappear from the storefront but stay intact otherwise.`)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("products").update({ is_active: false } as any).eq("seller_id", sellerId);
      if (error) throw error;
      toast.success("All products hidden from storefront.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to hide products.");
    } finally {
      setActionLoading(false);
    }
  }

  async function unhideAllProducts() {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("products").update({ is_active: true } as any).eq("seller_id", sellerId);
      if (error) throw error;
      toast.success("Products restored to storefront.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore products.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleProductActive(product: SellerProduct) {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active } as any)
        .eq("id", product.id)
        .eq("seller_id", sellerId); // belt-and-suspenders: never touch a product outside this seller
      if (error) throw error;
      toast.success(product.is_active ? "Product hidden." : "Product restored.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleProductSelected(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!products) return;
    setSelectedProductIds((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))
    );
  }

  async function bulkSetActive(active: boolean) {
    if (selectedProductIds.size === 0) return;
    const ids = Array.from(selectedProductIds);
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: active } as any)
        .in("id", ids)
        .eq("seller_id", sellerId);
      if (error) throw error;
      toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} ${active ? "restored" : "hidden"}.`);
      setSelectedProductIds(new Set());
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function suspendSeller() {
    if (!confirm(`Suspend "${seller?.store_name}"? This also hides all of their products from the storefront.`)) return;
    setActionLoading(true);
    try {
      // Suspending hides every product too — a suspended seller shouldn't
      // still be making sales while under suspension.
      const [r1, r2] = await Promise.all([
        supabase.from("sellers").update({ verification_status: "suspended" } as any).eq("id", sellerId),
        supabase.from("products").update({ is_active: false } as any).eq("seller_id", sellerId),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      toast.success("Seller suspended and products hidden.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend seller.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reinstateSeller() {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("sellers").update({ verification_status: "basic" } as any).eq("id", sellerId);
      if (error) throw error;
      toast.success("Seller reinstated. Note: their products are still hidden — restore them separately if appropriate.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reinstate seller.");
    } finally {
      setActionLoading(false);
    }
  }

  if (sellerLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <p className="text-sm text-muted-foreground">Seller not found.</p>
        <Link to="/admin/marketplace/sellers" className="text-sm text-primary mt-2 inline-block">← Back to sellers</Link>
      </div>
    );
  }

  const cfg = statusConfig[seller.verification_status] ?? { bg: "#F3F4F6", color: "#6B7280", label: seller.verification_status };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <Link to="/admin/marketplace/sellers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sellers
      </Link>

      {/* Seller info card */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-xl bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
            {seller.store_logo ? (
              <img src={seller.store_logo} alt={seller.store_name} className="h-full w-full object-cover" />
            ) : (
              <Store style={{ width: 24, height: 24, color: "#9CA3AF" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-foreground">{seller.store_name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            {seller.store_description && (
              <p className="text-sm text-muted-foreground mt-1">{seller.store_description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
              {seller.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {seller.phone}</span>}
              {seller.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {seller.address}</span>}
              <span>Joined {new Date(seller.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl bg-secondary/40 p-3 text-center">
            <Package className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-lg font-extrabold mt-1">{products?.length ?? 0}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Products</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3 text-center">
            <ShoppingBag className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-lg font-extrabold mt-1">{orderItems?.length ?? 0}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Order Items</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-lg font-extrabold mt-1">${salesVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Sales Volume</p>
          </div>
          <div className="rounded-xl bg-secondary/40 p-3 text-center">
            <Star className="h-4 w-4 mx-auto text-muted-foreground" />
            <p className="text-lg font-extrabold mt-1">
              {reviewStats?.average != null ? reviewStats.average.toFixed(1) : "—"}
            </p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
              {reviewStats?.count ? `${reviewStats.count} reviews` : "No reviews"}
            </p>
          </div>
        </div>

        {/* Admin actions */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/50">
          {allProductsHidden ? (
            <Button size="sm" variant="outline" onClick={unhideAllProducts} disabled={actionLoading} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Unhide All Products
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={hideAllProducts} disabled={actionLoading} className="gap-1.5">
              <EyeOff className="h-3.5 w-3.5" /> Hide All Products
            </Button>
          )}
          {seller.verification_status === "suspended" ? (
            <Button size="sm" variant="outline" onClick={reinstateSeller} disabled={actionLoading} className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> Reinstate Seller
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={suspendSeller} disabled={actionLoading} className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5">
              <Ban className="h-3.5 w-3.5" /> Suspend Seller
            </Button>
          )}
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Products</h2>
          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedProductIds.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(false)} disabled={actionLoading} className="gap-1.5 text-xs">
                <EyeOff className="h-3 w-3" /> Hide
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetActive(true)} disabled={actionLoading} className="gap-1.5 text-xs">
                <Eye className="h-3 w-3" /> Restore
              </Button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {productsLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (products?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No products yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 border-b border-border/50">
                <input
                  type="checkbox"
                  checked={selectedProductIds.size === products!.length}
                  onChange={toggleSelectAll}
                  className="rounded border-input"
                />
                <span className="text-xs font-semibold text-muted-foreground">Select all</span>
              </div>
              <div className="divide-y divide-border/50">
                {products!.map((p) => {
                  const img = p.product_images?.find((i) => i.is_primary) ?? p.product_images?.[0];
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(p.id)}
                        onChange={() => toggleProductSelected(p.id)}
                        className="rounded border-input flex-shrink-0"
                      />
                      <div className="h-10 w-10 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                        {img && <img src={img.url} alt={p.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.currency} {Number(p.price).toFixed(2)} · stock {p.stock}</p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50,
                        background: p.is_active ? "#D1FAE5" : "#F3F4F6",
                        color: p.is_active ? "#065F46" : "#6B7280",
                      }}>
                        {p.is_active ? "Visible" : "Hidden"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleProductActive(p)}
                        disabled={actionLoading}
                        className="gap-1.5 text-xs shrink-0"
                      >
                        {p.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Restore</>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Orders */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">Recent Order Items</h2>
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {ordersLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (orderItems?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {orderItems!.slice(0, 20).map((oi) => (
                <div key={oi.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {oi.quantity} × {oi.currency} {Number(oi.unit_price).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {oi.orders ? new Date(oi.orders.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground capitalize">{oi.orders?.status ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
