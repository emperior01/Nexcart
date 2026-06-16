import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Star, Minus, Plus, ImageOff, Heart, Store } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { ProductCard } from "@/components/nexcart/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, primaryImage, sortedImages, type ProductWithImages } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { toast } from "sonner";

type SellerInfo = { id: string; store_name: string; store_logo: string | null; verification_status: string };

export default function ProductDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { addItem } = useCart();
  const { toggle, hasItem } = useWishlist();
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<ProductWithImages | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as ProductWithImages | null;
    },
  });

  const { data: seller } = useQuery({
    queryKey: ["product-seller", (product as any)?.seller_id],
    enabled: !!(product as any)?.seller_id,
    queryFn: async (): Promise<SellerInfo | null> => {
      const sellerId = (product as any)?.seller_id;
      if (!sellerId) return null;
      const { data } = await supabase
        .from("sellers")
        .select("id,store_name,store_logo,verification_status")
        .eq("id", sellerId)
        .maybeSingle();
      return data as SellerInfo | null;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["products", "related", product?.category_id],
    enabled: !!product?.category_id,
    queryFn: async (): Promise<ProductWithImages[]> => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)")
        .eq("is_active", true)
        .eq("category_id", product!.category_id!)
        .neq("id", product!.id)
        .limit(4);
      return (data ?? []) as ProductWithImages[];
    },
  });

  function handleAddToCart() {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addItem({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: Number(product.price),
        currency: product.currency,
        image: primaryImage(product),
        maxStock: product.stock,
      });
    }
    toast.success(`${qty} × ${product.title} added to cart`);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 rounded-xl" />
              <Skeleton className="h-6 w-1/4 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <ImageOff className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">Product not found</h2>
          <p className="text-sm text-muted-foreground">It may have been removed or the link is wrong.</p>
          <Button
            className="mt-2 text-white rounded-full px-6"
            style={{ background: "#E8611A" }}
            onClick={() => navigate({ to: "/shop" })}
          >
            Browse shop
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = sortedImages(product);
  const onSale = product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price);
  const discount = onSale ? Math.round((1 - Number(product.price) / Number(product.compare_at_price!)) * 100) : 0;
  const inStock = product.stock > 0;
  const displayImg = images[selectedImg]?.url ?? primaryImage(product);
  const wishlisted = hasItem(product.id);

  function handleWishlist() {
    toggle({
      productId: product!.id,
      slug: product!.slug,
      title: product!.title,
      price: Number(product!.price),
      currency: product!.currency,
      image: primaryImage(product!),
    });
    if (wishlisted) toast.success("Removed from wishlist");
    else toast.success("Saved to wishlist", { description: product!.title });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <span className="text-muted-foreground/50">/</span>
            <Link to="/shop" className="text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground line-clamp-1">{product.title}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Images */}
            <div className="space-y-3">
              <div className="aspect-square overflow-hidden rounded-2xl bg-[#F4F4F4]">
                {displayImg ? (
                  <img src={displayImg} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center opacity-20">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImg(i)}
                      className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        selectedImg === i ? "border-[#E8611A]" : "border-transparent hover:border-[#E8611A]/50"
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-5">
              {product.categories && (
                <Link
                  to="/shop"
                  search={{ category: (product.categories as { slug: string }).slug }}
                  className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#E8611A] hover:opacity-80"
                >
                  {(product.categories as { name: string }).name}
                </Link>
              )}

              <h1 className="text-3xl font-extrabold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                {product.title}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-foreground">
                  {formatPrice(product.price, product.currency, currency)}
                </span>
                {onSale && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price!, product.currency, currency)}
                    </span>
                    <Badge className="text-white text-xs font-bold px-2" style={{ background: "#E8611A" }}>
                      -{discount}%
                    </Badge>
                  </>
                )}
              </div>

              {product.description && (
                <p className="text-[15px] leading-relaxed text-muted-foreground">{product.description}</p>
              )}

              {/* Seller info */}
              {seller && seller.verification_status === "verified" && (
                <Link
                  to={`/store/${seller.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-[#E8611A]/40 hover:bg-orange-50/50 transition-all"
                  style={{ textDecoration: "none" }}
                >
                  <div className="h-9 w-9 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center flex-shrink-0">
                    {seller.store_logo ? (
                      <img src={seller.store_logo} alt={seller.store_name} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-4 w-4 text-[#E8611A]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sold by</p>
                    <p className="text-sm font-bold text-foreground">{seller.store_name}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-[#E8611A]">View Store →</span>
                </Link>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${inStock ? "bg-green-500" : "bg-destructive"}`} />
                <span className="text-sm font-medium">
                  {inStock ? `${product.stock} in stock` : "Out of stock"}
                </span>
              </div>

              {/* Qty + CTA */}
              {inStock && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">Quantity</span>
                    <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-l-xl transition-colors hover:bg-secondary"
                        disabled={qty <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{qty}</span>
                      <button
                        onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-r-xl transition-colors hover:bg-secondary"
                        disabled={qty >= product.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 text-white font-bold rounded-full py-6 text-base"
                      style={{ background: "#E8611A" }}
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Add to cart
                    </Button>
                    <button
                      onClick={handleWishlist}
                      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                      className="w-14 h-14 flex items-center justify-center rounded-full border border-border/60 transition-all hover:border-[#E8611A]"
                      style={{
                        background: wishlisted ? "#FEF0E8" : "#fff",
                        borderColor: wishlisted ? "#E8611A" : undefined,
                      }}
                    >
                      <Heart
                        className="h-5 w-5 transition-colors"
                        strokeWidth={1.8}
                        style={{ color: wishlisted ? "#E8611A" : "#6B6B6B", fill: wishlisted ? "#E8611A" : "none" }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related products */}
          {related && related.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-extrabold text-foreground mb-6" style={{ letterSpacing: "-0.02em" }}>
                You might also like
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
