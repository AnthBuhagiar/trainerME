/**
 * Subscription plans (F3 in docs/product-strategy.md; method and full table in
 * docs/pricing.md).
 *
 * Every price is 5.99 a month or 59 a year, times a power of ten for the
 * currency: A$5.99 / A$59, ¥599 / ¥5,900, ₩5,990 / ₩59,000, Rp 59,900 /
 * Rp 590,000. The power of ten is the one that brings the price closest to
 * what A$5.99 buys in Australia, using purchasing power (World Bank PPP
 * conversion factor, private consumption). AUD, USD, GBP, EUR, NZD and CAD
 * are always plain 5.99 / 59.
 *
 * Tax is included everywhere: the rider pays exactly the price shown (billing
 * must be set to tax-inclusive, including for US and Canadian sales tax).
 * Countries without a currency here (or with very high inflation since the
 * PPP data) pay in US dollars.
 */

export interface Plan {
  id: "monthly" | "yearly";
  label: string;
  /** 5.99 or 59, before the currency's power of ten. */
  base: number;
  /** Length of one billing period. */
  months: 1 | 12;
}

export const PLANS: Plan[] = [
  { id: "monthly", label: "Monthly", base: 5.99, months: 1 },
  { id: "yearly", label: "Yearly", base: 59, months: 12 },
];

export const planById = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);

export interface Currency {
  code: string;
  name: string;
  /** Shown before the amount ("A$", "¥", "SEK "). */
  symbol: string;
  /** 0 for currencies without cents in everyday prices (yen, won, rupiah…). */
  decimals: 0 | 2;
  /** Power of ten on 5.99 / 59. */
  scale: number;
  /** World Bank PPP conversion factor, private consumption (local units per international $), 2020–21. Used to pick `scale`. */
  ppp: number;
  /** Countries (ISO 3166 alpha-2) that pay in it. */
  countries: string[];
}

