import { Link } from "@tanstack/react-router";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

export default function WishlistPage() {
  const { items, removeItem, loading } = useWishlist();
  const { addItem, openCart } = useCart();
  const { currency } = useCurrency();

  function handleAddToCart(item: typeof items[number]) {
    addItem({
      productId: item.productId,
      slug: item.slug,
      title: item.title,
      price: item.price,
      currency: item.currency,
      image: item.image,
      maxStock: 99,
    });
    toast.success("Added to cart", { description: item.title });
    openCart();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Wishlist
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.length === 0
                ? "No saved items yet"
                : `${items.length} saved item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {items.length > 0 && (
            <Link to="/shop">
              <Button variant="outline" size="sm" className="text-sm font-semibold rounded-full">
                Continue shopping
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4">
                <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/4 rounded" />
                </div>
                <Skeleton className="w-24 h-8 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#FEF0E8" }}>
              <Heart className="h-7 w-7" style={{ color: "#E8611A" }} />
            </div>
            <h3 className="font-extrabold text-foreground mb-1 text-lg">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Save items you love by tapping the heart icon on any product.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "#E8611A" }}
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
              >
                <Link
                  to="/products/$slug"
                  params={{ slug: item.slug }}
                  className="flex-shrink-0"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F4F4F4]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to="/products/$slug"
                    params={{ slug: item.slug }}
                    className="font-semibold text-[15px] text-foreground hover:text-[#E8611A] transition-colors line-clamp-2 leading-snug"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-[15px] font-bold" style={{ color: "#E8611A" }}>
                    {formatPrice(item.price, item.currency, currency)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    className="hidden sm:flex gap-1.5 text-white font-semibold rounded-full text-xs px-4"
                    style={{ background: "#E8611A" }}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Add to cart
                  </Button>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                    style={{ background: "#FEF0E8", color: "#E8611A" }}
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      removeItem(item.productId);
                      toast.success("Removed from wishlist");
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-red-50"
                    style={{ color: "#9B9B9B" }}
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
