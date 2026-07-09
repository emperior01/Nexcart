import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Store, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";
import { toast } from "sonner";

export default function BecomeSeller() {
  const { user, loading } = useAuth();
  const { seller, isLoading: sellerLoading } = useSeller();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    store_name: "",
    store_description: "",
    phone: "",
    address: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { void navigate({ to: "/auth" }); return; }
    if (!form.store_name.trim()) { toast.error("Store name is required."); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("sellers").insert({
        user_id: user.id,
        store_name: form.store_name.trim(),
        store_description: form.store_description.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        verification_status: "basic",
      } as any);
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || sellerLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center px-4">
          <Store className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-2xl font-extrabold text-foreground">Sign in to become a seller</h2>
          <p className="text-sm text-muted-foreground">You need an account to open a store on Nexcart.</p>
          <Button
            className="mt-2 text-white rounded-full px-8"
            style={{ background: "#E8611A" }}
            onClick={() => navigate({ to: "/auth" })}
          >
            Sign In / Sign Up
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (seller) {
    const status = seller.verification_status as string;
    const isActive = status === "basic" || status === "verified";
    // Per-status messaging: each of the four non-active states gets its
    // own explanation instead of a single generic "suspended" fallback.
    // suspension_reason is surfaced here specifically because it's the
    // one status the seller couldn't otherwise learn the "why" for.
    const statusMessage =
      status === "pending"
        ? "Your application is awaiting approval."
        : status === "rejected"
          ? "Your application has been rejected."
          : status === "suspended"
            ? (seller as any).suspension_reason
              ? `Your seller account has been suspended. Reason: ${(seller as any).suspension_reason}`
              : "Your seller account has been suspended. Please contact support for assistance."
            : null;

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center px-4">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#E8611A,#C4511A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">You already have a store</h2>
          <SellerStatusBadge status={status} large />
          {isActive ? (
            <Button
              className="mt-2 text-white rounded-full px-8"
              style={{ background: "#E8611A" }}
              onClick={() => navigate({ to: "/seller" })}
            >
              Go to Seller Dashboard
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground max-w-sm">{statusMessage}</p>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center px-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-extrabold text-foreground">Your Store is Ready!</h2>
          <p className="text-muted-foreground max-w-sm">
            You are now a seller on Nexcart. You can start listing products and managing orders immediately.
          </p>
          <div className="mt-1 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 max-w-sm text-sm text-amber-800">
            <ShieldCheck className="inline h-4 w-4 mr-1 -mt-0.5" />
            <span className="font-semibold">Basic Seller</span> — You will unlock withdrawals once an admin verifies your store.
          </div>
          <Button
            className="mt-3 rounded-full px-8 text-white"
            style={{ background: "#E8611A" }}
            onClick={() => navigate({ to: "/seller" })}
          >
            Go to Seller Dashboard
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
            <div className="mb-8 text-center">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#E8611A,#C4511A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Store className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                Open Your Store
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Join thousands of sellers on Nexcart. Get instant access to your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Store Name *</Label>
                <Input
                  value={form.store_name}
                  onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
                  placeholder="e.g. Lagos Fashion Hub"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Store Description</Label>
                <Textarea
                  value={form.store_description}
                  onChange={(e) => setForm((f) => ({ ...f, store_description: e.target.value }))}
                  placeholder="Tell customers what your store sells..."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Business Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street, City, State, Country"
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full text-white font-bold py-6 rounded-xl"
                style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
              >
                {submitting ? "Creating your store..." : "Start Selling Now"}
              </Button>
            </form>

            <div className="mt-6 rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground text-center">
                You will get <strong>instant dashboard access</strong> as a Basic Seller. Withdrawals unlock after your store is verified by our team.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function SellerStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    basic:     { bg: "#D1FAE5", color: "#065F46", label: "Active — Basic Seller" },
    verified:  { bg: "#D1FAE5", color: "#065F46", label: "Active — Verified Seller" },
    suspended: { bg: "#FEE2E2", color: "#991B1B", label: "Suspended" },
    pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    rejected:  { bg: "#F3F4F6", color: "#374151", label: "Rejected" },
  };
  const c = config[status] ?? config.basic;
  return (
    <span
      style={{
        fontSize: large ? 13 : 10,
        fontWeight: 700,
        padding: large ? "5px 14px" : "3px 10px",
        borderRadius: 50,
        background: c.bg,
        color: c.color,
        display: "inline-block",
      }}
    >
      {c.label}
    </span>
  );
}
