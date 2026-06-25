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

// Parse price from natural language
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

// Extract intent from message without AI
export function extractIntent(message: string): SearchIntent {
  const lower = message.toLowerCase();

  // Extract max price
  const pricePatterns = [
    /under\s+([\w,₦$£€.]+)/,
    /below\s+([\w,₦$£€.]+)/,
    /less\s+than\s+([\w,₦$£€.]+)/,
    /within\s+([\w,₦$£€.]+)/,
    /budget\s+of\s+([\w,₦$£€.]+)/,
    /max\s+([\w,₦$£€.]+)/,
  ];
  let maxPrice: number | undefined;
  for (const pattern of pricePatterns) {
    const match = lower.match(pattern);
    if (match) {
      maxPrice = parsePrice(match[1]);
      if (maxPrice) break;
    }
  }

  // Strip noise words to get clean keywords
  const keywords = lower
    .replace(/under\s+[\w,₦$£€.]+/g, "")
    .replace(/below\s+[\w,₦$£€.]+/g, "")
    .replace(/less\s+than\s+[\w,₦$£€.]+/g, "")
    .replace(/within\s+[\w,₦$£€.]+/g, "")
    .replace(/budget\s+of\s+[\w,₦$£€.]+/g, "")
    .replace(/(find|show|get|recommend|suggest|i need|i want|looking for|search for|me a|me an|me some|for a|for an|something|anything)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { keywords: keywords || message, maxPrice };
}

// Score a product for relevance against the original message
function scoreProduct(product: AiProductResult, message: string, intent: SearchIntent): number {
  const lower = message.toLowerCase();
  const title = product.title.toLowerCase();
  const desc = (product.description ?? "").toLowerCase();
  let score = 0;

  // Exact title match — highest signal
  if (title.includes(intent.keywords.toLowerCase())) score += 40;

  // Each keyword word found in title
  const words = intent.keywords.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  for (const word of words) {
    if (title.includes(word)) score += 10;
    if (desc.includes(word)) score += 3;
  }

  // Original message words in title (catches brand+model)
  const msgWords = lower.split(/\s+/).filter(w => w.length > 2);
  for (const word of msgWords) {
    if (title.includes(word)) score += 8;
  }

  // Category match
  if (product.category && lower.includes(product.category.toLowerCase())) score += 15;

  // Price fit bonus
  if (intent.maxPrice && product.price <= intent.maxPrice) score += 20;
  if (intent.maxPrice && product.price > intent.maxPrice) score -= 30;

  // In stock bonus
  if (product.stock > 0) score += 5;

  // Featured bonus
  return score;
}

async function queryProducts(keywords: string, maxPrice?: number, limit = 8): Promise<ProductWithImages[]> {
  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .ilike("title", `%${keywords}%`)
    .order("is_featured", { ascending: false })
    .limit(limit);
  if (maxPrice !== undefined) q = q.lte("price", maxPrice);
  const { data } = await q;
  return (data ?? []) as ProductWithImages[];
}

async function queryByDescription(keywords: string, maxPrice?: number): Promise<ProductWithImages[]> {
  let q = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .ilike("description", `%${keywords}%`)
    .order("is_featured", { ascending: false })
    .limit(6);
  if (maxPrice !== undefined) q = q.lte("price", maxPrice);
  const { data } = await q;
  return (data ?? []) as ProductWithImages[];
}

export async function searchProductsByIntent(intent: SearchIntent): Promise<AiProductResult[]> {
  const results = await queryProducts(intent.keywords, intent.maxPrice);
  if (results.length > 0) return results.map(toAiProduct);

  // Fallback: try description search
  const byDesc = await queryByDescription(intent.keywords, intent.maxPrice);
  if (byDesc.length > 0) return byDesc.map(toAiProduct);

  return [];
}

export async function searchProductsByKeyword(message: string): Promise<AiProductResult[]> {
  const intent = extractIntent(message);

  // Strategy 1: full extracted keywords
  let raw = await queryProducts(intent.keywords, intent.maxPrice, 12);

  // Strategy 2: try each significant word separately
  if (raw.length === 0) {
    const words = intent.keywords.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const r = await queryProducts(word, intent.maxPrice, 12);
      if (r.length > 0) { raw = r; break; }
    }
  }

  // Strategy 3: drop price filter and try again
  if (raw.length === 0 && intent.maxPrice !== undefined) {
    const words = intent.keywords.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const r = await queryProducts(word, undefined, 12);
      if (r.length > 0) { raw = r; break; }
    }
  }

  // Strategy 4: description search
  if (raw.length === 0) {
    const words = intent.keywords.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const r = await queryByDescription(word, intent.maxPrice);
      if (r.length > 0) { raw = r; break; }
    }
  }

  if (raw.length === 0) return [];

  // Score and sort by relevance
  const scored = raw
    .map(p => ({ product: toAiProduct(p), score: scoreProduct(toAiProduct(p), message, intent) }))
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 0);

  return scored.length > 0 ? scored.map(x => x.product).slice(0, 6) : raw.slice(0, 6).map(toAiProduct);
}

// Generate a helpful reply without AI API
export function generateLocalReply(message: string, products: AiProductResult[]): string {
  const intent = extractIntent(message);
  const lower = message.toLowerCase();

  if (products.length === 0) {
    const hasPrice = intent.maxPrice !== undefined;
    if (hasPrice) {
      return "I searched for " + intent.keywords + " within your budget but could not find an exact match. Try browsing the shop or adjusting your budget.";
    }
    return "I could not find products matching your request. Try a simpler keyword like the brand name or product type.";
  }

  const count = products.length;
  const budgetNote = intent.maxPrice
    ? " within your budget of " + intent.maxPrice.toLocaleString()
    : "";

  // Detect intent type for personalized reply
  if (lower.includes("program") || lower.includes("coding") || lower.includes("develop")) {
    return "Here are " + count + " option" + (count > 1 ? "s" : "") + " suitable for programming" + budgetNote + ". Look for higher RAM and storage for the best experience.";
  }
  if (lower.includes("gaming") || lower.includes("game")) {
    return "Found " + count + " product" + (count > 1 ? "s" : "") + " that could work for gaming" + budgetNote + ". Check the specs for GPU and RAM.";
  }
  if (lower.includes("portable") || lower.includes("travel") || lower.includes("light")) {
    return "Here are " + count + " portable option" + (count > 1 ? "s" : "") + budgetNote + ". Great for on-the-go use.";
  }
  if (lower.includes("wedding") || lower.includes("party") || lower.includes("occasion")) {
    return "Found " + count + " great option" + (count > 1 ? "s" : "") + " for your occasion" + budgetNote + ".";
  }

  return "Found " + count + " product" + (count > 1 ? "s" : "") + " matching your search" + budgetNote + ". Tap any card to view details or add to cart.";
}
