import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { X, Send, Bot, User, Loader2, ShoppingBag, Sparkles, Plus, Maximize2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { aiProvider, searchProductsByIntent, searchProductsByKeyword, generateLocalReply } from "@/ai/ai-search";
import type { ChatMessage, AiProductResult } from "@/ai/ai-types";

const hasAiKey = !!import.meta.env.VITE_OPENAI_API_KEY;

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I am Nexcart AI. Ask me anything and I will find the best products for you.",
};

const SUGGESTIONS = ["Gaming phones", "Laptops under 500k", "Fashion accessories", "Wireless headphones"];

function uid() { return Math.random().toString(36).slice(2, 10); }

function AiProductCard({ product, onClose }: { product: AiProductResult; onClose: () => void }) {
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
      className="flex-shrink-0 w-40 rounded-xl overflow-hidden bg-white"
      style={{ border: "1px solid #F0F0F0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      <Link to="/products/$slug" params={{ slug: product.slug }} onClick={onClose}>
        <div className="w-full aspect-square bg-[#F4F4F4] overflow-hidden">
          {product.image
            ? <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-6 w-6" style={{ color: "#D1D5DB" }} /></div>
          }
        </div>
      </Link>
      <div className="p-2">
        {product.category && (
          <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#E8611A" }}>{product.category}</p>
        )}
        <p className="text-[11px] font-semibold leading-snug line-clamp-2 mb-1" style={{ color: "#1A1A1A" }}>{product.title}</p>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#E8611A" }}>{fmt(product.price)}</p>
        <div className="flex gap-1">
          <Link
            to="/products/$slug"
            params={{ slug: product.slug }}
            onClick={onClose}
            className="flex-1 text-center text-[9px] font-semibold py-1 rounded-full border"
            style={{ color: "#3A3A3A", borderColor: "#E8E8E8" }}
          >View</Link>
          <button
            disabled={product.stock === 0}
            onClick={handleAdd}
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "#0D0D0D" }}
          >
            <Plus className="h-3 w-3 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onClose }: { msg: ChatMessage; onClose: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={"flex gap-2 " + (isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: isUser ? "#0D0D0D" : "linear-gradient(135deg,#E8611A,#C4511A)" }}
      >
        {isUser
          ? <User className="h-3 w-3 text-white" strokeWidth={2} />
          : <Bot className="h-3 w-3 text-white" strokeWidth={2} />
        }
      </div>
      <div className={"flex flex-col gap-2 " + (isUser ? "items-end" : "items-start")} style={{ maxWidth: "calc(100% - 36px)" }}>
        {msg.loading ? (
          <div className="px-3 py-2 rounded-2xl flex items-center gap-2" style={{ background: "#F5F5F5" }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#9B9B9B" }} />
            <span className="text-xs" style={{ color: "#9B9B9B" }}>Searching...</span>
          </div>
        ) : (
          <div
            className="px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
            style={{
              background: isUser ? "#0D0D0D" : "#F5F5F5",
              color: isUser ? "#FFF" : "#1A1A1A",
              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            }}
          >{msg.text}</div>
        )}
        {msg.products && msg.products.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 w-full">
            {msg.products.map(p => <AiProductCard key={p.id} product={p} onClose={onClose} />)}
          </div>
        )}
      </div>
    </div>
  );
}

interface AiDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AiDrawer({ open, onClose }: AiDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: ChatMessage = { id: uid(), role: "user", text };
    const loadingMsg: ChatMessage = { id: uid(), role: "assistant", text: "", loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    try {
      let products: AiProductResult[] = [];
      let replyText = "";
      if (hasAiKey) {
        const intent = await aiProvider.parseIntent(text);
        products = await searchProductsByIntent(intent);
        replyText = await aiProvider.generateReply(text, products, intent);
      } else {
        products = await searchProductsByKeyword(text);
        replyText = generateLocalReply(text, products);
      }
      const assistantMsg: ChatMessage = {
        id: uid(), role: "assistant", text: replyText,
        products: products.length > 0 ? products : undefined,
      };
      setMessages(prev => [...prev.filter(m => !m.loading), assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { id: uid(), role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, busy]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed z-50 bg-white flex flex-col"
        style={{
          bottom: 0,
          right: 0,
          width: "100%",
          maxWidth: 420,
          height: "80vh",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
            >
              <Sparkles style={{ width: 16, height: 16 }} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>Nexcart AI</p>
              <p className="text-[10px]" style={{ color: "#9B9B9B" }}>Shopping Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/ai"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#F3F4F6]"
              title="Open full page"
            >
              <Maximize2 className="h-4 w-4" style={{ color: "#9B9B9B" }} />
            </Link>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#F3F4F6]"
            >
              <X className="h-4 w-4" style={{ color: "#9B9B9B" }} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onClose={onClose} />)}

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors hover:bg-[#FEF0E8]"
                  style={{ background: "#F5F5F5", color: "#3A3A3A" }}
                >{s}</button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: "1px solid #F0F0F0" }}>
          <div
            className="flex items-center gap-2 rounded-full px-4"
            style={{ background: "#F5F5F5", border: "1.5px solid #E8E8E8" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about products..."
              className="flex-1 py-2.5 text-sm outline-none bg-transparent"
              style={{ color: "#1A1A1A" }}
              disabled={busy}
              autoComplete="off"
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || busy}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: "#E8611A" }}
            >
              {busy
                ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                : <Send className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
