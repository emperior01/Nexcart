import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check, ImageIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

type ProductForm = {
  title: string; slug: string; description: string;
  price: string; compare_at_price: string; currency: string;
  stock: string; category_id: string; is_featured: boolean; is_active: boolean; image_url: string;
};

const emptyForm: ProductForm = {
  title: "", slug: "", description: "", price: "", compare_at_price: "",
  currency: "USD", stock: "0", category_id: "", is_featured: false, is_active: true, image_url: "",
};

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function SellerProducts() {
  const { seller } = useSeller();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      if (!seller?.id) return [];
      const { data } = await supabase
        .from("products")
        .select("*, categories(name), product_images(url,is_primary)")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, description: p.description ?? "",
      price: String(p.price), compare_at_price: p.compare_at_price != null ? String(p.compare_at_price) : "",
      currency: p.currency, stock: String(p.stock), category_id: p.category_id ?? "",
      is_featured: p.is_featured, is_active: p.is_active, image_url: "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!seller?.id) return;
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      toast.error("A valid price is required."); return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title, slug: form.slug || toSlug(form.title),
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        currency: form.currency, stock: parseInt(form.stock, 10),
        category_id: form.category_id || null,
        is_featured: form.is_featured, is_active: form.is_active,
        seller_id: seller.id,
      };

      let productId = editing?.id;
      if (editing) {
        const { error } = await (supabase.from("products") as any).update(payload).eq("id", editing.id).eq("seller_id", seller.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload as any).select().single();
        if (error) throw error;
        productId = (data as { id: string }).id;
      }

      if (form.image_url.trim() && productId) {
        if (editing) {
          await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
        }
        await supabase.from("product_images").insert({
          product_id: productId, url: form.image_url.trim(), is_primary: true, sort_order: 0,
        } as any);
      }

      toast.success(editing ? "Product updated!" : "Product created!");
      qc.invalidateQueries({ queryKey: ["seller-products", seller.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!seller?.id) return;
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    const { error } = await (supabase.from("products") as any).delete().eq("id", id).eq("seller_id", seller.id);
    setDeletingId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted.");
      qc.invalidateQueries({ queryKey: ["seller-products", seller?.id] });
    }
  }

  async function toggleActive(p: Product) {
    if (!seller?.id) return;
    const { error } = await (supabase.from("products") as any).update({ is_active: !p.is_active }).eq("id", p.id).eq("seller_id", seller.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["seller-products", seller?.id] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">My Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products?.length ?? 0} total</p>
        </div>
        <Button size="sm" className="gap-1.5 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} onClick={openNew}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (products ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <div style={{ width: 52, height: 52, background: "rgba(232,97,26,0.10)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Plus style={{ width: 22, height: 22, color: "#E8611A" }} />
            </div>
            <p className="font-bold text-foreground mb-1">No products yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first product to start selling.</p>
            <Button size="sm" className="text-white" style={{ background: "#E8611A" }} onClick={openNew}>Add Product</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Image","Title","Price","Stock","Status","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products!.map((p) => {
                  const imgs = (p as any).product_images ?? [];
                  const img = imgs.find((i: any) => i.is_primary)?.url ?? imgs[0]?.url;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground/40" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground line-clamp-1">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{(p as any).categories?.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">{p.currency} {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${p.stock === 0 ? "text-destructive" : p.stock < 5 ? "text-yellow-600" : "text-green-600"}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(p)}
                          className="flex items-center gap-1.5 text-xs font-bold"
                          style={{ color: p.is_active ? "#16A34A" : "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {p.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                          {p.is_active ? "Active" : "Draft"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {showForm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-y-auto max-h-[95vh] md:top-0 md:right-0 md:left-auto md:bottom-0 md:w-[480px] md:rounded-none md:rounded-l-3xl">
            <div className="flex justify-center pt-3 pb-1 md:hidden"><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D" }}>{editing ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))} placeholder="Product name" />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe your product…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sale Price</Label>
                  <Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                    {["USD","EUR","GBP","NGN","GHS","KES","ZAR"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— No category —</option>
                  {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} className="rounded" />
                  Featured
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}>
                  {saving ? "Saving…" : editing ? "Update Product" : "Create Product"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
