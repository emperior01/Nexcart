import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Single shared category source for the whole app. Anywhere categories are
 * displayed or selected — homepage category cards, the Shop category
 * filter, seller/admin product category pickers, and admin category
 * management — reads through this hook instead of keeping its own list.
 * An admin changing a category's image, order, or active status here is
 * immediately reflected everywhere else, since they all read the same
 * underlying query/table.
 */
export type Category = Database["public"]["Tables"]["categories"]["Row"];

const CATEGORIES_QUERY_KEY = ["categories"] as const;

/**
 * All categories, ordered by display order. Used by admin category
 * management, where inactive categories still need to be visible/editable.
 */
export function useAllCategories() {
  const query = useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "all"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  return { categories: query.data ?? [], isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

/**
 * Only active categories, ordered by display order. Used everywhere a
 * customer or seller picks/sees a category — homepage cards, Shop filter,
 * and the category dropdown in product forms.
 */
export function useActiveCategories() {
  const query = useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "active"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  return { categories: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

/** Invalidate both category queries — call after any create/update/delete/reorder. */
export function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  };
}
