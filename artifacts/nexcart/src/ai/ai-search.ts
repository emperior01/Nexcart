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
    .replace(/(find|show|get|recommend|suggest|need|want|looking|search|me|a|an|some|for|good|best|great|nice|cheap|affordable|something|anything)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { keywords: keywords || message, maxPrice };
}

// Category synonyms — maps user intent to searchable terms
const CATEGORY_TERMS: Record<string, string[]> = {
  phones:      ["phone", "smartphone", "mobile", "iphone", "android", "samsung", "tecno", "infinix", "xiaomi", "redmi", "oppo", "vivo"],
  laptops:     ["laptop", "notebook", "macbook", "chromebook", "hp", "dell", "lenovo", "asus", "acer"],
  tablets:     ["tablet", "ipad", "tab"],
  headphones:  ["headphone", "earphone", "earbud", "airpod", "headset"],
  fashion:     ["shirt", "dress", "trouser", "jean", "cloth", "wear", "top", "skirt", "suit"],
  shoes:       ["shoe", "sneaker", "boot", "sandal", "heel", "loafer", "slipper"],
  accessories: ["bag", "watch", "belt", "cap", "hat", "sunglasses", "wallet"],
  electronics: ["tv", "television", "camera", "speaker", "printer", "router"],
};

function getSearchTerms(intent: SearchIntent): string[] {
  const kw = intent.keywords.toLowerCase();
  const terms = new Set<string>();
  terms.add(intent.keywords);

  // Check if keyword maps to a category
  for (const [, synonyms] of Object.entries(CATEGORY_TERMS)) {
    for (const syn of synonyms) {
      if (kw.includes(syn) || syn.includes(kw)) {
        synonyms.forEach(s => terms.add(s));
        break;
      }
    }
  }

  // Also add individual words
  kw.split(/\s+/).filter(w => w.length > 2).forEach(w => terms.add(w));

  return Array.from(terms);
}

async function queryByTitle(keyword: string, maxPrice?: number, limit = 8): Promise<ProductWithImages[]> {
  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .ilike("title", `%${keyword}%`)
    .order("is_featured", { ascending: false })
    .limit(limit);
  if (maxPrice) q = q.lte("price", maxPrice);
  const { data } = await q;
  return (data ?? []) as ProductWithImages[];
}

async function queryByDescription(keyword: string, maxPrice?: number): Promise<ProductWithImages[]> {
  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .ilike("description", `%${keyword}%`)
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

function scoreProduct(p: AiProductResult, message: string, intent: SearchIntent): number {
  const lower = message.toLowerCase();
  const title = p.title.toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  let score = 0;

  // Title match
  const words = intent.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  for (const w of words) {
    if (title.includes(w)) score += 12;
    if (desc.includes(w)) score += 4;
  }

  // Exact phrase match bonus
  if (title.includes(intent.keywords.toLowerCase())) score += 30;

  // Category match bonus
  if (p.category) {
    const catLower = p.category.toLowerCase();
    if (lower.includes(catLower)) score += 20;
    for (const [cat, synonyms] of Object.entries(CATEGORY_TERMS)) {
      if (catLower.includes(cat) || cat.includes(catLower)) {
        for (const syn of synonyms) {
          if (lower.includes(syn)) { score += 15; break; }
        }
      }
    }
  }

  // Price fit
  if (intent.maxPrice) {
    if (p.price <= intent.maxPrice) score += 15;
    else score -= 50; // Hard penalize over budget
  }

  // In stock
  if (p.stock > 0) score += 5;

  return score;
}

export async function searchProductsByIntent(intent: SearchIntent): Promise<AiProductResult[]> {
  const terms = getSearchTerms(intent);
  const allRaw: ProductWithImages[] = [];

  for (const term of terms.slice(0, 5)) {
    const r = await queryByTitle(term, intent.maxPrice);
    allRaw.push(...r);
    if (allRaw.length >= 12) break;
  }

  const deduped = dedup(allRaw);
  if (deduped.length > 0) {
    const scored = deduped
      .map(p => ({ p: toAiProduct(p), score: scoreProduct(toAiProduct(p), intent.keywords, intent) }))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map(x => x.p);
  }

  // Fallback: description search
  for (const term of terms.slice(0, 3)) {
    const r = await queryByDescription(term, intent.maxPrice);
    if (r.length > 0) return dedup(r).slice(0, 6).map(toAiProduct);
  }

  return [];
}

export async function searchProductsByKeyword(message: string): Promise<AiProductResult[]> {
  const intent = extractIntent(message);
  const terms = getSearchTerms(intent);
  const allRaw: ProductWithImages[] = [];

  // Try with price filter first
  for (const term of terms.slice(0, 6)) {
    const r = await queryByTitle(term, intent.maxPrice);
    allRaw.push(...r);
  }

  // If no results, drop price filter
  if (allRaw.length === 0) {
    for (const term of terms.slice(0, 6)) {
      const r = await queryByTitle(term, undefined);
      allRaw.push(...r);
      if (allRaw.length >= 10) break;
    }
  }

  // Fallback: description
  if (allRaw.length === 0) {
    for (const term of terms.slice(0, 3)) {
      const r = await queryByDescription(term, intent.maxPrice);
      allRaw.push(...r);
    }
  }

  if (allRaw.length === 0) return [];

  const deduped = dedup(allRaw);
  const scored = deduped
    .map(p => ({ p: toAiProduct(p), score: scoreProduct(toAiProduct(p), message, intent) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(x => x.p);
}

export function generateLocalReply(message: string, products: AiProductResult[]): string {
  const intent = extractIntent(message);
  const lower = message.toLowerCase();

  if (products.length === 0) {
    return intent.maxPrice
      ? "I searched for " + intent.keywords + " within your budget but found no exact match. Try browsing the shop or adjusting your budget."
      : "I could not find products matching your request. Try a simpler keyword like a brand name or product type.";
  }

  const count = products.length;
  const budgetNote = intent.maxPrice ? " within your budget" : "";

  if (lower.match(/gaming|game/)) return "Found " + count + " product" + (count > 1 ? "s" : "") + " suitable for gaming" + budgetNote + ". Check specs for the best performance.";
  if (lower.match(/program|cod|dev|work|office/)) return "Here are " + count + " option" + (count > 1 ? "s" : "") + " good for productivity and work" + budgetNote + ".";
  if (lower.match(/portable|travel|carry|light/)) return "Found " + count + " portable option" + (count > 1 ? "s" : "") + budgetNote + ". Great for use on the go.";
  if (lower.match(/wedding|party|event|occasion/)) return "Here are " + count + " great pick" + (count > 1 ? "s" : "") + " for your occasion" + budgetNote + ".";
  if (lower.match(/best|top|recommend/)) return "Here are my top " + count + " recommendation" + (count > 1 ? "s" : "") + " for you" + budgetNote + ".";

  return "Found " + count + " product" + (count > 1 ? "s" : "") + " matching your request" + budgetNote + ". Tap any card to view details or add to cart.";
}
