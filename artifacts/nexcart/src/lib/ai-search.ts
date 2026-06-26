/**
 * src/lib/ai-search.ts
 *
 * AI search engine — architecture:
 *
 *   Phase 1  Claude extracts a structured SearchIntent from the user's natural language.
 *            Intent includes: categoryTerms, excludedCategoryTerms, useCaseKeywords, maxPrice.
 *
 *   Phase 2  Two-pass Supabase query:
 *            Pass A — category-first (strict): fetch all active products, filter client-side
 *                     by category name/slug matching any categoryTerm.
 *            Pass B — fallback only if Pass A returns 0 results: title/description search.
 *
 *   Phase 3  Hard exclusion: products whose category name/slug contains any
 *            excludedCategoryTerms are removed entirely — regardless of score.
 *
 *   Phase 4  Relevance scoring on the remaining filtered set.
 *            useCaseKeywords score against title + description only.
 *
 * ── Trace log ──────────────────────────────────────────────────────────────
 * Every step logs to console:
 *   [AI Search] 1. Intent extracted: ...
 *   [AI Search] 2a. Pass A (category-strict): ...
 *   [AI Search] 2a. Pass A returned N candidates
 *   [AI Search] 2b. Pass B (fallback) returned N candidates
 *   [AI Search] 3. After hard exclusion: N remain
 *   [AI Search] 4. Final scored results: [...]
 */

import { supabase } from "@/integrations/supabase/client";
import type { ProductWithImages } from "@/lib/products";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SearchIntent {
  /**
   * Terms matched against the product's CATEGORY name and slug in the DB.
   * e.g. "gaming phone" → ["phone", "mobile", "smartphone", "handset"]
   * e.g. "wireless headphones" → ["headphone", "earphone", "earbud", "audio", "speaker"]
   */
  categoryTerms: string[];

  /**
   * Terms that must NOT appear in a product's category name/slug.
   * Hard-exclusion to prevent cross-category contamination.
   * e.g. phone query → ["headphone", "earphone", "audio", "speaker", "accessory", "cable"]
   */
  excludedCategoryTerms: string[];

  /**
   * Use-case / attribute keywords — used ONLY for scoring, never for DB filtering.
   * e.g. "gaming phone" → ["gaming", "performance", "refresh rate", "GPU", "RAM", "battery"]
   */
  useCaseKeywords: string[];

  /** Price ceiling from query, null if not specified. */
  maxPrice: number | null;

  /** Human-readable summary of the query. */
  summary: string;

  /** true = product search, false = general question */
  isProductSearch: boolean;
}

export interface ScoredProduct {
  product: ProductWithImages;
  score: number;
  reason: string;
}

export interface AISearchResult {
  intent: SearchIntent;
  results: ScoredProduct[];
  message: string;
  trace: string[];
}

// ─── Phase 1: Extract intent via Claude ──────────────────────────────────────

export async function extractIntent(userQuery: string): Promise<SearchIntent> {
  const systemPrompt = `You are a product search intent parser for Nexcart, an e-commerce marketplace.
Parse the user's query and return a JSON object for strict category-based product retrieval.

RULES (follow exactly):

1. categoryTerms — words identifying the product TYPE that should appear in the product's CATEGORY:
   "phone/mobile" → ["phone", "mobile", "smartphone", "handset"]
   "laptop" → ["laptop", "notebook", "computer", "ultrabook"]
   "headphones/earbuds" → ["headphone", "earphone", "earbud", "audio", "speaker", "headset"]
   "TV/television" → ["tv", "television", "display"]
   "shoes/footwear" → ["shoe", "sneaker", "footwear", "trainer", "boot", "sandal"]
   "watch" → ["watch", "smartwatch", "wearable"]
   "tablet" → ["tablet", "ipad"]
   "camera" → ["camera", "dslr", "mirrorless"]

2. excludedCategoryTerms — words that MUST NOT appear in the matched product's category:
   phone query → ["headphone", "earphone", "audio", "speaker", "headset", "accessory", "case", "charger", "cable", "screen protector"]
   laptop query → ["phone", "tablet", "headphone", "speaker", "audio", "accessory"]
   headphones query → ["phone", "smartphone", "laptop", "tablet", "computer"]
   TV query → ["phone", "laptop", "headphone", "audio"]
   If query is broad/generic → []

3. useCaseKeywords — use-case/feature words for scoring only (NOT for DB filtering):
   "gaming phone" → ["gaming", "performance", "refresh rate", "GPU", "processor", "RAM", "battery life"]
   "programming laptop" → ["programming", "developer", "RAM", "SSD", "processor", "battery"]
   "noise cancelling headphones" → ["noise cancelling", "ANC", "wireless", "bluetooth"]
   "cheap phone" → ["budget", "affordable", "value"]

4. maxPrice — number if user specifies ceiling (e.g. "under 200000" → 200000), null otherwise.

5. summary — one sentence what user wants.

6. isProductSearch — true if shopping intent, false if general question.

Return ONLY valid JSON, no markdown:
{
  "categoryTerms": string[],
  "excludedCategoryTerms": string[],
  "useCaseKeywords": string[],
  "maxPrice": number | null,
  "summary": string,
  "isProductSearch": boolean
}`;

  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? "";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        max_tokens: 512,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      }),
    });

    const data = await res.json();
    const raw = (data?.choices?.[0]?.message?.content ?? "").replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(raw) as SearchIntent;

    return {
      categoryTerms:         Array.isArray(parsed.categoryTerms)         ? parsed.categoryTerms         : [],
      excludedCategoryTerms: Array.isArray(parsed.excludedCategoryTerms) ? parsed.excludedCategoryTerms : [],
      useCaseKeywords:       Array.isArray(parsed.useCaseKeywords)       ? parsed.useCaseKeywords       : [],
      maxPrice:              typeof parsed.maxPrice === "number"          ? parsed.maxPrice              : null,
      summary:               typeof parsed.summary === "string"          ? parsed.summary               : userQuery,
      isProductSearch:       parsed.isProductSearch !== false,
    };
  } catch (err) {
    console.warn("[AI Search] Intent extraction failed, using fallback:", err);
    return {
      categoryTerms:         userQuery.trim().split(/\s+/).slice(0, 3),
      excludedCategoryTerms: [],
      useCaseKeywords:       [],
      maxPrice:              null,
      summary:               userQuery,
      isProductSearch:       true,
    };
  }
}

