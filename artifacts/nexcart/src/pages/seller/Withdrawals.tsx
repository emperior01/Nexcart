import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, X, ShieldCheck, Lock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Input, Label, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import { StepUpDialog } from "@/components/nexcart/StepUpDialog";
import type { Database } from "@/integrations/supabase/types";

type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  pending:  { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  approved: { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0" },
  rejected: { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5" },
};

export default function SellerWithdrawals() {
  const { seller, isVerified } = useSeller();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStepUp, setShowStepUp] = useState(false);
  const [form, setForm] = useState({ amount: "", bank_name: "", account_name: "", account_number: "" });

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["seller-withdrawals", seller?.id],
    enabled: !!seller?.id && isVerified,
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
    enabled: !!seller?.id && isVerified,
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

  async function submitWithdrawal() {
    if (!seller?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          bank_name: form.bank_name.trim(),
          account_name: form.account_name.trim(),
          account_number: form.account_number.trim(),
        }),
      });

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "step_up_required") {
          setSubmitting(false);
          setShowStepUp(true);
          return;
        }
        toast.error(data.error ?? "Not authorized to request withdrawals.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit request.");
      }

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
    await submitWithdrawal();
  }

  // ─── Locked state for unverified sellers ─────────────────────────────────
  if (!isVerified) {
    return (
      <div style={{ padding: "16px", maxWidth: 640, margin: "0 auto", boxSizing: "border-box" as const }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
            Withdrawals
          </h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>Request payouts to your bank account</p>
        </div>

        {/* Main locked card */}
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 16,
        }}>
          {/* Top accent */}
          <div style={{
            height: 4,
            background: "linear-gradient(90deg,#F59E0B,#D97706,#B45309)",
          }} />

          <div style={{ padding: "32px 24px", textAlign: "center" as const }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg,#FEF3C7,#FDE68A)",
              border: "3px solid #FDE68A",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 4px 16px rgba(217,119,6,0.2)",
            }}>
              <Lock style={{ width: 30, height: 30, color: "#D97706" }} />
            </div>

            <h2 style={{
              fontFamily: "'Inter',sans-serif", fontWeight: 800,
              fontSize: 20, color: "#0D0D0D", marginBottom: 10, letterSpacing: "-0.02em",
            }}>
              Withdrawals are locked
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, maxWidth: 340, margin: "0 auto 24px" }}>
              Your account is on the <strong style={{ color: "#0D0D0D" }}>Basic plan</strong>. 
              Withdrawals become available once an admin verifies your store identity.
            </p>

            {/* What you need to do */}
            <div style={{
              background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 14,
              padding: "16px", marginBottom: 20, textAlign: "left" as const,
            }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                Why is this locked?
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  { icon: ShieldCheck, color: "#E8611A", text: "Verification confirms your identity as a legitimate seller" },
                  { icon: AlertCircle, color: "#D97706", text: "It protects both sellers and customers from fraud" },
                  { icon: CheckCircle, color: "#059669", text: "Once verified, your earnings are immediately withdrawable" },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <Icon style={{ width: 13, height: 13, color }} />
                    </div>
                    <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5 }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Good news */}
            <div style={{
              background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)",
              border: "1px solid #6EE7B7", borderRadius: 12,
              padding: "12px 16px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 10, textAlign: "left" as const,
            }}>
              <CheckCircle style={{ width: 18, height: 18, color: "#059669", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#065F46", fontWeight: 600, lineHeight: 1.5 }}>
                <strong>Good news:</strong> Your sales and earnings are being tracked right now.
                They'll be ready to withdraw as soon as you're verified.
              </p>
            </div>

            <Link
              to="/seller/verification"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "linear-gradient(135deg,#D97706,#B45309)",
                color: "#fff", padding: "12px 24px", borderRadius: 10,
                fontSize: 14, fontWeight: 700, textDecoration: "none",
                boxShadow: "0 4px 14px rgba(217,119,6,0.35)",
                transition: "transform 0.15s",
              }}
            >
              <ShieldCheck style={{ width: 16, height: 16 }} />
              Complete Verification
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>

        {/* Note */}
        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center" as const, lineHeight: 1.5 }}>
          Verification is reviewed by our admin team. You'll receive a notification once approved.
        </p>
      </div>
    );
  }

  // ─── Verified seller view ─────────────────────────────────────────────────
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
        <Button
          size="sm"
          className="gap-1.5 text-white"
          style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" /> Request Withdrawal
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (withdrawals ?? []).length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" as const }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "#F3F4F6",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <Wallet style={{ width: 24, height: 24, color: "#D1D5DB" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 5 }}>No withdrawal requests yet</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16, lineHeight: 1.5 }}>
              Once you have delivered orders, request a payout to your bank account.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "linear-gradient(135deg,#E8611A,#C4511A)",
                color: "#fff", padding: "9px 18px", borderRadius: 9,
                fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Request Withdrawal
            </button>
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
                  const s = statusStyles[w.status] ?? { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
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
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 50,
                          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        }}>
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
              <div style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle style={{ width: 15, height: 15, color: "#059669", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>
                  Available: ${(availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
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

      <StepUpDialog
        open={showStepUp}
        onOpenChange={setShowStepUp}
        onVerified={submitWithdrawal}
        description="Requesting a payout requires a fresh password confirmation. Please re-enter your password to continue."
      />
    </div>
  );
}
