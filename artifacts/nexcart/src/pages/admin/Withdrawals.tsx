import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#FEF3C7", color: "#92400E" },
  approved: { bg: "#D1FAE5", color: "#065F46" },
  rejected: { bg: "#FEE2E2", color: "#991B1B" },
};

type WithdrawalWithStore = Withdrawal & { store_name?: string };

export default function AdminWithdrawals() {
  const qc = useQueryClient();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async (): Promise<WithdrawalWithStore[]> => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*, sellers(store_name)")
        .order("created_at", { ascending: false });
      return ((data ?? []) as any[]).map((w) => ({
        ...w,
        store_name: w.sellers?.store_name ?? "—",
      }));
    },
  });

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const { error } = await (supabase.from("withdrawals") as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Withdrawal ${status}.`);
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    }
  }

  const pendingTotal = (withdrawals ?? [])
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Withdrawal Requests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {withdrawals?.filter((w) => w.status === "pending").length ?? 0} pending · ${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (withdrawals ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <Wallet style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 12px" }} />
            <p className="text-muted-foreground">No withdrawal requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Date","Store","Bank Details","Amount","Status","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {withdrawals!.map((w) => {
                  const s = statusStyles[w.status] ?? statusStyles.pending;
                  return (
                    <tr key={w.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{w.store_name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{w.bank_name}</p>
                        <p className="text-xs text-muted-foreground">{w.account_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{w.account_number}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ${Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color }}>
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {w.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => updateStatus(w.id, "approved")}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => updateStatus(w.id, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
