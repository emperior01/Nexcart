/**
 * src/components/nexcart/SearchBar.tsx
 *
 * Normal ecommerce search bar.
 * Navigates to the shop page with the search query.
 */

import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, X, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SearchBar() {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [query, setQuery] = useState(() => new URLSearchParams(searchStr).get("q") ?? "");
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keep this box in sync with the URL — otherwise it shows empty on the
  // Shop page even when a search is already active (the Shop page's own
  // filter box read the URL correctly; this one didn't).
  useEffect(() => {
    setQuery(new URLSearchParams(searchStr).get("q") ?? "");
  }, [searchStr]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      void navigate({ to: "/shop", search: { q: query.trim() } });
    }
  }, [query, navigate]);

  const handleImagePicked = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow picking the same file again later
      if (!file) return;

      setImageSearchLoading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] ?? "");
          };
          reader.onerror = () => reject(new Error("Could not read image"));
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke("image-to-query", {
          body: { imageBase64: base64, mimeType: file.type || "image/jpeg" },
        });

        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return;
        }
        if (data?.query) {
          void navigate({ to: "/shop", search: { q: data.query } });
        }
      } catch (err) {
        console.error("[SearchBar] image search failed:", err);
        toast.error("Couldn't search with that photo. Please try again.");
      } finally {
        setImageSearchLoading(false);
      }
    },
    [navigate]
  );

  return (
    <div className="w-full relative">
      <div
        className="flex items-center rounded-full transition-all duration-200"
        style={{
          background: "#FFFFFF",
          border: "1.5px solid #E8E8E8",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          height: 46,
        }}
      >
        <span
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 46, color: "#9B9B9B" }}
        >
          <Search style={{ width: 17, height: 17 }} strokeWidth={1.8} />
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Search products, categories, brands..."
          className="flex-1 bg-transparent outline-none text-sm font-medium text-[#1A1A1A] placeholder-[#AAAAAA] min-w-0"
          style={{ fontSize: 14 }}
          autoComplete="off"
          spellCheck={false}
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImagePicked}
          style={{ display: "none" }}
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="flex items-center justify-center flex-shrink-0 rounded-full transition-colors hover:bg-[#F4F4F4]"
            style={{ width: 28, height: 28, marginRight: 6, color: "#9B9B9B" }}
            aria-label="Clear"
          >
            <X style={{ width: 14, height: 14 }} strokeWidth={2.5} />
          </button>
        )}

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={imageSearchLoading}
          className="flex items-center justify-center flex-shrink-0 rounded-full transition-colors hover:bg-[#F4F4F4]"
          style={{ width: 32, height: 32, marginRight: 4, color: "#9B9B9B" }}
          aria-label="Search by photo"
        >
          {imageSearchLoading ? (
            <Loader2 style={{ width: 16, height: 16 }} strokeWidth={2} className="animate-spin" />
          ) : (
            <Camera style={{ width: 17, height: 17 }} strokeWidth={1.8} />
          )}
        </button>

        <button
          onClick={handleSubmit}
          className="flex items-center justify-center flex-shrink-0 rounded-full font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#E8611A,#C4511A)",
            width: 36, height: 36, marginRight: 5,
          }}
          aria-label="Search"
        >
          <Search style={{ width: 16, height: 16 }} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
