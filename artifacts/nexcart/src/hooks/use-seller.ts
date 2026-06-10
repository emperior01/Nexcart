import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Seller = Database["public"]["Tables"]["sellers"]["Row"];

export function useSeller() {
  const { user, loading: authLoading } = useAuth();

  const { data: seller, isLoading, refetch } = useQuery({
    queryKey: ["seller-profile", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<Seller | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as Seller | null);
    },
  });

  return {
    seller: seller ?? null,
    isLoading: authLoading || isLoading,
    isSeller: !!seller,
    isVerified: seller?.verification_status === "verified",
    refetch,
  };
}
