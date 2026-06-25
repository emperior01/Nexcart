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

export async function searchProductsByKeyword(keyword: string): Promise<AiProductResult[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), categories(id,name,slug)")
    .eq("is_active", true)
    .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
    .order("is_featured", { ascending: false })
    .limit(6);

  if (error || !data) return [];
  return (data as ProductWithImages[]).map(toAiProduct);
}
