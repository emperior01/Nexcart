import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Input, Label, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#FEF3C7", color: "#92400E" },
  approved: { bg: "#D1FAE5", color: "#065F46" },
  rejected: { bg: "#FEE2E2", color: "#991B1B" },
};

export default function SellerWithdrawals() {
  const { seller } = useSeller();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: "", bank_name: "", account_name: "", account_number: "" });

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["seller-withdrawals", seller?.id],
    enabled: !!seller?.id,
    queryFn: async (): Promise<Withdrawal[]> => {
      if (!seller?.id) return [];
      const { data } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Withdrawal[];
    },
  });

  const { data: availableBalance } = useQuery({
    queryKey: ["seller-available-balance", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return 0;
      const productRes = await supabase.from("products").select("id").eq("seller_id", seller.id);
      const productIds = (productRes.data ?? []).map((p: { id: string }) => p.id);
      if (productIds.length === 0) return 0;

      const [itemsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("order_items")
          .select("quantity,unit_price,orders!inner(status)")
          .in("product_id", productIds),
        supabase.from("withdrawals").select("amount").eq("seller_id", seller.id).eq("status", "approved"),
      ]);

      type OI = { quantity: number; unit_price: number; orders: { status: string } };
      const totalRevenue = ((itemsRes.data ?? []) as OI[])
        .filter(oi => oi.orders.status === "delivered")
        .reduce((s, oi) => s + Number(oi.unit_price) * Number(oi.quantity), 0);
      const withdrawn = ((withdrawalsRes.data ?? []) as { amount: number }[]).reduce((s, w) => s + Number(w.amount), 0);
      return Math.max(0, totalRevenue - withdrawn);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller?.id) return;
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount."); return; }
    if (availableBalance !== undefined && amount > availableBalance) {
      toast.error(`Amount exceeds your available balance of $${availableBalance.toFixed(2)}.`); return;
    }
    if (!form.bank_name.trim() || !form.account_name.trim() || !form.account_number.trim()) {
      toast.error("All bank details are required."); return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        seller_id: seller.id,
        amount,
        bank_name: form.bank_name.trim(),
        account_name: form.account_name.trim(),
        account_number: form.account_number.trim(),
        status: "pending",
      } as any);
      if (error) throw error;
      toast.success("Withdrawal request submitted!");
      setForm({ amount: "", bank_name: "", account_name: "", account_number: "" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["seller-withdrawals", seller.id] });
      qc.invalidateQueries({ queryKey: ["seller-available-balance", seller.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Available balance:{" "}
            <span className="font-bold text-green-600">
              ${(availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Request Withdrawal
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (withdrawals ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <Wallet style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 12px" }} />
            <p className="text-muted-foreground font-medium">No withdrawal requests yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Date","Bank","Account","Amount","Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {withdrawals!.map((w) => {
                  const s = statusStyles[w.status] ?? { bg: "#F3F4F6", color: "#374151" };
                  return (
                    <tr key={w.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{w.bank_name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.account_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{w.account_number}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">${Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color }}>
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-y-auto max-h-[90vh] md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-2xl md:bottom-auto">
            <div className="flex justify-center pt-3 pb-1 md:hidden"><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D" }}>Request Withdrawal</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-green-50 text-sm text-green-700 font-medium">
                Available: ${(availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Name *</Label>
                <Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. First Bank" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name *</Label>
                <Input value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="Name on bank account" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number *</Label>
                <Input value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} placeholder="e.g. 0123456789" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
