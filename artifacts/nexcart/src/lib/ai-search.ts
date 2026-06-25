/**
 * ai-search.ts
 *
 * Two-phase AI search engine:
 *   Phase 1 — Claude extracts structured intent from the user's natural language query
 *   Phase 2 — Supabase fetches products filtered by the extracted intent
 *   Phase 3 — Client-side relevance scoring ranks & explains every result
 *
 * No keyword matching is used for retrieval. Category filtering is strict.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ProductWithImages } from "@/lib/products";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SearchIntent {
  /** Canonical product category the user wants, e.g. "smartphones", "laptops" */
  category: string | null;
  /** Broad product type keywords for the DB query, e.g. ["phone","mobile","smartphone"] */
  productTypeKeywords: string[];
  /** Attribute terms to look for in descriptions, e.g. ["gaming","high refresh rate","snapdragon"] */
  attributeKeywords: string[];
  /** Human-readable summary of what the user wants */
  summary: string;
  /** Is this clearly a product search (true) or a general question (false)? */
  isProductSearch: boolean;
}

export interface ScoredProduct {
  product: ProductWithImages;
  score: number;
  /** One-sentence explanation of why this product matches */
  reason: string;
}

export interface AISearchResult {
  intent: SearchIntent;
  results: ScoredProduct[];
  /** Friendly response message from the AI */
  message: string;
}

// ─── Phase 1: Extract intent from natural language ───────────────────────────

export async function extractIntent(userQuery: string): Promise<SearchIntent> {
  const systemPrompt = `You are a shopping assistant for Nexcart, an e-commerce marketplace.
Your job is to parse a user's shopping query and extract structured intent as JSON.

RULES:
- Identify the EXACT product category the user wants. Be precise.
  Examples:
    "gaming phone" → category: "smartphones", productTypeKeywords: ["phone","smartphone","mobile"]
    "wireless headphones" → category: "headphones", productTypeKeywords: ["headphone","earphone","earbud","audio"]
    "laptop for video editing" → category: "laptops", productTypeKeywords: ["laptop","notebook","computer"]
    "running shoes" → category: "footwear", productTypeKeywords: ["shoe","sneaker","trainer","running"]
- productTypeKeywords: array of synonyms/variants for the product type (for DB search)
- attributeKeywords: specific features, specs or use-cases to look for in descriptions
  Example for "gaming phone": ["gaming","processor","RAM","GPU","refresh rate","battery","performance","snapdragon","dimensity"]
- summary: one sentence describing what the user is looking for
- isProductSearch: true if this is a shopping request, false if it's a general question

Respond ONLY with valid JSON matching this exact shape, no markdown, no preamble:
{
  "category": string | null,
  "productTypeKeywords": string[],
  "attributeKeywords": string[],
  "summary": string,
  "isProductSearch": boolean
}`;

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userQuery }],
      }),
    });

    const data = await response.json();
    const raw = data?.content?.[0]?.text ?? "";
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean) as SearchIntent;
    return parsed;
  } catch {
    // Fallback: treat the whole query as a generic keyword search
    return {
      category: null,
      productTypeKeywords: userQuery.trim().split(/\s+/).slice(0, 4),
      attributeKeywords: [],
      summary: userQuery,
      isProductSearch: true,
    };
  }
}

// ─── Phase 2: Fetch candidate products from Supabase ─────────────────────────

async function fetchCandidates(intent: SearchIntent): Promise<ProductWithImages[]> {
  // Build an OR filter across title + description using all productTypeKeywords
  const typeFilters = intent.productTypeKeywords
    .map((kw) => `title.ilike.%${kw}%,description.ilike.%${kw}%`)
    .join(",");

  // Also include attribute keywords in description search
  const attrFilters = intent.attributeKeywords
    .map((kw) => `description.ilike.%${kw}%`)
    .join(",");

  const orFilter = [typeFilters, attrFilters].filter(Boolean).join(",");

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .or(orFilter || `title.ilike.%${intent.summary}%`)
    .order("is_featured", { ascending: false })
    .limit(30); // Fetch generously; scoring will cut this down

  if (error || !data) return [];
  return data as unknown as ProductWithImages[];
}

// ─── Phase 3: Score & filter candidates ──────────────────────────────────────

