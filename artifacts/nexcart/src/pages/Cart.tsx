import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight,
  ShoppingBag, Tag, ArrowLeft,
} from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function CartPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCart();
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F9F9]">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate({ to: "/shop" })}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors"
            style={{ border: "1px solid #E5E7EB" }}
            aria-label="Back to shop"
          >
            <ArrowLeft style={{ width: 16, height: 16, color: "#6B7280" }} />
          </button>
          <div>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: "#0D0D0D", margin: 0, letterSpacing: "-0.02em" }}>
              Your Cart
            </h1>
            <p style={{ fontSize: 13, color: "#9B9B9B", margin: 0 }}>
              {itemCount === 0 ? "No items" : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </p>
          </div>
        </div>

        {items.length === 0 ? (

          /* ── Empty state ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag style={{ width: 44, height: 44, color: "#E8611A" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#0D0D0D", margin: "0 0 8px" }}>
                Your cart is empty
              </p>
              <p style={{ fontSize: 14, color: "#9B9B9B", margin: 0, lineHeight: 1.6 }}>
                Looks like you haven't added anything yet. Start shopping!
              </p>
            </div>
            <Link
              to="/shop"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 32px", borderRadius: 50,
                background: "linear-gradient(135deg,#E8611A,#C4511A)",
                color: "#fff", fontWeight: 700, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(232,97,26,0.35)",
              }}
            >
              <ShoppingCart style={{ width: 17, height: 17 }} />
              Browse Products
            </Link>
          </div>

        ) : (

          /* ── Cart layout ── */
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }} className="lg:grid-cols-cart">
            <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr" }} className="md:cart-main">

              {/* Items list + layout grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Items */}
                <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #EFEFEF", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0D0D0D" }}>
                      Items ({itemCount})
                    </span>
                    <button
                      onClick={clearCart}
                      style={{ fontSize: 12, color: "#9B9B9B", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                    >
                      Clear all
                    </button>
                  </div>

                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          display: "flex", gap: 14, padding: "14px 12px",
                          borderRadius: 14, border: "1px solid #F0F0F0",
                          background: "#FAFAFA",
                        }}
                      >
                        {/* Image */}
                        <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", background: "#F3F4F6", flexShrink: 0 }}>
                          {item.image ? (
                            <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ShoppingBag style={{ width: 28, height: 28, color: "#E8611A", opacity: 0.4 }} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                          <Link
                            to="/products/$slug"
                            params={{ slug: item.slug }}
                            style={{ fontWeight: 700, fontSize: 14, color: "#0D0D0D", textDecoration: "none", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                          >
                            {item.title}
                          </Link>

                          <p style={{ fontSize: 16, fontWeight: 800, color: "#E8611A", margin: 0 }}>
                            {formatPrice(item.price, item.currency, currency)}
                          </p>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                            {/* Qty stepper */}
                            <div style={{ display: "flex", alignItems: "center", border: "1px solid #E5E7EB", borderRadius: 9, overflow: "hidden", background: "#fff" }}>
                              <button
                                onClick={() => updateQty(item.productId, item.quantity - 1)}
                                aria-label="Decrease"
                                style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", color: "#6B7280" }}
                              >
                                <Minus style={{ width: 13, height: 13 }} />
                              </button>
                              <span style={{ minWidth: 32, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0D0D0D" }}>
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQty(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= item.maxStock}
                                aria-label="Increase"
                                style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: item.quantity >= item.maxStock ? "not-allowed" : "pointer", color: "#6B7280", opacity: item.quantity >= item.maxStock ? 0.35 : 1 }}
                              >
                                <Plus style={{ width: 13, height: 13 }} />
                              </button>
                            </div>

                            {/* Line total + remove */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#6B7280" }}>
                                {formatPrice(item.price * item.quantity, item.currency, currency)}
                              </span>
                              <button
                                onClick={() => removeItem(item.productId)}
                                aria-label="Remove item"
                                style={{ width: 32, height: 32, borderRadius: 9, background: "#FFF1F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}
                              >
                                <Trash2 style={{ width: 15, height: 15 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promo code hint */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 14, border: "1.5px dashed #E8611A30", background: "#FFF8F5" }}>
                  <Tag style={{ width: 16, height: 16, color: "#E8611A", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#6B7280" }}>Have a promo code? You can apply it at checkout.</span>
                </div>

              </div>

              {/* Order summary */}
              <div>
                <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #EFEFEF", padding: "20px" }}>
                  <h2 style={{ fontWeight: 800, fontSize: 15, color: "#0D0D0D", margin: "0 0 16px" }}>
                    Order Summary
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Subtotal ({itemCount} items)</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0D0D0D" }}>
                        {formatPrice(total, items[0]?.currency ?? "USD", currency)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Delivery</span>
                      <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 700 }}>Calculated at checkout</span>
                    </div>

                    <div style={{ height: 1, background: "#F0F0F0", margin: "6px 0" }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0D0D0D" }}>Total</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: "#E8611A" }}>
                        {formatPrice(total, items[0]?.currency ?? "USD", currency)}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginTop: 20, padding: "15px", borderRadius: 14,
                      background: "linear-gradient(135deg,#E8611A,#C4511A)",
                      color: "#fff", fontWeight: 800, fontSize: 15,
                      textDecoration: "none",
                      boxShadow: "0 4px 18px rgba(232,97,26,0.35)",
                    }}
                  >
                    Proceed to Checkout
                    <ArrowRight style={{ width: 17, height: 17 }} />
                  </Link>

                  <Link
                    to="/shop"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginTop: 12, padding: "10px",
                      borderRadius: 12, border: "1px solid #E5E7EB",
                      color: "#6B7280", fontWeight: 600, fontSize: 13,
                      textDecoration: "none", background: "#FAFAFA",
                    }}
                  >
                    <ArrowLeft style={{ width: 14, height: 14 }} />
                    Continue Shopping
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
