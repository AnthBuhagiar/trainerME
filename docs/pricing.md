# Hour Power pricing (F3)

**The rule:** every rider pays 5.99 a month or 59 a year in their own currency, times a power of ten, tax included. The rider pays exactly the number shown.

- **Core currencies, always plain 5.99 / 59:** AUD, USD, GBP, EUR, NZD, CAD.
- **Other currencies** keep the same digits and move by a power of ten (59.90 / 590, 599 / 5,900, 5,990 / 59,000, 59,900 / 590,000). The power of ten is the one that lands closest to what A$5.99 buys in Australia, measured by purchasing power, not the exchange rate.
- **Anywhere else** (no currency below, or very high inflation since the purchasing-power data: Argentina, Türkiye, Nigeria, Egypt, Ukraine, Pakistan) pays US$5.99 / US$59. Mainland China is left out (Strava isn't available there).
- The rider's currency comes from their country (Cloudflare's `CF-IPCountry` header). Unknown shows Australian dollars.

Code: `src/lib/billing/plans.ts` (the table and `nearestScale`), enforced by tests in `src/lib/referral/referral.test.ts`.

## How the power of ten is chosen

1. **Fair local price** = A$5.99 × (local PPP ÷ Australian PPP), using the World Bank's PPP conversion factor for private consumption (local currency per international dollar, 2020–21; Australia 1.57).
2. **Pick the power of ten** whose 5.99 is closest to that fair price, on a log scale (so ×2 too dear and ÷2 too cheap count the same). Currencies without everyday cents start at 599.
3. **"Feels like"** below is the monthly price turned back into what it would buy in Australia.

Because the digits are fixed, each currency can only move in steps of ×10, so any currency can land up to about 3× from A$5.99 in buying power. Most land within 2×.

## The table

"Feels like" = what the monthly price buys locally, as Australian dollars would buy at home. "At today's rate" = the monthly price converted at market exchange rates (28 Oct 2026), for comparison. ↑ more than A$12, ↓ less than A$3.

| Currency | Monthly | Yearly | Feels like | At today's rate |
|---|---|---|---|---|
| AUD (Australian dollars) | A$5.99 | A$59 | A$5.99 | A$5.99 |
| USD (US dollars) | US$5.99 | US$59 | A$9.40 | A$8.50 |
| GBP (pounds sterling) | £5.99 | £59 | A$12.06 ↑ | A$11.32 |
| EUR (euros) | €5.99 | €59 | A$12.06 ↑ | A$9.48 |
| NZD (New Zealand dollars) | NZ$5.99 | NZ$59 | A$5.81 | A$4.78 |
| CAD (Canadian dollars) | CA$5.99 | CA$59 | A$7.12 | A$6.07 |
| CHF (Swiss francs) | CHF 5.99 | CHF 59 | A$7.12 | A$10.26 |
| SGD (Singapore dollars) | S$5.99 | S$59 | A$9.31 | A$6.63 |
| MYR (ringgit) | RM 5.99 | RM 59 | A$5.84 | A$2.08 |
| BRL (reais) | R$5.99 | R$59 | A$3.72 | A$1.59 |
| PLN (złoty) | PLN 5.99 | PLN 59 | A$4.85 | A$2.15 |
| RON (lei) | RON 5.99 | RON 59 | A$4.80 | A$1.77 |
| SAR (riyals) | SAR 5.99 | SAR 59 | A$5.63 | A$2.27 |
| AED (dirhams) | AED 5.99 | AED 59 | A$3.54 | A$2.31 |
| ILS (shekels) | ₪5.99 | ₪59 | A$2.20 ↓ | A$2.72 |
| SEK (Swedish kronor) | SEK 59.90 | SEK 590 | A$9.98 | A$8.58 |
| NOK (Norwegian kroner) | NOK 59.90 | NOK 590 | A$8.84 | A$9.17 |
| DKK (Danish kroner) | DKK 59.90 | DKK 590 | A$12.36 ↑ | A$12.68 |
| HKD (Hong Kong dollars) | HK$59.90 | HK$590 | A$15.52 ↑ | A$10.83 |
| INR (rupees) | ₹59.90 | ₹590 | A$4.44 | A$0.89 |
| ZAR (rand) | R 59.90 | R 590 | A$13.51 ↑ | A$5.11 |
| MXN (Mexican pesos) | MX$59.90 | MX$590 | A$8.76 | A$4.56 |
| CZK (koruna) | CZK 59.90 | CZK 590 | A$6.34 | A$3.89 |
| THB (baht) | ฿59.90 | ฿590 | A$7.66 | A$2.52 |
| PHP (Philippine pesos) | ₱59.90 | ₱590 | A$4.63 | A$1.33 |
| JPY (yen) | ¥599 | ¥5,900 | A$8.26 | A$5.38 |
| HUF (forint) | HUF 599 | HUF 5,900 | A$5.54 | A$2.58 |
| ISK (Icelandic krónur) | ISK 599 | ISK 5,900 | A$5.84 | A$6.98 |
| CLP (Chilean pesos) | CLP 599 | CLP 5,900 | A$2.00 ↓ | A$0.86 |
| KRW (won) | ₩5,990 | ₩59,000 | A$9.71 | A$6.33 |
| COP (Colombian pesos) | COP 5,990 | COP 59,000 | A$6.15 | A$2.69 |
| IDR (rupiah) | Rp 59,900 | Rp 590,000 | A$18.56 ↑ | A$4.68 |
| VND (đồng) | VND 59,900 | VND 590,000 | A$11.90 | – |

## Outliers to decide on

The ×10 steps leave a few currencies well off A$5.99 in buying power, with no closer option that keeps the digits:

- **Dearer (↑):** Indonesia (Rp 59,900 feels like A$18.56; the step below, Rp 5,990, would feel like A$1.86), Hong Kong, South Africa, Denmark, and the UK and euro area (fixed at 5.99 by choice).
- **Cheaper (↓):** Chile (CLP 599 feels like A$2.00; CLP 5,990 would feel like A$20), Israel.

Options per outlier: keep it (simplest, and the rule stays the same everywhere), or move that country to US$5.99. Moving rarely helps: for weaker currencies the US$ price converts to roughly the higher step.

## Against JOIN

JOIN charges €16.99 a month or €119.99 a year (join.cc/pricing, 29 Oct 2026; euro prices only), about A$26.88 and A$190 at today's rate. Hour Power's dearest countries, as a share of JOIN's price at market exchange rates:

| Country | Monthly | Yearly |
|---|---|---|
| Indonesia | 17% | 24% |
| South Africa | 19% | 27% |
| Euro area | 35% | 49% |
| Hong Kong | 40% | 56% |
| UK | 42% | 59% |
| Denmark | 47% | 66% |

Both are priced in the same local money, so the shares hold in buying-power terms too. If JOIN sets lower local app-store prices in some countries, the gap there narrows.

## Before billing opens

- Set each currency's prices in the billing provider to match this table, **tax-inclusive** everywhere (including US and Canadian sales tax, so the rider pays exactly what's shown and Hour Power absorbs the tax).
- Re-check the purchasing-power data yearly (World Bank releases new PPP rounds) and re-run the tests; a currency changes step only if its fair price crosses the halfway point between two steps.

Sources: World Bank, PPP conversion factor, private consumption (PA.NUS.PRVT.PP), via indexmundi.com; exchange rates from x-rates.com and fxfeed.io, 28 Oct 2026.