const EURO = ["AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "AD", "MC", "SM", "VA", "ME", "XK"];

/** The six where the price is always plain 5.99 / 59. */
export const CORE = ["AUD", "USD", "GBP", "EUR", "NZD", "CAD"];

const list: Currency[] = [
  { code: "AUD", name: "Australian dollars", symbol: "A$", decimals: 2, scale: 0, ppp: 1.57, countries: ["AU", "CX", "CC", "NF", "KI", "NR", "TV"] },
  { code: "USD", name: "US dollars", symbol: "US$", decimals: 2, scale: 0, ppp: 1.0, countries: ["US", "PR", "GU", "VI", "AS", "MP", "EC", "SV", "PA"] },
  { code: "GBP", name: "pounds sterling", symbol: "£", decimals: 2, scale: 0, ppp: 0.78, countries: ["GB", "GG", "JE", "IM"] },
  { code: "EUR", name: "euros", symbol: "€", decimals: 2, scale: 0, ppp: 0.78, countries: EURO },
  { code: "NZD", name: "New Zealand dollars", symbol: "NZ$", decimals: 2, scale: 0, ppp: 1.62, countries: ["NZ", "CK", "NU"] },
  { code: "CAD", name: "Canadian dollars", symbol: "CA$", decimals: 2, scale: 0, ppp: 1.32, countries: ["CA"] },
  { code: "CHF", name: "Swiss francs", symbol: "CHF ", decimals: 2, scale: 0, ppp: 1.32, countries: ["CH", "LI"] },
  { code: "SGD", name: "Singapore dollars", symbol: "S$", decimals: 2, scale: 0, ppp: 1.01, countries: ["SG"] },
  { code: "MYR", name: "ringgit", symbol: "RM ", decimals: 2, scale: 0, ppp: 1.61, countries: ["MY"] },
  { code: "BRL", name: "reais", symbol: "R$", decimals: 2, scale: 0, ppp: 2.53, countries: ["BR"] },
  { code: "PLN", name: "złoty", symbol: "PLN ", decimals: 2, scale: 0, ppp: 1.94, countries: ["PL"] },
  { code: "RON", name: "lei", symbol: "RON ", decimals: 2, scale: 0, ppp: 1.96, countries: ["RO"] },
  { code: "SAR", name: "riyals", symbol: "SAR ", decimals: 2, scale: 0, ppp: 1.67, countries: ["SA"] },
  { code: "AED", name: "dirhams", symbol: "AED ", decimals: 2, scale: 0, ppp: 2.66, countries: ["AE"] },
  { code: "ILS", name: "shekels", symbol: "₪", decimals: 2, scale: 0, ppp: 4.28, countries: ["IL"] },
  { code: "SEK", name: "Swedish kronor", symbol: "SEK ", decimals: 2, scale: 1, ppp: 9.42, countries: ["SE"] },
  { code: "NOK", name: "Norwegian kroner", symbol: "NOK ", decimals: 2, scale: 1, ppp: 10.64, countries: ["NO", "SJ", "BV"] },
  { code: "DKK", name: "Danish kroner", symbol: "DKK ", decimals: 2, scale: 1, ppp: 7.61, countries: ["DK", "GL", "FO"] },
  { code: "HKD", name: "Hong Kong dollars", symbol: "HK$", decimals: 2, scale: 1, ppp: 6.06, countries: ["HK"] },
  { code: "INR", name: "rupees", symbol: "₹", decimals: 2, scale: 1, ppp: 21.2, countries: ["IN"] },
  { code: "ZAR", name: "rand", symbol: "R ", decimals: 2, scale: 1, ppp: 6.96, countries: ["ZA"] },
  { code: "MXN", name: "Mexican pesos", symbol: "MX$", decimals: 2, scale: 1, ppp: 10.74, countries: ["MX"] },
  { code: "CZK", name: "koruna", symbol: "CZK ", decimals: 2, scale: 1, ppp: 14.83, countries: ["CZ"] },
  { code: "THB", name: "baht", symbol: "฿", decimals: 2, scale: 1, ppp: 12.28, countries: ["TH"] },
  { code: "PHP", name: "Philippine pesos", symbol: "₱", decimals: 2, scale: 1, ppp: 20.32, countries: ["PH"] },
  { code: "JPY", name: "yen", symbol: "¥", decimals: 0, scale: 2, ppp: 113.83, countries: ["JP"] },
  { code: "HUF", name: "forint", symbol: "HUF ", decimals: 0, scale: 2, ppp: 169.72, countries: ["HU"] },
  { code: "ISK", name: "Icelandic krónur", symbol: "ISK ", decimals: 0, scale: 2, ppp: 161.16, countries: ["IS"] },
  { code: "CLP", name: "Chilean pesos", symbol: "CLP ", decimals: 0, scale: 2, ppp: 469.1, countries: ["CL"] },
  { code: "KRW", name: "won", symbol: "₩", decimals: 0, scale: 3, ppp: 968.47, countries: ["KR"] },
  { code: "COP", name: "Colombian pesos", symbol: "COP ", decimals: 0, scale: 3, ppp: 1529.93, countries: ["CO"] },
  { code: "IDR", name: "rupiah", symbol: "Rp ", decimals: 0, scale: 4, ppp: 5067.27, countries: ["ID"] },
  { code: "VND", name: "đồng", symbol: "VND ", decimals: 0, scale: 4, ppp: 7901.71, countries: ["VN"] },
];

export const CURRENCIES: Record<string, Currency> = Object.fromEntries(list.map((c) => [c.code, c]));

const byCountry = new Map(list.flatMap((c) => c.countries.map((country) => [country, c] as const)));

/**
 * The currency a rider pays in, from their country (Cloudflare's CF-IPCountry
 * header). Anywhere not listed pays in US dollars; unknown (no header, e.g.
 * running locally) shows Australian dollars, the home market.
 */
export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").toUpperCase();
  if (!c || c === "XX" || c === "T1") return CURRENCIES.AUD;
  return byCountry.get(c) ?? CURRENCIES.USD;
}

/** The plan's price in this currency: 5.99 or 59 times its power of ten. */
export function priceIn(plan: Plan, currency: Currency): number {
  return Math.round(plan.base * 10 ** currency.scale * 100) / 100;
}

/** "A$5.99", "¥5,900", "Rp 59,900", "SEK 59.90". */
export function formatPrice(amount: number, currency: Currency): string {
  const whole = currency.decimals === 0 || Number.isInteger(amount);
  return `${currency.symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 })}`;
}

/** Twelve months on the monthly plan, less the yearly price (12.88 times the power of ten). */
export function yearlySaving(currency: Currency): number {
  const monthly = priceIn(planById("monthly")!, currency);
  const yearly = priceIn(planById("yearly")!, currency);
  return Math.round((monthly * 12 - yearly) * 100) / 100;
}

/** What the monthly price buys locally, expressed as what it would buy in Australia (A$). */
export function feelsLikeAud(currency: Currency): number {
  return (priceIn(planById("monthly")!, currency) * CURRENCIES.AUD.ppp) / currency.ppp;
}

/** The power of ten whose 5.99 lands closest to A$5.99 in purchasing power (cents only where the currency has them). */
export function nearestScale(ppp: number, decimals: 0 | 2): number {
  const fair = (5.99 * ppp) / CURRENCIES.AUD.ppp;
  let best = decimals === 0 ? 2 : 0;
  for (let k = best; k <= 8; k++) {
    if (Math.abs(Math.log10((5.99 * 10 ** k) / fair)) < Math.abs(Math.log10((5.99 * 10 ** best) / fair))) best = k;
  }
  return best;
}
