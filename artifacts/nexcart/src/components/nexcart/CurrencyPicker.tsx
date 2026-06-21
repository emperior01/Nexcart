import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import type { Currency } from "@/hooks/use-currencies";

interface CurrencyPickerProps {
  value: string;
  onChange: (code: string) => void;
  currencies: Currency[];
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable currency picker.
 * Filters by code, name, or symbol as the user types.
 * Matches the inline dropdown style used in seller/Settings.tsx.
 */
export function CurrencyPicker({
  value,
  onChange,
  currencies,
  disabled = false,
  className,
}: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = currencies.find((c) => c.code === value);

  const filtered = search.trim()
    ? currencies.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
        );
      })
    : currencies;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          borderRadius: 10,
          border: open ? "1.5px solid #E8611A" : "1.5px solid #E5E7EB",
          background: disabled ? "#F9FAFB" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: "#0D0D0D",
          boxShadow: open ? "0 0 0 3px rgba(232,97,26,0.1)" : "none",
          transition: "all 0.15s",
        }}
      >
        <span>
          {selected ? (
            <>
              <span style={{ color: "#9CA3AF", fontSize: 12, marginRight: 8, fontWeight: 600 }}>
                {selected.symbol}
              </span>
              {selected.code} — {selected.name}
            </>
          ) : (
            <span style={{ color: "#9CA3AF" }}>Select currency…</span>
          )}
        </span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            color: "#9CA3AF",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #E5E7EB",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {/* Search box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            <Search style={{ width: 14, height: 14, color: "#9CA3AF", flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, or symbol…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "#0D0D0D",
                background: "transparent",
              }}
            />
          </div>

          {/* Results */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                No currencies match "{search}"
              </div>
            ) : (
              filtered.map(({ code, symbol, name }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => select(code)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: "none",
                    background: code === value ? "#FFF8F5" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#0D0D0D",
                    textAlign: "left",
                    borderBottom: "1px solid #F9FAFB",
                  }}
                >
                  <span>
                    <span
                      style={{
                        color: "#9CA3AF",
                        marginRight: 8,
                        fontWeight: 600,
                        minWidth: 28,
                        display: "inline-block",
                      }}
                    >
                      {symbol}
                    </span>
                    {code} — {name}
                  </span>
                  {code === value && (
                    <Check style={{ width: 14, height: 14, color: "#E8611A", flexShrink: 0 }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
