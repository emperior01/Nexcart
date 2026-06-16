#!/usr/bin/env python3
"""
Nexcart Hybrid Seller Model — file writer
Run from inside ~/nexcart_scott:
    python3 create_hybrid_seller.py
"""
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'artifacts/nexcart')

files = {}

# ─────────────────────────────────────────────
# 1. src/hooks/use-seller.ts
# ─────────────────────────────────────────────
files["src/hooks/use-seller.ts"] = r'''import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Seller = Database["public"]["Tables"]["sellers"]["Row"];

// Hybrid seller status model
// basic    → instant access after "Become a Seller" (can create products, manage orders; NO withdrawals)
// verified → admin-upgraded; full access including withdrawals
// suspended → blocked; no dashboard access
export type SellerStatus = "basic" | "verified" | "suspended";

export function useSeller() {
  const { user, loading: authLoading } = useAuth();

  const { data: seller, isLoading, refetch } = useQuery({
    queryKey: ["seller-profile", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async (): Promise<Seller | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as Seller | null);
    },
  });

  const status = seller?.verification_status as SellerStatus | "pending" | "rejected" | undefined;

  return {
    seller: seller ?? null,
    isLoading: authLoading || isLoading,
    isSeller: !!seller,
    // Active if basic or verified (not suspended, not pending legacy)
    isActiveSeller: status === "basic" || status === "verified",
    isBasic: status === "basic",
    isVerified: status === "verified",
    isSuspended: status === "suspended",
    refetch,
  };
}
'''

# ─────────────────────────────────────────────
# 2. src/pages/BecomeSeller.tsx
# ─────────────────────────────────────────────
files["src/pages/BecomeSeller.tsx"] = r'''import { useState } from "react";
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
            <p className="text-sm text-muted-foreground max-w-sm">
              Your seller account has been suspended. Please contact support for assistance.
            </p>
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
    basic:     { bg: "#FEF3C7", color: "#92400E", label: "Basic Seller" },
    verified:  { bg: "#D1FAE5", color: "#065F46", label: "Verified Seller" },
    suspended: { bg: "#FEE2E2", color: "#991B1B", label: "Suspended" },
    pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
    rejected:  { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
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
'''

# ─────────────────────────────────────────────
# 3. src/pages/seller/Layout.tsx
# ─────────────────────────────────────────────
files["src/pages/seller/Layout.tsx"] = r'''import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Wallet,
  Star, Settings, Bell, LogOut, Home, Menu, X, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSeller } from "@/hooks/use-seller";

const navItems = [
  { to: "",               label: "Dashboard",      icon: LayoutDashboard },
  { to: "/products",      label: "Products",       icon: Package },
  { to: "/orders",        label: "Orders",         icon: ShoppingBag },
  { to: "/earnings",      label: "Earnings",       icon: TrendingUp },
  { to: "/withdrawals",   label: "Withdrawals",    icon: Wallet },
  { to: "/reviews",       label: "Reviews",        icon: Star },
  { to: "/settings",      label: "Store Settings", icon: Settings },
  { to: "/notifications", label: "Notifications",  icon: Bell },
] as const;

function StatusPill({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#D1FAE5", color: "#065F46", padding: "3px 8px", borderRadius: 50, border: "1px solid #A7F3D0", display: "inline-flex", alignItems: "center", gap: 3 }}>
        <ShieldCheck style={{ width: 9, height: 9 }} /> Verified
      </span>
    );
  }
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "#FEF3C7", color: "#92400E", padding: "3px 8px", borderRadius: 50, border: "1px solid #FDE68A", display: "inline-flex", alignItems: "center", gap: 3 }}>
      Basic
    </span>
  );
}

function SidebarContent({ onClose, signOut, storeName, sellerStatus }: {
  onClose: () => void;
  signOut: () => void;
  storeName: string;
  sellerStatus: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerified = sellerStatus === "verified";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#E8611A", letterSpacing: "-0.03em" }}>Nexcart</span>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: "rgba(232,97,26,0.12)", color: "#E8611A", padding: "3px 8px", borderRadius: 50, border: "1px solid rgba(232,97,26,0.25)" }}>Seller</span>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginBottom: 6 }}>{storeName}</p>
        <StatusPill status={sellerStatus} />
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" as const }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const fullPath = "/seller" + to;
          const isActive = to === "" ? pathname === "/seller" || pathname === "/seller/" : pathname.startsWith("/seller" + to);
          const isWithdrawals = to === "/withdrawals";
          const locked = isWithdrawals && !isVerified;

          return (
            <Link
              key={to}
              to={locked ? "/seller" : fullPath}
              onClick={locked ? (e) => { e.preventDefault(); } : onClose}
              title={locked ? "Only Verified sellers can request withdrawals" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                transition: "background 0.15s",
                color: isActive ? "#E8611A" : locked ? "#C4C4C4" : "#6B7280",
                background: isActive ? "rgba(232,97,26,0.10)" : "transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.6 : 1,
              }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {locked && (
                <span style={{ fontSize: 9, fontWeight: 700, background: "#FEF3C7", color: "#92400E", padding: "2px 6px", borderRadius: 50 }}>
                  Verified only
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 10px", borderTop: "1px solid #EBEBEB", display: "flex", flexDirection: "column", gap: 4 }}>
        <Link
          to="/"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", textDecoration: "none" }}
        >
          <Home style={{ width: 16, height: 16 }} /> Storefront
        </Link>
        <button
          onClick={signOut}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#6B7280", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" as const }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function SellerLayout() {
  const { user, loading: authLoading } = useAuth();
  const { seller, isLoading: sellerLoading } = useSeller();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading || sellerLoading) return;
    if (!user) { void navigate({ to: "/auth" }); return; }
    if (!seller) { void navigate({ to: "/become-seller" }); return; }

    const status = seller.verification_status as string;
    if (status === "suspended" || status === "rejected") {
      void navigate({ to: "/" });
    }
    // basic, verified, and legacy pending all get dashboard access
  }, [user, seller, authLoading, sellerLoading, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (authLoading || sellerLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const storeName = seller?.store_name ?? "My Store";
  const sellerStatus = (seller?.verification_status as string) ?? "basic";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F9FAFB" }}>
      <aside style={{ width: 224, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", flexShrink: 0, display: "flex", flexDirection: "column" }} className="hidden md:flex">
        <SidebarContent onClose={() => {}} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} />
      </aside>

      {sidebarOpen && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} onClick={() => setSidebarOpen(false)} />
          <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 248, background: "#FFFFFF", borderRight: "1px solid #EBEBEB", zIndex: 50, display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, background: "#F3F4F6", border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X style={{ width: 14, height: 14, color: "#6B7280" }} />
            </button>
            <SidebarContent onClose={() => setSidebarOpen(false)} signOut={signOut} storeName={storeName} sellerStatus={sellerStatus} />
          </aside>
        </>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", borderBottom: "1px solid #EBEBEB" }} className="flex md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, background: "#F3F4F6", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Menu style={{ width: 18, height: 18, color: "#3A3A3A" }} />
          </button>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#E8611A" }}>Seller Dashboard</span>
          <div style={{ marginLeft: "auto" }}>
            <StatusPill status={sellerStatus} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
'''

