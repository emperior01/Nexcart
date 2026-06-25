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

// Parse price from natural language: "2 million", "2m", "500k", "500,000"
export function parsePrice(text: string): number | undefined {
  const t = text.toLowerCase().replace(/[,₦$£€\s]/g, "");
  const millionMatch = t.match(/(\d+\.?\d*)\s*m(illion)?/);
  if (millionMatch) return parseFloat(millionMatch[1]) * 1_000_000;
  const kMatch = t.match(/(\d+\.?\d*)\s*k/);
  if (kMatch) return parseFloat(kMatch[1]) * 1_000;
  const plain = t.match(/(\d{4,})/);
  if (plain) return parseFloat(plain[1]);
  return undefined;
}

// Extract search intent from plain message without AI
export function extractIntent(message: string): SearchIntent {
  const lower = message.toLowerCase();

  // Extract max price
  const underMatch = lower.match(/under\s+(.+?)(?:\s|$)/);
  const belowMatch = lower.match(/below\s+(.+?)(?:\s|$)/);
  const lessThanMatch = lower.match(/less\s+than\s+(.+?)(?:\s|$)/);
  const priceStr = underMatch?.[1] ?? belowMatch?.[1] ?? lessThanMatch?.[1];
  const maxPrice = priceStr ? parsePrice(priceStr) : undefined;

  // Strip price words to get clean keywords
  const keywords = lower
    .replace(/under\s+\S+/g, "")
    .replace(/below\s+\S+/g, "")
    .replace(/less\s+than\s+\S+/g, "")
    .replace(/find\s+me\s+/g, "")
    .replace(/show\s+me\s+/g, "")
    .replace(/recommend\s+/g, "")
    .replace(/looking\s+for\s+/g, "")
    .replace(/i\s+need\s+/g, "")
    .replace(/a\s+/g, " ")
    .replace(/an\s+/g, " ")
    .replace(/some\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { keywords: keywords || message, maxPrice };
}

export async function searchProductsByIntent(intent: SearchIntent): Promise<AiProductResult[]> {
  let query = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .ilike("title", `%${intent.keywords}%`)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  if (intent.maxPrice !== undefined) {
    query = query.lte("price", intent.maxPrice);
  }
  if (intent.minPrice !== undefined) {
    query = query.gte("price", intent.minPrice);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as ProductWithImages[]).map(toAiProduct);
}

export async function searchProductsByKeyword(message: string): Promise<AiProductResult[]> {
  const intent = extractIntent(message);

  // Try with extracted keywords first
  let results = await searchProductsByIntent(intent);

  // If no results, try with first meaningful word only
  if (results.length === 0) {
    const firstWord = intent.keywords.split(" ").find(w => w.length > 2) ?? intent.keywords;
    results = await searchProductsByIntent({ ...intent, keywords: firstWord });
  }

  // If still no results and there was a price filter, try without price filter
  if (results.length === 0 && intent.maxPrice !== undefined) {
    results = await searchProductsByIntent({ keywords: intent.keywords });
  }

  return results;
}
