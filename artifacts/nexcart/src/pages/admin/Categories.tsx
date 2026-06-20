import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Check, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Skeleton } from "@/components/ui/index";
import { ImagePicker } from "@/components/nexcart/ImagePicker";
import { useAllCategories, useInvalidateCategories, type Category } from "@/hooks/use-categories";
import { toast } from "sonner";

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
};

export default function AdminCategories() {
  const { categories, isLoading, error, refetch } = useAllCategories();
  const invalidate = useInvalidateCategories();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      is_active: c.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || toSlug(form.name),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase.from("categories").update(payload as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Category updated!");
      } else {
        // New categories go to the end of the display order.
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0);
        const { error } = await supabase.from("categories").insert({ ...payload, sort_order: maxOrder + 1 } as any);
        if (error) throw error;
        toast.success("Category created!");
      }

      invalidate();
      refetch();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    // Categories may be referenced by existing products (category_id), so
    // check first rather than risk a foreign key violation or silently
    // orphaning products.
    setDeletingId(id);
    try {
      const { count, error: checkError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);
      if (checkError) throw checkError;

      if ((count ?? 0) > 0) {
        toast.error(
          `${count} product${count === 1 ? "" : "s"} still use this category. Deactivate it instead, or move those products to a different category first.`
        );
        return;
      }

      if (!confirm("Delete this category? This cannot be undone.")) return;
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted.");
      invalidate();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(c: Category) {
    const { error } = await supabase.from("categories").update({ is_active: !c.is_active } as any).eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(c.is_active ? "Category deactivated." : "Category activated.");
    invalidate();
    refetch();
  }

  async function move(c: Category, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((x) => x.id === c.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    setReorderingId(c.id);
    try {
      // Swap sort_order values between the two categories.
      const [r1, r2] = await Promise.all([
        supabase.from("categories").update({ sort_order: other.sort_order } as any).eq("id", c.id),
        supabase.from("categories").update({ sort_order: c.sort_order } as any).eq("id", other.id),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      invalidate();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed.");
    } finally {
      setReorderingId(null);
    }
  }

  const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Shown on the homepage and Shop filter — changes here reflect everywhere immediately.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 text-white shrink-0" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}>
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>Failed to load categories</p>
          <p style={{ fontSize: 12, color: "#B91C1C", marginTop: 3 }}>{(error as Error).message}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center" as const }}>
            <FolderTree style={{ width: 28, height: 28, color: "#C8C8C8", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>No categories yet</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Create your first category to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {sorted.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(c, "up")}
                    disabled={i === 0 || reorderingId === c.id}
                    style={{ opacity: i === 0 ? 0.3 : 1, cursor: i === 0 ? "default" : "pointer", border: "none", background: "none", padding: 2 }}
                  >
                    <ArrowUp style={{ width: 14, height: 14, color: "#6B7280" }} />
                  </button>
                  <button
                    onClick={() => move(c, "down")}
                    disabled={i === sorted.length - 1 || reorderingId === c.id}
                    style={{ opacity: i === sorted.length - 1 ? 0.3 : 1, cursor: i === sorted.length - 1 ? "default" : "pointer", border: "none", background: "none", padding: 2 }}
                  >
                    <ArrowDown style={{ width: 14, height: 14, color: "#6B7280" }} />
                  </button>
                </div>

                <div className="h-12 w-12 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border border-border/50">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <FolderTree style={{ width: 16, height: 16, color: "#C8C8C8" }} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">/{c.slug}</p>
                </div>

                <button
                  onClick={() => toggleActive(c)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 50, border: "none", cursor: "pointer",
                    background: c.is_active ? "#D1FAE5" : "#F3F4F6",
                    color: c.is_active ? "#065F46" : "#6B7280",
                  }}
                >
                  {c.is_active ? "Active" : "Inactive"}
                </button>

                <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="gap-1.5 text-xs shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="gap-1.5 text-xs shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 20, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-lg">{editing ? "Edit Category" : "New Category"}</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || toSlug(e.target.value) }))}
                  placeholder="e.g. Electronics"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: toSlug(e.target.value) }))} placeholder="electronics" />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Category Image</Label>
                <ImagePicker
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  folder="categories"
                  height={120}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-input"
                />
                Active (visible on homepage and Shop filter)
              </label>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                className="flex-1 gap-2 text-white"
                style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                onClick={handleSave}
                disabled={saving}
              >
                <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
