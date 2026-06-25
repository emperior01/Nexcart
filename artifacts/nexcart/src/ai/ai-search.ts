import { supabase } from "@/integrations/supabase/client";
import { primaryImage } from "@/lib/products";
import type { ProductWithImages } from "@/lib/products";
import { openAiProvider } from "./ai-openai";
import type { AiProductResult, SearchIntent } from "./ai-types";

export const aiProvider = openAiProvider;

// ---------------------------------------------------------------------------
// PRODUCT TYPE REGISTRY
//
// This is the only place that maps natural language to searchable product
// types. It has NO knowledge of database category trees or hierarchies.
//
// Structure per entry:
//   triggers  — words the user might say that mean this product type
//   queryTerms — terms sent to the DB (used in word-boundary title search)
//   blocks    — product type keys that must NOT appear in results when this
//               type is requested (e.g. asking for "phone" blocks "headphone")
// ---------------------------------------------------------------------------
interface ProductType {
  triggers:   string[];   // what the user says
  queryTerms: string[];   // what we search for in product titles
  blocks:     string[];   // other product type keys to exclude from results
}

const PRODUCT_TYPES: Record<string, ProductType> = {
  smartphone: {
    triggers:   ["phone", "smartphone", "mobile", "android", "iphone", "samsung phone", "tecno phone", "infinix phone"],
    queryTerms: ["smartphone", "mobile phone", "android", "iphone", "samsung", "tecno", "infinix", "xiaomi", "redmi", "oppo", "vivo"],
    blocks:     ["headphone", "earphone", "phone_case", "charger"],
  },
  laptop: {
    triggers:   ["laptop", "notebook", "macbook", "chromebook"],
    queryTerms: ["laptop", "notebook", "macbook", "chromebook", "hp", "dell", "lenovo", "asus", "acer"],
    blocks:     ["headphone", "earphone", "laptop_bag"],
  },
  tablet: {
    triggers:   ["tablet", "ipad", "tab"],
    queryTerms: ["tablet", "ipad", "tab"],
    blocks:     ["headphone", "earphone"],
  },
  headphone: {
    triggers:   ["headphone", "earphone", "earbud", "airpod", "headset", "earpiece"],
    queryTerms: ["headphone", "earphone", "earbud", "airpod", "headset", "earpiece"],
    blocks:     [],
  },
  tv: {
    triggers:   ["tv", "television", "smart tv"],
    queryTerms: ["tv", "television", "smart tv", "led tv", "oled"],
    blocks:     [],
  },
  camera: {
    triggers:   ["camera", "dslr", "mirrorless"],
    queryTerms: ["camera", "dslr", "mirrorless", "webcam"],
    blocks:     [],
  },
  speaker: {
    triggers:   ["speaker", "bluetooth speaker", "subwoofer"],
    queryTerms: ["speaker", "bluetooth speaker", "subwoofer", "soundbar"],
    blocks:     [],
  },
  shoe: {
    triggers:   ["shoe", "sneaker", "boot", "sandal", "heel", "loafer", "slipper"],
    queryTerms: ["shoe", "sneaker", "boot", "sandal", "heel", "loafer", "slipper"],
    blocks:     [],
  },
  clothing: {
    triggers:   ["shirt", "dress", "trouser", "jean", "cloth", "top", "skirt", "suit", "hoodie", "jacket"],
    queryTerms: ["shirt", "dress", "trouser", "jean", "top", "skirt", "suit", "hoodie", "jacket"],
    blocks:     [],
  },
  bag: {
    triggers:   ["bag", "backpack", "handbag", "purse", "luggage"],
    queryTerms: ["bag", "backpack", "handbag", "purse", "luggage"],
    blocks:     [],
  },
  watch: {
    triggers:   ["watch", "smartwatch", "wristwatch"],
    queryTerms: ["watch", "smartwatch", "wristwatch"],
    blocks:     [],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    /within\s+([\w,₦$£€.]+)/,
    /max\s+([\w,₦$£€.]+)/,
    /budget\s+(?:of\s+)?([\w,₦$£€.]+)/,
  ];
  for (const p of pricePatterns) {
    const match = lower.match(p);
    if (match) { maxPrice = parsePrice(match[1]); if (maxPrice) break; }
  }

  const keywords = lower
    .replace(/under\s+[\w,₦$£€.]+/g, "")
    .replace(/below\s+[\w,₦$£€.]+/g, "")
    .replace(/less\s+than\s+[\w,₦$£€.]+/g, "")
    .replace(/within\s+[\w,₦$£€.]+/g, "")
    .replace(/budget\s+(?:of\s+)?[\w,₦$£€.]+/g, "")
    .replace(/(find|show|get|recommend|suggest|need|want|looking|search|me|a|an|some|for|good|best|great|nice|cheap|affordable|something|anything)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { keywords: keywords || message, maxPrice };
}

// Word-boundary match: "phone" must NOT fire inside "headphone" or "earphone".
// Uses negative lookbehind/lookahead on [a-z] so it works on all ASCII product terms.
function matchesWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
  return re.test(text);
}

