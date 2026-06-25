import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, Send, Bot, User,
  Loader2, ShoppingBag, Sparkles, Plus, Scale,
} from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { aiProvider, searchProductsByIntent, searchProductsByKeyword, generateLocalReply } from "@/ai/ai-search";
import type { ChatMessage, AiProductResult } from "@/ai/ai-types";

const hasAiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I am Nexcart AI. Tell me what you are looking for and I will find the best products for you. Try: phones, laptops, shoes, or fashion accessories.\n\nYou can also ask me to compare products — e.g. \"Compare Samsung A15 and Redmi Note 13\".",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Comparison detection ─────────────────────────────────────────────────────

function detectComparison(text: string): { a: string; b: string } | null {
  const lower = text.toLowerCase();
  const m = lower.match(/compare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+)/);
  if (!m) return null;
  return { a: m[1].trim(), b: m[2].trim() };
}

async function fetchProductByName(name: string): Promise<AiProductResult | null> {
  const results = await searchProductsByKeyword(name);
  return results[0] ?? null;
}

// ─── Comparison card ──────────────────────────────────────────────────────────

function ComparisonCard({ a, b }: { a: AiProductResult; b: AiProductResult }) {
  const { fmt } = useCurrency();
  const { addItem, openCart } = useCart();

  function handleAdd(product: AiProductResult, e: React.MouseEvent) {
    e.preventDefault();
    if (product.stock === 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      currency: product.currency,
      image: product.image,
      maxStock: product.stock,
    });
    toast.success(product.title + " added to cart!", {
      action: { label: "View Cart", onClick: openCart },
      duration: 3000,
    });
  }

  const rows: Array<{ label: string; aVal: string; bVal: string; winner?: "a" | "b" | "tie" }> = [
    {
      label: "Price",
      aVal: fmt(a.price),
      bVal: fmt(b.price),
      winner: a.price < b.price ? "a" : b.price < a.price ? "b" : "tie",
    },
    {
      label: "Category",
      aVal: a.category ?? "—",
      bVal: b.category ?? "—",
    },
    {
      label: "Stock",
      aVal: a.stock > 0 ? `${a.stock} units` : "Out of stock",
      bVal: b.stock > 0 ? `${b.stock} units` : "Out of stock",
      winner: a.stock > b.stock ? "a" : b.stock > a.stock ? "b" : "tie",
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{ background: "#FFFFFF", border: "1px solid #EFEFEF", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
    >
      {/* Header row */}
      <div className="grid grid-cols-3 gap-0">
        <div className="p-3 flex items-center justify-center" style={{ background: "#F9F9F9" }}>
          <Scale className="h-4 w-4" style={{ color: "#9B9B9B" }} strokeWidth={1.5} />
        </div>
        {[a, b].map((p, i) => (
          <div key={i} className="p-3 text-center" style={{ background: i === 0 ? "#FEF9F6" : "#F6F9FE" }}>
            <div
              className="w-14 h-14 mx-auto rounded-xl overflow-hidden mb-2 flex items-center justify-center"
              style={{ background: "#F4F4F4" }}
            >
              {p.image
                ? <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                : <ShoppingBag className="h-6 w-6" style={{ color: "#D1D5DB" }} />
              }
            </div>
            <p className="text-[11px] font-bold leading-snug line-clamp-2" style={{ color: "#1A1A1A" }}>{p.title}</p>
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-3 border-t" style={{ borderColor: "#F0F0F0" }}>
          <div className="px-3 py-2.5 flex items-center" style={{ background: "#F9F9F9" }}>
            <span className="text-[11px] font-semibold" style={{ color: "#6B6B6B" }}>{row.label}</span>
          </div>
          {(["a", "b"] as const).map((side) => {
            const val = side === "a" ? row.aVal : row.bVal;
            const isWinner = row.winner === side;
            return (
              <div
                key={side}
                className="px-3 py-2.5 flex items-center justify-center"
                style={{ background: isWinner ? (side === "a" ? "#FEF9F6" : "#F6F9FE") : "#FFFFFF" }}
              >
                <span
                  className="text-[12px] font-medium text-center"
                  style={{ color: isWinner ? "#E8611A" : "#3A3A3A" }}
                >
                  {val}
                  {isWinner && " ✓"}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Action buttons */}
      <div className="grid grid-cols-3 border-t" style={{ borderColor: "#F0F0F0" }}>
        <div style={{ background: "#F9F9F9" }} />
        {[a, b].map((p, i) => (
          <div key={i} className="p-2.5 flex gap-1.5" style={{ background: i === 0 ? "#FEF9F6" : "#F6F9FE" }}>
            <Link
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-full border transition-colors"
              style={{ color: "#3A3A3A", borderColor: "#E8E8E8", background: "#FFFFFF" }}
            >
              View
            </Link>
            <button
              disabled={p.stock === 0}
              onClick={(e) => handleAdd(p, e)}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: "#0D0D0D" }}
              aria-label="Add to cart"
            >
              <Plus className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiProductCard({ product }: { product: AiProductResult }) {
  const { addItem, openCart } = useCart();
  const { fmt } = useCurrency();

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      currency: product.currency,
      image: product.image,
      maxStock: product.stock,
    });
    toast.success(product.title + " added to cart!", {
      action: { label: "View Cart", onClick: openCart },
      duration: 3000,
    });
  }

  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden bg-white border border-black/5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
    >
      <Link to="/products/$slug" params={{ slug: product.slug }}>
        <div className="w-full aspect-square bg-[#F4F4F4] overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8" style={{ color: "#D1D5DB" }} />
            </div>
          )}
        </div>
      </Link>
      <div className="px-2.5 pt-2 pb-2.5">
        {product.category && (
          <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#E8611A" }}>
            {product.category}
          </p>
        )}
        <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: "#1A1A1A" }}>
          {product.title}
        </p>
        <p className="text-sm font-bold mb-2" style={{ color: "#E8611A" }}>
          {fmt(product.price)}
        </p>
        <div className="flex gap-1.5">
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-full border transition-colors"
            style={{ color: "#3A3A3A", borderColor: "#E8E8E8" }}
          >
            View
          </Link>
          <button
            disabled={product.stock === 0}
            onClick={handleAdd}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "#0D0D0D" }}
            aria-label="Add to cart"
          >
            <Plus className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={"flex gap-2.5 " + (isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: isUser ? "#0D0D0D" : "linear-gradient(135deg,#E8611A,#C4511A)" }}
      >
        {isUser
          ? <User className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          : <Bot className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        }
      </div>
      <div className={"flex flex-col gap-2 max-w-[85%] " + (isUser ? "items-end" : "items-start")}>
        {msg.loading ? (
          <div className="px-4 py-3 rounded-2xl flex items-center gap-2" style={{ background: "#F5F5F5" }}>
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#9B9B9B" }} />
            <span className="text-sm" style={{ color: "#9B9B9B" }}>Searching products...</span>
          </div>
        ) : (
          <div
            className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
            style={{
              background: isUser ? "#0D0D0D" : "#F5F5F5",
              color: isUser ? "#FFFFFF" : "#1A1A1A",
              borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
            }}
          >
            {msg.text}
          </div>
        )}
        {/* Comparison card */}
        {msg.comparison && (
          <div className="w-full max-w-sm">
            <ComparisonCard a={msg.comparison.a} b={msg.comparison.b} />
          </div>
        )}
        {/* Product cards */}
        {!msg.comparison && msg.products && msg.products.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 w-full" style={{ maxWidth: "calc(100vw - 80px)" }}>
            {msg.products.map((p) => (
              <AiProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: ChatMessage = { id: uid(), role: "user", text };
    const loadingMsg: ChatMessage = { id: uid(), role: "assistant", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    try {
      // ── Comparison path ──────────────────────────────────────────────────
      const cmp = detectComparison(text);
      if (cmp) {
        const [pa, pb] = await Promise.all([
          fetchProductByName(cmp.a),
          fetchProductByName(cmp.b),
        ]);
        if (pa && pb) {
          const assistantMsg: ChatMessage = {
            id: uid(),
            role: "assistant",
            text: `Here is a comparison between ${pa.title} and ${pb.title}. The ✓ marks the better value on each row.`,
            comparison: { a: pa, b: pb },
          };
          setMessages((prev) => [...prev.filter((m) => !m.loading), assistantMsg]);
        } else {
          const missing = [!pa && cmp.a, !pb && cmp.b].filter(Boolean).join(" and ");
          setMessages((prev) => [
            ...prev.filter((m) => !m.loading),
            { id: uid(), role: "assistant", text: `I could not find "${missing}" in the store. Try checking the product name or browsing the shop.` },
          ]);
        }
        return;
      }

      // ── Normal product search path ────────────────────────────────────────
      let products: AiProductResult[] = [];
      let replyText = "";
      if (hasAiKey) {
        const intent = await aiProvider.parseIntent(text);
        products = await searchProductsByIntent(intent);
        replyText = await aiProvider.generateReply(text, products);
      } else {
        products = await searchProductsByKeyword(text);
        replyText = generateLocalReply(text, products);
      }
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        text: replyText,
        products: products.length > 0 ? products : undefined,
      };
      setMessages((prev) => [...prev.filter((m) => !m.loading), assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { id: uid(), role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, busy]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const SUGGESTIONS = ["Phones", "Laptops", "Fashion", "Headphones"];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAFA" }}>
      <Navbar />
      <div
        className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b bg-white"
        style={{ borderColor: "#EFEFEF" }}
      >
        <Link
          to="/"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#F3F4F6]"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "#3A3A3A" }} strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            <Sparkles style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>Nexcart AI</p>
            <p className="text-xs" style={{ color: "#9B9B9B" }}>Shopping Assistant</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="px-3.5 py-2 rounded-full text-xs font-semibold"
                style={{ background: "#F0F0F0", color: "#3A3A3A" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 sm:px-6 py-3 bg-white border-t" style={{ borderColor: "#EFEFEF" }}>
        <div
          className="flex items-center gap-2 rounded-full px-4"
          style={{ background: "#F5F5F5", border: "1.5px solid #E8E8E8" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about products..."
            className="flex-1 py-3 text-sm outline-none bg-transparent"
            style={{ color: "#1A1A1A" }}
            disabled={busy}
            autoComplete="off"
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || busy}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "#E8611A" }}
            aria-label="Send"
          >
            {busy
              ? <Loader2 className="h-4 w-4 text-white animate-spin" />
              : <Send className="h-4 w-4 text-white" strokeWidth={2} />
            }
          </button>
        </div>

      </div>
      <Footer />
    </div>
  );
}
