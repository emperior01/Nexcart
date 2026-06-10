import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/index";
import { CurrencySelector } from "@/components/nexcart/CurrencySelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function AccountSettings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function saveCurrency() {
    if (!user) return;
    const preferredCurrency = document.querySelector<HTMLSelectElement>("[data-currency-selector]")?.value;
    if (!preferredCurrency) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, preferred_currency: preferredCurrency } as any, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Currency preference saved!");
  }

  return (
    <div className="space-y-4">
      {/* Currency */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <Settings className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">App Preferences</h2>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label>Display Currency</Label>
            <p className="text-xs text-[#9B9B9B]">
              All prices will be shown in your selected currency.
            </p>
            <CurrencySelector className="w-full rounded-xl" />
          </div>

          <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">Notifications</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">Email notification preferences.</p>
            </div>
            <div className="space-y-2">
              {[
                { id: "order-updates", label: "Order status updates" },
                { id: "promotions",    label: "Promotions and offers" },
                { id: "newsletter",    label: "Newsletter" },
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id={id}
                      defaultChecked={id === "order-updates"}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 rounded-full transition-colors bg-[#E5E7EB] peer-checked:bg-[#E8611A]" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                  <span className="text-sm text-[#374151] font-medium select-none">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-[#F0F0F0] pt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#0D0D0D]">Theme</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">Choose your preferred appearance.</p>
            </div>
            <div className="flex gap-2">
              {["Light", "Dark", "System"].map((theme) => (
                <button
                  key={theme}
                  className="px-4 py-2 rounded-full text-xs font-semibold border transition-colors"
                  style={{
                    background: theme === "Light" ? "#E8611A" : "#F9FAFB",
                    color: theme === "Light" ? "#fff" : "#6B7280",
                    borderColor: theme === "Light" ? "#E8611A" : "#E5E7EB",
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#9B9B9B]">Theme switching coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
