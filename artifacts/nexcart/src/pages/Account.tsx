import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Settings, LogOut, Package } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { CurrencySelector } from "@/components/nexcart/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { clearServerSession } from "@/lib/authSession";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const search = useRouterState({ select: (s) => s.location.search });
  const params = new URLSearchParams(search);
  const tab = (params.get("tab") === "settings" ? "settings" : "orders") as "orders" | "settings";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then((result) => {
        const data = result.data as { full_name: string | null; phone: string | null } | null;
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
        }
      });
  }, [user]);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      type OrderItem = { id: string; quantity: number; unit_price: number; currency: string; products?: { title: string } | null };
      type Order = { id: string; status: string; total: number; currency: string; created_at: string; order_items?: OrderItem[] };
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(id, quantity, unit_price, currency, products(title))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Order[];
    },
  });

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, full_name: fullName, phone: phone || null } as any,
        { onConflict: "id" }
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  }

  async function signOut() {
    void clearServerSession();
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending:   "bg-yellow-100 text-yellow-800",
    paid:      "bg-blue-100 text-blue-800",
    shipped:   "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl text-white text-lg font-extrabold"
              style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
            >
              {(fullName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <p className="font-extrabold text-foreground">{fullName || "Your Account"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>

        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="font-extrabold text-foreground flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-[#E8611A]" /> My Orders
            </h2>
            {ordersLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            ) : (orders ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-4">
                  <Package className="h-7 w-7 text-[#E8611A]" />
                </div>
                <h3 className="font-extrabold text-foreground mb-1">No orders yet</h3>
                <p className="text-sm text-muted-foreground mb-5">Start shopping to see your orders here.</p>
                <Button className="text-white rounded-full px-6" style={{ background: "#E8611A" }} asChild>
                  <Link to="/shop">Shop now</Link>
                </Button>
              </div>
            ) : (
              orders!.map((order) => {
                const items = (order as { order_items?: { quantity: number; products?: { title: string } }[] }).order_items ?? [];
                return (
                  <div key={order.id} className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="font-extrabold text-foreground mt-0.5">
                          {order.currency} {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusColors[order.status] ?? "bg-secondary text-muted-foreground"}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          {item.quantity}× {item.products?.title ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-6">
            <h2 className="font-extrabold text-foreground flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-[#E8611A]" /> Settings
            </h2>
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-foreground">Profile</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (optional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled className="opacity-60" />
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="text-white w-full" style={{ background: "#E8611A" }}>
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-extrabold text-foreground">Currency</h3>
              <p className="text-sm text-muted-foreground">Choose your preferred display currency.</p>
              <CurrencySelector className="w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <h3 className="font-extrabold text-foreground mb-1">Sign out</h3>
              <p className="text-sm text-muted-foreground mb-4">You'll need to sign back in to access your account.</p>
              <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
