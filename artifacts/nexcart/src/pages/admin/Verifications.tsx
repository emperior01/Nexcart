import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, Eye, X, AlertCircle, Search, FileText, User, MapPin, Building2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

type VerifStatus =
  | "not_started"
  | "documents_submitted"
  | "under_review"
  | "verified"
  | "rejected";

type VerifRow = {
  id: string;
  seller_id: string;
  full_legal_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  id_type: string | null;
  government_id_url: string | null;
  address_line: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  proof_of_address_url: string | null;
  business_name: string | null;
  business_type: string | null;
  registration_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  status: VerifStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined from sellers
  store_name?: string;
  user_email?: string;
};

const statusConfig: Record<VerifStatus, { bg: string; color: string; border: string; label: string }> = {
  not_started:          { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB", label: "Not Started"         },
  documents_submitted:  { bg: "#DBEAFE", color: "#1E40AF", border: "#BFDBFE", label: "Docs Submitted"      },
  under_review:         { bg: "#EDE9FE", color: "#5B21B6", border: "#DDD6FE", label: "Under Review"        },
  verified:             { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0", label: "Verified"            },
  rejected:             { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA", label: "Rejected"            },
};

type TabFilter = "all" | "documents_submitted" | "under_review" | "verified" | "rejected";
const TABS: { key: TabFilter; label: string }[] = [
  { key: "all",                  label: "All"         },
  { key: "documents_submitted",  label: "Submitted"   },
  { key: "under_review",         label: "Under Review"},
  { key: "verified",             label: "Verified"    },
  { key: "rejected",             label: "Rejected"    },
];

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", minWidth: 120, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) return <InfoRow label={label} value="Not provided" />;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", minWidth: 120, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#E8611A", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <Eye style={{ width: 13, height: 13 }} /> View Document
      </a>
    </div>
  );
}

export default function AdminVerifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VerifRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async (): Promise<VerifRow[]> => {
      // Fetch verifications joined with sellers
      const { data: verifs, error } = await (supabase as any)
        .from("seller_verifications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) { console.error(error); return []; }

      // Fetch seller names
      const sellerIds = (verifs ?? []).map((v: VerifRow) => v.seller_id);
      if (sellerIds.length === 0) return [];

      const { data: sellers } = await supabase
        .from("sellers")
        .select("id, store_name, user_id")
        .in("id", sellerIds);

      const sellerMap = new Map((sellers ?? []).map((s: { id: string; store_name: string; user_id: string }) => [s.id, s]));

      return (verifs ?? []).map((v: VerifRow) => {
        const seller = sellerMap.get(v.seller_id) as { store_name: string } | undefined;
        return { ...v, store_name: seller?.store_name ?? "—" };
      });
    },
  });

  const filtered = (rows ?? []).filter((r) => {
    const matchTab = tab === "all" || r.status === tab;
    const matchSearch = !search ||
      (r.store_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.full_legal_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, { all: 0 });

  async function approve(v: VerifRow) {
    setProcessing(true);
    try {
      // Update verification record
      const { error: ve } = await (supabase as any)
        .from("seller_verifications")
        .update({ status: "verified", reviewed_at: new Date().toISOString(), rejection_reason: null })
        .eq("id", v.id);
      if (ve) throw ve;

      // Update sellers table
      const { error: se } = await (supabase as any)
        .from("sellers")
        .update({ verification_status: "verified", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", v.seller_id);
      if (se) throw se;

      // Notify seller
      await (supabase as any).from("seller_notifications").insert({
        seller_id: v.seller_id,
        title: "Verification Approved 🎉",
        message: "Congratulations! Your seller account has been verified. You now have access to withdrawals, a verified badge, and priority support.",
        is_read: false,
      });

      toast.success(`${v.store_name} verified successfully!`);
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setProcessing(false);
    }
  }

  async function reject(v: VerifRow) {
    if (!rejectionReason.trim()) { toast.error("Please enter a rejection reason."); return; }
    setProcessing(true);
    try {
      const { error: ve } = await (supabase as any)
        .from("seller_verifications")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason.trim() })
        .eq("id", v.id);
      if (ve) throw ve;

      // Notify seller
      await (supabase as any).from("seller_notifications").insert({
        seller_id: v.seller_id,
        title: "Verification Rejected",
        message: `Your verification was rejected. Reason: ${rejectionReason.trim()}. Please resubmit with the correct documents.`,
        is_read: false,
      });

      toast.success("Verification rejected and seller notified.");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      setSelected(null);
      setRejectionReason("");
      setShowRejectInput(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setProcessing(false);
    }
  }

  async function markUnderReview(v: VerifRow) {
    setProcessing(true);
    try {
      await (supabase as any)
        .from("seller_verifications")
        .update({ status: "under_review" })
        .eq("id", v.id);
      toast.success("Marked as Under Review.");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      if (selected?.id === v.id) setSelected({ ...v, status: "under_review" });
    } catch (err) {
      toast.error("Failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={{ padding: "16px" }} className="admin-content-padding">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, color: "#0D0D0D", letterSpacing: "-0.02em" }}>
          Verification Requests
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          Review and approve seller verification documents
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {TABS.map(({ key, label }) => {
          const cnt = counts[key] ?? 0;
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: 50,
                border: active ? "none" : "1.5px solid #E5E7EB",
                background: active ? "#E8611A" : "#fff",
                color: active ? "#fff" : "#6B7280",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {label}
              {cnt > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 50,
                  background: active ? "rgba(255,255,255,0.3)" : "#F3F4F6",
                  color: active ? "#fff" : "#374151",
                  fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 5px",
                }}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9CA3AF" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store or seller name..."
          style={{ width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Table / cards */}
      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {isLoading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <FileText style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>No verification requests found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F3F4F6", background: "#FAFAFA" }}>
                  {["Store", "Seller Name", "Submitted", "Status", "Action"].map((h) => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const cfg = statusConfig[v.status] ?? statusConfig.not_started;
                  return (
                    <tr key={v.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D" }}>{v.store_name}</p>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151" }}>{v.full_legal_name ?? "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#6B7280" }}>
                        {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => { setSelected(v); setShowRejectInput(false); setRejectionReason(""); }}
                          style={{ fontSize: 12, fontWeight: 600, color: "#E8611A", background: "rgba(232,97,26,0.08)", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          <Eye style={{ width: 13, height: 13 }} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
            onClick={() => { setSelected(null); setShowRejectInput(false); setRejectionReason(""); }}
          />
          <div style={{
            position: "fixed", right: 0, top: 0, bottom: 0,
            width: "min(460px, 100vw)",
            background: "#fff", zIndex: 50,
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            overflowY: "auto",
          }}>
            {/* Drawer header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: "#0D0D0D" }}>{selected.store_name}</p>
                <p style={{ fontSize: 12, color: "#6B7280" }}>Verification Review</p>
              </div>
              <button
                onClick={() => { setSelected(null); setShowRejectInput(false); setRejectionReason(""); }}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", flex: 1 }}>
              {/* Current status */}
              {(() => {
                const cfg = statusConfig[selected.status];
                return (
                  <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>Status: {cfg.label}</span>
                    {selected.submitted_at && (
                      <span style={{ fontSize: 11, color: cfg.color }}>Submitted {new Date(selected.submitted_at).toLocaleDateString()}</span>
                    )}
                  </div>
                );
              })()}

              {/* Identity */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <User style={{ width: 14, height: 14, color: "#E8611A" }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#0D0D0D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Identity</p>
                </div>
                <InfoRow label="Full Name" value={selected.full_legal_name} />
                <InfoRow label="Date of Birth" value={selected.date_of_birth} />
                <InfoRow label="Country" value={selected.country} />
                <InfoRow label="ID Type" value={selected.id_type} />
                <DocLink label="Gov. ID" url={selected.government_id_url} />
              </div>

              {/* Address */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <MapPin style={{ width: 14, height: 14, color: "#E8611A" }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#0D0D0D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Address</p>
                </div>
                <InfoRow label="Address" value={selected.address_line} />
                <InfoRow label="City" value={selected.address_city} />
                <InfoRow label="State" value={selected.address_state} />
                <InfoRow label="Country" value={selected.address_country} />
                <DocLink label="Proof" url={selected.proof_of_address_url} />
              </div>

              {/* Business */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Building2 style={{ width: 14, height: 14, color: "#E8611A" }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#0D0D0D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Business</p>
                </div>
                <InfoRow label="Biz. Name" value={selected.business_name} />
                <InfoRow label="Biz. Type" value={selected.business_type} />
                <InfoRow label="Reg. Number" value={selected.registration_number} />
              </div>

              {/* Payment */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <CreditCard style={{ width: 14, height: 14, color: "#E8611A" }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#0D0D0D", textTransform: "uppercase", letterSpacing: "0.06em" }}>Payment</p>
                </div>
                <InfoRow label="Bank" value={selected.bank_name} />
                <InfoRow label="Acct. Name" value={selected.account_name} />
                <InfoRow label="Acct. No." value={selected.account_number} />
              </div>

              {/* Rejection reason (if any) */}
              {selected.rejection_reason && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <AlertCircle style={{ width: 13, height: 13, color: "#DC2626" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>Previous Rejection Reason</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#991B1B" }}>{selected.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status !== "verified" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selected.status === "documents_submitted" && (
                    <button
                      onClick={() => markUnderReview(selected)}
                      disabled={processing}
                      style={{ padding: "12px", borderRadius: 12, border: "1.5px solid #BFDBFE", background: "#EFF6FF", color: "#1E40AF", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    >
                      Mark as Under Review
                    </button>
                  )}

                  <button
                    onClick={() => approve(selected)}
                    disabled={processing}
                    style={{ padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#10B981,#065F46)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <ShieldCheck style={{ width: 16, height: 16 }} />
                    {processing ? "Processing..." : "Approve Verification"}
                  </button>

                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      style={{ padding: "12px", borderRadius: 12, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <ShieldX style={{ width: 16, height: 16 }} /> Reject
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection (visible to seller)..."
                        rows={3}
                        style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #FECACA", borderRadius: 10, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => reject(selected)}
                          disabled={processing || !rejectionReason.trim()}
                          style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#DC2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                        >
                          {processing ? "Rejecting..." : "Confirm Reject"}
                        </button>
                        <button
                          onClick={() => { setShowRejectInput(false); setRejectionReason(""); }}
                          style={{ padding: "11px 16px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selected.status === "verified" && (
                <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <ShieldCheck style={{ width: 24, height: 24, color: "#10B981", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>This seller is verified.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
