import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, ArrowLeft, CreditCard } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        metadata?: Record<string, unknown>;
        onSuccess: (tx: { reference: string }) => void;
        onCancel: () => void;
      }) => { openIframe: () => void };
    };
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { currency } = useCurrency();
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">Your cart is empty</h2>
          <Button variant="outline" asChild>
            <Link to="/shop"><ArrowLeft className="mr-2 h-4 w-4" />Browse products</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const cartCurrency = items[0]?.currency ?? "USD";
  const paystackAmount = Math.round(total * 100);

  async function loadPaystack(): Promise<void> {
    return new Promise((resolve) => {
      if (window.PaystackPop) return resolve();
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  async function handleCheckout() {
    if (!email || !fullName || !address || !city || !country) {
      toast.error("Please fill in all shipping details.");
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error("Payment is not configured yet.");
      return;
    }
    setLoading(true);
    try {
      await loadPaystack();
      const ref = `NEXCART_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: paystackAmount,
        currency: cartCurrency,
        ref,
        metadata: {
          custom_fields: [
            { display_name: "Customer", variable_name: "customer", value: fullName },
            { display_name: "Address", variable_name: "address", value: `${address}, ${city}, ${country}` },
          ],
        },
        onSuccess: async (tx) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await supabase.functions.invoke("verify-payment", {
              body: {
                reference: tx.reference,
                currency: cartCurrency,
                items: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  currency: item.currency,
                })),
                shippingAddress: { full_name: fullName, address, city, country },
              },
              headers: session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {},
            });

            if (res.error) throw new Error(res.error.message);

            clearCart();
            toast.success("Payment confirmed! Order placed. 🎉");
            void navigate({ to: "/account" });
          } catch {
            toast.error("Payment received but order creation failed. Contact support with ref: " + tx.reference);
            setLoading(false);
          }
        },
        onCancel: () => {
          toast.info("Payment cancelled.");
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch {
      toast.error("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/shop"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-2xl font-black text-foreground">Checkout</h1>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <h2 className="font-extrabold text-foreground text-base">Contact & Shipping</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Street Address *</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City *</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country *</Label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                <h2 className="font-extrabold text-foreground text-base mb-4">Order Summary</h2>
                <ul className="space-y-3 divide-y divide-border/50">
                  {items.map((item) => (
                    <li key={item.productId} className="flex items-center gap-3 pt-3 first:pt-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.image && <img src={item.image} alt={item.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 text-xs font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">
                        {formatPrice(item.price * item.quantity, item.currency, currency)}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatPrice(total, cartCurrency, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-border/50 pt-2">
                    <span>Total</span>
                    <span>{formatPrice(total, cartCurrency, currency)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-12 gap-2 font-bold text-white text-base"
                style={{ background: "linear-gradient(135deg, #E8611A, #F5986A)" }}
              >
                <CreditCard className="h-5 w-5" />
                {loading ? "Preparing payment…" : `Pay ${formatPrice(total, cartCurrency, currency)}`}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                🔒 Secured by Paystack · End-to-end encrypted
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
