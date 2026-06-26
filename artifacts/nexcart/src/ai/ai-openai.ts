import type { AiProvider, AiProductResult, SearchIntent } from "./ai-types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) throw new Error("No OpenAI key");
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      max_tokens: 300,
      temperature: 0,
      messages,
    }),
  });
  if (!res.ok) throw new Error("OpenAI error: " + res.status);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

const INTENT_SYSTEM = [
  "You are a product search intent extractor for Nexcart, a Nigerian ecommerce marketplace.",
  "Extract the user shopping intent and return ONLY valid JSON with no markdown or explanation.",
  "JSON shape: {",
  "  \"keywords\": string,",
  "  \"productType\": string,",
  "  \"excludeTypes\": string[],",
  "  \"maxPrice\": number | null,",
  "  \"minPrice\": number | null,",
  "  \"useCase\": string | null,",
  "  \"brand\": string | null",
  "}",
  "productType must be one of: smartphone laptop tablet headphone earphone television camera shoe shirt trouser dress bag watch accessories appliance other",
  "excludeTypes: types that must NOT appear. Example: smartphone excludes headphone earphone",
  "price: 300k=300000 2m=2000000 2million=2000000",
  "Examples:",
  "phones good for gaming -> {keywords:phone,productType:smartphone,excludeTypes:[headphone,earphone],useCase:gaming}",
  "Samsung S26 -> {keywords:Samsung S26,productType:smartphone,brand:Samsung}",
  "laptop for programming under 500k -> {keywords:laptop,productType:laptop,maxPrice:500000,useCase:programming}",
  "wireless headphones -> {keywords:headphone,productType:headphone,excludeTypes:[smartphone,laptop]}"
].join(" ");

export const openAiProvider: AiProvider = {
  async parseIntent(userMessage: string): Promise<SearchIntent> {
    try {
      const raw = await callOpenAI([
        { role: "system", content: INTENT_SYSTEM },
        { role: "user", content: userMessage },
      ]);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as Partial<SearchIntent>;
      return {
        keywords: parsed.keywords ?? userMessage,
        productType: parsed.productType ?? "other",
        excludeTypes: parsed.excludeTypes ?? [],
        maxPrice: parsed.maxPrice ?? undefined,
        minPrice: parsed.minPrice ?? undefined,
        useCase: parsed.useCase ?? undefined,
        brand: parsed.brand ?? undefined,
      };
    } catch {
      return { keywords: userMessage, productType: "other", excludeTypes: [] };
    }
  },

  async generateReply(userMessage: string, products: AiProductResult[], intent: SearchIntent): Promise<string> {
    const system = "You are Nexcart AI, a friendly shopping assistant for a Nigerian ecommerce marketplace. Write 1-2 sentences maximum. No markdown. If products found explain briefly why they match. If no products suggest alternatives.";
    const found = products.length > 0
      ? "Found " + products.length + " products: " + products.map(function(p) { return p.title; }).join(", ")
      : "No matching products found.";
    const ctx = "User: " + userMessage + ". Intent: " + intent.productType + (intent.useCase ? " for " + intent.useCase : "") + (intent.maxPrice ? " budget " + intent.maxPrice : "") + ". " + found;
    try {
      return await callOpenAI([
        { role: "system", content: system },
        { role: "user", content: ctx },
      ]);
    } catch {
      if (products.length > 0) {
        return "Found " + products.length + " product" + (products.length > 1 ? "s" : "") + " matching your request. Tap any card to view or add to cart.";
      }
      return "I could not find an exact match. Try a different keyword or browse the shop.";
    }
  },
};
