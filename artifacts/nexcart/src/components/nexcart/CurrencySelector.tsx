import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPicker } from "@/components/nexcart/CurrencyPicker";

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency, currencyList, currencyListLoading } = useCurrency();

  return (
    <CurrencyPicker
      value={currency}
      onChange={setCurrency}
      currencies={currencyList}
      isLoading={currencyListLoading}
      className={className}
    />
  );
}
