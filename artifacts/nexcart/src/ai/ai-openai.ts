import type { AiProvider, AiProductResult, SearchIntent } from "./ai-types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-3.5-turbo";

function getKey(): string {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!key) throw new Error("VITE_OPENAI_API_KEY is not set");
  return key;
}

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

export const openAiProvider: AiProvider = {
  async parseIntent(userMessage: string): Promise<SearchIntent> {
    const systemPrompt = `You are a shopping assistant for Nexcart marketplace.
Extract the product search intent from the user message.
Respond ONLY with valid JSON no markdown no explanation.
JSON shape: { "keywords": string, "maxPrice": number|null, "minPrice": number|null, "category": string|null }`;

    const raw = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ]);

    try {
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
    const systemPrompt = `You are Nexcart AI, a helpful shopping assistant.
Be friendly and concise. Keep replies under 3 sentences.
If products were found, briefly describe what you found.
If no products were found, suggest broadening the search.`;

    const productSummary =
      products.length > 0
        ? `Found ${products.length} product(s): ${products.map((p) => p.title).join(", ")}`
        : "No products found matching the request.";

    return callOpenAI([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `User said: "${userMessage}"
Search result: ${productSummary}
Write a short helpful reply.`,
      },
    ]);
  },
};
