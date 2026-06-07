import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, ShoppingBag, Settings, LogOut, Package, Shield } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { CurrencySelector } from "@/components/nexcart/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [tab, setTab] = useState<"orders" | "settings">("orders");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
      }
    });
  }, [user]);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function saveProfile() {
    if (!user) return;
    if (!fullName.trim()) { toast.error("Full name cannot be empty."); return; }
    if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName.trim(), phone: phone.trim() || null });
      if (error) throw error;
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-1/3 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-full text-white font-black text-lg"
                style={{ background: "var(--gradient-brand)" }}
              >
                {(user.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground">{fullName || "My Account"}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button size="sm" className="gap-2 text-white" style={{ background: "#E8611A" }}>
                    <Shield className="h-4 w-4" /> Admin
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-xl border border-border/50 bg-secondary/30 p-1 w-fit">
            {([["orders", ShoppingBag, "Orders"], ["settings", Settings, "Settings"]] as const).map(
              ([key, Icon, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    tab === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            )}
          </div>

          {/* Orders Tab */}
          {tab === "orders" && (
            <div className="space-y-4">
              {ordersLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              ) : (orders ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-12 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No orders yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your orders will appear here once you shop.</p>
                  <Button size="sm" className="mt-4 text-white" style={{ background: "var(--gradient-brand)" }} asChild>
                    <Link to="/shop">Start Shopping</Link>
                  </Button>
                </div>
              ) : (
                orders!.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-0.5 font-bold text-foreground">
                          {formatPrice(order.total, order.currency, currency)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                          {" · "}
                          {(order as { order_items?: unknown[] }).order_items?.length ?? 0} item(s)
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColors[order.status] ?? ""}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div className="space-y-6 rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Profile
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={user.email ?? ""} disabled className="opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0000" />
                  </div>
                  <Button
                    onClick={saveProfile}
                    disabled={saving}
                    className="text-white"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {saving ? "Saving…" : "Save Profile"}
                  </Button>
                </div>
              </div>

              <hr className="border-border/50" />

              <div>
                <h2 className="text-base font-extrabold text-foreground mb-3">Preferred Currency</h2>
                <CurrencySelector className="max-w-xs" />
                <p className="mt-2 text-xs text-muted-foreground">
                  All prices will be displayed in your chosen currency.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
