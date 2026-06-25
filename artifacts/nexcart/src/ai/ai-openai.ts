import type { AiProvider, AiProductResult, SearchIntent } from "./ai-types";

// Uses Anthropic claude-sonnet-4-6 via the proxy available in this environment
const AI_URL = "https://api.anthropic.com/v1/messages";

async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error("AI API error: " + res.status);
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  return data.content.find(b => b.type === "text")?.text?.trim() ?? "";
}

export const openAiProvider: AiProvider = {
  async parseIntent(userMessage: string): Promise<SearchIntent> {
    const system = `You are a shopping assistant for Nexcart marketplace.
Analyze the user shopping request and extract structured search intent.
Respond ONLY with valid JSON, no markdown, no explanation.
JSON shape:
{
  "keywords": "the best search terms to find this product in a database (brand, model, product type)",
  "maxPrice": number or null,
  "minPrice": number or null,
  "category": "one of: phones, laptops, tablets, headphones, fashion, shoes, accessories, electronics or null"
}

Rules:
- For "gaming phone" use keywords: "smartphone" or "phone"  
- For "work laptop" use keywords: "laptop"
- For "portable device" extract the likely product type
- For "Samsung S26" use keywords: "Samsung S26"
- For price: "2 million" = 2000000, "300k" = 300000, "2m" = 2000000
- Return the most searchable keywords, not the full sentence`;

    try {
      const raw = await callAI(system, userMessage);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as Partial<SearchIntent>;
      return {
        keywords: parsed.keywords ?? userMessage,
        maxPrice: parsed.maxPrice ?? undefined,
        minPrice: parsed.minPrice ?? undefined,
        category: parsed.category ?? undefined,
      };
    } catch {
      return { keywords: userMessage };
    }
  },

  async generateReply(userMessage: string, products: AiProductResult[]): Promise<string> {
    const system = `You are Nexcart AI, a helpful shopping assistant for Nexcart marketplace in Nigeria.
Be friendly, concise, and helpful. Maximum 2-3 sentences.
If products found: briefly explain why they match and invite exploration.
If no products: empathize and suggest alternative search terms.
Do not list prices. Do not use markdown.`;

    const productSummary = products.length > 0
      ? `Found ${products.length} product(s): ${products.map(p => p.title + " (" + (p.category ?? "general") + ")").join(", ")}`
      : "No matching products found in the database.";

    try {
      return await callAI(system, `User request: "${userMessage}"
Search result: ${productSummary}
Write a short helpful reply.`);
    } catch {
      return products.length > 0
        ? `Found ${products.length} product${products.length > 1 ? "s" : ""} that match your request. Tap any card to view or add to cart.`
        : "I could not find an exact match. Try a broader search term or browse the shop.";
    }
  },
};
