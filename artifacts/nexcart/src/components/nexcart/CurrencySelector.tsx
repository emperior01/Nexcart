import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyPicker } from "@/components/nexcart/CurrencyPicker";

interface CurrencySelectorProps {
  /** Pending value controlled by the parent — NOT the committed currency. */
  value: string;
  /** Called when user selects a currency. Does NOT commit to DB. */
  onChange: (code: string) => void;
  className?: string;
}

/**
 * Pulls the currency list from context.
 * The parent owns the pending value and calls context.setCurrency()
 * only when the user clicks Save.
 */
export function CurrencySelector({ value, onChange, className }: CurrencySelectorProps) {
  const { currencyList, currencyListLoading } = useCurrency();

  return (
    <CurrencyPicker
      value={value}
      onChange={onChange}
      currencies={currencyList}
      isLoading={currencyListLoading}
      className={className}
    />
  );
}
