import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, Eye, Mail, Phone, MapPin, Clock, ShieldCheck, RefreshCw, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton, Textarea, Label } from "@/components/ui/index";
import { toast } from "sonner";
import { useStepUp } from "@/hooks/use-step-up";
import { StepUpDialog } from "@/components/nexcart/StepUpDialog";

type SellerApplication = {
  id: string;
  user_id: string;
  user_email: string;
  store_name: string;
  store_description: string | null;
  store_logo: string | null;
  phone: string | null;
  address: string | null;
  verification_status: "basic" | "verified" | "suspended" | "pending" | "rejected";
  suspension_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
};

// 🟢 Active covers both "basic" (can sell, no withdrawals) and "verified"
// (full access) — both are functioning, non-suspended sellers from a
// moderation standpoint. The distinct Basic/Verified badges in the summary
// legend above the table still show that finer distinction.
const statusConfig: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  basic:     { bg: "#D1FAE5", color: "#065F46", label: "Active (Basic)",    dot: "🟢" },
  verified:  { bg: "#D1FAE5", color: "#065F46", label: "Active (Verified)", dot: "🟢" },
  pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending",           dot: "🟡" },
  suspended: { bg: "#FEE2E2", color: "#991B1B", label: "Suspended",         dot: "🔴" },
  rejected:  { bg: "#F3F4F6", color: "#374151", label: "Rejected",          dot: "⚫" },
};

type TabFilter = "all" | "basic" | "verified" | "suspended" | "pending" | "rejected";
const tabFilters: TabFilter[] = ["all", "basic", "verified", "suspended", "pending", "rejected"];

