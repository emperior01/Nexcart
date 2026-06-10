import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store, Star, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { ProductCard } from "@/components/nexcart/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ProductWithImages } from "@/lib/products";

type Seller = Database["public"]["Tables"]["sellers"]["Row"];

export default function StorePage() {
  const { sellerId } = useParams({ strict: false }) as { sellerId: string };

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["store", sellerId],
    queryFn: async (): Promise<Seller | null> => {
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", sellerId)
        .eq("verification_status", "verified")
        .maybeSingle();
      return data as Seller | null;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["store-products", sellerId],
    enabled: !!seller,
    queryFn: async (): Promise<ProductWithImages[]> => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as ProductWithImages[];
    },
  });

  const { data: avgRating } = useQuery({
    queryKey: ["store-rating", sellerId],
    enabled: !!seller,
    queryFn: async () => {
      const productRes = await supabase.from("products").select("id").eq("seller_id", sellerId);
      const productIds = (productRes.data ?? []).map((p: { id: string }) => p.id);
      if (productIds.length === 0) return null;
      const { data } = await supabase.from("reviews").select("rating").in("product_id", productIds);
      if (!data || data.length === 0) return null;
      const avg = (data as { rating: number }[]).reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: avg.toFixed(1), count: data.length };
    },
  });

  if (sellerLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-48 rounded-2xl mb-6" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center px-4">
          <Store className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">Store not found</h2>
          <p className="text-sm text-muted-foreground">This store may have been removed or does not exist.</p>
          <Link to="/shop">
            <Button className="mt-2 rounded-full px-8 text-white" style={{ background: "#E8611A" }}>Browse Shop</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Banner */}
        <div style={{
          background: seller.store_banner
            ? `url(${seller.store_banner}) center/cover no-repeat`
            : "linear-gradient(135deg,#E8611A,#C4511A)",
          minHeight: 200,
          position: "relative",
        }}>
          {seller.store_banner && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Store header */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -32, marginBottom: 32, flexWrap: "wrap" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 16, background: "#fff",
              border: "3px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {seller.store_logo ? (
                <img src={seller.store_logo} alt={seller.store_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Store style={{ width: 36, height: 36, color: "#E8611A" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, color: "#0D0D0D", letterSpacing: "-0.02em" }}>
                {seller.store_name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                {avgRating && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star style={{ width: 14, height: 14, color: "#F59E0B", fill: "#F59E0B" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D" }}>{avgRating.avg}</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>({avgRating.count} reviews)</span>
                  </div>
                )}
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{products?.length ?? 0} products</span>
              </div>
            </div>
          </div>

          {seller.store_description && (
            <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7, maxWidth: 600, marginBottom: 32 }}>
              {seller.store_description}
            </p>
          )}

          {/* Products */}
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#0D0D0D", marginBottom: 16 }}>
            Products
          </h2>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-16">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : (products ?? []).length === 0 ? (
            <div style={{ padding: "48px 0 64px", textAlign: "center" }}>
              <Store style={{ width: 40, height: 40, color: "#D1D5DB", margin: "0 auto 12px" }} />
              <p className="text-muted-foreground">This store has no products listed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-16">
              {products!.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
