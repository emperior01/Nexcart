import { useState, useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/index";
import { toast } from "sonner";
import {
  Store, ShieldCheck, Lock, CheckCircle, AlertCircle,
  Globe,
} from "lucide-react";

export default function SellerSettings() {
  const { seller, refetch } = useSeller();
  const { currency: globalCurrency, setCurrency } = useCurrency();
  const location = useLocation();
  const verificationRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [highlightVerification, setHighlightVerification] = useState(false);
  const [highlightCurrency, setHighlightCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(globalCurrency);

  const [form, setForm] = useState({
    store_name: "",
    store_description: "",
    store_logo: "",
    store_banner: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (seller) {
      setForm({
        store_name: seller.store_name ?? "",
        store_description: seller.store_description ?? "",
        store_logo: seller.store_logo ?? "",
        store_banner: seller.store_banner ?? "",
        phone: seller.phone ?? "",
        address: seller.address ?? "",
      });
    }
  }, [seller]);

  // Keep local currency in sync if global changes externally
  useEffect(() => {
    setSelectedCurrency(globalCurrency);
  }, [globalCurrency]);

  // Scroll + highlight on hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#verification") {
      setTimeout(() => {
        verificationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightVerification(true);
        setTimeout(() => setHighlightVerification(false), 3000);
      }, 150);
    }
    if (hash === "#currency") {
      setTimeout(() => {
        currencyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightCurrency(true);
        setTimeout(() => setHighlightCurrency(false), 3000);
      }, 150);
    }
  }, [location.hash]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!seller?.id) return;
    if (!form.store_name.trim()) { toast.error("Store name is required."); return; }
    setSaving(true);
    try {
      const { error } = await (supabase.from("sellers") as any).update({
        store_name: form.store_name.trim(),
        store_description: form.store_description.trim() || null,
        store_logo: form.store_logo.trim() || null,
        store_banner: form.store_banner.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      }).eq("id", seller.id);
      if (error) throw error;
      toast.success("Store settings saved!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCurrency() {
    if (!seller?.user_id) return;
    setSavingCurrency(true);
    try {
      // Persist via CurrencyContext (writes to profiles + localStorage)
      setCurrency(selectedCurrency);
      const cur = currencyList.find((c) => c.code === selectedCurrency);
      toast.success(`Currency set to ${cur?.name ?? selectedCurrency}. All financial figures will now display in ${selectedCurrency}.`);
    } catch (err) {
      toast.error("Failed to save currency preference.");
    } finally {
      setSavingCurrency(false);
    }
  }

  const isVerified = seller?.verification_status === "verified";
  const { currencies: currencyList } = useCurrencies();

  const sectionStyle = (highlighted: boolean): React.CSSProperties => ({
    borderRadius: 16,
    border: highlighted ? "2px solid #E8611A" : "1px solid #EBEBEB",
    background: highlighted ? "rgba(232,97,26,0.03)" : "#fff",
    padding: "20px",
    boxShadow: highlighted
      ? "0 0 0 4px rgba(232,97,26,0.1)"
      : "0 1px 4px rgba(0,0,0,0.04)",
    transition: "all 0.4s ease",
    marginBottom: 16,
  });

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto", boxSizing: "border-box" as const }}>
      <style>{`
        .currency-option:hover { background: rgba(232,97,26,0.06) !important; }
        @keyframes highlight-pulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(232,97,26,0.1); }
          50% { box-shadow: 0 0 0 8px rgba(232,97,26,0.2); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
          Store Settings
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          Manage your store profile, branding, and preferences.
        </p>
      </div>

      {/* Store logo preview card */}
      {seller?.store_logo && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 16px", borderRadius: 14,
          border: "1px solid #F3F4F6", background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 16,
        }}>
          <img src={seller.store_logo} alt={seller.store_name} style={{ height: 56, width: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#0D0D0D" }}>{seller.store_name}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
              background: isVerified ? "#D1FAE5" : "#FEF3C7",
              color: isVerified ? "#065F46" : "#92400E",
            }}>
              {seller.verification_status.charAt(0).toUpperCase() + seller.verification_status.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* ── Store Profile Form ─────────────────────────────── */}
      <form onSubmit={handleSave} style={sectionStyle(false)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Store style={{ width: 16, height: 16, color: "#E8611A" }} />
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>
            Store Profile
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <div>
            <Label>Store Name *</Label>
            <Input
              value={form.store_name}
              onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
              placeholder="Your store name"
              style={{ marginTop: 6 }}
            />
          </div>

          <div>
            <Label>Store Description</Label>
            <Textarea
              value={form.store_description}
              onChange={(e) => setForm((f) => ({ ...f, store_description: e.target.value }))}
              rows={3}
              placeholder="Tell customers about your store…"
              style={{ marginTop: 6 }}
            />
          </div>

          <div>
            <Label>Logo URL</Label>
            <Input
              value={form.store_logo}
              onChange={(e) => setForm((f) => ({ ...f, store_logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
              style={{ marginTop: 6 }}
            />
            {form.store_logo && (
              <img src={form.store_logo} alt="Logo preview" style={{ height: 56, width: 56, borderRadius: 10, objectFit: "cover", marginTop: 8, border: "1px solid #F3F4F6" }} />
            )}
          </div>

          <div>
            <Label>Banner URL</Label>
            <Input
              value={form.store_banner}
              onChange={(e) => setForm((f) => ({ ...f, store_banner: e.target.value }))}
              placeholder="https://example.com/banner.jpg"
              style={{ marginTop: 6 }}
            />
            {form.store_banner && (
              <img src={form.store_banner} alt="Banner preview" style={{ width: "100%", height: 96, borderRadius: 10, objectFit: "cover", marginTop: 8, border: "1px solid #F3F4F6" }} />
            )}
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+234 800 000 0000"
              style={{ marginTop: 6 }}
            />
          </div>

          <div>
            <Label>Business Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              placeholder="Street, City, State, Country"
              style={{ marginTop: 6 }}
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            style={{
              width: "100%", background: "linear-gradient(135deg,#E8611A,#C4511A)",
              color: "#fff", fontWeight: 700, borderRadius: 10, padding: "11px",
            }}
          >
            {saving ? "Saving…" : "Save Store Profile"}
          </Button>
        </div>
      </form>

      {/* ── Preferred Currency ─────────────────────────────── */}
      <div ref={currencyRef} id="currency" style={sectionStyle(highlightCurrency)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Globe style={{ width: 16, height: 16, color: "#3B82F6" }} />
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>
            Preferred Currency
          </p>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
          Affects how revenue, earnings, and withdrawals are displayed in your dashboard.
          This does <strong>not</strong> change stored prices or what customers pay — only your view.
        </p>

        {/* Currency selector */}
        <div style={{ marginBottom: 14 }}>
          <CurrencyPicker
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            currencies={currencyList}
          />
        </div>

        {/* Info note */}
        <div style={{
          background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10,
          padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14,
        }}>
          <AlertCircle style={{ width: 14, height: 14, color: "#3B82F6", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.5 }}>
            Revenue figures are converted from their original currency using approximate exchange rates.
            Actual payout amounts are determined at withdrawal time.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSaveCurrency}
          disabled={savingCurrency || selectedCurrency === globalCurrency}
          style={{
            width: "100%",
            background: selectedCurrency === globalCurrency
              ? "#F3F4F6"
              : "linear-gradient(135deg,#3B82F6,#1D4ED8)",
            color: selectedCurrency === globalCurrency ? "#9CA3AF" : "#fff",
            fontWeight: 700, borderRadius: 10, padding: "11px",
            border: "none", cursor: selectedCurrency === globalCurrency ? "default" : "pointer",
          }}
        >
          {savingCurrency
            ? "Saving…"
            : selectedCurrency === globalCurrency
            ? `Current: ${selectedCurrency}`
            : `Save — Switch to ${selectedCurrency}`}
        </Button>
      </div>

      {/* ── Verification Status ────────────────────────────── */}
      <div
        ref={verificationRef}
        id="verification"
        style={{
          ...sectionStyle(highlightVerification),
          animation: highlightVerification ? "highlight-pulse 1s ease-in-out 3" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <ShieldCheck style={{ width: 16, height: 16, color: isVerified ? "#059669" : "#D97706" }} />
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>
            Verification Status
          </p>
          {highlightVerification && (
            <span style={{
              marginLeft: "auto", fontSize: 10, fontWeight: 800,
              background: "rgba(232,97,26,0.1)", color: "#E8611A",
              padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.2)",
            }}>
              Action needed here
            </span>
          )}
        </div>

        {isVerified ? (
          /* Verified state */
          <div style={{
            background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)",
            border: "1px solid #6EE7B7", borderRadius: 12, padding: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle style={{ width: 22, height: 22, color: "#059669", flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 800, fontSize: 14, color: "#065F46" }}>Your store is verified</p>
                <p style={{ fontSize: 12, color: "#047857", marginTop: 2, lineHeight: 1.5 }}>
                  You have full access including withdrawals and the Verified badge on your listings.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Unverified state */
          <>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 14 }}>
              Your store is currently on the <strong style={{ color: "#D97706" }}>Basic plan</strong>.
              Complete verification to unlock withdrawals, display a Verified badge, and access priority support.
            </p>

            {/* What's locked */}
            <div style={{
              background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
              padding: "14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#92400E", marginBottom: 10 }}>
                Locked until verified
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {[
                  { icon: Lock, label: "Withdrawals", desc: "Request payouts to your bank account" },
                  { icon: ShieldCheck, label: "Verified Badge", desc: "Builds trust with customers on your listings" },
                  { icon: AlertCircle, label: "Priority Support", desc: "Faster response times from our team" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(217,119,6,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 12, height: 12, color: "#D97706" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>{label}</p>
                      <p style={{ fontSize: 11, color: "#B45309" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div style={{
              background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 12,
              padding: "14px", marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#6B7280", marginBottom: 10 }}>
                How verification works
              </p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {[
                  "Make sure your store name and contact details above are complete and accurate.",
                  "Ensure your store has at least one active product listed.",
                  "An admin will review your store and upgrade your account.",
                  "You'll receive a notification here once approved — usually within 24–48 hours.",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(232,97,26,0.1)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#E8611A",
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.5 }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current status */}
            <div style={{
              background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10,
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertCircle style={{ width: 14, height: 14, color: "#D97706", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                Status: <strong>Awaiting admin review.</strong> Keep selling — your earnings are being tracked and will be available to withdraw once verified.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
