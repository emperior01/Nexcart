import { useState, useEffect } from "react";
import {
  Settings, Globe, CreditCard, Truck, ShoppingBag,
  ChevronRight, Check, Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/index";
import { CurrencySelector } from "@/components/nexcart/CurrencySelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// ── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "sw", label: "Swahili" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yoruba" },
  { code: "ig", label: "Igbo" },
];

const SHOPPING_CATEGORIES = [
  { id: "electronics",   label: "Electronics",      emoji: "📱" },
  { id: "fashion",       label: "Fashion",           emoji: "👗" },
  { id: "beauty",        label: "Beauty",            emoji: "💄" },
  { id: "home-living",   label: "Home & Living",     emoji: "🏠" },
  { id: "sports-fitness",label: "Sports & Fitness",  emoji: "🏋️" },
];

// ── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
        {icon}
        <h2 className="font-extrabold text-[#0D0D0D] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Preference Row ────────────────────────────────────────────────────────────
function PrefRow({
  label, description, children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-[#0D0D0D]">{label}</p>
      <p className="text-xs text-[#9B9B9B]">{description}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({
  icon, label, description, buttonText, to, badge,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  buttonText: string;
  to: string;
  badge?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px", borderRadius: 14,
      border: "1.5px solid #F0F0F0", background: "#FAFAFA",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: "linear-gradient(135deg,#FEF0E8,#FDE8D8)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D", margin: 0 }}>{label}</p>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 7px",
              borderRadius: 20, background: "#FEF0E8", color: "#E8611A",
            }}>{badge}</span>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#9B9B9B", margin: "2px 0 0" }}>{description}</p>
      </div>
      <Link to={to} style={{ textDecoration: "none", flexShrink: 0 }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "8px 12px", borderRadius: 10,
          background: "linear-gradient(135deg,#E8611A,#C4511A)",
          color: "#fff", fontSize: 11, fontWeight: 700,
          border: "none", cursor: "pointer", whiteSpace: "nowrap",
        }}>
          {buttonText}
          <ChevronRight style={{ width: 13, height: 13 }} />
        </button>
      </Link>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AccountSettings() {
  const { user } = useAuth();

  // Currency
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Language
  const [language, setLanguage] = useState(
    () => localStorage.getItem("nexcart-language") ?? "en"
  );
  const [savingLang, setSavingLang] = useState(false);

  // Shopping categories
  const [categories, setCategories] = useState<string[]>(
    () => {
      try { return JSON.parse(localStorage.getItem("nexcart-categories") ?? "[]"); }
      catch { return []; }
    }
  );
  const [savingCats, setSavingCats] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function saveCurrency() {
    if (!user) return;
    const preferredCurrency = document.querySelector<HTMLSelectElement>("[data-currency-selector]")?.value;
    if (!preferredCurrency) return;
    setSavingCurrency(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, preferred_currency: preferredCurrency } as any, { onConflict: "id" });
    setSavingCurrency(false);
    if (error) toast.error(error.message);
    else toast.success("Currency preference saved!");
  }

  function saveLanguage(code: string) {
    setLanguage(code);
    setSavingLang(true);
    localStorage.setItem("nexcart-language", code);
    // Structured for future i18n: document.documentElement.lang = code;
    setTimeout(() => {
      setSavingLang(false);
      toast.success("Language preference saved!");
    }, 400);
  }

  function toggleCategory(id: string) {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function saveCategories() {
    setSavingCats(true);
    localStorage.setItem("nexcart-categories", JSON.stringify(categories));
    setTimeout(() => {
      setSavingCats(false);
      toast.success("Shopping preferences saved!");
    }, 400);
  }

  const selectedLangLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  return (
    <div className="space-y-4">

      {/* ── App Preferences header ── */}
      <div className="flex items-center gap-2.5 pb-1">
        <Settings className="h-4 w-4 text-[#E8611A]" />
        <h2 className="font-extrabold text-[#0D0D0D] text-base">App Preferences</h2>
      </div>

      {/* ── 1. Display Currency ── */}
      <SectionCard
        icon={<span style={{ fontSize: 16 }}>💱</span>}
        title="Display Currency"
      >
        <PrefRow
          label="Currency"
          description="All prices across the app will be shown in your selected currency."
        >
          <div className="flex gap-2 items-center">
            <CurrencySelector className="flex-1 rounded-xl" />
            <Button
              onClick={saveCurrency}
              disabled={savingCurrency}
              className="text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
            >
              {savingCurrency ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </PrefRow>
      </SectionCard>

      {/* ── 2. Language Preference ── */}
      <SectionCard
        icon={<Globe className="h-4 w-4 text-[#E8611A]" />}
        title="Language Preference"
      >
        <PrefRow
          label="Language"
          description="Choose your preferred language for the Nexcart interface."
        >
          <div className="flex gap-2 items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex-1 h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#E8611A]/30"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <Button
              onClick={() => saveLanguage(language)}
              disabled={savingLang}
              className="text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
            >
              {savingLang ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          <p className="text-xs text-[#9B9B9B] mt-2">
            Currently: <span className="font-semibold text-[#E8611A]">{selectedLangLabel}</span>
            {language !== "en" && (
              <span className="ml-2 text-[#C8A96E]">· Full translation coming soon</span>
            )}
          </p>
        </PrefRow>
      </SectionCard>

      {/* ── 3. Payment Settings ── */}
      <SectionCard
        icon={<CreditCard className="h-4 w-4 text-[#E8611A]" />}
        title="Payment Settings"
      >
        <PrefRow
          label="Payment Settings"
          description="Manage your payment preferences for a smoother checkout experience."
        >
          <ActionCard
            icon={<CreditCard style={{ width: 20, height: 20, color: "#E8611A" }} />}
            label="Payment Methods"
            description="View active payment methods accepted at checkout."
            buttonText="View"
            to="/account/payment-settings"
            badge="Active"
          />
          <p className="text-xs text-[#9B9B9B] mt-3">
            More payment providers (Flutterwave, Stripe) coming soon.
          </p>
        </PrefRow>
      </SectionCard>

      {/* ── 4. Delivery Preferences ── */}
      <SectionCard
        icon={<Truck className="h-4 w-4 text-[#E8611A]" />}
        title="Delivery Preferences"
      >
        <PrefRow
          label="Delivery Preferences"
          description="Configure your default shipping address, preferred delivery method, and pickup preferences."
        >
          <ActionCard
            icon={<Truck style={{ width: 20, height: 20, color: "#E8611A" }} />}
            label="Shipping Address & Delivery"
            description="Set your default address and preferred delivery method."
            buttonText="Manage"
            to="/account/addresses"
          />
          <p className="text-xs text-[#9B9B9B] mt-3">
            Courier integrations and pickup locations coming soon.
          </p>
        </PrefRow>
      </SectionCard>

      {/* ── 5. Shopping Preferences ── */}
      <SectionCard
        icon={<ShoppingBag className="h-4 w-4 text-[#E8611A]" />}
        title="Shopping Preferences"
      >
        <PrefRow
          label="Interested Categories"
          description="Select categories you're most interested in to personalise your homepage and product discovery."
        >
          <div className="grid grid-cols-1 gap-2 mt-1">
            {SHOPPING_CATEGORIES.map((cat) => {
              const checked = categories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                    border: `1.5px solid ${checked ? "#E8611A" : "#F0F0F0"}`,
                    background: checked ? "#FFF8F5" : "#FAFAFA",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0D0D0D", flex: 1 }}>
                    {cat.label}
                  </span>
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${checked ? "#E8611A" : "#D1D5DB"}`,
                    background: checked ? "#E8611A" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {checked && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
                  </div>
                </label>
              );
            })}
          </div>
          <Button
            onClick={saveCategories}
            disabled={savingCats}
            className="w-full mt-4 text-white"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            {savingCats ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
            ) : (
              "Save Shopping Preferences"
            )}
          </Button>
        </PrefRow>
      </SectionCard>

      {/* ── 6. Notifications ── */}
      <SectionCard
        icon={<span style={{ fontSize: 16 }}>🔔</span>}
        title="Notifications"
      >
        <PrefRow
          label="Email Notifications"
          description="Choose which emails you'd like to receive from Nexcart."
        >
          <div className="space-y-3">
            {[
              { id: "orderUpdates", label: "Order status updates", locked: true },
              { id: "promotions",   label: "Promotions and offers", locked: false },
              { id: "newsletter",   label: "Newsletter",            locked: false },
            ].map(({ id, label, locked }) => (
              <label key={id} className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[id as keyof typeof notifications]}
                    onChange={(e) =>
                      !locked && setNotifications((n) => ({ ...n, [id]: e.target.checked }))
                    }
                    className="sr-only peer"
                    disabled={locked}
                  />
                  <div className="w-9 h-5 rounded-full transition-colors bg-[#E5E7EB] peer-checked:bg-[#E8611A]" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm text-[#374151] font-medium select-none">{label}</span>
                {locked && (
                  <span className="text-[10px] text-[#9B9B9B] bg-[#F3F4F6] px-2 py-0.5 rounded-full">Required</span>
                )}
              </label>
            ))}
          </div>
        </PrefRow>
      </SectionCard>

      {/* ── 7. Theme ── */}
      <SectionCard
        icon={<span style={{ fontSize: 16 }}>🎨</span>}
        title="Appearance"
      >
        <PrefRow
          label="Theme"
          description="Choose your preferred appearance."
        >
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
          <p className="text-xs text-[#9B9B9B] mt-2">Theme switching coming soon.</p>
        </PrefRow>
      </SectionCard>

    </div>
  );
}
