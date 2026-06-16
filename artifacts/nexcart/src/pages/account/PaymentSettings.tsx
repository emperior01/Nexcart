import { CreditCard, CheckCircle, XCircle, Bitcoin } from "lucide-react";
import { useActivePaymentMethods } from "@/hooks/use-payment-methods";
import { Loader2 } from "lucide-react";

const PROVIDER_META: Record<string, { emoji: string; color: string; bg: string }> = {
  paystack:    { emoji: "🇳🇬", color: "#00C3F7", bg: "#E8F9FD" },
  flutterwave: { emoji: "🦋", color: "#F5A623", bg: "#FEF9EE" },
  stripe:      { emoji: "💳", color: "#635BFF", bg: "#F0EFFE" },
  paypal:      { emoji: "🅿️", color: "#003087", bg: "#EEF2FA" },
  crypto:      { emoji: "₿",  color: "#F7931A", bg: "#FEF6EC" },
};

export default function AccountPaymentSettings() {
  const { data: methods, isLoading } = useActivePaymentMethods();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 pb-1">
        <CreditCard className="h-4 w-4 text-[#E8611A]" />
        <h2 className="font-extrabold text-[#0D0D0D] text-base">Payment Settings</h2>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <span className="text-base">💳</span>
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Available Payment Methods</h2>
        </div>
        <div className="p-5">
          <p className="text-xs text-[#9B9B9B] mb-4">
            These are the payment methods currently accepted at checkout. Contact support if you need help with a payment.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#E8611A]" />
            </div>
          ) : methods?.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="h-8 w-8 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-sm text-[#9B9B9B]">No payment methods are currently active.</p>
              <p className="text-xs text-[#C0C0C0] mt-1">Please check back later or contact support.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methods?.map((method) => {
                const meta = PROVIDER_META[method.provider] ?? { emoji: "💰", color: "#6B7280", bg: "#F9FAFB" };
                return (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 p-4 rounded-xl border"
                    style={{ borderColor: "#F0F0F0", background: "#FAFAFA" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: meta.bg }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#0D0D0D] text-sm">{method.name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A]">
                          Active
                        </span>
                        {method.type === "crypto" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF6EC] text-[#F7931A]">
                            Crypto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9B9B9B] mt-0.5 line-clamp-2">{method.description}</p>
                      {method.type === "crypto" && (
                        <p className="text-[10px] text-[#C0C0C0] mt-1">
                          Accepts: {method.supported_currencies.join(", ")}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="h-4 w-4 text-[#16A34A] flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <span className="text-base">🔒</span>
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Payment Security</h2>
        </div>
        <div className="p-5 space-y-3">
          {[
            { icon: "🔐", title: "End-to-end encrypted", desc: "All transactions are secured with TLS encryption." },
            { icon: "🛡️", title: "Fraud protection", desc: "Every payment is screened for suspicious activity." },
            { icon: "✅", title: "Verified on server", desc: "Payments are verified server-side before your order is confirmed." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D]">{item.title}</p>
                <p className="text-xs text-[#9B9B9B] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
