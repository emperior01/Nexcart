import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Zap, Star, Minus, Plus, ImageOff } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { currency } = useCurrency();
  const { addItem, openCart } = useCart();
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
    openCart();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3 rounded-xl" />
              <Skeleton className="h-6 w-1/3 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
          </div>
        </div>
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
          <Button variant="outline" asChild>
            <Link to="/shop"><ArrowLeft className="mr-2 h-4 w-4" />Back to Shop</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = sortedImages(product);
  const onSale = product.compare_at_price != null && Number(product.compare_at_price) > Number(product.price);
  const discount = onSale
    ? Math.round((1 - Number(product.price) / Number(product.compare_at_price!)) * 100)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-primary">Shop</Link>
            {product.categories && (
              <>
                <span>/</span>
                <Link to="/shop" search={{ category: product.categories.slug }} className="hover:text-primary">
                  {product.categories.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="line-clamp-1 text-foreground font-medium">{product.title}</span>
          </nav>

          {/* Product grid */}
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Images */}
            <div className="space-y-3">
              {/* Main image */}
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted border border-border/50">
                {images[selectedImg]?.url ? (
                  <img
                    src={images[selectedImg].url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full opacity-10"
                    style={{ background: "var(--gradient-brand)" }}
                  />
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImg(i)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        i === selectedImg ? "border-primary shadow-[var(--shadow-elegant)]" : "border-border/50"
                      }`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-5">
              {product.categories && (
                <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                  {product.categories.name}
                </span>
              )}
              <h1 className="text-2xl font-black text-foreground leading-tight sm:text-3xl">
                {product.title}
              </h1>

              {/* Rating placeholder */}
              <div className="flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                ))}
                <span className="text-xs text-muted-foreground ml-1">4.8 (128 reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-foreground">
                  {formatPrice(product.price, product.currency, currency)}
                </span>
                {onSale && (
                  <>
                    <span className="text-base text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price!, product.currency, currency)}
                    </span>
                    <Badge
                      className="border-0 text-[oklch(0.14_0.06_75)] font-bold shadow-[var(--shadow-gold)]"
                      style={{ background: "var(--gradient-gold)" }}
                    >
                      <Zap className="mr-1 h-3 w-3 fill-current" />
                      {discount}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${product.stock > 0 ? "bg-green-500" : "bg-red-500"}`} />
                <span className={`text-sm font-semibold ${product.stock > 0 ? "text-green-600" : "text-destructive"}`}>
                  {product.stock > 0 ? `In Stock (${product.stock} left)` : "Out of Stock"}
                </span>
              </div>

              {/* Qty + Add to Cart */}
              {product.stock > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="grid h-10 w-10 place-items-center rounded-l-xl text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-bold text-foreground">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(Math.min(product.stock, qty + 1))}
                      className="grid h-10 w-10 place-items-center rounded-r-xl text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    size="lg"
                    className="flex-1 gap-2 font-bold text-[oklch(0.14_0.06_75)] shadow-[var(--shadow-gold)]"
                    style={{ background: "var(--gradient-gold)" }}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </Button>
                </div>
              )}

              <div className="mt-2 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p>✅ Secure checkout via Paystack</p>
                <p>🚚 Free shipping on orders over $50</p>
                <p>🔄 30-day easy returns</p>
              </div>
            </div>
          </div>

          {/* Related products */}
          {(related ?? []).length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-xl font-extrabold text-foreground">You might also like</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {related!.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
