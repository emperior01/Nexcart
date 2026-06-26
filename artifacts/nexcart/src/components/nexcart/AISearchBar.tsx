/**
 * src/components/nexcart/AISearchBar.tsx
 *
 * AI shopping assistant bar.
 * Opens a floating panel with intent chips, product results, and match reasons.
 * In development, shows a collapsible trace log for debugging.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, X, Loader2, Sparkles, PackageSearch, Send, ArrowRight, ChevronRight, ChevronDown,
} from "lucide-react";
import { aiSearch } from "@/lib/ai-search";
import type { AISearchResult, ScoredProduct } from "@/lib/ai-search";
import { primaryImage, formatPrice } from "@/lib/products";
import { useCurrency } from "@/contexts/CurrencyContext";

const IS_DEV = import.meta.env.DEV;

// ─── Suggestion chips ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Phones good for gaming",
  "Laptop for programming",
  "Wireless headphones with noise cancellation",
  "Smart TV under 500",
  "Running shoes for men",
];

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  scored,
  onNavigate,
  displayCurrency,
}: {
  scored: ScoredProduct;
  onNavigate: () => void;
  displayCurrency: string;
}) {
  const { product, reason } = scored;
  const imgUrl = primaryImage(product);
  const catName = (product.categories as { name?: string } | null)?.name;

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      onClick={onNavigate}
      style={{ textDecoration: "none" }}
      className="flex gap-3 p-3 rounded-xl transition-colors hover:bg-[#FEF9F6] group"
    >
      <div
        className="flex-shrink-0 rounded-lg overflow-hidden bg-[#F4F4F4] flex items-center justify-center"
        style={{ width: 64, height: 64 }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.title}
            style={{ width: 64, height: 64, objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <PackageSearch style={{ width: 24, height: 24, color: "#CCC" }} strokeWidth={1.5} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-[13px] font-semibold leading-snug truncate group-hover:text-[#E8611A] transition-colors"
            style={{ color: "#1A1A1A" }}
          >
            {product.title}
          </p>
          <span className="flex-shrink-0 text-[13px] font-bold" style={{ color: "#E8611A" }}>
            {formatPrice(product.price, product.currency, displayCurrency)}
          </span>
        </div>
        {catName && (
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
            style={{ background: "#FEF0E8", color: "#E8611A" }}
          >
            {catName}
          </span>
        )}
        <p className="text-[11px] text-[#888] mt-1.5 leading-snug line-clamp-2">{reason}</p>
      </div>

      <ChevronRight
        className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 14, height: 14, color: "#E8611A" }}
      />
    </Link>
  );
}

// ─── Dev trace panel ─────────────────────────────────────────────────────────

function TracePanel({ trace }: { trace: string[] }) {
  const [open, setOpen] = useState(false);
  if (!IS_DEV || !trace.length) return null;
  return (
    <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-[#E8611A]/30" style={{ background: "#FFF8F5" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-[#E8611A]"
      >
        <span>🔍 Debug Trace ({trace.length} steps)</span>
        <ChevronDown
          style={{ width: 13, height: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-1">
          {trace.map((line, i) => (
            <p key={i} className="text-[10px] font-mono text-[#555] leading-relaxed break-all">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AISearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AISearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { currency } = useCurrency();

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        panelRef.current    && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setHasSearched(true);
    setResult(null);
    try {
      const res = await aiSearch(trimmed);
      setResult(res);
    } catch {
      setResult({
        intent: {
          categoryTerms: [], excludedCategoryTerms: [], useCaseKeywords: [],
          maxPrice: null, summary: trimmed, isProductSearch: true,
        },
        results: [],
        message: "Something went wrong. Please try again.",
        trace: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit   = useCallback(() => { if (query.trim()) runSearch(query); }, [query, runSearch]);
  const handleSuggest  = useCallback((s: string) => { setQuery(s); runSearch(s); }, [runSearch]);
  const handleClose    = useCallback(() => {
    setOpen(false); setQuery(""); setResult(null); setHasSearched(false);
  }, []);
  const handleNavigate = useCallback(() => handleClose(), [handleClose]);

  return (
    <>
      {/* ── Search bar ── */}
      <div ref={containerRef} className="w-full relative">
        <div
          className="flex items-center rounded-full transition-all duration-200"
          style={{
            background: "#FFFFFF",
            border: open ? "1.5px solid #E8611A" : "1.5px solid #E8E8E8",
            boxShadow: open
              ? "0 0 0 3px rgba(232,97,26,0.10), 0 2px 12px rgba(0,0,0,0.07)"
              : "0 1px 6px rgba(0,0,0,0.06)",
            height: 46,
          }}
        >
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 46, color: open ? "#E8611A" : "#9B9B9B" }}
          >
            {loading
              ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              : <Sparkles style={{ width: 17, height: 17 }} strokeWidth={1.8} />
            }
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Ask AI: 'phones good for gaming'..."
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[#1A1A1A] placeholder-[#AAAAAA] min-w-0"
            style={{ fontSize: 14 }}
            autoComplete="off"
            spellCheck={false}
          />

          {query && (
            <button
              onClick={() => { setQuery(""); setResult(null); setHasSearched(false); }}
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

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          style={{ backdropFilter: "blur(2px)" }}
          onClick={handleClose}
        />
      )}

      {/* ── Floating panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 overflow-hidden"
          style={{
            top: 120,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(680px, calc(100vw - 24px))",
            maxHeight: "calc(100vh - 140px)",
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: "0 24px 64px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #F0F0F0",
            display: "flex",
            flexDirection: "column",
            animation: "aiPanelIn 0.18s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5]" style={{ flexShrink: 0 }}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
              >
                <Sparkles style={{ width: 14, height: 14, color: "#fff" }} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">Nexcart AI Assistant</p>
                <p className="text-[10px] text-[#9B9B9B]">Understands what you need</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#F4F4F4]"
              style={{ color: "#9B9B9B" }}
            >
              <X style={{ width: 15, height: 15 }} strokeWidth={2.5} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1" style={{ overscrollBehavior: "contain" }}>

            {/* Idle state — suggestion chips */}
            {!loading && !hasSearched && (
              <div className="px-4 py-4">
                <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#9B9B9B] mb-3">Try asking</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggest(s)}
                      className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl transition-colors hover:bg-[#FEF9F6] group"
                      style={{ background: "#F9F9F9" }}
                    >
                      <Search style={{ width: 13, height: 13, color: "#E8611A", flexShrink: 0 }} strokeWidth={2.2} />
                      <span className="text-[13px] font-medium text-[#3A3A3A] group-hover:text-[#E8611A] transition-colors flex-1">
                        {s}
                      </span>
                      <ArrowRight style={{ width: 12, height: 12, color: "#CCC", flexShrink: 0 }} strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                >
                  <Sparkles className="animate-pulse" style={{ width: 22, height: 22, color: "#fff" }} strokeWidth={2} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">Thinking...</p>
                  <p className="text-[12px] text-[#9B9B9B] mt-0.5">Understanding your request &amp; filtering by category</p>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && result && (
              <div className="py-3">
                {/* Intent chips */}
                {(result.intent.categoryTerms.length > 0 || result.intent.useCaseKeywords.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-3 px-4">
                    {result.intent.categoryTerms.slice(0, 3).map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "#FEF0E8", color: "#E8611A" }}>
                        category: {t}
                      </span>
                    ))}
                    {result.intent.useCaseKeywords.slice(0, 4).map((t) => (
                      <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ background: "#F4F4F4", color: "#6B6B6B" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI message */}
                <p className="text-[13px] text-[#555] mb-3 px-4 leading-snug">{result.message}</p>

                {/* Dev trace */}
                <TracePanel trace={result.trace} />

                {/* Product cards */}
                {result.results.length > 0 ? (
                  <div className="flex flex-col gap-1 px-2">
                    {result.results.map((scored) => (
                      <ResultCard
                        key={scored.product.id}
                        scored={scored}
                        onNavigate={handleNavigate}
                        displayCurrency={currency}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8 text-center px-4">
                    <PackageSearch style={{ width: 40, height: 40, color: "#E0E0E0", marginBottom: 12 }} strokeWidth={1.5} />
                    <p className="text-[13px] font-semibold text-[#3A3A3A]">No products found</p>
                    <p className="text-[12px] text-[#AAAAAA] mt-1 max-w-[260px]">
                      The store might not carry this yet. Try browsing all products.
                    </p>
                    <Link
                      to="/shop"
                      onClick={handleNavigate}
                      className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full transition-colors hover:opacity-90"
                      style={{ background: "#E8611A", color: "#fff", textDecoration: "none" }}
                    >
                      Browse Shop <ArrowRight style={{ width: 13, height: 13 }} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input bar inside modal */}
          <div
            className="px-3 py-3 border-t border-[#F5F5F5]"
            style={{ flexShrink: 0 }}
          >
            <div
              className="flex items-center gap-2 rounded-full px-4"
              style={{ background: "#F5F5F5", border: "1.5px solid #E8E8E8", height: 46 }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Ask Nexcart AI anything..."
                className="flex-1 bg-transparent outline-none text-sm text-[#1A1A1A] placeholder-[#AAAAAA] min-w-0"
                style={{ fontSize: 14 }}
                autoComplete="off"
                spellCheck={False}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setResult(null); setHasSearched(false); }}
                  className="flex items-center justify-center flex-shrink-0 rounded-full"
                  style={{ width: 24, height: 24, color: "#9B9B9B" }}
                >
                  <X style={{ width: 13, height: 13 }} strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || loading}
                className="flex items-center justify-center flex-shrink-0 rounded-full disabled:opacity-40"
                style={{ width: 32, height: 32, background: "#E8611A" }}
                aria-label="Search"
              >
                {loading
                  ? <Loader2 style={{ width: 14, height: 14, color: "#fff" }} className="animate-spin" />
                  : <Send style={{ width: 14, height: 14, color: "#fff" }} strokeWidth={2} />
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiPanelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);    }
        }
      `}</style>
    </>
  );
}