// ---------------------------------------------------------------------------
// Intent → product type resolution
//
// Returns:
//   queryTerms      — terms to run word-boundary title searches against
//   blockedTitles   — product title substrings that must be excluded post-query
// ---------------------------------------------------------------------------
function resolveProductType(intent: SearchIntent): {
  queryTerms: string[];
  blockedTitles: string[];
} {
  const kw = intent.keywords.toLowerCase();
  const matched: ProductType[] = [];

  for (const pt of Object.values(PRODUCT_TYPES)) {
    for (const trigger of pt.triggers) {
      if (matchesWord(kw, trigger)) {
        matched.push(pt);
        break;
      }
    }
  }

  if (matched.length === 0) {
    // No known product type — use raw keyword tokens as query terms, no blocks
    const rawTokens = kw.split(/\s+/).filter(w => w.length > 2);
    return { queryTerms: rawTokens.length > 0 ? rawTokens : [intent.keywords], blockedTitles: [] };
  }

  const queryTerms: string[] = [];
  const blockedKeys = new Set<string>();

  for (const pt of matched) {
    pt.queryTerms.forEach(t => queryTerms.push(t));
    pt.blocks.forEach(b => blockedKeys.add(b));
  }

  // Collect all queryTerms of blocked product types — used to filter results by title
  const blockedTitles: string[] = [];
  for (const key of blockedKeys) {
    const blocked = PRODUCT_TYPES[key];
    if (blocked) blocked.queryTerms.forEach(t => blockedTitles.push(t));
  }

  // Also add intent modifiers (gaming, travel, work) as extra query terms
  const INTENT_MODIFIERS = ["gaming", "game", "work", "office", "travel", "portable", "student", "professional"];
  for (const mod of INTENT_MODIFIERS) {
    if (matchesWord(kw, mod)) queryTerms.push(mod);
  }

  return { queryTerms: [...new Set(queryTerms)], blockedTitles: [...new Set(blockedTitles)] };
}

// ---------------------------------------------------------------------------
// DB queries — word-boundary only, no ilike substring fallback
// ---------------------------------------------------------------------------

async function queryByTitleWordBoundary(term: string, maxPrice?: number, limit = 8): Promise<ProductWithImages[]> {
  // \y is Postgres' word boundary marker — prevents "phone" matching "headphone"
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `\\y${escaped}\\y`;

  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .filter("title", "~*", pattern)
    .order("is_featured", { ascending: false })
    .limit(limit);
  if (maxPrice) q = q.lte("price", maxPrice);
  const { data } = await q;
  return (data ?? []) as ProductWithImages[];
}

async function queryByDescription(term: string, maxPrice?: number): Promise<ProductWithImages[]> {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `\\y${escaped}\\y`;

  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .filter("description", "~*", pattern)
    .order("is_featured", { ascending: false })
    .limit(8);
  if (maxPrice) q = q.lte("price", maxPrice);
  const { data } = await q;
  return (data ?? []) as ProductWithImages[];
}

function dedup(products: ProductWithImages[]): ProductWithImages[] {
  const seen = new Set<string>();
  return products.filter(p => seen.has(p.id) ? false : (seen.add(p.id), true));
}

// ---------------------------------------------------------------------------
// Scoring — based on product type match + intent tokens + constraints only.
// No category tree traversal.
// ---------------------------------------------------------------------------

function scoreProduct(p: AiProductResult, intent: SearchIntent, queryTerms: string[]): number {
  const title = p.title.toLowerCase();
  const desc  = (p.description ?? "").toLowerCase();
  let score = 0;

  // Score each query term that appears in title/description (word-boundary)
  for (const term of queryTerms) {
    if (matchesWord(title, term)) score += 10;
    if (matchesWord(desc,  term)) score += 3;
  }

  // Exact product type phrase in title gets a strong bonus
  for (const pt of Object.values(PRODUCT_TYPES)) {
    for (const qt of pt.queryTerms) {
      if (matchesWord(title, qt)) { score += 8; break; }
    }
  }

  // Intent modifier bonuses
  const kw = intent.keywords.toLowerCase();
  const INTENT_MODIFIERS: Record<string, string[]> = {
    gaming:      ["gaming", "game", "gamer"],
    work:        ["work", "office", "business", "professional"],
    travel:      ["travel", "portable", "lightweight", "compact"],
    student:     ["student", "school", "education"],
  };
  for (const [mod, triggers] of Object.entries(INTENT_MODIFIERS)) {
    const userWantsThis = triggers.some(t => matchesWord(kw, t));
    if (userWantsThis) {
      if (matchesWord(title, mod) || matchesWord(desc, mod)) score += 15;
    }
  }

  // Budget fit
  if (intent.maxPrice) {
    if (p.price <= intent.maxPrice) score += 10;
    else score -= 60;
  }

  // In stock
  if (p.stock > 0) score += 5;

  return score;
}