export default function AdminSellers() {
  const { open, setOpen, runWithStepUp, handleVerified } = useStepUp();
  const qc = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState<TabFilter>("all");
  const [suspendTarget, setSuspendTarget] = useState<SellerApplication | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<SellerApplication | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SellerApplication | null>(null);

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async (): Promise<SellerApplication[]> => {
      const { data, error } = await (supabase as any).rpc("get_seller_applications");
      if (error) {
        console.warn("RPC not available, falling back to direct query:", error.message);
        const { data: fallback } = await supabase
          .from("sellers")
          .select("*")
          .order("created_at", { ascending: false });
        return ((fallback ?? []) as any[]).map((s) => ({ ...s, user_email: "—" }));
      }
      return (data ?? []) as SellerApplication[];
    },
  });

  const filtered = (sellers ?? []).filter(
    (s) => currentFilter === "all" || s.verification_status === currentFilter
  );

  const counts = (sellers ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.verification_status] = (acc[s.verification_status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, { all: 0 });

  async function callModeration(body: Record<string, unknown>): Promise<boolean> {
    const res = await runWithStepUp(() =>
      fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Action failed.");
      return false;
    }
    return true;
  }

  async function approve(seller: SellerApplication) {
    if (await callModeration({ action: "approve-seller", sellerId: seller.id })) {
      toast.success("Seller approved.");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  async function reject(seller: SellerApplication, reason: string) {
    if (await callModeration({ action: "reject-seller", sellerId: seller.id, reason })) {
      toast.success("Seller rejected.");
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
    setRejectTarget(null);
  }

  async function suspend(seller: SellerApplication, reason: string, notes: string) {
    if (await callModeration({ action: "suspend-seller", sellerId: seller.id, reason, notes })) {
      toast.success(`${seller.store_name} suspended.`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
    setSuspendTarget(null);
  }

  async function reactivate(seller: SellerApplication) {
    if (await callModeration({ action: "reactivate-seller", sellerId: seller.id })) {
      toast.success(`${seller.store_name} reactivated.`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
    setReactivateTarget(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Sellers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sellers?.length ?? 0} total · {counts.basic ?? 0} basic · {counts.verified ?? 0} verified · {counts.suspended ?? 0} suspended
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
        {[
          { label: "Active",    desc: "Can sell (Basic: no withdrawals, Verified: full access)", bg: "#D1FAE5", color: "#065F46" },
          { label: "Pending",   desc: "Application awaiting review",  bg: "#FEF3C7", color: "#92400E" },
          { label: "Suspended", desc: "No dashboard access",          bg: "#FEE2E2", color: "#991B1B" },
          { label: "Rejected",  desc: "Application denied",           bg: "#F3F4F6", color: "#374151" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: item.bg, color: item.color }}>{item.label}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{item.desc}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabFilters.map((tab) => {
          const count = counts[tab];
          if (tab !== "all" && !count) return null;
          return (
            <button
              key={tab}
              onClick={() => setCurrentFilter(tab)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: currentFilter === tab ? "#E8611A" : "#F3F4F6",
                color: currentFilter === tab ? "#fff" : "#6B7280",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count > 0 && <span className="ml-1.5 opacity-80">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-muted-foreground">No {currentFilter === "all" ? "" : currentFilter + " "}sellers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Store", "Contact", "Date Joined", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((seller) => {
                  const s = statusConfig[seller.verification_status] ?? statusConfig.basic;
                  return (
                    <tr key={seller.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center flex-shrink-0">
                            {seller.store_logo ? (
                              <img src={seller.store_logo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-lg font-black text-orange-400">{seller.store_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground line-clamp-1">{seller.store_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{seller.store_description ?? "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {seller.user_email && seller.user_email !== "—" && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{seller.user_email}</span>
                            </div>
                          )}
                          {seller.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 flex-shrink-0" /><span>{seller.phone}</span>
                            </div>
                          )}
                          {seller.address && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-1 max-w-[180px]">{seller.address}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground whitespace-nowrap">
                          {new Date(seller.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </div>
                        {seller.suspended_at && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            Suspended {new Date(seller.suspended_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color, display: "inline-block" }}>
                          {s.dot} {s.label}
                        </span>
                        {seller.verification_status === "suspended" && seller.suspension_reason && (
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px] line-clamp-2">{seller.suspension_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(seller.verification_status === "verified" || seller.verification_status === "basic") && (
                            <Link to="/store/$sellerId" params={{ sellerId: seller.id }}>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="View store">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}

                          {seller.verification_status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => approve(seller)}>
                                <ShieldCheck className="h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => setRejectTarget(seller)}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}

                          {(seller.verification_status === "basic" || seller.verification_status === "verified") && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => setSuspendTarget(seller)}>
                              <ShieldOff className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          )}

                          {seller.verification_status === "basic" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => approve(seller)}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Upgrade to Verified
                            </Button>
                          )}

                          {seller.verification_status === "suspended" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => setReactivateTarget(seller)}>
                              <RefreshCw className="h-3.5 w-3.5" /> Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {suspendTarget && (
        <SuspendModal
          seller={suspendTarget}
          onCancel={() => setSuspendTarget(null)}
          onConfirm={(reason, notes) => suspend(suspendTarget, reason, notes)}
        />
      )}

      {reactivateTarget && (
        <ConfirmModal
          title="Reactivate this seller?"
          message="This seller will immediately regain access to their seller dashboard and may continue selling on Nexcart."
          confirmLabel="Reactivate"
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
          onCancel={() => setReactivateTarget(null)}
          onConfirm={() => reactivate(reactivateTarget)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          seller={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) => reject(rejectTarget, reason)}
        />
      )}

      <StepUpDialog
        open={open}
        onOpenChange={setOpen}
        onVerified={handleVerified}
        description="Changing a seller's status requires a fresh password confirmation. Please re-enter your password to continue."
      />
    </div>
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%" }}>{children}</div>
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, confirmClass, onCancel, onConfirm,
}: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          className={`text-white ${confirmClass}`}
          disabled={busy}
          onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

function SuspendModal({
  seller, onCancel, onConfirm,
}: {
  seller: SellerApplication; onCancel: () => void; onConfirm: (reason: string, notes: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell>
      <h3 className="text-lg font-bold text-foreground mb-1">Suspend {seller.store_name}?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The seller will immediately lose dashboard access. A reason is required — it's shown to the seller and kept in the audit log.
      </p>
      <div className="space-y-3 mb-5">
        <div>
          <Label className="text-xs font-semibold">Suspension reason *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated policy violations" rows={2} />
        </div>
        <div>
          <Label className="text-xs font-semibold">Internal notes (optional, not shown to seller)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal context for other admins" rows={2} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          className="text-white bg-red-600 hover:bg-red-700"
          disabled={busy || !reason.trim()}
          onClick={async () => { setBusy(true); await onConfirm(reason, notes); setBusy(false); }}
        >
          Suspend Seller
        </Button>
      </div>
    </ModalShell>
  );
}

function RejectModal({
  seller, onCancel, onConfirm,
}: {
  seller: SellerApplication; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell>
      <h3 className="text-lg font-bold text-foreground mb-1">Reject {seller.store_name}'s application?</h3>
      <div className="mb-4">
        <Label className="text-xs font-semibold">Reason (optional, shown to applicant)</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Incomplete business information" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          className="text-white bg-red-600 hover:bg-red-700"
          disabled={busy}
          onClick={async () => { setBusy(true); await onConfirm(reason); setBusy(false); }}
        >
          Reject
        </Button>
      </div>
    </ModalShell>
  );
}