function scoreProduct(product: ProductWithImages, intent: SearchIntent): number {
  let score = 0;

  const title = (product.title ?? "").toLowerCase();
  const desc = (product.description ?? "").toLowerCase();
  const categoryName = (
    (product.categories as { name?: string } | null)?.name ?? ""
  ).toLowerCase();
  const categorySlug = (
    (product.categories as { slug?: string } | null)?.slug ?? ""
  ).toLowerCase();
  const fullText = `${title} ${desc} ${categoryName} ${categorySlug}`;

  // ── Category match (most important — strict gating) ──────────────────────
  if (intent.category) {
    const intentCat = intent.category.toLowerCase();

    // Direct category name/slug match → strong signal
    if (
      categoryName.includes(intentCat) ||
      categorySlug.includes(intentCat) ||
      intentCat.includes(categoryName) ||
      intentCat.includes(categorySlug)
    ) {
      score += 50;
    }

    // Semantic category synonyms map — keeps "headphones" out of "phones" results
    const CATEGORY_SYNONYMS: Record<string, string[]> = {
      smartphones:   ["phone","mobile","smartphone","android","iphone","5g"],
      laptops:       ["laptop","notebook","ultrabook","macbook","chromebook"],
      headphones:    ["headphone","earphone","earbud","audio","headset","speaker"],
      televisions:   ["tv","television","oled","qled","smart tv","4k tv"],
      tablets:       ["tablet","ipad","android tablet"],
      cameras:       ["camera","dslr","mirrorless","lens","photography"],
      footwear:      ["shoe","sneaker","boot","sandal","trainer","slipper"],
      clothing:      ["shirt","trouser","dress","jacket","hoodie","jeans"],
      appliances:    ["fridge","washing machine","microwave","blender","oven"],
      gaming:        ["console","playstation","xbox","nintendo","controller"],
      furniture:     ["chair","table","desk","sofa","bed","shelf"],
      watches:       ["watch","smartwatch","timepiece","wristwatch"],
    };

    const synonyms = CATEGORY_SYNONYMS[intentCat] ?? [];
    const matchedSynonyms = synonyms.filter(
      (s) => fullText.includes(s) || categoryName.includes(s)
    );
    score += matchedSynonyms.length * 15;

    // Hard penalty: if intent is "smartphones" but category is "headphones" or "audio"
    const CONFLICTING: Record<string, string[]> = {
      smartphones: ["headphone","earphone","audio","speaker","headset","accessory"],
      headphones:  ["phone","smartphone","mobile","tablet"],
      laptops:     ["phone","tablet","camera"],
      televisions: ["phone","laptop","headphone"],
    };
    const conflicts = CONFLICTING[intentCat] ?? [];
    const hasConflict = conflicts.some(
      (c) => categoryName.includes(c) || title.includes(c)
    );
    if (hasConflict) score -= 60; // Makes it rank at the bottom or be filtered
  }

  // ── Product type keyword match ─────────────────────────────────────────────
  for (const kw of intent.productTypeKeywords) {
    const k = kw.toLowerCase();
    if (title.includes(k))    score += 20;
    if (desc.includes(k))     score += 8;
    if (categoryName.includes(k)) score += 12;
  }

  // ── Attribute / use-case keyword match ────────────────────────────────────
  for (const attr of intent.attributeKeywords) {
    const a = attr.toLowerCase();
    if (title.includes(a)) score += 10;
    if (desc.includes(a))  score += 6;
  }

  // ── Featured bonus ─────────────────────────────────────────────────────────
  if (product.is_featured) score += 5;

  return score;
}

function buildReason(product: ProductWithImages, intent: SearchIntent): string {
  const title = product.title ?? "";
  const desc = product.description ?? "";
  const categoryName =
    (product.categories as { name?: string } | null)?.name ?? "";

  // Find which attribute keywords are present in this product's description
  const matchedAttrs = intent.attributeKeywords.filter((attr) =>
    desc.toLowerCase().includes(attr.toLowerCase()) ||
    title.toLowerCase().includes(attr.toLowerCase())
  );

  if (matchedAttrs.length > 0) {
    return `Matches your request — found in ${categoryName || "this category"} with relevant specs: ${matchedAttrs.slice(0, 3).join(", ")}.`;
  }
  if (categoryName) {
    return `Listed under ${categoryName}, which matches what you're looking for.`;
  }
  return `This product fits the profile of what you searched for.`;
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function aiSearch(userQuery: string): Promise<AISearchResult> {
  // Phase 1: understand what the user wants
  const intent = await extractIntent(userQuery);

  if (!intent.isProductSearch) {
    return {
      intent,
      results: [],
      message: "I can help you find products. Try something like 'phones good for gaming' or 'lightweight laptop for students'.",
    };
  }

  // Phase 2: fetch broad candidate set from Supabase
  const candidates = await fetchCandidates(intent);

  if (candidates.length === 0) {
    return {
      intent,
      results: [],
      message: `I couldn't find any products matching "${intent.summary}". The store may not carry this yet.`,
    };
  }

  // Phase 3: score, filter negatives, sort, cap at 6
  const scored: ScoredProduct[] = candidates
    .map((p) => ({
      product: p,
      score: scoreProduct(p, intent),
      reason: "",
    }))
    .filter((s) => s.score > 0) // remove hard-conflicting products
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => ({
      ...s,
      reason: buildReason(s.product, intent),
    }));

  const count = scored.length;
  const message =
    count > 0
      ? `Found ${count} product${count !== 1 ? "s" : ""} matching "${intent.summary}".`
      : `No products closely matched "${intent.summary}". Try a broader search.`;

  return { intent, results: scored, message };
}
