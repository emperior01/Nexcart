import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  type: "fiat" | "crypto";
  status: "active" | "inactive";
  logo_url: string | null;
  description: string | null;
  supported_currencies: string[];
  config: Record<string, unknown>;
  priority: number;
  created_at: string;
  updated_at: string;
}

/** Fetch only active payment methods — used at checkout */
export function useActivePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods", "active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .eq("status", "active")
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
    staleTime: 30_000,
  });
}

/** Fetch ALL payment methods — used in admin */
export function useAllPaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });
}

/** Toggle active/inactive — admin only */
export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const { error } = await (supabase as any)
        .from("payment_methods")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Payment method updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Update config (wallet addresses, priority, etc.) — admin only */
export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PaymentMethod> }) => {
      const { error } = await (supabase as any)
        .from("payment_methods")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Customer preference hooks ─────────────────────────────────────────────────
// These read/write the customer's preferred_payment_method_id on their profile.
// They do NOT touch the payment_methods table (admin-only territory).

/** Fetch the current user's preferred payment method id */
export function useUserPaymentPreference() {
  const { user } = useAuth();
  return useQuery<string | null>({
    queryKey: ["user-payment-preference", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_payment_method_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as { preferred_payment_method_id: string | null } | null)
        ?.preferred_payment_method_id ?? null;
    },
    staleTime: 60_000,
  });
}

/** Save the current user's preferred payment method id */
export function useSetPaymentPreference() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (preferred_payment_method_id: string | null) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_payment_method_id })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: (_data, preferred_payment_method_id) => {
      qc.setQueryData(["user-payment-preference", user?.id], preferred_payment_method_id);
      toast.success("Payment preference saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