// ─── Word-boundary helper ─────────────────────────────────────────────────────
// Prevents "phone" matching inside "headphone" or "earphone".

function matchesWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text);
}

// ─── Phase 2a: Category-first fetch (strict) ─────────────────────────────────

async function fetchPassA(intent: SearchIntent): Promise<ProductWithImages[]> {
  // Fetch active products with their categories, apply price filter if present.
  // Category filtering is done client-side because PostgREST .or() cannot
  // directly filter on a joined table's column in a single call.
  const query = supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .limit(200);

  const { data, error } = intent.maxPrice
    ? await query.lte("price", intent.maxPrice)
    : await query;

  if (error || !data) return [];

  const all = data as unknown as ProductWithImages[];

  // Use word-boundary matching — "phone" must not match "headphone"
  return all.filter((p) => {
    const catName = ((p.categories as { name?: string } | null)?.name ?? "").toLowerCase();
    const catSlug = ((p.categories as { slug?: string } | null)?.slug ?? "").toLowerCase();
    return intent.categoryTerms.some((term) =>
      matchesWord(catName, term.toLowerCase()) || matchesWord(catSlug, term.toLowerCase())
    );
  });
}

// ─── Phase 2b: Fallback — title/description word-boundary search ──────────────

async function fetchPassB(intent: SearchIntent): Promise<ProductWithImages[]> {
  if (!intent.categoryTerms.length) return [];

  // Use Postgres \y word-boundary markers — prevents "phone" matching "headphone"
  const orFilter = intent.categoryTerms
    .map((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pat = `\\\\y${escaped}\\\\y`;
      return `title.~*.${pat},description.~*.${pat}`;
    })
    .join(",");

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .or(orFilter)
    .order("is_featured", { ascending: false })
    .limit(30);

  if (error || !data) return [];
  return data as unknown as ProductWithImages[];
}

// ─── Phase 3: Hard category exclusion ────────────────────────────────────────

function hardExclude(products: ProductWithImages[], excluded: string[]): ProductWithImages[] {
  if (!excluded.length) return products;
  return products.filter((p) => {
    const catName = ((p.categories as { name?: string } | null)?.name ?? "").toLowerCase();
    const catSlug = ((p.categories as { slug?: string } | null)?.slug ?? "").toLowerCase();
    // Word-boundary: excluded term "phone" must not fire inside "headphone"
    return !excluded.some((term) =>
      matchesWord(catName, term.toLowerCase()) || matchesWord(catSlug, term.toLowerCase())
    );
  });
}

// ─── Phase 4: Relevance scoring ───────────────────────────────────────────────

function scoreProduct(p: ProductWithImages, intent: SearchIntent): number {
  let score = 10; // base for passing category filter

  const title   = (p.title ?? "").toLowerCase();
  const desc    = (p.description ?? "").toLowerCase();
  const catName = ((p.categories as { name?: string } | null)?.name ?? "").toLowerCase();
  const catSlug = ((p.categories as { slug?: string } | null)?.slug ?? "").toLowerCase();

  // Category match bonus — word-boundary only
  for (const term of intent.categoryTerms.map((t) => t.toLowerCase())) {
    if (matchesWord(catName, term) || matchesWord(catSlug, term)) score += 20;
    if (matchesWord(title, term))                                  score += 8;
  }

  // Use-case keyword scoring — description + title (these are non-product-type words like "gaming", "wireless")
  for (const kw of intent.useCaseKeywords.map((t) => t.toLowerCase())) {
    if (title.includes(kw)) score += 15;
    if (desc.includes(kw))  score += 8;
  }

  if (p.is_featured) score += 5;

  return score;
}

