import { Link } from "@tanstack/react-router";
import { ArrowRight, Truck, ShieldCheck, RefreshCw, MessageCircle, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { ProductCard } from "@/components/nexcart/ProductCard";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { fetchSiteSettings, DEFAULT_SETTINGS, type TrustBadge } from "@/lib/site-settings";
import type { ProductWithImages } from "@/lib/products";
import { useCart } from "@/lib/cart";

const ICON_MAP: Record<TrustBadge["icon"], React.ElementType> = {
  truck:   Truck,
  shield:  ShieldCheck,
  refresh: RefreshCw,
  chat:    MessageCircle,
};

const categories = [
  { label: "Electronics", slug: "electronics", bg: "linear-gradient(135deg,#1a1a2e,#2a2a4e)" },
  { label: "Beauty",      slug: "beauty",       bg: "linear-gradient(135deg,#2e1a1a,#4e2a2a)" },
  { label: "Fashion",     slug: "fashion",      bg: "linear-gradient(135deg,#1a2e1a,#2a4e2a)" },
  { label: "Home",        slug: "home-kitchen", bg: "linear-gradient(135deg,#1e1a2e,#362a4e)" },
  { label: "Fitness",     slug: "sports",       bg: "linear-gradient(135deg,#2e2a1a,#4e3a10)" },
];

export default function IndexPage() {
  const { openCart } = useCart();
  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 1000 * 60 * 5,
  });

  const heroImages = settings.hero.images ?? [];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 4500);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const featured = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async (): Promise<ProductWithImages[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []) as ProductWithImages[];
    },
  });

  const newArrivals = useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: async (): Promise<ProductWithImages[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), categories(id,name,slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(2);
      if (error) throw error;
      return (data ?? []) as ProductWithImages[];
    },
  });

  const promoBadges = settings.trust_badges;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar announcementText={settings.announcement_bar} />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section
          className="relative min-h-[100svh] flex items-end pb-12 px-6 overflow-hidden"
          style={{ background: "linear-gradient(160deg,#1a1a1a 0%,#2e1a0e 60%,#3d2010 100%)" }}
        >
          {heroImages.length > 0 && heroImages.map((url, i) => (
            <div
              key={url + i}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ backgroundImage: `url(${url})`, opacity: i === heroIdx ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(13,13,13,0.92) 0%,rgba(13,13,13,0.45) 50%,rgba(13,13,13,0.2) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 30%,rgba(180,80,20,0.25) 0%,transparent 60%)" }} />

          {heroImages.length > 1 && (
            <div className="absolute bottom-5 right-6 flex gap-1.5 z-20">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className="transition-all duration-300 rounded-full"
                  style={{ width: i === heroIdx ? "20px" : "6px", height: "6px", background: i === heroIdx ? "#E8611A" : "rgba(255,255,255,0.4)" }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 max-w-[440px]" style={{ animation: "fadeUp 0.8s ease both" }}>
            <h1
              className="text-white mb-4 leading-[1.05]"
              style={{ fontWeight: 800, fontSize: "clamp(34px,8vw,50px)", letterSpacing: "-0.03em" }}
            >
              {settings.hero.heading_line1}<br />
              <em style={{ fontStyle: "normal", color: "#E8611A" }}>{settings.hero.heading_line2}</em>
            </h1>
            <p className="text-[15px] leading-[1.65] mb-7 max-w-[340px]" style={{ color: "rgba(255,255,255,0.65)" }}>
              {settings.hero.subtext}
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-white text-[14px] font-semibold px-6 py-3.5 rounded-full transition-all hover:opacity-90 hover:-translate-y-px"
                style={{ background: "#E8611A" }}
              >
                {settings.hero.cta_primary} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop?category=electronics"
                className="inline-flex items-center gap-2 text-white text-[14px] font-medium px-6 py-3.5 rounded-full transition-colors hover:bg-white/20"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                {settings.hero.cta_secondary}
              </Link>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
        <div className="bg-white overflow-x-auto border-b border-[#EFEFEF]" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3 min-w-max px-6 py-5 max-w-7xl mx-auto">
            {promoBadges.map((b) => {
              const Icon = ICON_MAP[b.icon] ?? Truck;
              return (
                <div key={b.title} className="flex items-center gap-2.5 bg-[#F4F4F4] rounded-xl px-4 py-3 min-w-[160px]">
                  <div className="w-9 h-9 bg-[#FEF0E8] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-[18px] w-[18px] text-[#E8611A]" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0D0D0D] leading-tight">{b.title}</p>
                    <p className="text-[11px] text-[#6B6B6B] leading-snug max-w-[180px]">{b.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CATEGORIES ── */}
        <section className="px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#E8611A] mb-1.5">Categories</div>
              <h2 style={{ fontWeight: 700, fontSize: "26px", letterSpacing: "-0.02em", color: "#0D0D0D" }}>Shop by category</h2>
            </div>
            <Link to="/shop" className="text-[13px] font-medium text-[#E8611A] flex items-center gap-1 hover:opacity-80">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/shop?category=${c.slug}`}
                className="flex-shrink-0 w-[100px] aspect-square rounded-xl overflow-hidden relative transition-all hover:-translate-y-0.5"
                style={{ background: c.bg }}
              >
                <div className="absolute inset-0 flex items-end p-2.5" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#fff", letterSpacing: "-0.01em" }}>{c.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── BESTSELLERS ── */}
        <section className="px-6 pb-8 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#E8611A] mb-1.5">Bestsellers</div>
              <h2 style={{ fontWeight: 700, fontSize: "26px", letterSpacing: "-0.02em", color: "#0D0D0D" }}>Loved by the community</h2>
            </div>
            <Link to="/shop" className="text-[13px] font-medium text-[#E8611A] flex items-center gap-1 hover:opacity-80">
              Shop all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {featured.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />)}
            </div>
          ) : (featured.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#EFEFEF] bg-[#F4F4F4] p-12 text-center">
              <Tag className="mx-auto mb-3 h-8 w-8 text-[#C8C8C8]" />
              <p className="font-semibold text-[#0D0D0D]">Catalog coming soon</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Products will appear once the store is stocked.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {featured.data!.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* ── NEW ARRIVALS ── */}
        <section className="px-6 pb-8 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#E8611A] mb-1.5">Just Landed</div>
              <h2 style={{ fontWeight: 700, fontSize: "26px", letterSpacing: "-0.02em", color: "#0D0D0D" }}>New arrivals</h2>
            </div>
            <Link to="/shop" className="text-[13px] font-medium text-[#E8611A] flex items-center gap-1 hover:opacity-80">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {newArrivals.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-[20px]" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(newArrivals.data ?? []).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* ── PROMO BANNER ── */}
        <div className="mx-6 mb-8 rounded-[20px] px-6 py-7 relative overflow-hidden max-w-7xl" style={{ background: "#E8611A" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute -bottom-16 right-10 w-52 h-52 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="relative z-10">
            <h2
              className="text-white mb-2 leading-[1.15]"
              style={{ fontWeight: 800, fontSize: "24px", letterSpacing: "-0.02em", whiteSpace: "pre-line" }}
            >
              {settings.promo_banner.heading}
            </h2>
            <p className="text-[13px] mb-4 leading-[1.5]" style={{ color: "rgba(255,255,255,0.8)" }}>
              {settings.promo_banner.subtext}
            </p>
            <div
              className="inline-block text-white text-[14px] font-bold tracking-[0.08em] px-3 py-1 rounded-lg mb-5"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px dashed rgba(255,255,255,0.5)" }}
            >
              {settings.promo_banner.code}
            </div>
            <br />
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-white text-[#E8611A] text-[14px] font-bold px-5 py-3 rounded-full transition-transform hover:-translate-y-px"
            >
              {settings.promo_banner.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* ── WHY NEXCART ── */}
        <section className="px-6 pb-12 max-w-7xl mx-auto">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck,        title: "Fast & Free Shipping", desc: "Free delivery on orders over $50." },
              { icon: ShieldCheck,  title: "Secure Checkout",      desc: "Encrypted payments via Paystack." },
              { icon: RefreshCw,    title: "30-Day Returns",       desc: "Easy no-fuss return policy." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 bg-[#F4F4F4] rounded-xl p-4">
                <div className="w-9 h-9 rounded-lg bg-[#FEF0E8] flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-4 w-4 text-[#E8611A]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0D0D0D]">{f.title}</p>
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
