/**
 * Subscription plans (F3 in docs/product-strategy.md). The same numbers in
 * every currency: 5.99 a month or 59 a year, in the rider's own currency
 * (A$5.99 in Australia, US$5.99 in the US, £5.99 in the UK, €5.99 in the
 * euro area, and so on). No exchange-rate conversion. Billing (not built yet)
 * charges these; the app shows them.
 */

export interface Plan {
  id: "monthly" | "yearly";
  label: string;
  /** Price per billing period, in hundredths of the currency (cents, pence). The same in every currency. */
  priceMinor: number;
  /** Length of one billing period. */
  months: 1 | 12;
}

export const PLANS: Plan[] = [
  { id: "monthly", label: "Monthly", priceMinor: 599, months: 1 },
  { id: "yearly", label: "Yearly", priceMinor: 5900, months: 12 },
];

export const planById = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);

export interface Currency {
  code: "AUD" | "USD" | "GBP" | "EUR" | "NZD" | "CAD";
  symbol: string;
  /** How tax shows: included in the price, or added at checkout. */
  taxNote: string;
}

export const CURRENCIES: Record<Currency["code"], Currency> = {
  AUD: { code: "AUD", symbol: "A$", taxNote: "Australian dollars, GST included." },
  USD: { code: "USD", symbol: "US$", taxNote: "US dollars. Sales tax is added at checkout where it applies." },
  GBP: { code: "GBP", symbol: "£", taxNote: "Pounds sterling, VAT included." },
  EUR: { code: "EUR", symbol: "€", taxNote: "Euros, VAT included." },
  NZD: { code: "NZD", symbol: "NZ$", taxNote: "New Zealand dollars, GST included." },
  CAD: { code: "CAD", symbol: "CA$", taxNote: "Canadian dollars. Sales tax is added at checkout where it applies." },
};

/** Euro-area countries (ISO 3166 alpha-2). */
const EURO = new Set(["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "AD", "MC", "SM", "VA", "ME", "XK"]);

/**
 * The currency a rider pays in, from their country (Cloudflare's CF-IPCountry
 * header). Anywhere not listed pays in US dollars; unknown (no header, e.g.
 * running locally) shows Australian dollars, the home market.
 */
export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").toUpperCase();
  if (!c || c === "XX" || c === "T1") return CURRENCIES.AUD;
  if (c === "AU") return CURRENCIES.AUD;
  if (c === "NZ") return CURRENCIES.NZD;
  if (c === "GB" || c === "GG" || c === "JE" || c === "IM") return CURRENCIES.GBP;
  if (c === "CA") return CURRENCIES.CAD;
  if (EURO.has(c)) return CURRENCIES.EUR;
  return CURRENCIES.USD;
}

/** "A$5.99", "£59", "€5.99". */
export function formatPrice(minor: number, currency: Currency = CURRENCIES.AUD): string {
  const amount = minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
  return `${currency.symbol}${amount}`;
}

/** What a year costs on the monthly plan, less the yearly price (12.88 in any currency). */
export function yearlySavingMinor(plans: Plan[] = PLANS): number {
  const monthly = plans.find((p) => p.id === "monthly")!;
  const yearly = plans.find((p) => p.id === "yearly")!;
  return monthly.priceMinor * 12 - yearly.priceMinor;
}
