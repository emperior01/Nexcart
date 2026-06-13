import { CheckCircle2, ShoppingBag, ArrowRight, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";

export default function OrderSuccessPage() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div
          style={{
            maxWidth: 480, width: "100%", textAlign: "center",
            background: "#fff", borderRadius: 24, padding: "40px 32px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0",
          }}
        >
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg,#22C55E,#16A34A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: "#fff" }} />
          </div>

          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 26, color: "#0D0D0D", margin: "0 0 8px" }}>
            Order Confirmed! 🎉
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.6 }}>
            Your payment was successful and your order has been placed. We'll send you a confirmation email shortly.
          </p>

          {ref && (
            <div style={{
              background: "#F9FAFB", borderRadius: 12, padding: "12px 16px",
              marginBottom: 28, border: "1px solid #E5E7EB",
            }}>
              <p style={{ fontSize: 11, color: "#9B9B9B", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Reference
              </p>
              <p style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 700, margin: 0, fontFamily: "monospace" }}>
                {ref}
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              to="/account/orders"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px", borderRadius: 14,
                background: "linear-gradient(135deg,#E8611A,#C4511A)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 4px 18px rgba(232,97,26,0.3)",
              }}
            >
              <ShoppingBag style={{ width: 17, height: 17 }} />
              View My Orders
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link
              to="/"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px", borderRadius: 14,
                border: "1.5px solid #E5E7EB", background: "#fff",
                color: "#3A3A3A", fontWeight: 700, fontSize: 14,
                textDecoration: "none",
              }}
            >
              <Home style={{ width: 15, height: 15 }} />
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
