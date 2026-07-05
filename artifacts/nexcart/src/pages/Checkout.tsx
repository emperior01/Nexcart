import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, ArrowLeft, CreditCard, Loader2, Bitcoin, Copy, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { sanitizeText } from "@/lib/sanitize";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useActivePaymentMethods, useUserPaymentPreference, type PaymentMethod } from "@/hooks/use-payment-methods";
import { toast } from "sonner";

async function verifyAndCreateOrder(
  reference: string,
  items: { productId: string; quantity: number; price: number; currency: string }[],
  shippingAddress: { full_name: string; address: string; city: string; country: string },
  cartCurrency: string
) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("bright-function", {
    body: { reference, currency: cartCurrency, items, shippingAddress },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ── Crypto Payment Panel ────────────────────────────────────────────────────
function CryptoPaymentPanel({
  method,
  total,
  cartCurrency,
  onCancel,
}: {
  method: PaymentMethod;
  total: number;
  cartCurrency: string;
  onCancel: () => void;
}) {
  const [selectedCoin, setSelectedCoin] = useState<string>(method.supported_currencies[0] ?? "BTC");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const wallets = (method.config?.wallets ?? {}) as Record<string, string>;
  const walletAddress = wallets[selectedCoin] ?? "";

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function submitTxHash() {
    if (!txHash.trim()) { toast.error("Please enter your transaction hash."); return; }
    toast.success("Transaction submitted! Your order will be confirmed after verification.");
  }

  return (
    <div className="rounded-2xl border border-[#F0F0F0] bg-[#FAFAFA] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bitcoin className="h-4 w-4 text-[#F7931A]" />
        <p className="font-extrabold text-[#0D0D0D] text-sm">Pay with Crypto</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {method.supported_currencies.map((coin) => (
          <button
            key={coin}
            onClick={() => setSelectedCoin(coin)}
            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={{
              background: selectedCoin === coin ? "#F7931A" : "#fff",
              color: selectedCoin === coin ? "#fff" : "#6B7280",
              borderColor: selectedCoin === coin ? "#F7931A" : "#E5E7EB",
            }}
          >
            {coin}
          </button>
        ))}
      </div>

      {walletAddress ? (
        <>
          <div className="bg-white rounded-xl border border-[#EBEBEB] p-4">
            <p className="text-xs text-[#9B9B9B] mb-1">Send exactly</p>
            <p className="font-extrabold text-[#0D0D0D] text-base">{total.toFixed(8)} {selectedCoin}</p>
            <p className="text-xs text-[#9B9B9B] mt-1">(≈ {formatPrice(total, cartCurrency, cartCurrency)} at checkout rate)</p>
          </div>

          <div className="bg-white rounded-xl border border-[#EBEBEB] p-4">
            <p className="text-xs text-[#9B9B9B] mb-2">To this {selectedCoin} address:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-[#0D0D0D] font-mono break-all bg-[#F9FAFB] p-2 rounded-lg">
                {walletAddress}
              </code>
              <button
                onClick={copyAddress}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors flex-shrink-0"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-[#6B7280]" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction Hash (after sending)</Label>
            <Input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x... or txid..."
              className="font-mono text-xs"
            />
          </div>

          <Button
            onClick={submitTxHash}
            className="w-full text-white font-bold"
            style={{ background: "linear-gradient(135deg,#F7931A,#E8611A)" }}
          >
            I've Sent the Payment
          </Button>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 text-center">
          <p className="text-sm text-[#9B9B9B]">
            {selectedCoin} wallet not configured yet. Please choose another coin or contact support.
          </p>
        </div>
      )}

      <button onClick={onCancel} className="text-xs text-[#9B9B9B] hover:text-[#6B7280] underline w-full text-center">
        ← Back to payment methods
      </button>
    </div>
  );
}

// ── Main Checkout Page ────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const { currency } = useCurrency();
  const { data: paymentMethods, isLoading: loadingMethods } = useActivePaymentMethods();
  const { data: preferredMethodId } = useUserPaymentPreference();

  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showCrypto, setShowCrypto] = useState(false);

  useEffect(() => {
    if (!paymentMethods || paymentMethods.length === 0 || selectedMethod) return;
    if (preferredMethodId) {
      const preferred = paymentMethods.find((m) => m.id === preferredMethodId);
      if (preferred) { setSelectedMethod(preferred); return; }
    }
    setSelectedMethod(paymentMethods[0]);
  }, [paymentMethods, preferredMethodId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle Paystack redirect-back ─────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let reference = params.get("reference") ?? params.get("trxref");
    if (!reference) return;
    window.history.replaceState({}, "", window.location.pathname);
    const saved = sessionStorage.getItem("nexcart_checkout");
    if (!saved) { toast.error("Session lost. Contact support with ref: " + reference); return; }
    let parsed: {
      savedItems: typeof items;
      shippingAddress: { full_name: string; address: string; city: string; country: string };
      cartCurrency: string;
      checkoutSessionId?: string | null;
    };
    try { parsed = JSON.parse(saved); } catch {
      toast.error("Session data corrupted. Contact support with ref: " + reference); return;
    }
    setVerifying(true);
    verifyAndCreateOrder(
      reference,
      parsed.savedItems.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, currency: i.currency })),
      parsed.shippingAddress,
      parsed.cartCurrency
    )
      .then(() => {
        // Best-effort — see the create-side comment in handlePaystackCheckout.
        // The order is already created and confirmed at this point regardless
        // of whether this call succeeds.
        if (parsed.checkoutSessionId) {
          fetch("/api/checkout/session", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: parsed.checkoutSessionId }),
          }).catch(() => {});
        }
        clearCart();
        sessionStorage.removeItem("nexcart_checkout");
        void navigate({ to: "/order-success", search: { ref: reference as string } });
      })
      .catch((err) => {
        toast.error("Order creation failed. Ref: " + reference + " — " + err.message);
        setVerifying(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (verifying) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#E8611A]" />
          <h2 className="text-xl font-bold text-foreground">Confirming your payment…</h2>
          <p className="text-sm text-muted-foreground">Please wait, do not close this page.</p>
        </div>
        <Footer />
      </div>
    );
  }

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

  const cartCurrency = items[0]?.currency ?? "NGN";
  const paystackAmount = Math.round(total * 100);

  function validateForm() {
    if (!email || !fullName || !address || !city || !country) {
      toast.error("Please fill in all shipping details.");
      return false;
    }
    return true;
  }

  async function handlePaystackCheckout() {
    if (!validateForm()) return;
    setLoading(true);

    const shippingAddress = {
      full_name: sanitizeText(fullName, 150),
      address: sanitizeText(address, 300),
      city: sanitizeText(city, 100),
      country: sanitizeText(country, 100),
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("initialize-payment", {
        body: {
          email,
          amount: paystackAmount,
          currency: cartCurrency,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (res.error) {
        console.error("[Checkout] initialize-payment error:", res.error);
        throw new Error(res.error.message ?? "Failed to initialize payment");
      }

      const { authorization_url, reference } = res.data as {
        authorization_url: string;
        reference: string;
      };

      if (!authorization_url) {
        console.error("[Checkout] No authorization_url in response:", res.data);
        throw new Error("Paystack did not return a checkout URL");
      }

      // Best-effort checkout session tracking (120-min expiry, server-side).
      // Purely observational — doesn't gate or alter anything below.
      let checkoutSessionId: string | null = null;
      try {
        const trackRes = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ cartSnapshot: items }),
        });
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          checkoutSessionId = trackData.checkoutSessionId ?? null;
        }
      } catch (_) {
        // Non-fatal — checkout proceeds regardless.
      }

      sessionStorage.setItem(
        "nexcart_checkout",
        JSON.stringify({ savedItems: items, shippingAddress, cartCurrency, reference, checkoutSessionId })
      );

      console.log("[Checkout] Redirecting to Paystack:", authorization_url);
      window.location.href = authorization_url;

    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment initialization failed";
      console.error("[Checkout] error:", err);
      toast.error(message);
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!selectedMethod) { toast.error("Please select a payment method."); return; }
    if (selectedMethod.provider === "paystack") { await handlePaystackCheckout(); return; }
    if (selectedMethod.type === "crypto") {
      if (!validateForm()) return;
      setShowCrypto(true);
      return;
    }
    toast.info(`${selectedMethod.name} integration coming soon.`);
  }

  const PROVIDER_META: Record<string, { emoji: string }> = {
    paystack: { emoji: "🇳🇬" }, flutterwave: { emoji: "🦋" },
    stripe: { emoji: "💳" }, paypal: { emoji: "🅿️" }, crypto: { emoji: "₿" },
  };

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

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {/* Shipping */}
              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <h2 className="font-extrabold text-foreground text-base">Contact & Shipping</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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

              {/* Payment Method Selection */}
              <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <h2 className="font-extrabold text-foreground text-base">Payment Method</h2>

                {loadingMethods ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…
                  </div>
                ) : paymentMethods?.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No payment methods available. Please contact support.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods?.map((method) => {
                      const meta = PROVIDER_META[method.provider] ?? { emoji: "💰" };
                      const isSelected = selectedMethod?.id === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => { setSelectedMethod(method); setShowCrypto(false); }}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all"
                          style={{
                            borderColor: isSelected ? "#E8611A" : "#F0F0F0",
                            background: isSelected ? "#FFF8F5" : "#FAFAFA",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: isSelected ? "#FEF0E8" : "#F3F4F6" }}
                          >
                            {meta.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#0D0D0D] text-sm">{method.name}</p>
                            <p className="text-xs text-[#9B9B9B] truncate">{method.description}</p>
                          </div>
                          <div
                            className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all"
                            style={{
                              borderColor: isSelected ? "#E8611A" : "#D1D5DB",
                              background: isSelected ? "#E8611A" : "transparent",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {showCrypto && selectedMethod?.type === "crypto" && (
                  <CryptoPaymentPanel
                    method={selectedMethod}
                    total={total}
                    cartCurrency={cartCurrency}
                    onCancel={() => setShowCrypto(false)}
                  />
                )}
              </div>
            </div>

            {/* Order Summary */}
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

              {!showCrypto && (
                <Button
                  onClick={handleCheckout}
                  disabled={loading || loadingMethods || !selectedMethod}
                  className="w-full h-12 gap-2 font-bold text-white text-base"
                  style={{ background: "linear-gradient(135deg, #E8611A, #F5986A)" }}
                >
                  <CreditCard className="h-5 w-5" />
                  {loading
                    ? "Redirecting to payment…"
                    : selectedMethod
                    ? `Pay with ${selectedMethod.name}`
                    : `Pay ${formatPrice(total, cartCurrency, currency)}`}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                🔒 Secured · End-to-end encrypted
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
