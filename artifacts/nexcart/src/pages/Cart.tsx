import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShoppingCart, ShoppingBag, Trash2, Plus, Minus,
  ArrowRight, Tag, X, ChevronLeft,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function CartPage() {
  const { items, removeItem, updateQty, total, clearCart, closeCart } = useCart();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const baseCurrency = items[0]?.currency ?? "USD";

  function handleApplyCoupon() {
    if (coupon.trim()) setCouponApplied(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
      {/* Page header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #EFEFEF",
          padding: "16px 20px",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => void navigate({ to: "/shop" })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: "#6B7280", padding: 0,
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Continue Shopping
          </button>

          <span style={{ color: "#E0E0E0", fontSize: 16 }}>|</span>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#FEF0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingCart style={{ width: 16, height: 16, color: "#E8611A" }} />
            </div>
            <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D", margin: 0 }}>
              Your Cart
            </h1>
            {itemCount > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 22, height: 22, borderRadius: 50, padding: "0 6px",
                background: "#E8611A", color: "#fff", fontSize: 11, fontWeight: 800,
              }}>
                {itemCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {items.length === 0 ? (
          /* ── Empty state ── */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 20, padding: "80px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 96, height: 96, borderRadius: 28,
              background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <ShoppingBag style={{ width: 44, height: 44, color: "#E8611A" }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: "#0D0D0D", margin: "0 0 8px" }}>
                Your cart is empty
              </p>
              <p style={{ fontSize: 14, color: "#9B9B9B", margin: 0, lineHeight: 1.6 }}>
                Looks like you haven't added anything yet.
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
                boxShadow: "0 4px 16px rgba(232,97,26,0.35)",
              }}
            >
              <ShoppingCart style={{ width: 17, height: 17 }} />
              Browse Products
            </Link>
          </div>
        ) : (
          /* ── Two-column layout ── */
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
          }}
            className="cart-grid"
          >
            {/* ── LEFT: item list ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Clear all */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={clearCart}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: "#9B9B9B", fontWeight: 600, padding: 0,
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                  Clear all
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    display: "flex", gap: 14, padding: "14px",
                    borderRadius: 16, border: "1px solid #F0F0F0",
                    background: "#fff",
                  }}
                >
                  {/* Image */}
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", background: "#F3F4F6", flexShrink: 0 }}>
                    {item.image ? (
                      <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ShoppingBag style={{ width: 28, height: 28, color: "#E8611A", opacity: 0.4 }} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <Link
                        to="/products/$slug"
                        params={{ slug: item.slug }}
                        style={{
                          fontWeight: 700, fontSize: 14, color: "#0D0D0D",
                          textDecoration: "none", lineHeight: 1.35,
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.title}
                      </Link>
                      <button
                        onClick={() => removeItem(item.productId)}
                        aria-label="Remove item"
                        style={{
                          width: 28, height: 28, borderRadius: 8, background: "#FFF1F2",
                          border: "none", cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          color: "#EF4444", flexShrink: 0,
                        }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>

                    <p style={{ fontSize: 16, fontWeight: 800, color: "#E8611A", margin: 0 }}>
                      {formatPrice(item.price, item.currency, currency)}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      {/* Qty stepper */}
                      <div style={{
                        display: "flex", alignItems: "center",
                        border: "1px solid #E5E7EB", borderRadius: 10,
                        overflow: "hidden", background: "#F9FAFB",
                      }}>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          aria-label="Decrease"
                          style={{
                            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", background: "transparent", cursor: "pointer", color: "#6B7280",
                          }}
                        >
                          <Minus style={{ width: 13, height: 13 }} />
                        </button>
                        <span style={{ minWidth: 32, textAlign: "center", fontSize: 14, fontWeight: 800, color: "#0D0D0D" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label="Increase"
                          style={{
                            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                            border: "none", background: "transparent",
                            cursor: item.quantity >= item.maxStock ? "not-allowed" : "pointer",
                            color: "#6B7280",
                            opacity: item.quantity >= item.maxStock ? 0.35 : 1,
                          }}
                        >
                          <Plus style={{ width: 13, height: 13 }} />
                        </button>
                      </div>

                      {/* Line total */}
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#6B7280" }}>
                        {formatPrice(item.price * item.quantity, item.currency, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── RIGHT: order summary ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Coupon */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F0F0", padding: "16px" }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#0D0D0D", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag style={{ width: 15, height: 15, color: "#E8611A" }} />
                  Promo Code
                </p>
                {couponApplied ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>"{coupon}" applied!</span>
                    <button
                      onClick={() => { setCoupon(""); setCouponApplied(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}
                    >
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                      placeholder="Enter coupon code"
                      style={{
                        flex: 1, padding: "10px 12px", borderRadius: 10,
                        border: "1.5px solid #E5E7EB", fontSize: 13, outline: "none",
                        fontFamily: "'Inter',sans-serif",
                      }}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!coupon.trim()}
                      style={{
                        padding: "10px 16px", borderRadius: 10, border: "none",
                        background: coupon.trim() ? "#E8611A" : "#F3F4F6",
                        color: coupon.trim() ? "#fff" : "#9B9B9B",
                        fontWeight: 700, fontSize: 13, cursor: coupon.trim() ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F0F0", padding: "16px" }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: "#0D0D0D", margin: "0 0 14px" }}>Order Summary</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                      Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0D0D0D" }}>
                      {formatPrice(total, baseCurrency, currency)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Shipping</span>
                    <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 700 }}>Calculated at checkout</span>
                  </div>

                  {couponApplied && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>Coupon discount</span>
                      <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 700 }}>–</span>
                    </div>
                  )}

                  <div style={{ height: 1, background: "#F3F4F6", margin: "4px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#0D0D0D" }}>Estimated Total</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#E8611A" }}>
                      {formatPrice(total, baseCurrency, currency)}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <Link
                  to="/checkout"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    marginTop: 18, padding: "15px", borderRadius: 14,
                    background: "linear-gradient(135deg,#E8611A,#C4511A)",
                    color: "#fff", fontWeight: 800, fontSize: 15,
                    textDecoration: "none",
                    boxShadow: "0 4px 18px rgba(232,97,26,0.35)",
                  }}
                >
                  Proceed to Checkout
                  <ArrowRight style={{ width: 17, height: 17 }} />
                </Link>

                <p style={{ fontSize: 11, color: "#9B9B9B", textAlign: "center", marginTop: 10 }}>
                  Secure checkout · Paystack encrypted
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Responsive grid style injected inline so no extra CSS file is needed */}
      <style>{`
        @media (min-width: 680px) {
          .cart-grid {
            grid-template-columns: 1fr 340px !important;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}
