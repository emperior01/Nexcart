export interface AiProductResult {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  image: string | null;
  category: string | null;
  description: string | null;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  products?: AiProductResult[];
  loading?: boolean;
  comparison?: { a: AiProductResult; b: AiProductResult };
}

export interface SearchIntent {
  keywords: string;        // clean search terms for DB query
  productType: string;     // exact product type: smartphone, laptop, headphone, shoe, etc.
  excludeTypes: string[];  // product types to never return
  maxPrice?: number;
  minPrice?: number;
  useCase?: string;        // gaming, work, travel, photography, etc.
  brand?: string;          // Samsung, Apple, HP, etc.
}

export interface AiProvider {
  parseIntent(userMessage: string): Promise<SearchIntent>;
  generateReply(userMessage: string, products: AiProductResult[], intent: SearchIntent): Promise<string>;
}
