import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

export default function AccountWishlist() {
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
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <Heart className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Wishlist</h2>
          {items.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-[#9B9B9B]">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#F0F0F0]">
                  <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-3">
                <Heart className="h-6 w-6 text-[#E8611A]" />
              </div>
              <h3 className="font-extrabold text-[#0D0D0D] mb-1">Your wishlist is empty</h3>
              <p className="text-sm text-[#9B9B9B] mb-5">
                Tap the heart icon on any product to save it here.
              </p>
              <Button className="text-white rounded-full px-6" style={{ background: "#E8611A" }} asChild>
                <Link to="/shop">Browse products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#F0F0F0] hover:border-[#E8611A]/20 transition-colors"
                >
                  <Link
                    to="/products/$slug"
                    params={{ slug: item.slug }}
                    className="flex-shrink-0"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F4F4F4]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="1">
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
                      className="font-semibold text-sm text-[#0D0D0D] hover:text-[#E8611A] transition-colors line-clamp-2"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm font-bold" style={{ color: "#E8611A" }}>
                      {formatPrice(item.price, item.currency, currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(item)}
                      className="hidden sm:flex gap-1.5 text-white font-semibold rounded-full text-xs px-3"
                      style={{ background: "#E8611A" }}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add
                    </Button>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full"
                      style={{ background: "#FEF0E8", color: "#E8611A" }}
                      aria-label="Add to cart"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        removeItem(item.productId);
                        toast.success("Removed from wishlist");
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                      style={{ color: "#9B9B9B" }}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
