import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies, type Currency } from "@/hooks/use-currencies";
import { fetchSiteSettings } from "@/lib/site-settings";
import { formatMoney } from "@/lib/currency";

interface CurrencyContextValue {
  // ── Per-user preferred display currency ───────────────────────────────────
  // Stored in profiles.preferred_currency + localStorage.
  // Used by the customer-facing CurrencySelector in the Navbar.
  currency: string;
  setCurrency: (code: string) => void;
  currencyList: Currency[];
  currencyListLoading: boolean;

  // ── Admin-set marketplace default ─────────────────────────────────────────
  // Stored in site_settings.marketplace_currency.
  // This is the currency code all prices render in by default.
  marketplaceCurrency: string;
  setMarketplaceCurrency: (code: string) => void;

  // ── Global price formatter ─────────────────────────────────────────────────
  // fmt(amount) — formats using the ACTIVE display currency:
  //   - If the user has set a personal preference → use that
  //   - Otherwise → use the admin marketplace default
  // Every component that shows money calls this. No hardcoded symbols anywhere.
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currencies, isLoading } = useCurrencies();

  // Per-user preference (falls back to marketplace default once loaded)
  const [currency, setCurrencyState] = useState<string>(
    () => localStorage.getItem("nexcart-currency") ?? "USD"
  );

  // Admin-set marketplace default loaded from site_settings
  const [marketplaceCurrency, setMarketplaceCurrencyState] = useState<string>("USD");
  const [marketplaceLoaded, setMarketplaceLoaded] = useState(false);

  // Load marketplace currency from DB on mount
  useEffect(() => {
    fetchSiteSettings().then((s) => {
      const code = s.marketplace_currency ?? "USD";
      setMarketplaceCurrencyState(code);
      setMarketplaceLoaded(true);
      // If no per-user preference is stored yet, default to marketplace currency
      if (!localStorage.getItem("nexcart-currency")) {
        setCurrencyState(code);
      }
    });
  }, []);

  // Sync per-user preferred currency from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .maybeSingle()
      .then((result) => {
        const data = result.data as { preferred_currency: string } | null;
        if (data?.preferred_currency) {
          setCurrencyState(data.preferred_currency);
          localStorage.setItem("nexcart-currency", data.preferred_currency);
        }
      });
  }, [user]);

  function setCurrency(code: string) {
    setCurrencyState(code);
    localStorage.setItem("nexcart-currency", code);
    if (user) {
      supabase
        .from("profiles")
        .upsert({ id: user.id, preferred_currency: code } as any)
        .then(() => {});
    }
  }

  function setMarketplaceCurrency(code: string) {
    setMarketplaceCurrencyState(code);
  }

  // Active display currency: user preference if set, otherwise marketplace default
  const activeCurrency = marketplaceLoaded ? currency : marketplaceCurrency;

  // The single global formatter — all components call this
  const fmt = (amount: number) => formatMoney(amount, activeCurrency);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencyList: currencies,
        currencyListLoading: isLoading,
        marketplaceCurrency,
        setMarketplaceCurrency,
        fmt,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
