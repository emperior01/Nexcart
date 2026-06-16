import { CreditCard, CheckCircle, Loader2, XCircle } from "lucide-react";
import {
  useActivePaymentMethods,
  useUserPaymentPreference,
  useSetPaymentPreference,
} from "@/hooks/use-payment-methods";

const PROVIDER_META: Record<string, { emoji: string; color: string; bg: string }> = {
  paystack:    { emoji: "🇳🇬", color: "#00C3F7", bg: "#E8F9FD" },
  flutterwave: { emoji: "🦋",  color: "#F5A623", bg: "#FEF9EE" },
  stripe:      { emoji: "💳",  color: "#635BFF", bg: "#F0EFFE" },
  paypal:      { emoji: "🅿️",  color: "#003087", bg: "#EEF2FA" },
  crypto:      { emoji: "₿",   color: "#F7931A", bg: "#FEF6EC" },
};

export default function AccountPaymentSettings() {
  const { data: methods, isLoading: loadingMethods } = useActivePaymentMethods();
  const { data: preferredId, isLoading: loadingPref } = useUserPaymentPreference();
  const { mutate: setPreference, isPending: saving } = useSetPaymentPreference();

  const isLoading = loadingMethods || loadingPref;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 pb-1">
        <CreditCard className="h-4 w-4 text-[#E8611A]" />
        <h2 className="font-extrabold text-[#0D0D0D] text-base">Preferred Payment Method</h2>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <span className="text-base">💳</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-[#0D0D0D] text-sm">Choose Your Preferred Method</h2>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs text-[#9B9B9B] mb-4">
            Select your preferred payment method for checkout. If it's available when you check out,
            it will be pre-selected for you. You can always change it before paying.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#E8611A]" />
            </div>
          ) : methods?.length === 0 ? (
            <div className="text-center py-10">
              <XCircle className="h-8 w-8 text-[#D1D5DB] mx-auto mb-2" />
              <p className="text-sm text-[#9B9B9B]">No payment methods are currently active.</p>
              <p className="text-xs text-[#C0C0C0] mt-1">The store admin has not enabled any payment methods yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {methods?.map((method) => {
                const meta = PROVIDER_META[method.provider] ?? { emoji: "💰", color: "#6B7280", bg: "#F9FAFB" };
                const isSelected = preferredId === method.id;
                return (
                  <button
                    key={method.id}
                    disabled={saving}
                    onClick={() => setPreference(method.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all disabled:opacity-60"
                    style={{
                      borderColor: isSelected ? "#E8611A" : "#F0F0F0",
                      background: isSelected ? "#FFF8F5" : "#FAFAFA",
                    }}
                  >
                    {/* Provider icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: isSelected ? "#FEF0E8" : meta.bg }}
                    >
                      {meta.emoji}
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0D0D0D] text-sm">{method.name}</p>
                      <p className="text-xs text-[#9B9B9B] mt-0.5 line-clamp-1">{method.description}</p>
                    </div>

                    {/* Radio indicator */}
                    <div
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center"
                      style={{
                        borderColor: isSelected ? "#E8611A" : "#D1D5DB",
                        background: isSelected ? "#E8611A" : "transparent",
                      }}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear preference */}
          {preferredId && !isLoading && (
            <button
              onClick={() => setPreference(null)}
              disabled={saving}
              className="mt-4 text-xs text-[#9B9B9B] hover:text-[#6B7280] underline disabled:opacity-50"
            >
              Clear preference (let checkout auto-select)
            </button>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="p-5 space-y-3">
          {[
            { icon: "ℹ️", title: "How this works", desc: "Your preferred method is pre-selected at checkout. If the store admin disables it, the next available method will be selected instead." },
            { icon: "🔒", title: "Secure payments", desc: "All transactions are secured with TLS encryption and verified server-side before your order is confirmed." },
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
