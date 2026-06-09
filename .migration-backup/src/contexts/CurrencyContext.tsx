import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENCIES } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  currencyList: Array<{ code: string; symbol: string; name: string }>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>(
    () => localStorage.getItem("nexcart-currency") ?? "USD"
  );

  // Sync from profile on login
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
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
        .upsert({ id: user.id, preferred_currency: code })
        .then(() => {});
    }
  }

  const currencyList = Object.entries(CURRENCIES).map(([code, { symbol, name }]) => ({
    code,
    symbol,
    name,
  }));

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, currencyList }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