# ─────────────────────────────────────────────
# 4. src/pages/seller/Dashboard.tsx
# ─────────────────────────────────────────────
files["src/pages/seller/Dashboard.tsx"] = r'''import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, TrendingUp, DollarSign, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "#FEF3C7", color: "#92400E" },
  paid:       { bg: "#DBEAFE", color: "#1E40AF" },
  processing: { bg: "#EDE9FE", color: "#5B21B6" },
  shipped:    { bg: "#E0E7FF", color: "#3730A3" },
  delivered:  { bg: "#D1FAE5", color: "#065F46" },
  cancelled:  { bg: "#FEE2E2", color: "#991B1B" },
};

function StatCard({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: string | number; icon: React.ElementType; gradient: string; sub?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "16px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#6B7280", marginBottom: 3 }}>{label}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 20, color: "#0D0D0D", letterSpacing: "-0.02em" }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#D1FAE5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "10px 14px", marginBottom: 20 }}>
        <ShieldCheck style={{ width: 18, height: 18, color: "#065F46", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46" }}>Verified Seller</p>
          <p style={{ fontSize: 11, color: "#047857" }}>You have full access including withdrawals.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 14px", marginBottom: 20 }}>
      <ShieldCheck style={{ width: 18, height: 18, color: "#92400E", flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Basic Seller</p>
        <p style={{ fontSize: 11, color: "#B45309" }}>You can list products and manage orders. Withdrawals unlock after verification.</p>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { seller } = useSeller();
  const sellerStatus = (seller?.verification_status as string) ?? "basic";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["seller-stats", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return null;
      const [products, orderItemsRes] = await Promise.all([
        supabase.from("products").select("id,stock", { count: "exact" }).eq("seller_id", seller.id),
        supabase
          .from("order_items")
          .select("id,quantity,unit_price,currency,orders!inner(id,status,created_at)")
          .in("product_id",
            await supabase.from("products").select("id").eq("seller_id", seller.id)
              .then(r => (r.data ?? []).map((p: { id: string }) => p.id))
          ),
      ]);

      type OI = { id: string; quantity: number; unit_price: number; currency: string; orders: { id: string; status: string; created_at: string } };
      const orderItems = (orderItemsRes.data ?? []) as OI[];
      const productRows = (products.data ?? []) as { id: string; stock: number }[];

      const orderMap = new Map<string, { status: string; created_at: string; total: number }>();
      for (const oi of orderItems) {
        const ord = oi.orders;
        if (!orderMap.has(ord.id)) {
          orderMap.set(ord.id, { status: ord.status, created_at: ord.created_at, total: 0 });
        }
        orderMap.get(ord.id)!.total += Number(oi.unit_price) * Number(oi.quantity);
      }

      const allOrders = Array.from(orderMap.entries()).map(([id, v]) => ({ id, ...v }));
      const totalRevenue = allOrders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
      const pending = allOrders.filter(o => o.status === "pending").length;
      const completed = allOrders.filter(o => o.status === "delivered").length;
      const lowStock = productRows.filter(p => p.stock > 0 && p.stock <= 5);
      const outOfStock = productRows.filter(p => p.stock === 0);

      return {
        totalProducts: products.count ?? 0,
        totalOrders: allOrders.length,
        pendingOrders: pending,
        completedOrders: completed,
        totalRevenue,
        recentOrders: allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
        lowStock,
        outOfStock,
      };
    },
  });

  return (
    <div style={{ padding: "16px", maxWidth: "100%" }} className="sm:p-6">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#0D0D0D" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
          Welcome back, <span style={{ fontWeight: 700, color: "#E8611A" }}>{seller?.store_name}</span>
        </p>
      </div>

      <StatusBanner status={sellerStatus} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 82, borderRadius: 16, background: "#EBEBEB" }} />
          ))
        ) : (
          <>
            <StatCard label="Products"       value={stats?.totalProducts ?? 0}  icon={Package}     gradient="linear-gradient(135deg,#E8611A,#C4511A)" />
            <StatCard label="Total Orders"   value={stats?.totalOrders ?? 0}    icon={ShoppingBag} gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)" />
            <StatCard label="Pending Orders" value={stats?.pendingOrders ?? 0}  icon={Clock}       gradient="linear-gradient(135deg,#F59E0B,#D97706)" />
            <StatCard label="Completed"      value={stats?.completedOrders ?? 0}icon={TrendingUp}  gradient="linear-gradient(135deg,#10B981,#065F46)" />
            <div style={{ gridColumn: "span 2" }}>
              <StatCard
                label="Total Revenue"
                value={`$${(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)"
                sub="From delivered orders"
              />
            </div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="lg:grid-cols-2">
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>Recent Orders</p>
            <Link to="/seller/orders" style={{ fontSize: 12, color: "#E8611A", fontWeight: 600, textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {isLoading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6" }} />)}
              </div>
            ) : (stats?.recentOrders ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <ShoppingBag style={{ width: 28, height: 28, color: "#D1D5DB", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>No orders yet</p>
              </div>
            ) : (
              stats!.recentOrders.map((order) => {
                const s = statusColors[order.status] ?? { bg: "#F3F4F6", color: "#374151" };
                return (
                  <div key={order.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6", gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: "monospace" }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D" }}>
                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: s.bg, color: s.color, whiteSpace: "nowrap" as const }}>
                      {order.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 15, color: "#0D0D0D" }}>Stock Alerts</p>
            <Link to="/seller/products" style={{ fontSize: 12, color: "#E8611A", fontWeight: 600, textDecoration: "none" }}>Manage</Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {isLoading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 48, borderRadius: 10, background: "#F3F4F6" }} />)}
              </div>
            ) : (stats?.outOfStock ?? []).length === 0 && (stats?.lowStock ?? []).length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>All products are well-stocked</p>
              </div>
            ) : (
              <>
                {(stats?.outOfStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 500 }}>Product #{p.id.slice(0, 6)}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: "#FEE2E2", color: "#991B1B" }}>Out of stock</span>
                  </div>
                ))}
                {(stats?.lowStock ?? []).slice(0, 3).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: "#D97706", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#0D0D0D", fontWeight: 500 }}>Product #{p.id.slice(0, 6)}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 50, background: "#FEF3C7", color: "#92400E" }}>{p.stock} left</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
'''