// ---------------------------------------------------------------------------
// Post-query filter: hard-block results whose titles contain blocked terms
// ---------------------------------------------------------------------------

function applyBlockedTitles(products: ProductWithImages[], blockedTitles: string[]): ProductWithImages[] {
  if (blockedTitles.length === 0) return products;
  return products.filter(p => {
    const title = p.title.toLowerCase();
    return !blockedTitles.some(blocked => matchesWord(title, blocked));
  });
}

// ---------------------------------------------------------------------------
// Public search API
// ---------------------------------------------------------------------------

export async function searchProductsByIntent(intent: SearchIntent): Promise<AiProductResult[]> {
  const { queryTerms, blockedTitles } = resolveProductType(intent);
  const allRaw: ProductWithImages[] = [];

  for (const term of queryTerms.slice(0, 6)) {
    const r = await queryByTitleWordBoundary(term, intent.maxPrice);
    allRaw.push(...r);
    if (allRaw.length >= 12) break;
  }

  let pool = applyBlockedTitles(dedup(allRaw), blockedTitles);

  if (pool.length === 0) {
    for (const term of queryTerms.slice(0, 3)) {
      const r = await queryByDescription(term, intent.maxPrice);
      pool = applyBlockedTitles(dedup(r), blockedTitles);
      if (pool.length > 0) break;
    }
  }

  if (pool.length === 0) return [];

  return pool
    .map(p => ({ p: toAiProduct(p), score: scoreProduct(toAiProduct(p), intent, queryTerms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.p);
}

export async function searchProductsByKeyword(message: string): Promise<AiProductResult[]> {
  const intent = extractIntent(message);
  const { queryTerms, blockedTitles } = resolveProductType(intent);
  const allRaw: ProductWithImages[] = [];

  for (const term of queryTerms.slice(0, 6)) {
    const r = await queryByTitleWordBoundary(term, intent.maxPrice);
    allRaw.push(...r);
  }

  // Drop price filter if empty
  if (allRaw.length === 0) {
    for (const term of queryTerms.slice(0, 6)) {
      const r = await queryByTitleWordBoundary(term, undefined);
      allRaw.push(...r);
      if (allRaw.length >= 10) break;
    }
  }

  // Fallback: description
  if (allRaw.length === 0) {
    for (const term of queryTerms.slice(0, 3)) {
      const r = await queryByDescription(term, intent.maxPrice);
      allRaw.push(...r);
    }
  }

  if (allRaw.length === 0) return [];

  const pool = applyBlockedTitles(dedup(allRaw), blockedTitles);
  if (pool.length === 0) return [];

  return pool
    .map(p => ({ p: toAiProduct(p), score: scoreProduct(toAiProduct(p), intent, queryTerms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.p);
}

export function generateLocalReply(message: string, products: AiProductResult[]): string {
  const intent = extractIntent(message);
  const lower = message.toLowerCase();

  if (products.length === 0) {
    return intent.maxPrice
      ? `I searched for ${intent.keywords} within your budget but found no exact match. Try browsing the shop or adjusting your budget.`
      : "I could not find products matching your request. Try a simpler keyword like a brand name or product type.";
  }

  const count = products.length;
  const budgetNote = intent.maxPrice ? " within your budget" : "";

  if (lower.match(/gaming|game/))            return `Found ${count} product${count > 1 ? "s" : ""} suitable for gaming${budgetNote}. Check specs for the best performance.`;
  if (lower.match(/program|cod|dev|work|office/)) return `Here are ${count} option${count > 1 ? "s" : ""} good for productivity and work${budgetNote}.`;
  if (lower.match(/portable|travel|carry|light/)) return `Found ${count} portable option${count > 1 ? "s" : ""}${budgetNote}. Great for use on the go.`;
  if (lower.match(/wedding|party|event|occasion/)) return `Here are ${count} great pick${count > 1 ? "s" : ""} for your occasion${budgetNote}.`;
  if (lower.match(/best|top|recommend/))      return `Here are my top ${count} recommendation${count > 1 ? "s" : ""} for you${budgetNote}.`;

  return `Found ${count} product${count > 1 ? "s" : ""} matching your request${budgetNote}. Tap any card to view details or add to cart.`;
}
