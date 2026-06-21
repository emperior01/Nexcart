import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CURRENCIES } from "@/lib/products";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  sort_order: number;
}

/**
 * Built-in fallback list derived from the existing CURRENCIES constant in
 * products.ts. Guarantees the picker always has data even if the DB query
 * is still loading or the currencies table doesn't exist yet.
 */
const FALLBACK_CURRENCIES: Currency[] = Object.entries(CURRENCIES).map(
  ([code, { symbol, name }], i) => ({ code, name, symbol, sort_order: i + 1 })
);

/**
 * Fetches active currencies from the database.
 * While loading or on error, returns the built-in fallback list so the
 * picker always shows something immediately.
 */
export function useCurrencies() {
  const query = useQuery({
    queryKey: ["currencies"],
    queryFn: async (): Promise<Currency[]> => {
      const { data, error } = await supabase
        .from("currencies")
        .select("code, name, symbol, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Use DB data if loaded and non-empty, otherwise fall back to built-in list
  const currencies =
    query.data && query.data.length > 0 ? query.data : FALLBACK_CURRENCIES;

  return {
    currencies,
    isLoading: query.isLoading,
    error: query.error,
  };
}