# ─────────────────────────────────────────────
# 5. src/pages/seller/Withdrawals.tsx
# ─────────────────────────────────────────────
files["src/pages/seller/Withdrawals.tsx"] = r'''import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet, X, ShieldCheck, Lock } from "lucide-react";
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
  const { seller, isVerified } = useSeller();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  if (!isVerified) {
    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Request payouts to your bank account</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", background: "#fff", borderRadius: 20, border: "1px solid #EBEBEB", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock style={{ width: 28, height: 28, color: "#92400E" }} />
          </div>
          <div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D", marginBottom: 8 }}>
              Withdrawals Locked
            </p>
            <p style={{ fontSize: 13, color: "#6B7280", maxWidth: 320, lineHeight: 1.6 }}>
              Withdrawals are only available to <strong>Verified Sellers</strong>. An admin will review your store and upgrade your account.
            </p>
          </div>
          <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, maxWidth: 320 }}>
            <ShieldCheck style={{ width: 16, height: 16, color: "#065F46", flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "#065F46", fontWeight: 600 }}>
              Keep selling — your earnings are tracked and will be available once verified.
            </p>
          </div>
        </div>
      </div>
    );
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
                  {submitting ? "Submitting..." : "Submit Request"}
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
'''

# ─────────────────────────────────────────────
# 6. src/pages/admin/Sellers.tsx
# ─────────────────────────────────────────────
files["src/pages/admin/Sellers.tsx"] = r'''import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldOff, Eye, Mail, Phone, MapPin, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

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
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  basic:     { bg: "#FEF3C7", color: "#92400E",  label: "Basic"     },
  verified:  { bg: "#D1FAE5", color: "#065F46",  label: "Verified"  },
  suspended: { bg: "#FEE2E2", color: "#991B1B",  label: "Suspended" },
  pending:   { bg: "#FEF3C7", color: "#92400E",  label: "Pending"   },
  rejected:  { bg: "#F3F4F6", color: "#6B7280",  label: "Rejected"  },
};

type TabFilter = "all" | "basic" | "verified" | "suspended" | "pending" | "rejected";
const tabFilters: TabFilter[] = ["all", "basic", "verified", "suspended", "pending", "rejected"];

export default function AdminSellers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState<TabFilter>("all");

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

  async function updateStatus(seller: SellerApplication, status: SellerApplication["verification_status"]) {
    const { error } = await (supabase.from("sellers") as any).update({
      verification_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    }).eq("id", seller.id);

    if (error) { toast.error(error.message); return; }

    if (status === "verified" || status === "suspended") {
      const title = status === "verified" ? "Account Upgraded to Verified 🎉" : "Seller Account Suspended";
      const message =
        status === "verified"
          ? `Congratulations! Your store "${seller.store_name}" has been verified. You now have full access including withdrawal requests.`
          : `Your seller account for "${seller.store_name}" has been suspended. Please contact support for assistance.`;
      await (supabase.from("seller_notifications") as any).insert({ seller_id: seller.id, title, message });
    }

    const labels: Record<string, string> = {
      verified:  "Seller upgraded to Verified — notification sent.",
      basic:     "Seller set to Basic.",
      suspended: "Seller suspended — notification sent.",
      pending:   "Seller status reset to pending.",
      rejected:  "Seller rejected.",
    };
    toast.success(labels[status] ?? `Status updated to ${status}.`);
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Sellers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sellers?.length ?? 0} total · {counts.basic ?? 0} basic · {counts.verified ?? 0} verified
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
        {[
          { label: "Basic",     desc: "Can sell, no withdrawals",  bg: "#FEF3C7", color: "#92400E" },
          { label: "Verified",  desc: "Full access + withdrawals", bg: "#D1FAE5", color: "#065F46" },
          { label: "Suspended", desc: "No dashboard access",       bg: "#FEE2E2", color: "#991B1B" },
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
                        {seller.reviewed_at && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            Updated {new Date(seller.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color, display: "inline-block" }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {seller.verification_status === "verified" && (
                            <Link to="/store/$sellerId" params={{ sellerId: seller.id }}>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="View store">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {(seller.verification_status === "basic" || seller.verification_status === "pending") && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={() => updateStatus(seller, "verified")}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Upgrade to Verified
                            </Button>
                          )}
                          {(seller.verification_status === "basic" || seller.verification_status === "verified") && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => updateStatus(seller, "suspended")}>
                              <ShieldOff className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          )}
                          {seller.verification_status === "verified" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-gray-700 hover:bg-gray-50" onClick={() => updateStatus(seller, "basic")}>
                              <RefreshCw className="h-3.5 w-3.5" /> Set Basic
                            </Button>
                          )}
                          {seller.verification_status === "suspended" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => updateStatus(seller, "basic")}>
                              <RefreshCw className="h-3.5 w-3.5" /> Reinstate
                            </Button>
                          )}
                          {seller.verification_status === "rejected" && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50" onClick={() => updateStatus(seller, "basic")}>
                              <RefreshCw className="h-3.5 w-3.5" /> Restore as Basic
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
    </div>
  );
}
'''

# ─────────────────────────────────────────────
# Write all files
# ─────────────────────────────────────────────
written = []
skipped = []

for rel_path, content in files.items():
    full_path = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.lstrip("\n"))
    written.append(rel_path)

print("\n✅ Hybrid seller files written successfully!\n")
for p in written:
    print(f"   ✓ {p}")
print("\nNext step: run the SQL in your Supabase dashboard, then `npm run dev`\n")
