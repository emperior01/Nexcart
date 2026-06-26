import { supabase } from "@/integrations/supabase/client";
import { primaryImage } from "@/lib/products";
import type { ProductWithImages } from "@/lib/products";
import { openAiProvider } from "./ai-openai";
import type { AiProductResult, SearchIntent } from "./ai-types";

export const aiProvider = openAiProvider;

function toAiProduct(p: ProductWithImages): AiProductResult {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: Number(p.price),
    currency: p.currency,
    stock: p.stock,
    image: primaryImage(p),
    category: p.categories?.name ?? null,
    description: p.description ?? null,
  };
}

// Maps productType to search keywords that match product titles
const TYPE_KEYWORDS: Record<string, string[]> = {
  smartphone:  ["phone", "smartphone", "mobile", "samsung", "iphone", "tecno", "infinix", "xiaomi", "redmi", "oppo", "vivo", "itel"],
  laptop:      ["laptop", "notebook", "macbook", "chromebook"],
  tablet:      ["tablet", "ipad"],
  headphone:   ["headphone", "earphone", "earbud", "airpod", "headset"],
  earphone:    ["earphone", "earbud", "airpod"],
  television:  ["tv", "television", "smart tv"],
  camera:      ["camera", "dslr", "mirrorless"],
  shoe:        ["shoe", "sneaker", "boot", "sandal", "heel", "loafer"],
  shirt:       ["shirt", "top", "blouse", "tee"],
  trouser:     ["trouser", "jean", "pant", "chino"],
  dress:       ["dress", "gown", "skirt"],
  bag:         ["bag", "backpack", "handbag", "purse"],
  watch:       ["watch", "smartwatch"],
  accessories: ["accessory", "accessories", "belt", "cap", "hat", "sunglasses", "wallet"],
  appliance:   ["appliance", "fridge", "washing", "microwave", "blender", "iron"],
  other:       [],
};

// Words that should be excluded when a productType is set
// Prevents "phone" matching "headphone" etc.
const TYPE_EXCLUDE_PATTERNS: Record<string, RegExp[]> = {
  smartphone: [/headphone/i, /earphone/i, /earbud/i, /airpod/i, /headset/i, /laptop/i, /tablet/i],
  laptop:     [/phone/i, /tablet/i, /headphone/i],
  tablet:     [/phone/i, /laptop/i, /headphone/i],
  headphone:  [/phone/i, /laptop/i, /tablet/i],
  shoe:       [/shirt/i, /trouser/i, /dress/i, /laptop/i, /phone/i],
  shirt:      [/shoe/i, /trouser/i, /laptop/i, /phone/i],
};

function isExcluded(title: string, productType: string, excludeTypes: string[]): boolean {
  const titleLower = title.toLowerCase();

  // Check built-in exclusion patterns for this product type
  const patterns = TYPE_EXCLUDE_PATTERNS[productType] ?? [];
  for (const pattern of patterns) {
    if (pattern.test(titleLower)) return true;
  }

  // Check AI-provided excludeTypes
  for (const excType of excludeTypes) {
    const excKeywords = TYPE_KEYWORDS[excType] ?? [excType];
    for (const kw of excKeywords) {
      if (titleLower.includes(kw.toLowerCase())) return true;
    }
  }

  return false;
}

function dedup(products: ProductWithImages[]): ProductWithImages[] {
  const seen = new Set<string>();
  return products.filter(p => seen.has(p.id) ? false : (seen.add(p.id), true));
}

function scoreProduct(p: AiProductResult, intent: SearchIntent): number {
  const title = p.title.toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  let score = 0;

  // Keyword match in title
  const words = intent.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  for (const w of words) {
    if (title.includes(w)) score += 15;
    if (desc.includes(w)) score += 5;
  }

  // Brand match bonus
  if (intent.brand && title.includes(intent.brand.toLowerCase())) score += 25;

  // Exact keyword phrase match
  if (title.includes(intent.keywords.toLowerCase())) score += 20;

  // Use case in description
  if (intent.useCase && desc.includes(intent.useCase.toLowerCase())) score += 10;

  // Price fit
  if (intent.maxPrice) {
    if (p.price <= intent.maxPrice) score += 15;
    else score -= 60;
  }

  // In stock
  if (p.stock > 0) score += 5;

  return score;
}

async function queryProducts(terms: string[], maxPrice?: number): Promise<ProductWithImages[]> {
  const all: ProductWithImages[] = [];
  for (const term of terms) {
    let q = supabase
      .from("products")
      .select("*, product_images(*), categories(id,name,slug)")
      .eq("is_active", true)
      .ilike("title", `%${term}%`)
      .order("is_featured", { ascending: false })
      .limit(10);
    if (maxPrice) q = q.lte("price", maxPrice);
    const { data } = await q;
    if (data) all.push(...(data as ProductWithImages[]));
    if (all.length >= 20) break;
  }
  return dedup(all);
}

