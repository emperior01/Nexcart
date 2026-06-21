import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  sort_order: number;
}

/**
 * Fetches all active currencies from the database.
 * Falls back to an empty array while loading — callers should handle this.
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
    staleTime: 1000 * 60 * 10, // 10 min — currencies rarely change
  });

  return {
    currencies: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
