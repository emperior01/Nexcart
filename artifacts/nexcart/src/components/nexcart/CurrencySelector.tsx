import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPicker } from "@/components/nexcart/CurrencyPicker";

interface CurrencySelectorProps {
  /**
   * Pending value. If omitted, falls back to the committed currency from context.
   * Pass this when the parent manages pending state (e.g. account settings).
   */
  value?: string;
  /**
   * Called when user selects a currency. Does NOT commit to DB.
   * If omitted, selection immediately commits via context setCurrency.
   */
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
