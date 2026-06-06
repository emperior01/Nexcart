import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, Check, ImageIcon } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

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

function AdminProducts() {
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
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

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
    if (form.compare_at_price && parseFloat(form.compare_at_price) <= parseFloat(form.price)) {
      toast.error("Compare-at price must be greater than the sale price."); return;
    }
    if (isNaN(parseInt(form.stock, 10)) || parseInt(form.stock, 10) < 0) {
      toast.error("Stock must be a non-negative number."); return;
    }
    if (form.image_url && !/^https?:\/\/.+\..+/.test(form.image_url)) {
      toast.error("Image URL must be a valid https:// URL."); return;
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
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Add image if provided
      if (form.image_url && productId) {
        await supabase.from("product_images").insert({
          product_id: productId,
          url: form.image_url,
          is_primary: true,
          sort_order: 0,
        });
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
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setDeletingId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted.");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
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
          });
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
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products?.length ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => csvRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-white"
            style={{ background: "var(--gradient-brand)" }}
            onClick={openNew}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* CSV format hint */}
      <p className="text-xs text-muted-foreground">
        CSV columns: <code className="bg-secondary px-1 rounded">title, slug, description, price, compare_at_price, currency, stock, is_featured, is_active</code>
      </p>

      {/* Table */}
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
                  const img = (p as { product_images?: { url: string; is_primary: boolean }[] }).product_images?.find((i) => i.is_primary)?.url
                    ?? (p as { product_images?: { url: string }[] }).product_images?.[0]?.url;
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
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-background shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h2 className="font-extrabold text-foreground">
                {editing ? "Edit Product" : "Add Product"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: toSlug(e.target.value) }))}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated from title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Product description…"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Compare-at Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.compare_at_price}
                    onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                    {["USD","EUR","GBP","NGN","GHS","KES","ZAR"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— No category —</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Image URL</Label>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-input"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                    className="rounded border-input"
                  />
                  Featured
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {saving ? "Saving…" : editing ? "Update Product" : "Create Product"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