function buildReason(p: ProductWithImages, intent: SearchIntent): string {
  const title   = p.title ?? "";
  const desc    = (p.description ?? "").toLowerCase();
  const catName = (p.categories as { name?: string } | null)?.name ?? "";

  const matched = intent.useCaseKeywords.filter(
    (kw) => desc.includes(kw.toLowerCase()) || title.toLowerCase().includes(kw.toLowerCase())
  );

  if (matched.length > 0) {
    return `Found in ${catName || "this category"} — matches: ${matched.slice(0, 3).join(", ")}.`;
  }
  if (catName) {
    return `Listed under ${catName}, which matches your request.`;
  }
  return "This product fits your search criteria.";
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function aiSearch(userQuery: string): Promise<AISearchResult> {
  const trace: string[] = [];

  // Phase 1
  const intent = await extractIntent(userQuery);
  trace.push(`1. Intent: ${JSON.stringify(intent)}`);
  console.log("[AI Search] 1. Intent extracted:", intent);

  if (!intent.isProductSearch) {
    return {
      intent, results: [], trace,
      message: "I can help you find products. Try: 'phones good for gaming', 'laptop for programming', 'wireless headphones'.",
    };
  }

  // Handle broad single-word category queries — ask for clarification
  const isBroad = intent.categoryTerms.length <= 2 && intent.useCaseKeywords.length === 0 && intent.maxPrice === null;
  const broadCategoryMap: Record<string, string> = {
    electronic: "electronics. Are you looking for phones, laptops, TVs, or audio?",
    electronics: "electronics. Are you looking for phones, laptops, TVs, or audio?",
    phone: "phones. Are you looking for a gaming phone, camera phone, or budget phone?",
    laptop: "laptops. Are you looking for a programming laptop, gaming laptop, or everyday use?",
    fashion: "fashion. Are you looking for shirts, shoes, dresses, or accessories?",
    shoe: "shoes. Are you looking for sneakers, formal shoes, or sandals?",
    shoes: "shoes. Are you looking for sneakers, formal shoes, or sandals?",
    watch: "watches. Are you looking for a smartwatch or a classic watch?",
    tv: "TVs. Are you looking for a smart TV, 4K TV, or a specific size?",
    headphone: "headphones. Are you looking for wireless, noise-cancelling, or wired headphones?",
    headphones: "headphones. Are you looking for wireless, noise-cancelling, or wired headphones?",
  };
  if (isBroad) {
    const lowerSummary = intent.summary.toLowerCase().trim();
    for (const [key, clarification] of Object.entries(broadCategoryMap)) {
      if (lowerSummary === key || lowerSummary.includes(key)) {
        return {
          intent, results: [], trace,
          message: "I can help you find " + clarification,
        };
      }
    }
  }

  // Phase 2a
  const passALabel = `2a. Pass A — categoryTerms: ${JSON.stringify(intent.categoryTerms)}`;
  trace.push(passALabel);
  console.log("[AI Search]", passALabel);

  let candidates = await fetchPassA(intent);
  trace.push(`2a. Pass A returned ${candidates.length} candidates`);
  console.log(`[AI Search] 2a. Pass A returned ${candidates.length} candidates`);

  // Phase 2b (fallback)
  if (candidates.length === 0) {
    trace.push("2b. Pass A empty — running Pass B (title/description fallback)");
    console.log("[AI Search] 2b. Running Pass B fallback");
    candidates = await fetchPassB(intent);
    trace.push(`2b. Pass B returned ${candidates.length} candidates`);
    console.log(`[AI Search] 2b. Pass B returned ${candidates.length} candidates`);
  }

  if (candidates.length === 0) {
    return {
      intent, results: [], trace,
      message: `No products found for "${intent.summary}". The store may not carry this yet.`,
    };
  }

  // Phase 3
  const afterExclusion = hardExclude(candidates, intent.excludedCategoryTerms);
  const removed = candidates
    .filter((p) => !afterExclusion.includes(p))
    .map((p) => `"${p.title}" (cat: ${(p.categories as { name?: string } | null)?.name ?? "none"})`);
  trace.push(`3. After hard exclusion: ${afterExclusion.length} remain. Removed: [${removed.join(", ")}]`);
  console.log(
    `[AI Search] 3. After hard exclusion: ${afterExclusion.length} remain.`,
    "\n  Excluded terms:", intent.excludedCategoryTerms,
    "\n  Removed:", removed
  );

  // Phase 4
  const scored: ScoredProduct[] = afterExclusion
    .map((p) => ({ product: p, score: scoreProduct(p, intent), reason: "" }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => ({ ...s, reason: buildReason(s.product, intent) }));

  const scoreLog = scored.map((s) => ({
    title: s.product.title,
    category: (s.product.categories as { name?: string } | null)?.name ?? "?",
    score: s.score,
  }));
  trace.push(`4. Final results: ${JSON.stringify(scoreLog)}`);
  console.log("[AI Search] 4. Final results:", scoreLog);

  const count = scored.length;
  const message = count > 0
    ? `Found ${count} product${count !== 1 ? "s" : ""} matching "${intent.summary}".`
    : `No products closely matched "${intent.summary}". Try a broader search.`;

  return { intent, results: scored, message, trace };
}
