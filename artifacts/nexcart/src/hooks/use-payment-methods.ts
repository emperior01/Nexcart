import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });
}

/** Toggle active/inactive */
export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const { error } = await supabase
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

/** Update config (wallet addresses, priority, etc.) */
export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PaymentMethod> }) => {
      const { error } = await supabase
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
