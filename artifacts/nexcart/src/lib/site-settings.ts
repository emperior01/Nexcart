import { supabase } from "@/integrations/supabase/client";

export interface HeroSettings {
  heading_line1: string;
  heading_line2: string;
  subtext: string;
  cta_primary: string;
  cta_secondary: string;
  images: string[];
  heading_line1_color: string;
  heading_line2_color: string;
  subtext_color: string;
}

export interface PromoBannerSettings {
  heading: string;
  subtext: string;
  code: string;
  cta: string;
}

export interface TrustBadge {
  icon: "truck" | "shield" | "refresh" | "chat";
  title: string;
  sub: string;
}

export interface HomepageCategory {
  id: string;       // uuid, client-generated
  label: string;
  slug: string;
  image: string;    // URL — either uploaded or external
  bg: string;       // fallback gradient if image fails/absent
}

export interface SiteSettings {
  announcement_bar: string;
  hero: HeroSettings;
  promo_banner: PromoBannerSettings;
  trust_badges: TrustBadge[];
  shipping_fee: number;
  homepage_categories: HomepageCategory[];
  marketplace_currency: string; // ISO 4217 code — default currency for all price display
}

export const DEFAULT_CATEGORIES: HomepageCategory[] = [
  { id: "c1", label: "Electronics", slug: "electronics", image: "", bg: "linear-gradient(135deg,#1a1a2e,#2a2a4e)" },
  { id: "c2", label: "Beauty",      slug: "beauty",       image: "", bg: "linear-gradient(135deg,#2e1a1a,#4e2a2a)" },
  { id: "c3", label: "Fashion",     slug: "fashion",      image: "", bg: "linear-gradient(135deg,#1a2e1a,#2a4e2a)" },
  { id: "c4", label: "Home",        slug: "home-kitchen", image: "", bg: "linear-gradient(135deg,#1e1a2e,#362a4e)" },
  { id: "c5", label: "Fitness",     slug: "sports",       image: "", bg: "linear-gradient(135deg,#2e2a1a,#4e3a10)" },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  announcement_bar: "Fast delivery · Secure encrypted checkout",
  hero: {
    heading_line1: "Shop Smarter.",
    heading_line2: "Live Better with Nexcart",
    subtext: "Quality goods, easy ordering, and reliable service.",
    cta_primary: "Shop the collection",
    cta_secondary: "Browse new tech",
    images: [],
    heading_line1_color: "#FFFFFF",
    heading_line2_color: "#E8611A",
    subtext_color: "#A8A8A8",
  },
  promo_banner: {
    heading: "Shop Smarter.\nLive Better with Nexcart",
    subtext: "Quality goods, easy ordering, and reliable service.",
    code: "NEXCART10",
    cta: "Start shopping",
  },
  trust_badges: [
    { icon: "truck",   title: "Fast delivery",   sub: "Fast fulfillment and dependable shipping on every order." },
    { icon: "shield",  title: "Secure checkout", sub: "Encrypted payments via Paystack." },
    { icon: "refresh", title: "30-day returns",  sub: "No-fuss return policy." },
    { icon: "chat",    title: "Real support",    sub: "Humans, not bots." },
  ],
  shipping_fee: 0,
  homepage_categories: DEFAULT_CATEGORIES,
  marketplace_currency: "USD",
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data: rawData, error } = await supabase
    .from("site_settings")
    .select("key, value");
  const data = rawData as { key: string; value: unknown }[] | null;

  if (error || !data?.length) return DEFAULT_SETTINGS;

  const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
  return {
    announcement_bar:    (map.announcement_bar as string)              ?? DEFAULT_SETTINGS.announcement_bar,
    hero:                (map.hero as HeroSettings)                    ?? DEFAULT_SETTINGS.hero,
    promo_banner:        (map.promo_banner as PromoBannerSettings)     ?? DEFAULT_SETTINGS.promo_banner,
    trust_badges:        (map.trust_badges as TrustBadge[])            ?? DEFAULT_SETTINGS.trust_badges,
    shipping_fee:         (map.shipping_fee as number)                   ?? DEFAULT_SETTINGS.shipping_fee,
    homepage_categories:  (map.homepage_categories as HomepageCategory[]) ?? DEFAULT_SETTINGS.homepage_categories,
    marketplace_currency: (map.marketplace_currency as string)            ?? DEFAULT_SETTINGS.marketplace_currency,
  };
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() } as any);
  if (error) throw error;
}