async function queryDescription(terms: string[], maxPrice?: number): Promise<ProductWithImages[]> {
  const all: ProductWithImages[] = [];
  for (const term of terms) {
    let q = supabase
      .from("products")
      .select("*, product_images(*), categories(id,name,slug)")
      .eq("is_active", true)
      .ilike("description", `%${term}%`)
      .order("is_featured", { ascending: false })
      .limit(8);
    if (maxPrice) q = q.lte("price", maxPrice);
    const { data } = await q;
    if (data) all.push(...(data as ProductWithImages[]));
  }
  return dedup(all);
}

export async function searchProductsByIntent(intent: SearchIntent): Promise<AiProductResult[]> {
  // Build search terms: brand first, then keywords, then type synonyms
  const searchTerms: string[] = [];
  if (intent.brand) searchTerms.push(intent.brand);
  if (intent.keywords) searchTerms.push(intent.keywords);
  const typeTerms = TYPE_KEYWORDS[intent.productType] ?? [];
  searchTerms.push(...typeTerms.slice(0, 4));

  // Query with price filter
  let raw = await queryProducts(searchTerms, intent.maxPrice);

  // If nothing found with price, drop price filter
  if (raw.length === 0 && intent.maxPrice) {
    raw = await queryProducts(searchTerms, undefined);
  }

  // Description fallback
  if (raw.length === 0) {
    raw = await queryDescription(searchTerms.slice(0, 3), intent.maxPrice);
  }

  if (raw.length === 0) return [];

  // Filter out wrong product types
  const filtered = raw.filter(p =>
    !isExcluded(p.title, intent.productType, intent.excludeTypes)
  );

  // If filtering removed everything, return unfiltered with a warning
  const toScore = filtered.length > 0 ? filtered : raw;

  // Score and rank
  const scored = toScore
    .map(p => ({ p: toAiProduct(p), score: scoreProduct(toAiProduct(p), intent) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(x => x.p);
}

// Used when OpenAI is not available — basic local fallback
export function parsePrice(text: string): number | undefined {
  const t = text.toLowerCase().replace(/[,\s₦$£€]/g, "");
  const m = t.match(/(\d+\.?\d*)(m(?:illion)?)/);
  if (m) return parseFloat(m[1]) * 1_000_000;
  const k = t.match(/(\d+\.?\d*)k/);
  if (k) return parseFloat(k[1]) * 1_000;
  const plain = t.match(/(\d{4,})/);
  if (plain) return parseFloat(plain[1]);
  return undefined;
}

export function extractIntent(message: string): SearchIntent {
  const lower = message.toLowerCase();
  let maxPrice: number | undefined;
  const pricePatterns = [
    /under\s+([\w,₦$£€.]+)/,
    /below\s+([\w,₦$£€.]+)/,
    /less\s+than\s+([\w,₦$£€.]+)/,
    /max\s+([\w,₦$£€.]+)/,
    /budget\s+(?:of\s+)?([\w,₦$£€.]+)/,
  ];
  for (const p of pricePatterns) {
    const match = lower.match(p);
    if (match) { maxPrice = parsePrice(match[1]); if (maxPrice) break; }
  }

  // Detect product type locally
  let productType = "other";
  for (const [type, synonyms] of Object.entries(TYPE_KEYWORDS)) {
    for (const syn of synonyms) {
      if (lower.includes(syn)) { productType = type; break; }
    }
    if (productType !== "other") break;
  }

  const keywords = lower
    .replace(/under\s+[\w,₦$£€.]+/g, "")
    .replace(/below\s+[\w,₦$£€.]+/g, "")
    .replace(/(find|show|get|recommend|me|a|an|some|for|good|best)/g, " ")
    .replace(/\s+/g, " ").trim();

  const excludeTypes = TYPE_EXCLUDE_PATTERNS[productType]
    ? Object.keys(TYPE_KEYWORDS).filter(t => t !== productType && t !== "other").slice(0, 3)
    : [];

  return { keywords: keywords || message, productType, excludeTypes, maxPrice };
}

export async function searchProductsByKeyword(message: string): Promise<AiProductResult[]> {
  const intent = extractIntent(message);
  return searchProductsByIntent(intent);
}

export function generateLocalReply(message: string, products: AiProductResult[]): string {
  const intent = extractIntent(message);
  const lower = message.toLowerCase();
  if (products.length === 0) {
    return intent.maxPrice
      ? "I searched within your budget but found no exact match. Try adjusting your budget or browsing the shop."
      : "I could not find products matching your request. Try a brand name or product type.";
  }
  const count = products.length;
  const budget = intent.maxPrice ? " within your budget" : "";
  if (lower.match(/gaming|game/)) return "Found " + count + " option" + (count > 1 ? "s" : "") + " suitable for gaming" + budget + ".";
  if (lower.match(/program|work|office/)) return "Here are " + count + " option" + (count > 1 ? "s" : "") + " for work and productivity" + budget + ".";
  if (lower.match(/portable|travel/)) return "Found " + count + " portable option" + (count > 1 ? "s" : "") + budget + ".";
  return "Found " + count + " product" + (count > 1 ? "s" : "") + " matching your request" + budget + ". Tap to view or add to cart.";
}
