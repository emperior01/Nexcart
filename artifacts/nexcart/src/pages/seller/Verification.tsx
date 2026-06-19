import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck, User, MapPin, Building2, CreditCard,
  Upload, Check, AlertCircle, ChevronRight, ChevronLeft, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── types ────────────────────────────────────────────────────────────────────
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
};

// ─── constants ────────────────────────────────────────────────────────────────
const ID_TYPES = [
  "National ID",
  "Passport",
  "Driver's License",
  "Voter's Card",
  "Residence Permit",
];
const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Limited Liability Company (LLC)",
  "Corporation",
  "Non-Profit",
  "Other",
];
const STEPS = [
  { id: 0, label: "Identity",  icon: User        },
  { id: 1, label: "Address",   icon: MapPin       },
  { id: 2, label: "Business",  icon: Building2    },
  { id: 3, label: "Payment",   icon: CreditCard   },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function statusColor(s: VerifStatus) {
  switch (s) {
    case "verified":            return { bg: "#D1FAE5", color: "#065F46", border: "#A7F3D0" };
    case "under_review":
    case "documents_submitted": return { bg: "#DBEAFE", color: "#1E40AF", border: "#BFDBFE" };
    case "rejected":            return { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" };
    default:                    return { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  }
}
function statusLabel(s: VerifStatus) {
  switch (s) {
    case "not_started":          return "Not Started";
    case "documents_submitted":  return "Documents Submitted";
    case "under_review":         return "Under Review";
    case "verified":             return "Verified";
    case "rejected":             return "Rejected";
  }
}

// ─── file upload helper ────────────────────────────────────────────────────────
async function uploadFile(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("verification-documents")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("verification-documents")
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── sub-components ───────────────────────────────────────────────────────────
function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {label}{required && <span style={{ color: "#E8611A" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  border: "1.5px solid #E5E7EB", borderRadius: 10,
  fontSize: 14, color: "#0D0D0D", background: "#FAFAFA",
  outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

function FileUploadField({
  label, required, value, onChange, accept = "image/*,.pdf",
}: {
  label: string; required?: boolean;
  value: File | null; onChange: (f: File | null) => void;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Field label={label} required={required}>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: "2px dashed #D1D5DB", borderRadius: 10,
          padding: "18px 14px", cursor: "pointer",
          background: value ? "#F0FDF4" : "#FAFAFA",
          display: "flex", alignItems: "center", gap: 10,
          transition: "border-color 0.2s",
        }}
      >
        {value ? (
          <>
            <Check style={{ width: 18, height: 18, color: "#10B981", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X style={{ width: 14, height: 14, color: "#9CA3AF" }} />
            </button>
          </>
        ) : (
          <>
            <Upload style={{ width: 18, height: 18, color: "#9CA3AF", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>Tap to upload (JPG, PNG, PDF)</span>
          </>
        )}
      </div>
      <input
        ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </Field>
  );
}

// ─── status card (shown when already submitted) ────────────────────────────────
function StatusCard({ verif, seller, onResubmit }: { verif: VerifRow; seller: { store_name: string; verification_status: string }; onResubmit: () => void }) {
  const st = verif.status;
  const col = statusColor(st);
  const plan = "Basic"; // plan is always Basic until we add paid tiers

  return (
    <div style={{ padding: "16px", maxWidth: 540, margin: "0 auto" }}>
      {/* header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#0D0D0D" }}>
          Verification
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>{seller.store_name}</p>
      </div>

      {/* status card */}
      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 20, padding: "20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#E8611A,#C4511A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck style={{ width: 22, height: 22, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Seller Plan</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0D0D0D" }}>{plan}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 50, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
            {statusLabel(st)}
          </span>
        </div>

        <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
          {st === "not_started" && (
            <>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 1.6 }}>
                Complete verification to unlock your full seller benefits.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {["Withdrawals", "Verified Badge", "Priority Support"].map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check style={{ width: 11, height: 11, color: "#9CA3AF" }} />
                    </div>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{b}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(st === "documents_submitted" || st === "under_review") && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6" }} />
                <span style={{ fontSize: 13, color: "#1E40AF", fontWeight: 600 }}>Under Review</span>
              </div>
              {verif.submitted_at && (
                <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  Submitted: <strong>{new Date(verif.submitted_at).toLocaleDateString()}</strong>
                </p>
              )}
              <p style={{ fontSize: 12, color: "#6B7280" }}>
                Estimated review time: <strong>1–3 business days</strong>
              </p>
            </>
          )}

          {st === "verified" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Withdrawals Enabled",
                "Verified Badge Active",
                "Priority Support Enabled",
              ].map((b) => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check style={{ width: 11, height: 11, color: "#065F46" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>{b}</span>
                </div>
              ))}
            </div>
          )}

          {st === "rejected" && (
            <>
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AlertCircle style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>Rejection Reason</span>
                </div>
                <p style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.5 }}>
                  {verif.rejection_reason ?? "Your documents could not be verified. Please resubmit with clear, valid documents."}
                </p>
              </div>
              <button
                onClick={onResubmit}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg,#E8611A,#C4511A)",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                Resubmit Documents
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────
export default function SellerVerification() {
  const { seller } = useSeller();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [forceForm, setForceForm] = useState(false); // for resubmission

  // form state
  const [form, setForm] = useState({
    full_legal_name: "",
    date_of_birth: "",
    country: "",
    id_type: "",
    address_line: "",
    address_city: "",
    address_state: "",
    address_country: "",
    business_name: "",
    business_type: "",
    registration_number: "",
    bank_name: "",
    account_name: "",
    account_number: "",
  });
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // fetch existing verification record
  const { data: verif, isLoading } = useQuery({
    queryKey: ["seller-verification", seller?.id],
    enabled: !!seller?.id,
    queryFn: async (): Promise<VerifRow | null> => {
      if (!seller?.id) return null;
      const { data } = await (supabase as any)
        .from("seller_verifications")
        .select("*")
        .eq("seller_id", seller.id)
        .maybeSingle();
      return (data as VerifRow | null) ?? null;
    },
  });

  async function handleSubmit() {
    if (!seller?.id) return;
    if (!form.full_legal_name.trim()) { toast.error("Full legal name is required."); return; }
    if (!form.date_of_birth)          { toast.error("Date of birth is required."); return; }
    if (!form.country.trim())         { toast.error("Country is required."); return; }
    if (!form.id_type)                { toast.error("ID type is required."); return; }
    if (!govIdFile)                   { toast.error("Government ID upload is required."); return; }
    if (!form.address_line.trim())    { toast.error("Address is required."); return; }
    if (!form.address_city.trim())    { toast.error("City is required."); return; }
    if (!form.address_state.trim())   { toast.error("State is required."); return; }
    if (!form.address_country.trim()) { toast.error("Address country is required."); return; }
    if (!proofFile)                   { toast.error("Proof of address upload is required."); return; }
    if (!form.business_name.trim())   { toast.error("Store name is required."); return; }
    if (!form.business_type)          { toast.error("Business type is required."); return; }
    if (!form.bank_name.trim())       { toast.error("Bank name is required."); return; }
    if (!form.account_name.trim())    { toast.error("Account name is required."); return; }
    if (!form.account_number.trim())  { toast.error("Account number is required."); return; }

    setSubmitting(true);
    try {
      const ts = Date.now();
      const govIdUrl  = await uploadFile(govIdFile,  `${seller.id}/gov-id-${ts}`);
      const proofUrl  = await uploadFile(proofFile,  `${seller.id}/proof-addr-${ts}`);

      const payload = {
        seller_id: seller.id,
        ...form,
        government_id_url: govIdUrl,
        proof_of_address_url: proofUrl,
        status: "documents_submitted" as VerifStatus,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      };

      // upsert
      const { error } = await (supabase as any)
        .from("seller_verifications")
        .upsert(payload, { onConflict: "seller_id" });
      if (error) throw error;

      // notify seller
      await (supabase as any).from("seller_notifications").insert({
        seller_id: seller.id,
        title: "Verification Documents Submitted ✅",
        message: "Your verification documents have been submitted and are under review. You'll be notified when reviewed.",
        is_read: false,
      });

      toast.success("Documents submitted! We'll review within 1–3 business days.");
      qc.invalidateQueries({ queryKey: ["seller-verification", seller.id] });
      setForceForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!seller) return null;
  if (isLoading) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Show status card if already submitted (unless forcing form for resubmission)
  const showStatus = verif && verif.status !== "not_started" && !forceForm;
  if (showStatus) {
    return (
      <StatusCard
        verif={verif}
        seller={{ store_name: seller.store_name, verification_status: seller.verification_status as string }}
        onResubmit={() => {
          // Pre-fill form with existing data
          setForm({
            full_legal_name: verif.full_legal_name ?? "",
            date_of_birth: verif.date_of_birth ?? "",
            country: verif.country ?? "",
            id_type: verif.id_type ?? "",
            address_line: verif.address_line ?? "",
            address_city: verif.address_city ?? "",
            address_state: verif.address_state ?? "",
            address_country: verif.address_country ?? "",
            business_name: verif.business_name ?? "",
            business_type: verif.business_type ?? "",
            registration_number: verif.registration_number ?? "",
            bank_name: verif.bank_name ?? "",
            account_name: verif.account_name ?? "",
            account_number: verif.account_number ?? "",
          });
          setStep(0);
          setForceForm(true);
        }}
      />
    );
  }

  // ── form ────────────────────────────────────────────────────────────────────
  const isLastStep = step === STEPS.length - 1;

  function canProceed() {
    if (step === 0) return !!(form.full_legal_name && form.date_of_birth && form.country && form.id_type && govIdFile);
    if (step === 1) return !!(form.address_line && form.address_city && form.address_state && form.address_country && proofFile);
    if (step === 2) return !!(form.business_name && form.business_type);
    if (step === 3) return !!(form.bank_name && form.account_name && form.account_number);
    return false;
  }

  return (
    <div style={{ padding: "16px", maxWidth: 540, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#0D0D0D" }}>
          Seller Verification
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          Complete all steps to unlock full seller benefits
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "unset" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#E8611A" : active ? "rgba(232,97,26,0.12)" : "#F3F4F6",
                border: active ? "2px solid #E8611A" : "2px solid transparent",
                transition: "all 0.2s",
              }}>
                {done
                  ? <Check style={{ width: 14, height: 14, color: "#fff" }} />
                  : <s.icon style={{ width: 14, height: 14, color: active ? "#E8611A" : "#9CA3AF" }} />
                }
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? "#E8611A" : "#E5E7EB", margin: "0 4px", transition: "background 0.2s" }} />
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#E8611A", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Step {step + 1} of {STEPS.length} — {STEPS[step].label}
      </p>

      {/* Step panels */}
      <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 20, padding: "20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

        {/* Step 0 — Identity */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Full Legal Name" required>
              <input style={inputStyle} placeholder="As shown on your ID" value={form.full_legal_name} onChange={set("full_legal_name")} />
            </Field>
            <Field label="Date of Birth" required>
              <input style={inputStyle} type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
            </Field>
            <Field label="Country" required>
              <input style={inputStyle} placeholder="e.g. Nigeria" value={form.country} onChange={set("country")} />
            </Field>
            <Field label="ID Type" required>
              <select style={selectStyle} value={form.id_type} onChange={set("id_type")}>
                <option value="">Select ID type</option>
                {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <FileUploadField
              label="Government ID Upload"
              required
              value={govIdFile}
              onChange={setGovIdFile}
            />
          </div>
        )}

        {/* Step 1 — Address */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Address" required>
              <input style={inputStyle} placeholder="Street address" value={form.address_line} onChange={set("address_line")} />
            </Field>
            <Field label="City" required>
              <input style={inputStyle} placeholder="City" value={form.address_city} onChange={set("address_city")} />
            </Field>
            <Field label="State / Province" required>
              <input style={inputStyle} placeholder="State or province" value={form.address_state} onChange={set("address_state")} />
            </Field>
            <Field label="Country" required>
              <input style={inputStyle} placeholder="Country" value={form.address_country} onChange={set("address_country")} />
            </Field>
            <FileUploadField
              label="Proof of Address"
              required
              value={proofFile}
              onChange={setProofFile}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF" }}>Accepted: utility bill, bank statement, or government letter (not older than 3 months)</p>
          </div>
        )}

        {/* Step 2 — Business */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Store / Business Name" required>
              <input style={inputStyle} placeholder="Your registered business name" value={form.business_name} onChange={set("business_name")} />
            </Field>
            <Field label="Business Type" required>
              <select style={selectStyle} value={form.business_type} onChange={set("business_type")}>
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Registration Number (optional)">
              <input style={inputStyle} placeholder="CAC / company reg. number" value={form.registration_number} onChange={set("registration_number")} />
            </Field>
          </div>
        )}

        {/* Step 3 — Payment */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 12, color: "#9A3412", fontWeight: 600, lineHeight: 1.5 }}>
                This information is used for withdrawal payouts once your account is verified.
              </p>
            </div>
            <Field label="Bank Name" required>
              <input style={inputStyle} placeholder="e.g. First Bank" value={form.bank_name} onChange={set("bank_name")} />
            </Field>
            <Field label="Account Name" required>
              <input style={inputStyle} placeholder="Name exactly as on bank account" value={form.account_name} onChange={set("account_name")} />
            </Field>
            <Field label="Account Number" required>
              <input style={inputStyle} placeholder="e.g. 0123456789" value={form.account_number} onChange={set("account_number")} />
            </Field>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            style={{
              flex: 1, padding: "13px", borderRadius: 12,
              border: "1.5px solid #E5E7EB", background: "#fff",
              color: "#374151", fontWeight: 600, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back
          </button>
        )}
        <button
          onClick={isLastStep ? handleSubmit : () => setStep((s) => s + 1)}
          disabled={!canProceed() || submitting}
          style={{
            flex: 2, padding: "13px", borderRadius: 12, border: "none",
            background: canProceed() && !submitting
              ? "linear-gradient(135deg,#E8611A,#C4511A)"
              : "#E5E7EB",
            color: canProceed() && !submitting ? "#fff" : "#9CA3AF",
            fontWeight: 700, fontSize: 14,
            cursor: canProceed() && !submitting ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.2s",
          }}
        >
          {submitting ? "Submitting..." : isLastStep ? "Submit for Review" : (
            <><span>Continue</span><ChevronRight style={{ width: 16, height: 16 }} /></>
          )}
        </button>
      </div>
    </div>
  );
}
