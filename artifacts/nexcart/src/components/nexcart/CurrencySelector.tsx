import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPicker } from "@/components/nexcart/CurrencyPicker";

/**
 * Drop-in replacement for the old <select>-based selector.
 * Now uses the searchable CurrencyPicker backed by the DB.
 */
export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency, currencyList } = useCurrency();

  return (
    <CurrencyPicker
      value={currency}
      onChange={setCurrency}
      currencies={currencyList}
      className={className}
    />
  );
}
