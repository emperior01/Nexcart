import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/index";
import { toast } from "sonner";
import { Store } from "lucide-react";

export default function SellerSettings() {
  const { seller, refetch } = useSeller();
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Store Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your store profile and branding.</p>
        </div>

        {seller?.store_logo && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card">
            <img src={seller.store_logo} alt={seller.store_name} className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="font-bold text-foreground">{seller.store_name}</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: seller.verification_status === "verified" ? "#D1FAE5" : "#FEF3C7", color: seller.verification_status === "verified" ? "#065F46" : "#92400E" }}>
                {seller.verification_status.charAt(0).toUpperCase() + seller.verification_status.slice(1)}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <Label>Store Name *</Label>
            <Input
              value={form.store_name}
              onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
              placeholder="Your store name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Store Description</Label>
            <Textarea
              value={form.store_description}
              onChange={(e) => setForm((f) => ({ ...f, store_description: e.target.value }))}
              rows={4}
              placeholder="Tell customers about your store…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input
              value={form.store_logo}
              onChange={(e) => setForm((f) => ({ ...f, store_logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
            {form.store_logo && (
              <img src={form.store_logo} alt="Logo preview" className="h-16 w-16 rounded-xl object-cover mt-2 border border-border/50" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Banner URL</Label>
            <Input
              value={form.store_banner}
              onChange={(e) => setForm((f) => ({ ...f, store_banner: e.target.value }))}
              placeholder="https://example.com/banner.jpg"
            />
            {form.store_banner && (
              <img src={form.store_banner} alt="Banner preview" className="w-full h-28 rounded-xl object-cover mt-2 border border-border/50" />
            )}
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
              rows={2}
              placeholder="Street, City, State, Country"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full text-white font-bold"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </form>
      </div>
    </div>
  );
}
