import { useState } from "react";
import {
  CreditCard, ToggleLeft, ToggleRight, Save, ChevronDown, ChevronUp,
  Loader2, Bitcoin, Wallet, Globe, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import {
  useAllPaymentMethods,
  useTogglePaymentMethod,
  useUpdatePaymentMethod,
  type PaymentMethod,
} from "@/hooks/use-payment-methods";

// ── Provider logos / icons ────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { emoji: string; color: string; bg: string }> = {
  paystack:    { emoji: "🇳🇬", color: "#00C3F7", bg: "#E8F9FD" },
  flutterwave: { emoji: "🦋", color: "#F5A623", bg: "#FEF9EE" },
  stripe:      { emoji: "💳", color: "#635BFF", bg: "#F0EFFE" },
  paypal:      { emoji: "🅿️", color: "#003087", bg: "#EEF2FA" },
  crypto:      { emoji: "₿",  color: "#F7931A", bg: "#FEF6EC" },
};

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-secondary/20">
        <CreditCard className="h-4 w-4 text-primary" />
        <h2 className="font-extrabold text-foreground text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Crypto wallet config editor ────────────────────────────────────────────────
function CryptoConfig({
  method,
  onSave,
  saving,
}: {
  method: PaymentMethod;
  onSave: (wallets: Record<string, string>) => void;
  saving: boolean;
}) {
  const wallets = (method.config?.wallets ?? {}) as Record<string, string>;
  const [vals, setVals] = useState<Record<string, string>>(wallets);
  const coins = ["BTC", "ETH", "LTC", "USDT"];

  return (
    <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet Addresses</p>
      {coins.map((coin) => (
        <div key={coin} className="flex items-center gap-2">
          <span className="text-xs font-bold w-12 text-[#F7931A]">{coin}</span>
          <Input
            value={vals[coin] ?? ""}
            onChange={(e) => setVals((v) => ({ ...v, [coin]: e.target.value }))}
            placeholder={`${coin} wallet address`}
            className="flex-1 font-mono text-xs"
          />
        </div>
      ))}
      <Button
        size="sm"
        className="gap-1.5 text-white mt-2"
        style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
        disabled={saving}
        onClick={() => onSave(vals)}
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Save Wallets
      </Button>
    </div>
  );
}

// ── Payment method card ────────────────────────────────────────────────────────
function PaymentCard({ method }: { method: PaymentMethod }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useTogglePaymentMethod();
  const update = useUpdatePaymentMethod();
  const meta = PROVIDER_META[method.provider] ?? { emoji: "💰", color: "#6B7280", bg: "#F9FAFB" };
  const isActive = method.status === "active";

  function handleToggle() {
    toggle.mutate({ id: method.id, status: isActive ? "inactive" : "active" });
  }

  function handleSaveWallets(wallets: Record<string, string>) {
    update.mutate({
      id: method.id,
      patch: { config: { ...method.config, wallets } },
    });
  }

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden transition-all"
      style={{ borderColor: isActive ? "#E8611A40" : "#EBEBEB" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: meta.bg }}
        >
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-extrabold text-[#0D0D0D] text-sm">{method.name}</p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: isActive ? "#DCFCE7" : "#F3F4F6",
                color: isActive ? "#16A34A" : "#6B7280",
              }}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: method.type === "crypto" ? "#FEF6EC" : "#EEF2FF", color: method.type === "crypto" ? "#F7931A" : "#6366F1" }}
            >
              {method.type === "crypto" ? "Crypto" : "Fiat"}
            </span>
          </div>
          <p className="text-xs text-[#9B9B9B] mt-0.5 line-clamp-1">{method.description}</p>
          <p className="text-[10px] text-[#C0C0C0] mt-0.5">
            {method.supported_currencies.join(" · ")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggle.isPending}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
            style={{
              background: isActive ? "#FEF2F2" : "#F0FDF4",
              borderColor: isActive ? "#FECACA" : "#BBF7D0",
              color: isActive ? "#EF4444" : "#16A34A",
            }}
          >
            {toggle.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isActive ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
            {isActive ? "Disable" : "Enable"}
          </button>

          {/* Expand (only for crypto — has config to edit) */}
          {method.type === "crypto" && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-[#6B7280]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#6B7280]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Crypto wallet config */}
      {expanded && method.type === "crypto" && (
        <div className="px-4 pb-4">
          <CryptoConfig
            method={method}
            onSave={handleSaveWallets}
            saving={update.isPending}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPayments() {
  const { data: methods, isLoading } = useAllPaymentMethods();

  const fiat   = methods?.filter((m) => m.type === "fiat")   ?? [];
  const crypto = methods?.filter((m) => m.type === "crypto") ?? [];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8611A]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Payment Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable payment methods. Changes apply instantly at checkout for all customers.
        </p>
      </div>

      {/* Info banner */}
      <div
        className="rounded-2xl p-4 mb-6 flex items-start gap-3"
        style={{ background: "#FEF0E8", border: "1px solid #FDE8D8" }}
      >
        <Zap className="h-4 w-4 text-[#E8611A] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#E8611A]">Live Changes</p>
          <p className="text-xs text-[#C4511A] mt-0.5">
            Enabling or disabling a payment method takes effect immediately. Customers will see only active methods at checkout.
            API keys and secret credentials are managed via environment variables and are never exposed to the frontend.
          </p>
        </div>
      </div>

      {/* Fiat */}
      <Section title="Fiat Payment Methods">
        <div className="space-y-3">
          {fiat.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fiat methods found.</p>
          ) : (
            fiat.map((m) => <PaymentCard key={m.id} method={m} />)
          )}
        </div>
      </Section>

      {/* Crypto */}
      <Section title="Crypto Payment Methods">
        <div className="space-y-3">
          {crypto.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crypto methods found.</p>
          ) : (
            crypto.map((m) => <PaymentCard key={m.id} method={m} />)
          )}
        </div>
        <div className="mt-4 rounded-xl p-3 text-xs text-[#9B9B9B] bg-[#F9FAFB] border border-[#EBEBEB]">
          <strong className="text-[#6B7280]">How crypto payments work:</strong> Customer selects crypto at checkout →
          they see your wallet address + QR code → after sending, they submit their transaction hash →
          you verify and fulfill the order manually or via webhook.
        </div>
      </Section>

      {/* Architecture note */}
      <div className="rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] p-5 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-[#6B7280]" />
          <p className="text-sm font-extrabold text-[#0D0D0D]">Adding More Providers</p>
        </div>
        <p className="text-xs text-[#9B9B9B] leading-relaxed">
          To add a new payment provider: insert a row into the <code className="bg-[#F0F0F0] px-1 rounded">payment_methods</code> table
          with your provider details, then implement the checkout handler in <code className="bg-[#F0F0F0] px-1 rounded">Checkout.tsx</code>.
          No other files need to change — the system is plug-and-play.
        </p>
      </div>
    </div>
  );
}
