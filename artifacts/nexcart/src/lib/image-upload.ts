import { supabase } from "@/integrations/supabase/client";

/**
 * Shared image-handling logic for Nexcart. Used by every place in the app
 * that lets someone provide a product/hero image — admin products, seller
 * products, and homepage hero settings. Keeping this in one place means a
 * fix here (e.g. better URL validation) applies everywhere at once, instead
 * of needing to be repeated per-page.
 */

const STORAGE_BUCKET = "product-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Uploads a file to Supabase storage under the given folder prefix and
 * returns its public URL. `folder` keeps each context's existing path
 * convention (e.g. "admin", "sellers/<id>", "hero") so already-uploaded
 * images and any code that lists by prefix keep working unchanged.
 */
export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be under 5 MB.");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export type ImageUrlCheckResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Known image-provider PAGE domains (not their CDN domains) that we can
 * recognize and give specific, accurate copy-paste instructions for. This
 * is NOT automatic conversion — there's no reliable way to derive a site's
 * real CDN image URL from its page URL without that site's API or a
 * server-side fetch of the page (which this app doesn't have). What we CAN
 * do reliably is recognize "this is an Unsplash/Pexels/etc. page link" and
 * tell the person exactly how to grab the real image URL themselves.
 */
const KNOWN_IMAGE_PROVIDER_PAGES: { match: RegExp; name: string; instructions: string }[] = [
  {
    match: /(^|\.)unsplash\.com$/i,
    name: "Unsplash",
    instructions:
      "That's an Unsplash page link, not the image file itself. Open the photo on Unsplash, right-click the photo (not the page) and choose \"Copy image address\", then paste that here.",
  },
  {
    match: /(^|\.)pexels\.com$/i,
    name: "Pexels",
    instructions:
      "That's a Pexels page link, not the image file itself. Open the photo on Pexels, right-click the photo and choose \"Copy image address\", then paste that here.",
  },
  {
    match: /(^|\.)pixabay\.com$/i,
    name: "Pixabay",
    instructions:
      "That's a Pixabay page link, not the image file itself. Open the photo on Pixabay, right-click the image and choose \"Copy image address\", then paste that here.",
  },
  {
    match: /(^|\.)google\.[a-z.]+$/i,
    name: "Google Images",
    instructions:
      "That looks like a Google Images / Google search link, not a direct image file. Open the image in a new tab first, then right-click it and choose \"Copy image address\".",
  },
  {
    match: /(^|\.)freepik\.com$/i,
    name: "Freepik",
    instructions:
      "That's a Freepik page link, not the image file itself. Freepik images usually require a download/license step before you get a direct file link.",
  },
];

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Attempts to actually load `url` as an image in the browser. This is real
 * validation, not a guess based on file extension — it works the same way
 * whether the URL ends in .jpg or has no extension at all (common with CDN
 * links), and correctly fails for HTML pages even if they return a 200
 * status, since the bytes simply won't decode as an image.
 */
function tryLoadImage(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => { clearTimeout(timeout); resolve(true); };
    img.onerror = () => { clearTimeout(timeout); resolve(false); };
    img.src = url;
  });
}

/**
 * Validates a pasted image URL. Returns the URL back if it genuinely loads
 * as an image. Otherwise returns a clear, specific error — naming the known
 * provider and how to get the real link when we recognize the site, or a
 * general explanation otherwise.
 */
export async function resolveImageUrl(rawUrl: string): Promise<ImageUrlCheckResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, message: "Enter an image URL." };
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, message: "Enter a valid URL starting with http." };
  }

  const loads = await tryLoadImage(trimmed);
  if (loads) return { ok: true, url: trimmed };

  const hostname = getHostname(trimmed);
  const known = hostname
    ? KNOWN_IMAGE_PROVIDER_PAGES.find((p) => p.match.test(hostname))
    : null;

  if (known) {
    return { ok: false, message: known.instructions };
  }

  return {
    ok: false,
    message:
      "Please paste a direct image URL — not a webpage link. Open the image itself, right-click it, and choose \"Copy image address\".",
  };
}
