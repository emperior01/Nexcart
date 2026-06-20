import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, Check, ImageIcon } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Skeleton } from "@/components/ui/index";
import { ImagePicker } from "@/components/nexcart/ImagePicker";
import { useActiveCategories } from "@/hooks/use-categories";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// All products created directly by an admin (not through a seller account)
// are attributed to this fixed "Nexcart Official Store" seller record, so
// they have a real, queryable owner instead of seller_id = NULL.
const NEXCART_OFFICIAL_STORE_SELLER_ID = "4e88f29a-9bb5-43af-9421-f142f375fcff";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

type ProductForm = {
  title: string;
  slug: string;
  description: string;
  price: string;
  compare_at_price: string;
  currency: string;
  stock: string;
  category_id: string;
  is_featured: boolean;
  is_active: boolean;
  image_url: string;
};

const emptyForm: ProductForm = {
  title: "",
  slug: "",
  description: "",
  price: "",
  compare_at_price: "",
  currency: "USD",
  stock: "0",
  category_id: "",
  is_featured: false,
  is_active: true,
  image_url: "",
};

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name), product_images(url,is_primary)")
        .order("created_at", { ascending: false });
      return (data ?? []) as Product[];
    },
  });

  const { categories } = useActiveCategories();

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      description: p.description ?? "",
      price: String(p.price),
      compare_at_price: p.compare_at_price != null ? String(p.compare_at_price) : "",
      currency: p.currency,
      stock: String(p.stock),
      category_id: p.category_id ?? "",
      is_featured: p.is_featured,
      is_active: p.is_active,
      image_url: "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      toast.error("A valid price greater than 0 is required."); return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || toSlug(form.title),
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        currency: form.currency,
        stock: parseInt(form.stock, 10),
        category_id: form.category_id || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
      };

      let productId = editing?.id;

      if (editing) {
        const { error } = await (supabase.from("products") as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, seller_id: NEXCART_OFFICIAL_STORE_SELLER_ID } as any)
          .select()
          .single();
        if (error) throw error;
        productId = (data as { id: string }).id;
      }

      if (form.image_url.trim() && productId) {
        if (editing) {
          await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
        }
        await supabase.from("product_images").insert({
          product_id: productId,
          url: form.image_url.trim(),
          is_primary: true,
          sort_order: 0,
        } as any);
      }

      toast.success(editing ? "Product updated!" : "Product created!");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      // Check if this product has ever been ordered. If it has, a hard delete
      // would violate the order_items -> products foreign key, and would also
      // destroy order history and seller earnings tied to it. If it has never
      // been ordered, there's no such risk, so we can remove it outright.
      const { count, error: checkError } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id);
      if (checkError) throw checkError;

      const hasOrderHistory = (count ?? 0) > 0;

      if (hasOrderHistory) {
        if (!confirm("This product has order history and can't be permanently deleted. It will be hidden from the storefront instead, and past orders will still show it correctly. Continue?")) {
          return;
        }
        const { error } = await supabase.from("products").update({ is_active: false } as any).eq("id", id);
        if (error) throw error;
        toast.success("Product removed from store (order history preserved).");
      } else {
        if (!confirm("Permanently delete this product? It has no order history, so this cannot be undone.")) {
          return;
        }
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
        toast.success("Product deleted.");
      }

      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let created = 0;
        let failed = 0;
        for (const row of rows) {
          if (!row.title || !row.price) { failed++; continue; }
          const { error } = await supabase.from("products").insert({
            title: row.title,
            slug: row.slug || toSlug(row.title),
            description: row.description || null,
            price: parseFloat(row.price),
            compare_at_price: row.compare_at_price ? parseFloat(row.compare_at_price) : null,
            currency: row.currency || "USD",
            stock: parseInt(row.stock ?? "0", 10),
            is_featured: row.is_featured === "true",
            is_active: row.is_active !== "false",
            category_id: null,
            seller_id: NEXCART_OFFICIAL_STORE_SELLER_ID,
          } as any);
          if (error) failed++;
          else created++;
        }
        toast.success(`CSV imported: ${created} created, ${failed} failed.`);
        qc.invalidateQueries({ queryKey: ["admin-products"] });
        if (csvRef.current) csvRef.current.value = "";
      },
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products?.length ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => csvRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" className="gap-1.5 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV columns: <code className="bg-secondary px-1 rounded">title, slug, description, price, compare_at_price, currency, stock, is_featured, is_active</code>
      </p>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : (products ?? []).length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No products yet. Add one or import a CSV.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Image", "Title", "Price", "Stock", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products!.map((p) => {
                  const imgs = (p as { product_images?: { url: string; is_primary: boolean }[] }).product_images ?? [];
                  const img = imgs.find((i) => i.is_primary)?.url ?? imgs[0]?.url;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted">
                          {img ? (
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground line-clamp-1">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{(p as { categories?: { name: string } | null }).categories?.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {p.currency} {Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${p.stock === 0 ? "text-destructive" : p.stock < 5 ? "text-yellow-600" : "text-green-600"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.is_active ? "bg-green-100 text-green-800" : "bg-secondary text-muted-foreground"}`}>
                          {p.is_active ? <><Check className="h-3 w-3" /> Active</> : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                          >
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
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 18, color: "#0D0D0D" }}>
                {editing ? "Edit Product" : "Add Product"}
              </h2>
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
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from title" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Product description…" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Compare-at Price</Label>
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
                  <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" />
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
                <Label>Product Image</Label>
                <ImagePicker
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  folder="admin"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-input" />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} className="rounded border-input" />
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
