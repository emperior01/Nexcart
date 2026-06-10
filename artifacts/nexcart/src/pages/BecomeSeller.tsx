import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Store, ArrowLeft, CheckCircle } from "lucide-react";
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
        verification_status: "pending",
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
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center px-4">
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#E8611A,#C4511A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">You already have a store</h2>
          <p className="text-sm text-muted-foreground">
            Status: <span className={`font-bold ${seller.verification_status === "verified" ? "text-green-600" : seller.verification_status === "rejected" ? "text-red-600" : "text-yellow-600"}`}>
              {seller.verification_status.charAt(0).toUpperCase() + seller.verification_status.slice(1)}
            </span>
          </p>
          {seller.verification_status === "verified" ? (
            <Button
              className="mt-2 text-white rounded-full px-8"
              style={{ background: "#E8611A" }}
              onClick={() => navigate({ to: "/seller" })}
            >
              Go to Seller Dashboard
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground max-w-sm">Your application is under review. We'll notify you once it's approved.</p>
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
          <h2 className="text-2xl font-extrabold text-foreground">Application Submitted!</h2>
          <p className="text-muted-foreground max-w-sm">
            Your seller application is now under review. Our team will verify your store within 24–48 hours. You'll be notified once approved.
          </p>
          <Link to="/">
            <Button className="mt-2 rounded-full px-8 text-white" style={{ background: "#E8611A" }}>
              Back to Home
            </Button>
          </Link>
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
                Join thousands of sellers on Nexcart. Fill in your store details to get started.
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
                  placeholder="Tell customers what your store sells…"
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
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            </form>

            <div className="mt-6 rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground text-center">
                Applications are reviewed within 24–48 hours. Once approved, you can publish products and start selling immediately.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
