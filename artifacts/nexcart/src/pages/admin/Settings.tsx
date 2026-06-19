import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, ImageIcon, Type, Megaphone, Gift, Star, Truck, LayoutGrid, Upload, Link as LinkIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSiteSettings, saveSetting,
  type HeroSettings, type PromoBannerSettings, type TrustBadge, type HomepageCategory,
} from "@/lib/site-settings";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50 bg-secondary/20">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-extrabold text-foreground text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Dual-mode image input: upload OR paste URL ─────────────────────────────────
function ImageInput({
  value,
  onChange,
  bucket = "product-images",
  storagePath,
  label = "Image",
  previewSize = 56,
}: {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  storagePath: string;
  label?: string;
  previewSize?: number;
}) {
  const [mode, setMode] = useState<"url" | "upload">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${storagePath}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      setMode("url");
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
          <button
            onClick={() => setMode("upload")}
            className="px-2.5 py-1 flex items-center gap-1 transition-colors"
            style={{ background: mode === "upload" ? "#E8611A" : "transparent", color: mode === "upload" ? "#fff" : undefined }}
          >
            <Upload className="h-3 w-3" /> Upload
          </button>
          <button
            onClick={() => setMode("url")}
            className="px-2.5 py-1 flex items-center gap-1 transition-colors"
            style={{ background: mode === "url" ? "#E8611A" : "transparent", color: mode === "url" ? "#fff" : undefined }}
          >
            <LinkIcon className="h-3 w-3" /> URL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className="rounded-lg border border-border/50 bg-secondary/30 overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ width: previewSize, height: previewSize }}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        {mode === "url" ? (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
          />
        ) : (
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Choose image from device"}
            </Button>
            {value && <p className="text-xs text-muted-foreground mt-1 truncate">Current: {value}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function AdminSettings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const heroImgRef = useRef<HTMLInputElement>(null);
  const [heroImgUploading, setHeroImgUploading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
  });

  const [announcement, setAnnouncement] = useState("");
  useEffect(() => { if (settings) setAnnouncement(settings.announcement_bar); }, [settings]);

  const [hero, setHero] = useState<HeroSettings>({
    heading_line1: "", heading_line2: "", subtext: "",
    cta_primary: "Shop the collection", cta_secondary: "Browse new tech",
    images: [], heading_line1_color: "#FFFFFF", heading_line2_color: "#E8611A", subtext_color: "#A8A8A8",
  });
  useEffect(() => { if (settings) setHero(settings.hero); }, [settings]);

  const [promo, setPromo] = useState<PromoBannerSettings>({ heading: "", subtext: "", code: "NEXCART10", cta: "Start shopping" });
  useEffect(() => { if (settings) setPromo(settings.promo_banner); }, [settings]);

  const [badges, setBadges] = useState<TrustBadge[]>([]);
  useEffect(() => { if (settings) setBadges(settings.trust_badges); }, [settings]);

  const [shippingFee, setShippingFee] = useState(0);
  useEffect(() => { if (settings) setShippingFee(settings.shipping_fee); }, [settings]);

  const [cats, setCats] = useState<HomepageCategory[]>([]);
  useEffect(() => { if (settings) setCats(settings.homepage_categories ?? []); }, [settings]);

  async function save(key: string, value: unknown) {
    setSaving(key);
    try {
      await saveSetting(key, value);
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(null);
    }
  }

  // ── Hero image helpers ────────────────────────────────────────────────────
  function addHeroImageSlot() {
    if (hero.images.length >= 4) { toast.error("Maximum 4 hero images allowed."); return; }
    setHero((h) => ({ ...h, images: [...h.images, ""] }));
  }
  function removeHeroImage(i: number) {
    setHero((h) => ({ ...h, images: h.images.filter((_, idx) => idx !== i) }));
  }
  function setHeroImage(i: number, url: string) {
    setHero((h) => { const imgs = [...h.images]; imgs[i] = url; return { ...h, images: imgs }; });
  }
  async function uploadHeroImageDirect(file: File) {
    setHeroImgUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setHero((h) => ({ ...h, images: [...h.images, data.publicUrl] }));
      toast.success("Hero image uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setHeroImgUploading(false);
      if (heroImgRef.current) heroImgRef.current.value = "";
    }
  }

  // ── Category helpers ──────────────────────────────────────────────────────
  function addCategory() {
    setCats((prev) => [...prev, { id: uuid(), label: "", slug: "", image: "", bg: "linear-gradient(135deg,#1a1a2e,#2a2a4e)" }]);
  }
  function removeCategory(id: string) {
    setCats((prev) => prev.filter((c) => c.id !== id));
  }
  function updateCat(id: string, field: keyof HomepageCategory, val: string) {
    setCats((prev) => prev.map((c) => c.id === id ? { ...c, [field]: val } : c));
  }

  function updateBadge(i: number, field: keyof TrustBadge, val: string) {
    setBadges((b) => b.map((badge, idx) => idx === i ? { ...badge, [field]: val } : badge));
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Homepage Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit your storefront content without touching any code.</p>
      </div>

      {/* ── Announcement Bar ─────────────────────────────────────────────── */}
      <Section icon={Megaphone} title="Announcement Bar">
        <p className="text-xs text-muted-foreground mb-3">The thin bar at the very top of every page.</p>
        <div className="space-y-1.5">
          <Label>Text</Label>
          <Input value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Fast delivery · Secure encrypted checkout" maxLength={120} />
          <p className="text-xs text-muted-foreground">{announcement.length}/120 characters</p>
        </div>
        <Button className="mt-4 gap-2 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} disabled={saving === "announcement_bar"} onClick={() => save("announcement_bar", announcement)}>
          <Save className="h-4 w-4" /> {saving === "announcement_bar" ? "Saving…" : "Save"}
        </Button>
      </Section>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <Section icon={Type} title="Hero Section">
        <p className="text-xs text-muted-foreground mb-4">The full-screen section at the top of the homepage.</p>
        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <div className="space-y-1.5">
            <Label>Heading — Line 1</Label>
            <div className="flex gap-2 items-center">
              <Input value={hero.heading_line1} onChange={(e) => setHero((h) => ({ ...h, heading_line1: e.target.value }))} placeholder="Shop Smarter." className="flex-1" />
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <input type="color" value={hero.heading_line1_color ?? "#FFFFFF"} onChange={(e) => setHero((h) => ({ ...h, heading_line1_color: e.target.value }))} title="Line 1 text color" className="h-9 w-9 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5" />
                <span className="text-[9px] text-muted-foreground">Color</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Heading — Line 2</Label>
            <div className="flex gap-2 items-center">
              <Input value={hero.heading_line2} onChange={(e) => setHero((h) => ({ ...h, heading_line2: e.target.value }))} placeholder="Live Better with Nexcart" className="flex-1" />
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <input type="color" value={hero.heading_line2_color ?? "#E8611A"} onChange={(e) => setHero((h) => ({ ...h, heading_line2_color: e.target.value }))} title="Line 2 text color" className="h-9 w-9 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5" />
                <span className="text-[9px] text-muted-foreground">Color</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtext</Label>
            <div className="flex gap-2 items-start">
              <Textarea value={hero.subtext} onChange={(e) => setHero((h) => ({ ...h, subtext: e.target.value }))} placeholder="Quality goods, easy ordering…" rows={2} className="flex-1" />
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
                <input type="color" value={hero.subtext_color ?? "#A8A8A8"} onChange={(e) => setHero((h) => ({ ...h, subtext_color: e.target.value }))} title="Subtext color" className="h-9 w-9 cursor-pointer rounded-md border border-border/60 bg-transparent p-0.5" />
                <span className="text-[9px] text-muted-foreground">Color</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Primary Button Text</Label>
            <Input value={hero.cta_primary} onChange={(e) => setHero((h) => ({ ...h, cta_primary: e.target.value }))} placeholder="Shop the collection" />
          </div>
          <div className="space-y-1.5">
            <Label>Secondary Button Text</Label>
            <Input value={hero.cta_secondary} onChange={(e) => setHero((h) => ({ ...h, cta_secondary: e.target.value }))} placeholder="Browse new tech" />
          </div>
        </div>

        {/* Hero Images — dual mode per slot */}
        <div className="border-t border-border/50 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label>Background Images</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Up to 4 images — they cycle as a slideshow.</p>
            </div>
            <div className="flex gap-2">
              <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHeroImageDirect(f); }} />
              <Button size="sm" variant="outline" disabled={heroImgUploading || hero.images.length >= 4} onClick={() => heroImgRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> {heroImgUploading ? "Uploading…" : "Upload"}
              </Button>
              <Button size="sm" variant="outline" onClick={addHeroImageSlot} disabled={hero.images.length >= 4} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add URL
              </Button>
            </div>
          </div>

          {hero.images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No images yet. Upload a file or add a URL.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hero.images.map((url, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border border-border/50">
                    {url ? <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/40" /></div>}
                  </div>
                  <Input value={url} onChange={(e) => setHeroImage(i, e.target.value)} placeholder={`Image ${i + 1} URL`} className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => removeHeroImage(i)} className="text-destructive hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="mt-5 gap-2 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} disabled={saving === "hero"} onClick={() => save("hero", { ...hero, images: hero.images.map((u) => u.trim()).filter(Boolean) })}>
          <Save className="h-4 w-4" /> {saving === "hero" ? "Saving…" : "Save Hero"}
        </Button>
      </Section>

      {/* ── Category Management ───────────────────────────────────────────── */}
      <Section icon={LayoutGrid} title="Homepage Categories">
        <p className="text-xs text-muted-foreground mb-4">
          The category cards shown on the homepage. Each card links to the shop filtered by slug.
          Images can be uploaded from your device or pasted as a URL.
        </p>

        {cats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-center mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No categories yet. Add one below.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {cats.map((cat, idx) => (
              <div key={cat.id} className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category {idx + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeCategory(cat.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input value={cat.label} onChange={(e) => updateCat(cat.id, "label", e.target.value)} placeholder="Electronics" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input value={cat.slug} onChange={(e) => updateCat(cat.id, "slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="electronics" />
                    <p className="text-xs text-muted-foreground">Links to /shop?category=<strong>{cat.slug || "…"}</strong></p>
                  </div>
                </div>

                {/* Dual-mode image input */}
                <ImageInput
                  label="Category Image"
                  value={cat.image}
                  onChange={(url) => updateCat(cat.id, "image", url)}
                  storagePath="categories"
                  previewSize={72}
                />

                {/* Live preview chip */}
                {(cat.label || cat.image) && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">Preview:</span>
                    <div
                      className="w-[72px] h-[72px] rounded-xl overflow-hidden relative flex-shrink-0"
                      style={{ background: cat.image ? "transparent" : cat.bg }}
                    >
                      {cat.image && <img src={cat.image} alt={cat.label} className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; (e.currentTarget.parentElement as HTMLElement).style.background = cat.bg; }} />}
                      <div className="absolute inset-0 flex items-end p-1.5" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)" }}>
                        <span style={{ fontWeight: 700, fontSize: "10px", color: "#fff" }}>{cat.label || "Label"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" onClick={addCategory} className="gap-2 mb-5 w-full">
          <Plus className="h-4 w-4" /> Add Category
        </Button>

        <Button
          className="gap-2 text-white w-full sm:w-auto"
          style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          disabled={saving === "homepage_categories"}
          onClick={() => save("homepage_categories", cats.filter((c) => c.label && c.slug))}
        >
          <Save className="h-4 w-4" /> {saving === "homepage_categories" ? "Saving…" : "Save Categories"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">Categories without a label or slug will not be saved.</p>
      </Section>

      {/* ── Promo Banner ─────────────────────────────────────────────────── */}
      <Section icon={Gift} title="Promo Banner">
        <p className="text-xs text-muted-foreground mb-4">The orange banner on the homepage. Use \n for a line break.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Heading</Label>
            <Textarea value={promo.heading} onChange={(e) => setPromo((p) => ({ ...p, heading: e.target.value }))} placeholder={"Shop Smarter.\nLive Better"} rows={2} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtext</Label>
            <Input value={promo.subtext} onChange={(e) => setPromo((p) => ({ ...p, subtext: e.target.value }))} placeholder="Quality goods…" />
          </div>
          <div className="space-y-1.5">
            <Label>Promo Code</Label>
            <Input value={promo.code} onChange={(e) => setPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="NEXCART10" />
          </div>
          <div className="space-y-1.5">
            <Label>Button Text</Label>
            <Input value={promo.cta} onChange={(e) => setPromo((p) => ({ ...p, cta: e.target.value }))} placeholder="Start shopping" />
          </div>
        </div>
        <Button className="mt-5 gap-2 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} disabled={saving === "promo_banner"} onClick={() => save("promo_banner", promo)}>
          <Save className="h-4 w-4" /> {saving === "promo_banner" ? "Saving…" : "Save Banner"}
        </Button>
      </Section>

      {/* ── Trust Badges ─────────────────────────────────────────────────── */}
      <Section icon={Star} title="Trust Badges">
        <p className="text-xs text-muted-foreground mb-4">The 4 badges shown in the strip below the hero.</p>
        <div className="space-y-4">
          {badges.map((b, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="space-y-1.5">
                <Label>Badge {i + 1} — Title</Label>
                <Input value={b.title} onChange={(e) => updateBadge(i, "title", e.target.value)} placeholder="Fast delivery" />
              </div>
              <div className="space-y-1.5">
                <Label>Badge {i + 1} — Subtitle</Label>
                <Input value={b.sub} onChange={(e) => updateBadge(i, "sub", e.target.value)} placeholder="Fast fulfillment…" />
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-5 gap-2 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} disabled={saving === "trust_badges"} onClick={() => save("trust_badges", badges)}>
          <Save className="h-4 w-4" /> {saving === "trust_badges" ? "Saving…" : "Save Badges"}
        </Button>
      </Section>

      {/* ── Shipping Fee ─────────────────────────────────────────────────── */}
      <Section icon={Truck} title="Shipping Fee">
        <p className="text-xs text-muted-foreground mb-3">Set the shipping fee displayed and charged at checkout.</p>
        <div className="space-y-1.5">
          <Label>Shipping Fee Amount</Label>
          <Input type="number" step="0.01" min="0" value={shippingFee} onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)} placeholder="0.00" />
        </div>
        <Button className="mt-5 gap-2 text-white" style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }} disabled={saving === "shipping_fee"} onClick={() => save("shipping_fee", shippingFee)}>
          <Save className="h-4 w-4" /> {saving === "shipping_fee" ? "Saving…" : "Save Shipping Fee"}
        </Button>
      </Section>
    </div>
  );
}
