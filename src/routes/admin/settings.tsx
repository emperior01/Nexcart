import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, ImageIcon, Type, Megaphone, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/index";
import { fetchSiteSettings, saveSetting, type HeroSettings, type PromoBannerSettings, type TrustBadge } from "@/lib/site-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

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

function AdminSettings() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
  });

  // ── Announcement bar ──────────────────────────────
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => { if (settings) setAnnouncement(settings.announcement_bar); }, [settings]);

  // ── Hero ──────────────────────────────────────────
  const [hero, setHero] = useState<HeroSettings>({
    heading_line1: "",
    heading_line2: "",
    subtext: "",
    cta_primary: "Shop the collection",
    cta_secondary: "Browse new tech",
    images: [],
  });
  useEffect(() => { if (settings) setHero(settings.hero); }, [settings]);

  // ── Promo banner ──────────────────────────────────
  const [promo, setPromo] = useState<PromoBannerSettings>({
    heading: "",
    subtext: "",
    code: "NEXCART10",
    cta: "Start shopping",
  });
  useEffect(() => { if (settings) setPromo(settings.promo_banner); }, [settings]);

  // ── Trust badges ──────────────────────────────────
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  useEffect(() => { if (settings) setBadges(settings.trust_badges); }, [settings]);

  // ── Helpers ───────────────────────────────────────
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

  function addHeroImage() {
    if (hero.images.length >= 4) { toast.error("Maximum 4 hero images allowed."); return; }
    setHero((h) => ({ ...h, images: [...h.images, ""] }));
  }

  function removeHeroImage(i: number) {
    setHero((h) => ({ ...h, images: h.images.filter((_, idx) => idx !== i) }));
  }

  function setHeroImage(i: number, url: string) {
    setHero((h) => {
      const images = [...h.images];
      images[i] = url;
      return { ...h, images };
    });
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Homepage Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit your storefront content without touching any code.
        </p>
      </div>

      {/* ── ANNOUNCEMENT BAR ── */}
      <Section icon={Megaphone} title="Announcement Bar">
        <p className="text-xs text-muted-foreground mb-3">
          The thin bar at the very top of every page.
        </p>
        <div className="space-y-1.5">
          <Label>Text</Label>
          <Input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Fast delivery · Secure encrypted checkout"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">{announcement.length}/120 characters</p>
        </div>
        <Button
          className="mt-4 gap-2 text-white"
          style={{ background: "var(--gradient-brand)" }}
          disabled={saving === "announcement_bar"}
          onClick={() => save("announcement_bar", announcement)}
        >
          <Save className="h-4 w-4" />
          {saving === "announcement_bar" ? "Saving…" : "Save"}
        </Button>
      </Section>

      {/* ── HERO ── */}
      <Section icon={Type} title="Hero Section">
        <p className="text-xs text-muted-foreground mb-4">
          The full-screen section at the top of the homepage.
        </p>

        {/* Text fields */}
        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          <div className="space-y-1.5">
            <Label>Heading — Line 1</Label>
            <Input
              value={hero.heading_line1}
              onChange={(e) => setHero((h) => ({ ...h, heading_line1: e.target.value }))}
              placeholder="Shop Smarter."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Heading — Line 2 (orange)</Label>
            <Input
              value={hero.heading_line2}
              onChange={(e) => setHero((h) => ({ ...h, heading_line2: e.target.value }))}
              placeholder="Live Better with Nexcart"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtext</Label>
            <Textarea
              value={hero.subtext}
              onChange={(e) => setHero((h) => ({ ...h, subtext: e.target.value }))}
              placeholder="Quality goods, easy ordering, and reliable service."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary Button Text</Label>
            <Input
              value={hero.cta_primary}
              onChange={(e) => setHero((h) => ({ ...h, cta_primary: e.target.value }))}
              placeholder="Shop the collection"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Secondary Button Text</Label>
            <Input
              value={hero.cta_secondary}
              onChange={(e) => setHero((h) => ({ ...h, cta_secondary: e.target.value }))}
              placeholder="Browse new tech"
            />
          </div>
        </div>

        {/* Hero background images */}
        <div className="border-t border-border/50 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label>Background Images</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Up to 4 images — they cycle automatically as a slideshow behind the hero.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={addHeroImage}
              disabled={hero.images.length >= 4}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Image
            </Button>
          </div>

          {hero.images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-8 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No images yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Image" and paste a URL (e.g. from Unsplash, Cloudinary, or Supabase Storage).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {hero.images.map((url, i) => (
                <div key={i} className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="h-14 w-14 rounded-lg bg-secondary flex-shrink-0 overflow-hidden border border-border/50">
                    {url ? (
                      <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={url}
                      onChange={(e) => setHeroImage(i, e.target.value)}
                      placeholder={`Image ${i + 1} URL — https://...`}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeHeroImage(i)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          className="mt-5 gap-2 text-white"
          style={{ background: "var(--gradient-brand)" }}
          disabled={saving === "hero"}
          onClick={() => {
            const cleanImages = hero.images.filter((u) => u.trim() !== "");
            if (cleanImages.some((u) => !/^https?:\/\/.+/.test(u))) {
              toast.error("All image URLs must start with http:// or https://");
              return;
            }
            save("hero", { ...hero, images: cleanImages });
          }}
        >
          <Save className="h-4 w-4" />
          {saving === "hero" ? "Saving…" : "Save Hero"}
        </Button>
      </Section>

      {/* ── PROMO BANNER ── */}
      <Section icon={Gift} title="Promo Banner">
        <p className="text-xs text-muted-foreground mb-4">
          The orange banner on the homepage. Use \n for a line break in the heading.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Heading (use \n for line break)</Label>
            <Textarea
              value={promo.heading}
              onChange={(e) => setPromo((p) => ({ ...p, heading: e.target.value }))}
              placeholder={"Shop Smarter.\nLive Better with Nexcart"}
              rows={2}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subtext</Label>
            <Input
              value={promo.subtext}
              onChange={(e) => setPromo((p) => ({ ...p, subtext: e.target.value }))}
              placeholder="Quality goods, easy ordering, and reliable service."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Promo Code</Label>
            <Input
              value={promo.code}
              onChange={(e) => setPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="NEXCART10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Button Text</Label>
            <Input
              value={promo.cta}
              onChange={(e) => setPromo((p) => ({ ...p, cta: e.target.value }))}
              placeholder="Start shopping"
            />
          </div>
        </div>
        <Button
          className="mt-5 gap-2 text-white"
          style={{ background: "var(--gradient-brand)" }}
          disabled={saving === "promo_banner"}
          onClick={() => save("promo_banner", promo)}
        >
          <Save className="h-4 w-4" />
          {saving === "promo_banner" ? "Saving…" : "Save Banner"}
        </Button>
      </Section>

      {/* ── TRUST BADGES ── */}
      <Section icon={Star} title="Trust Badges">
        <p className="text-xs text-muted-foreground mb-4">
          The 4 badges shown in the strip below the hero (shipping, checkout, returns, support).
        </p>
        <div className="space-y-4">
          {badges.map((b, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="space-y-1.5">
                <Label>Badge {i + 1} — Title</Label>
                <Input
                  value={b.title}
                  onChange={(e) => updateBadge(i, "title", e.target.value)}
                  placeholder="Fast delivery"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Badge {i + 1} — Subtitle</Label>
                <Input
                  value={b.sub}
                  onChange={(e) => updateBadge(i, "sub", e.target.value)}
                  placeholder="Fast fulfillment and dependable shipping."
                />
              </div>
            </div>
          ))}
        </div>
        <Button
          className="mt-5 gap-2 text-white"
          style={{ background: "var(--gradient-brand)" }}
          disabled={saving === "trust_badges"}
          onClick={() => save("trust_badges", badges)}
        >
          <Save className="h-4 w-4" />
          {saving === "trust_badges" ? "Saving…" : "Save Badges"}
        </Button>
      </Section>
    </div>
  );
}
