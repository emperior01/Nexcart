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
  comparison?: { a: AiProductResult; b: AiProductResult };
  loading?: boolean;
}

export interface SearchIntent {
  keywords: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
}

export interface AiProvider {
  parseIntent(userMessage: string): Promise<SearchIntent>;
  generateReply(userMessage: string, products: AiProductResult[]): Promise<string>;
}
