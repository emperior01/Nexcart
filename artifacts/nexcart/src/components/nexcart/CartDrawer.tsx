import { X, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, clearCart } = useCart();
  const { currency } = useCurrency();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-base font-extrabold text-foreground">
              Your Cart
              {items.length > 0 && (
                <span className="ml-2 text-xs font-semibold text-muted-foreground">
                  ({items.length} {items.length === 1 ? "item" : "items"})
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "#FEF0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart style={{ width: 32, height: 32, color: "#E8611A" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 16, color: "#0D0D0D" }}>Your cart is empty</p>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Browse products and add them here.</p>
              </div>
              <Button
                size="sm"
                onClick={closeCart}
                className="text-white"
                style={{ background: "#E8611A", borderRadius: 50, padding: "10px 24px", fontWeight: 700 }}
                asChild
              >
                <Link to="/shop">Shop Now</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full opacity-20" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <Link
                      to={`/products/${item.slug}`}
                      onClick={closeCart}
                      className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm font-extrabold text-primary">
                      {formatPrice(item.price, item.currency, currency)}
                    </p>

                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="grid h-6 w-6 place-items-center rounded border border-border/60 text-muted-foreground hover:bg-secondary"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-bold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="grid h-6 w-6 place-items-center rounded border border-border/60 text-muted-foreground hover:bg-secondary disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border/50 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Subtotal</span>
              <span className="font-extrabold text-foreground text-base">
                {formatPrice(total, items[0]?.currency ?? "USD", currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping & taxes calculated at checkout
            </p>
            <Button
              className="w-full h-11 font-bold text-white"
              style={{ background: "linear-gradient(135deg, #E8611A, #F5986A)" }}
              asChild
              onClick={closeCart}
            >
              <Link to="/checkout">Proceed to Checkout</Link>
            </Button>
            <button
              onClick={clearCart}
              className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
