import { supabase } from "@/integrations/supabase/client";

export interface HeroSettings {
  heading_line1: string;
  heading_line2: string;
  subtext: string;
  cta_primary: string;
  cta_secondary: string;
  images: string[]; // up to 4 image URLs
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

export interface SiteSettings {
  announcement_bar: string;
  hero: HeroSettings;
  promo_banner: PromoBannerSettings;
  trust_badges: TrustBadge[];
  shipping_fee: number;
  /** Marketplace commission rate Nexcart takes on seller sales, as a percentage (e.g. 10 = 10%). */
  commission_rate: number;
}

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
  commission_rate: 10,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data: rawData, error } = await supabase
    .from("site_settings")
    .select("key, value");
  const data = rawData as { key: string; value: unknown }[] | null;

  if (error || !data?.length) return DEFAULT_SETTINGS;

  const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
  return {
    announcement_bar: (map.announcement_bar as string) ?? DEFAULT_SETTINGS.announcement_bar,
    hero:         (map.hero as HeroSettings)                  ?? DEFAULT_SETTINGS.hero,
    promo_banner: (map.promo_banner as PromoBannerSettings)   ?? DEFAULT_SETTINGS.promo_banner,
    trust_badges: (map.trust_badges as TrustBadge[])          ?? DEFAULT_SETTINGS.trust_badges,
    shipping_fee: (map.shipping_fee as number)                ?? DEFAULT_SETTINGS.shipping_fee,
    commission_rate: (map.commission_rate as number)          ?? DEFAULT_SETTINGS.commission_rate,
  };
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() } as any);
  if (error) throw error;
}
