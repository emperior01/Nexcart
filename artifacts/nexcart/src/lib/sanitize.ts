// Shared sanitization helpers for direct-to-Supabase form writes. These
// exist as defense-in-depth: RLS controls WHO can write, these control
// WHAT gets written — trimming, capping length, stripping invisible/control
// characters, and clamping numbers to sane bounds, regardless of what a
// browser devtools console or a modified request might otherwise send.

// Strips control characters and zero-width/invisible Unicode characters
// (commonly used to hide content or break layout/parsing), collapses all
// whitespace to single spaces, trims, and caps length.
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// Same idea as sanitizeText, but preserves single newlines for multi-line
// content (descriptions, addresses) while still collapsing runs of 3+
// blank lines and stripping control characters other than \n.
export function sanitizeMultiline(input: string, maxLength = 5000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase().slice(0, 254);
}

// Keeps digits, spaces, +, -, (, ) — permissive enough for international
// formats without allowing arbitrary text into a phone field.
export function sanitizePhone(input: string): string {
  return input.replace(/[^\d+\-() ]/g, "").trim().slice(0, 30);
}

// Clamps a number into [min, max]; falls back to `fallback` (default: min)
// on anything non-finite (NaN, Infinity, garbage strings).
export function sanitizeNumber(input: number | string, min: number, max: number, fallback = min): number {
  const n = typeof input === "number" ? input : parseFloat(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeInteger(input: number | string, min: number, max: number, fallback = min): number {
  return Math.round(sanitizeNumber(input, min, max, fallback));
}

// Only accepts http(s) URLs — rejects javascript:, data:, and anything
// else that could be used for a stored-link-based attack. Returns null
// for anything invalid so callers can decide to omit the field instead of
// silently storing a malformed value.
export function sanitizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Conservative slug: lowercase letters, numbers, and hyphens only.
export function sanitizeSlug(input: string, maxLength = 200): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength);
}
