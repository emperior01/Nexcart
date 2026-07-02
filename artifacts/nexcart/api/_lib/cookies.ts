// Minimal cookie parse/serialize helpers. Deliberately dependency-free so
// this doesn't require touching pnpm-workspace catalog versions.

export const SESSION_COOKIE = "nex_session";
export const GUEST_CART_COOKIE = "nex_guest_cart";

export function parseCookies(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

interface CookieOptions {
  maxAgeSeconds?: number; // omit for a session cookie that dies with the browser
  expires?: Date;
  path?: string;
}

// Always HttpOnly + Secure + SameSite=Lax. Lax (not Strict) is required so
// the cookie survives the top-level redirect back from Google OAuth and
// from Paystack's hosted checkout page.
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push("HttpOnly");
  parts.push("Secure");
  parts.push("SameSite=Lax");
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join("; ");
}

export function clearCookie(name: string, path = "/"): string {
  return serializeCookie(name, "", { maxAgeSeconds: 0, path });
}

// Vercel Node functions allow multiple Set-Cookie headers via an array.
export function appendSetCookie(res: { setHeader: (name: string, value: string | string[]) => void; getHeader: (name: string) => string | string[] | number | undefined }, cookie: string) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookie]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), cookie]);
  }
}
