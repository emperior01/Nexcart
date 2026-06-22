import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import type { Currency } from "@/hooks/use-currencies";

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  currencies: Currency[];
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CurrencyPicker({
  value,
  onChange,
  currencies,
  isLoading = false,
  disabled = false,
  className,
}: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Modal position — calculated from trigger on open
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = currencies.find((c) => c.code === value);

  const filtered =
    search.trim() === ""
      ? currencies
      : currencies.filter((c) => {
          const q = search.toLowerCase();
          return (
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q)
          );
        });

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(400, window.innerHeight * 0.6);
    const top = spaceBelow >= dropH
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - dropH - 4;
    setPos({ top, left: rect.left + window.scrollX, width: rect.width });
  }, []);

  function openModal() {
    calcPos();
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (
        modalRef.current && !modalRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Focus search + scroll to selected item after open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      searchRef.current?.focus();
      selectedRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
    }, 40);
    return () => clearTimeout(t);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  const dropdownContent = open ? (
    <div
      ref={modalRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 320),
        zIndex: 99999,
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 40px -4px rgba(0,0,0,0.15)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Search bar ── */}
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid #F1F5F9",
        background: "#fff",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          padding: "8px 12px",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search currency name, code, or symbol…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#0F172A",
              background: "transparent",
              minWidth: 0,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, borderRadius: 50,
                border: "none", background: "#CBD5E1",
                cursor: "pointer", padding: 0, flexShrink: 0,
              }}
            >
              <X style={{ width: 10, height: 10, color: "#fff" }} />
            </button>
          )}
        </div>
        {search && (
          <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 6, marginBottom: 0 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* ── List ── */}
      <div style={{
        overflowY: "auto",
        maxHeight: 300,
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "28px 16px",
            textAlign: "center",
            fontSize: 13,
            color: "#94A3B8",
          }}>
            No currencies match &ldquo;{search}&rdquo;
          </div>
        ) : (
          filtered.map(({ code, symbol, name }) => {
            const isSelected = code === value;
            return (
              <button
                key={code}
                type="button"
                ref={isSelected ? selectedRef : undefined}
                onClick={() => select(code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 16px",
                  border: "none",
                  borderBottom: "1px solid #F8FAFC",
                  background: isSelected ? "#FFF7F3" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.08s",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#F8FAFC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? "#FFF7F3" : "#fff";
                }}
              >
                {/* Left: code + name + symbol */}
                <span style={{ display: "flex", alignItems: "baseline", gap: 0, minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontFamily: "'SF Mono','Fira Mono','Consolas',monospace",
                    fontWeight: 700,
                    fontSize: 13,
                    color: isSelected ? "#C2410C" : "#0F172A",
                    letterSpacing: "0.02em",
                    minWidth: 42,
                    flexShrink: 0,
                  }}>
                    {code}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: "#64748B",
                    marginLeft: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    — {name}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: "#94A3B8",
                    marginLeft: 6,
                    flexShrink: 0,
                  }}>
                    ({symbol})
                  </span>
                </span>

                {/* Right: checkmark if selected */}
                {isSelected && (
                  <Check style={{ width: 15, height: 15, color: "#C2410C", flexShrink: 0 }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ── Trigger button ── */}
      <div className={className} style={{ position: "relative" }}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || isLoading}
          onClick={openModal}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border: open ? "1.5px solid #E8611A" : "1.5px solid #E2E8F0",
            background: disabled || isLoading ? "#F8FAFC" : "#fff",
            cursor: disabled || isLoading ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
            color: "#0F172A",
            boxShadow: open ? "0 0 0 3px rgba(232,97,26,0.08)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            textAlign: "left",
          }}
        >
          <span style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            {isLoading ? (
              <span style={{ color: "#94A3B8", fontSize: 13 }}>Loading currencies…</span>
            ) : selected ? (
              <>
                <span style={{
                  fontFamily: "'SF Mono','Fira Mono','Consolas',monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#0F172A",
                  letterSpacing: "0.02em",
                  flexShrink: 0,
                }}>
                  {selected.code}
                </span>
                <span style={{ color: "#64748B", fontSize: 13 }}>— {selected.name}</span>
                <span style={{ color: "#94A3B8", fontSize: 12, flexShrink: 0 }}>({selected.symbol})</span>
              </>
            ) : (
              <span style={{ color: "#94A3B8", fontSize: 13 }}>Select currency…</span>
            )}
          </span>
          <ChevronDown style={{
            width: 15,
            height: 15,
            color: "#94A3B8",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }} />
        </button>
      </div>

      {/* ── Portal dropdown — renders at document.body, immune to overflow clipping ── */}
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
