import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useLocalWishlist, type WishlistItem } from "@/lib/wishlist";

const QUERY_KEY = (userId: string) => ["wishlist", userId];

async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await (supabase as any)
    .from("wishlists")
    .select(
      "product_id, products(id, slug, title, price, currency, product_images(url, is_primary, sort_order))"
    )
    .eq("user_id", userId);
  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => {
    const p = row.products as any;
    const imgs: any[] = (p?.product_images ?? []).slice().sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );
    const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
    return {
      productId: row.product_id as string,
      slug: (p?.slug ?? "") as string,
      title: (p?.title ?? "") as string,
      price: Number(p?.price ?? 0),
      currency: (p?.currency ?? "USD") as string,
      image: (primary?.url ?? null) as string | null,
    };
  });
}

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const local = useLocalWishlist();

  const { data: serverItems = [], isLoading } = useQuery({
    queryKey: QUERY_KEY(user?.id ?? ""),
    enabled: !!user,
    queryFn: () => fetchWishlist(user!.id),
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (item: WishlistItem) => {
      const { error } = await (supabase as any)
        .from("wishlists")
        .insert({ user_id: user!.id, product_id: item.productId });
      if (error) throw error;
    },
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY(user!.id) });
      const prev = qc.getQueryData<WishlistItem[]>(QUERY_KEY(user!.id)) ?? [];
      qc.setQueryData<WishlistItem[]>(QUERY_KEY(user!.id), [...prev, item]);
      return { prev };
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY(user!.id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY(user!.id) }),
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await (supabase as any)
        .from("wishlists")
        .delete()
        .eq("user_id", user!.id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY(user!.id) });
      const prev = qc.getQueryData<WishlistItem[]>(QUERY_KEY(user!.id)) ?? [];
      qc.setQueryData<WishlistItem[]>(
        QUERY_KEY(user!.id),
        prev.filter((i) => i.productId !== productId)
      );
      return { prev };
    },
    onError: (_err, _productId, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY(user!.id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY(user!.id) }),
  });

  const items = user ? serverItems : local.items;

  function hasItem(productId: string) {
    return items.some((i) => i.productId === productId);
  }

  function toggle(item: WishlistItem) {
    if (user) {
      if (hasItem(item.productId)) removeMutation.mutate(item.productId);
      else addMutation.mutate(item);
    } else {
      local.toggle(item);
    }
  }

  function removeItem(productId: string) {
    if (user) removeMutation.mutate(productId);
    else local.removeItem(productId);
  }

  return {
    items,
    toggle,
    hasItem,
    removeItem,
    count: items.length,
    loading: !!user && isLoading,
  };
}
