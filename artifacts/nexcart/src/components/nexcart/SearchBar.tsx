/**
 * src/components/nexcart/SearchBar.tsx
 *
 * Normal ecommerce search bar.
 * Navigates to the shop page with the search query.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

export function SearchBar() {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const [query, setQuery] = useState(() => new URLSearchParams(searchStr).get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
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
