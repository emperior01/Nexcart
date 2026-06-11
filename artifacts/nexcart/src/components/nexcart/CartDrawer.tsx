import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, clearCart } = useCart();
  const { currency } = useCurrency();

  if (!isOpen) return null;

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
        onClick={closeCart}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full flex-col bg-white"
        style={{ width: "min(420px, 100vw)", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEF0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart style={{ width: 18, height: 18, color: "#E8611A" }} />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#0D0D0D", margin: 0 }}>
                  Your Cart
                </h2>
                <p style={{ fontSize: 12, color: "#9B9B9B", margin: 0 }}>
                  {itemCount === 0 ? "No items" : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                </p>
              </div>
            </div>
            <button
              onClick={closeCart}
              aria-label="Close cart"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 16, height: 16, color: "#6B7280" }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {items.length === 0 ? (
            /* Empty state */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingBag style={{ width: 36, height: 36, color: "#E8611A" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D", margin: "0 0 6px" }}>
                  Your cart is empty
                </p>
                <p style={{ fontSize: 13, color: "#9B9B9B", margin: 0, lineHeight: 1.5 }}>
                  Looks like you haven't added anything yet. Start shopping!
                </p>
              </div>
              <button
                onClick={closeCart}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 28px", borderRadius: 50,
                  background: "linear-gradient(135deg,#E8611A,#C4511A)",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(232,97,26,0.35)",
                }}
                // @ts-ignore
                as="span"
                onClick={() => { closeCart(); }}
              >
                <ShoppingCart style={{ width: 16, height: 16 }} />
                Browse Products
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    display: "flex", gap: 12, padding: "12px",
                    borderRadius: 14, border: "1px solid #F0F0F0",
                    background: "#FAFAFA",
                  }}
                >
                  {/* Image */}
                  <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", background: "#F3F4F6", flexShrink: 0 }}>
                    {item.image ? (
                      <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ShoppingBag style={{ width: 24, height: 24, color: "#E8611A", opacity: 0.4 }} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <Link
                      to="/products/$slug"
                      params={{ slug: item.slug }}
                      onClick={closeCart}
                      style={{ fontWeight: 700, fontSize: 13, color: "#0D0D0D", textDecoration: "none", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                    >
                      {item.title}
                    </Link>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#E8611A", margin: 0 }}>
                      {formatPrice(item.price, item.currency, currency)}
                    </p>

                    {/* Qty + Remove */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          aria-label="Decrease"
                          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", color: "#6B7280" }}
                        >
                          <Minus style={{ width: 12, height: 12 }} />
                        </button>
                        <span style={{ minWidth: 28, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0D0D0D" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label="Increase"
                          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: item.quantity >= item.maxStock ? "not-allowed" : "pointer", color: "#6B7280", opacity: item.quantity >= item.maxStock ? 0.35 : 1 }}
                        >
                          <Plus style={{ width: 12, height: 12 }} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        aria-label="Remove item"
                        style={{ width: 30, height: 30, borderRadius: 8, background: "#FFF1F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ borderTop: "1px solid #F3F4F6", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Order summary */}
            <div style={{ background: "#FAFAFA", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Subtotal ({itemCount} items)</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0D0D0D" }}>
                  {formatPrice(total, items[0]?.currency ?? "USD", currency)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Delivery</span>
                <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 700 }}>Calculated at checkout</span>
              </div>
              <div style={{ height: 1, background: "#EFEFEF", margin: "2px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0D0D0D" }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#E8611A" }}>
                  {formatPrice(total, items[0]?.currency ?? "USD", currency)}
                </span>
              </div>
            </div>

            {/* Promo hint */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "1.5px dashed #E8611A20", background: "#FFF8F5" }}>
              <Tag style={{ width: 14, height: 14, color: "#E8611A", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#6B7280" }}>Have a promo code? Apply it at checkout.</span>
            </div>

            {/* Checkout button */}
            <Link
              to="/checkout"
              onClick={closeCart}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px", borderRadius: 14,
                background: "linear-gradient(135deg,#E8611A,#C4511A)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 4px 18px rgba(232,97,26,0.35)",
              }}
            >
              Proceed to Checkout
              <ArrowRight style={{ width: 17, height: 17 }} />
            </Link>

            <button
              onClick={clearCart}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9B9B9B", textAlign: "center", padding: "2px 0" }}
            >
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
