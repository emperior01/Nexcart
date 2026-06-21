import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, Loader2 } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

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

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // When opened: focus search and scroll selected item into view
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      searchRef.current?.focus();
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    }, 60);
  }, [open]);

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative" }}
    >
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          borderRadius: 10,
          border: open ? "1.5px solid #E8611A" : "1.5px solid #E5E7EB",
          background: disabled || isLoading ? "#F9FAFB" : "#fff",
          cursor: disabled || isLoading ? "not-allowed" : "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: "#0D0D0D",
          boxShadow: open ? "0 0 0 3px rgba(232,97,26,0.1)" : "none",
          transition: "all 0.15s",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isLoading ? (
            <span style={{ color: "#9CA3AF", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
              Loading currencies…
            </span>
          ) : selected ? (
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
            marginLeft: 8,
          }}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && currencies.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #E5E7EB",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            zIndex: 300,
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderBottom: "1.5px solid #F3F4F6",
              background: "#FAFAFA",
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
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "#9CA3AF",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Count hint */}
          {search && (
            <div style={{ padding: "6px 14px", fontSize: 11, color: "#9CA3AF", borderBottom: "1px solid #F9FAFB" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
            </div>
          )}

          {/* List */}
          <div ref={listRef} style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "18px 14px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
                No currencies match "{search}"
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
                      padding: "10px 14px",
                      border: "none",
                      background: isSelected ? "#FFF8F5" : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#0D0D0D",
                      textAlign: "left",
                      borderBottom: "1px solid #F9FAFB",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <span
                        style={{
                          color: "#9CA3AF",
                          fontWeight: 700,
                          fontSize: 12,
                          minWidth: 32,
                          display: "inline-block",
                        }}
                      >
                        {symbol}
                      </span>
                      <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? "#E8611A" : "#0D0D0D" }}>
                        {code}
                      </span>
                      <span style={{ color: "#6B7280", marginLeft: 6 }}>— {name}</span>
                    </span>
                    {isSelected && (
                      <Check style={{ width: 14, height: 14, color: "#E8611A", flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
