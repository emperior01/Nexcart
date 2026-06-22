import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPicker } from "@/components/nexcart/CurrencyPicker";

interface CurrencySelectorProps {
  value?: string;
  onChange?: (code: string) => void;
  className?: string;
}

export function CurrencySelector({ value, onChange, className }: CurrencySelectorProps) {
  const { currency, setCurrency, currencyList, currencyListLoading } = useCurrency();

  return (
    <CurrencyPicker
      value={value ?? currency}
      onChange={onChange ?? setCurrency}
      currencies={currencyList}
      isLoading={currencyListLoading}
      className={className}
    />
  );
}
