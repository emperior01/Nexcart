import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Seller = Database["public"]["Tables"]["sellers"]["Row"];

// Hybrid seller status model
// basic    → instant access after "Become a Seller" (can create products, manage orders; NO withdrawals)
// verified → admin-upgraded; full access including withdrawals
// suspended → blocked; no dashboard access
export type SellerStatus = "basic" | "verified" | "suspended";

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

  const status = seller?.verification_status as SellerStatus | "pending" | "rejected" | undefined;

  return {
    seller: seller ?? null,
    isLoading: authLoading || isLoading,
    isSeller: !!seller,
    // Active if basic or verified (not suspended, not pending legacy)
    isActiveSeller: status === "basic" || status === "verified",
    isBasic: status === "basic",
    isVerified: status === "verified",
    isSuspended: status === "suspended",
    refetch,
  };
}
