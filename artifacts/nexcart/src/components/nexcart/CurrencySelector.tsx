import { useCurrency } from "@/contexts/CurrencyContext";
import { Select } from "@/components/ui/index";

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency, currencyList } = useCurrency();

  return (
    <Select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className={className}
      aria-label="Select currency"
    >
      {currencyList.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code} — {c.name}
        </option>
      ))}
    </Select>
  );
}
