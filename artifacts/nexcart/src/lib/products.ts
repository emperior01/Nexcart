import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
  categories: Pick<Category, "id" | "name" | "slug"> | null;
}

/** All major world currencies with symbols */
export const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { symbol: "R", name: "South African Rand" },
  EGP: { symbol: "E£", name: "Egyptian Pound" },
  MAD: { symbol: "MAD", name: "Moroccan Dirham" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling" },
  UGX: { symbol: "USh", name: "Ugandan Shilling" },
  XOF: { symbol: "CFA", name: "West African CFA" },
  ETB: { symbol: "Br", name: "Ethiopian Birr" },
  CAD: { symbol: "CA$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  MXN: { symbol: "MX$", name: "Mexican Peso" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  SEK: { symbol: "kr", name: "Swedish Krona" },
  NOK: { symbol: "kr", name: "Norwegian Krone" },
  DKK: { symbol: "kr", name: "Danish Krone" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
  ZMW: { symbol: "ZK", name: "Zambian Kwacha" },
  RWF: { symbol: "RF", name: "Rwandan Franc" },
};

/**
 * Exchange rates relative to USD (approximate).
 * In production you'd fetch live rates from an API.
 */
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  GHS: 15.5,
  KES: 130,
  ZAR: 18.5,
  EGP: 49,
  MAD: 10.1,
  TZS: 2700,
  UGX: 3750,
  XOF: 604,
  ETB: 57,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149,
  CNY: 7.24,
  INR: 83.5,
  BRL: 5.0,
  MXN: 17.2,
  AED: 3.67,
  SAR: 3.75,
  CHF: 0.9,
  SEK: 10.4,
  NOK: 10.6,
  DKK: 6.9,
  SGD: 1.34,
  HKD: 7.82,
  NZD: 1.63,
  ZMW: 27,
  RWF: 1300,
};

/** Convert a price from its source currency to the user's preferred display currency */
export function convertPrice(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string
): number {
  const value = Number(amount);
  if (fromCurrency === toCurrency) return value;
  const fromRate = EXCHANGE_RATES[fromCurrency] ?? 1;
  const toRate = EXCHANGE_RATES[toCurrency] ?? 1;
  return (value / fromRate) * toRate;
}

/** Format a price for display in the user's currency */
export function formatPrice(
  amount: number | string,
  sourceCurrency: string = "USD",
  displayCurrency?: string
): string {
  const target = displayCurrency ?? sourceCurrency;
  const converted = convertPrice(Number(amount), sourceCurrency, target);
  const info = CURRENCIES[target];
  const symbol = info?.symbol ?? target;

  // JPY, KES, UGX, XOF, TZS, RWF — no decimals
  const noDecimals = ["JPY", "KES", "UGX", "XOF", "TZS", "RWF", "ETB"].includes(target);
  const formatted = noDecimals
    ? Math.round(converted).toLocaleString()
    : converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${symbol}${formatted}`;
}

/** Get the primary image URL for a product */
export function primaryImage(product: ProductWithImages): string | null {
  if (!product.product_images?.length) return null;
  const primary = product.product_images.find((img) => img.is_primary);
  const sorted = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return (primary ?? sorted[0])?.url ?? null;
}

/** Get all images sorted */
export function sortedImages(product: ProductWithImages): ProductImage[] {
  return [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
}
