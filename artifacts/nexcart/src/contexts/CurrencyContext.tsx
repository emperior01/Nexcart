import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies, type Currency } from "@/hooks/use-currencies";
import { formatPrice } from "@/lib/products";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  currencyList: Currency[];
  currencyListLoading: boolean;
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currencies, isLoading } = useCurrencies();

  const [currency, setCurrencyState] = useState<string>(
    () => localStorage.getItem("nexcart-currency") ?? "NGN"
  );

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

  const fmt = (amount: number) => formatPrice(amount, currency, currency);

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, currencyList: currencies, currencyListLoading: isLoading, fmt }}
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
