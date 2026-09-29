export const SUPPORTED_CURRENCIES = [
  "NGN",
  "USD",
  "GBP",
] as const;

export type Currency =
  (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "NGN";

export const CURRENCY_METADATA = {
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    decimals: 2,
  },

  USD: {
    code: "USD",
    name: "United States Dollar",
    symbol: "$",
    decimals: 2,
  },

  GBP: {
    code: "GBP",
    name: "British Pound Sterling",
    symbol: "£",
    decimals: 2,
  },
} satisfies Record<
  Currency,
  {
    code: Currency;
    name: string;
    symbol: string;
    decimals: number;
  }
>;

export type CurrencyPricing<
  TValue = number,
> = Partial<Record<Currency, TValue>>;

export function isSupportedCurrency(
  value: string,
): value is Currency {
  return (
    SUPPORTED_CURRENCIES as readonly string[]
  ).includes(value);
}