/**
 * currency.ts — Nexcart global currency system
 *
 * Single source of truth for:
 *   - ISO 4217 currency list (code, name, symbol, locale)
 *   - formatMoney() — the ONE function every component uses to display prices
 *
 * Usage:
 *   import { formatMoney } from "@/lib/currency";
 *   formatMoney(10000, "NGN")  →  "₦10,000"
 *   formatMoney(10.5,  "USD")  →  "$10.50"
 *   formatMoney(10,    "GBP")  →  "£10.00"
 *   formatMoney(10,    "EUR")  →  "€10.00"
 *
 * Uses Intl.NumberFormat for correct symbol placement, decimal rules,
 * and thousands separators per locale — no manual symbol concatenation.
 */

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;    // display symbol — for picker UI only
  locale: string;    // BCP 47 locale tag for Intl.NumberFormat
}

// ── ISO 4217 currency list ────────────────────────────────────────────────────
// Covers all major world currencies. Add more entries here as needed.
export const ISO_CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar",            symbol: "$",    locale: "en-US" },
  { code: "EUR", name: "Euro",                 symbol: "€",    locale: "de-DE" },
  { code: "GBP", name: "British Pound",        symbol: "£",    locale: "en-GB" },
  { code: "NGN", name: "Nigerian Naira",       symbol: "₦",    locale: "en-NG" },
  { code: "GHS", name: "Ghanaian Cedi",        symbol: "₵",    locale: "en-GH" },
  { code: "KES", name: "Kenyan Shilling",      symbol: "KSh",  locale: "sw-KE" },
  { code: "ZAR", name: "South African Rand",   symbol: "R",    locale: "en-ZA" },
  { code: "EGP", name: "Egyptian Pound",       symbol: "£",    locale: "ar-EG" },
  { code: "TZS", name: "Tanzanian Shilling",   symbol: "TSh",  locale: "sw-TZ" },
  { code: "UGX", name: "Ugandan Shilling",     symbol: "USh",  locale: "en-UG" },
  { code: "XOF", name: "West African CFA",     symbol: "CFA",  locale: "fr-SN" },
  { code: "CAD", name: "Canadian Dollar",      symbol: "CA$",  locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar",    symbol: "A$",   locale: "en-AU" },
  { code: "JPY", name: "Japanese Yen",         symbol: "¥",    locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan",         symbol: "¥",    locale: "zh-CN" },
  { code: "INR", name: "Indian Rupee",         symbol: "₹",    locale: "en-IN" },
  { code: "BRL", name: "Brazilian Real",       symbol: "R$",   locale: "pt-BR" },
  { code: "MXN", name: "Mexican Peso",         symbol: "$",    locale: "es-MX" },
  { code: "AED", name: "UAE Dirham",           symbol: "د.إ",  locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal",          symbol: "﷼",    locale: "ar-SA" },
  { code: "CHF", name: "Swiss Franc",          symbol: "CHF",  locale: "de-CH" },
  { code: "SEK", name: "Swedish Krona",        symbol: "kr",   locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone",      symbol: "kr",   locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone",         symbol: "kr",   locale: "da-DK" },
  { code: "PLN", name: "Polish Złoty",         symbol: "zł",   locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna",         symbol: "Kč",   locale: "cs-CZ" },
  { code: "HUF", name: "Hungarian Forint",     symbol: "Ft",   locale: "hu-HU" },
  { code: "TRY", name: "Turkish Lira",         symbol: "₺",    locale: "tr-TR" },
  { code: "IDR", name: "Indonesian Rupiah",    symbol: "Rp",   locale: "id-ID" },
  { code: "MYR", name: "Malaysian Ringgit",    symbol: "RM",   locale: "ms-MY" },
  { code: "SGD", name: "Singapore Dollar",     symbol: "S$",   locale: "en-SG" },
  { code: "PHP", name: "Philippine Peso",      symbol: "₱",    locale: "en-PH" },
  { code: "THB", name: "Thai Baht",            symbol: "฿",    locale: "th-TH" },
  { code: "PKR", name: "Pakistani Rupee",      symbol: "₨",    locale: "en-PK" },
  { code: "BDT", name: "Bangladeshi Taka",     symbol: "৳",    locale: "bn-BD" },
  { code: "NZD", name: "New Zealand Dollar",   symbol: "NZ$",  locale: "en-NZ" },
  { code: "HKD", name: "Hong Kong Dollar",     symbol: "HK$",  locale: "en-HK" },
  { code: "KWD", name: "Kuwaiti Dinar",        symbol: "د.ك",  locale: "ar-KW" },
  { code: "QAR", name: "Qatari Riyal",         symbol: "﷼",    locale: "ar-QA" },
  { code: "MAD", name: "Moroccan Dirham",      symbol: "د.م.", locale: "ar-MA" },
];

// Fast lookup map: code → meta
const _map = new Map<string, CurrencyMeta>(ISO_CURRENCIES.map((c) => [c.code, c]));

export function getCurrencyMeta(code: string): CurrencyMeta {
  return _map.get(code) ?? { code, name: code, symbol: code, locale: "en-US" };
}

// ── Formatter cache — avoid re-creating Intl objects on every render ──────────
const _fmtCache = new Map<string, Intl.NumberFormat>();

function getFormatter(code: string): Intl.NumberFormat {
  const key = code;
  if (_fmtCache.has(key)) return _fmtCache.get(key)!;
  const meta = getCurrencyMeta(code);
  const fmt = new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: code,
    // JPY, UGX etc. naturally use 0 decimals via Intl — no manual override needed
  });
  _fmtCache.set(key, fmt);
  return fmt;
}

/**
 * formatMoney — the ONE function all Nexcart components use to display prices.
 *
 * @param amount  Raw number stored in DB (always in the product's native currency)
 * @param code    ISO 4217 currency code, e.g. "NGN", "USD", "GBP"
 * @returns       Formatted string with correct symbol, decimals, and separators
 *
 * Examples:
 *   formatMoney(10000, "NGN") → "₦10,000.00"
 *   formatMoney(10.5,  "USD") → "$10.50"
 *   formatMoney(10,    "GBP") → "£10.00"
 *   formatMoney(1999,  "JPY") → "¥1,999"
 *   formatMoney(10,    "EUR") → "10,00 €"   (correct European format)
 */
export function formatMoney(amount: number, code: string): string {
  try {
    return getFormatter(code).format(amount);
  } catch {
    // Fallback if Intl doesn't know the code
    const meta = getCurrencyMeta(code);
    return `${meta.symbol}${amount.toFixed(2)}`;
  }
}
