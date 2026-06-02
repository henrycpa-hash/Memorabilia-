# CrownX — Consumer Pricing Model

Implemented in **`packages/shared-pricing`** (`@crownx-jewel/shared-pricing`).
This is the **consumer / creator** plan ladder. It is a *separate surface* from
the **enterprise / tenant** SaaS billing in `@crownx-jewel/shared-billing` +
`billing-metering-service`, which is **PRICING-LOCK** and was not touched.

## Three distinct, stacking price dimensions

> "Pricing for better royalties is different pricing, and buyouts of royalties is
> different — all additions to the price."

| # | Dimension | Where | What it is |
|---|---|---|---|
| 1 | **Subscription** | `tiers.ts` | The monthly plan fee (Free / Premium / Legacy) + per-mint fee. |
| 2 | **Royalty-keep** | `royalties.ts` | A **separate monthly add-on** that raises your share of the fixed 10% royalty (up to 85%). |
| 3 | **Royalty buyout** | `buyout.ts` | A **separate one-time** lump sum = present value of your future royalty stream. |

`composePriceBreakdown()` (in `index.ts`) returns all of these as transparent
line items so the UI can show exactly what stacks on top of what.

The **10% lifetime resale royalty itself never changes** — only the collector's
*share* of it does. The athlete/CrownX split of the remainder is governed
per-asset by `royalty_config` (the locked settlement engine reads it).

## 1 · Subscription tiers (authoritative — from "✅ Subscription Model.docx")

| | **Starter** (Free) | **Premium** | **Legacy** |
|---|---|---|---|
| Monthly | **$0** | **$9.99** | **$19.99** |
| Free trial | — | 7 days | 15 days |
| Minting fee | **$2.99** / COA | **$0.99** / COA | **$0.99** / COA |
| Monthly mint limit | Unlimited | 6 (+ unlimited drafts) | Unlimited |
| Marketplace | View-only, 1 interaction/mo | Full (buy/sell) | Full (buy/sell) |
| Wallet | Custodial | MetaMask / WalletConnect | Hot+cold + multisig |
| AI auth time | ≤ 12 hrs | ≤ 30 min | ≤ 5 min |
| Boosts | 0 | 1 / mo | 3 / mo |
| Baseline royalty keep | 50% | 70% | 80% |
| Max royalty keep | 50% | 80% | 85% |
| Support | Email 48–72 hr | Priority email 24 hr | Concierge + live chat |

Full feature lists per tier live in `tiers.ts` (`CONSUMER_TIERS`). UIs render
**from** that constant — numbers are never hardcoded in components.

## 2 · Royalty-keep add-ons (`ROYALTY_KEEP_ADDONS`)

Optional monthly upgrades that raise your share of the 10%, gated by tier cap:

| Add-on | Keep | Price/mo | Eligible |
|---|---|---|---|
| Keep 70% | 70% | included | Premium, Legacy |
| Keep 80% | 80% | $4.99 | Premium, Legacy |
| Keep 85% (max) | 85% | $9.99 | Legacy |

`effectiveKeepBps(tier, addonKey)` resolves the final keep (capped at the tier
max and the platform ceiling of 85%). `computeRoyaltySplit(resaleCents, keepBps)`
splits a resale's 10% pool into collector vs. athlete+platform.

> Prices for the keep add-ons + buyout discount rates are **configurable
> business inputs** (sensible defaults shipped). The subscription numbers in
> §1 are the doc-authoritative values.

## 3 · Royalty buyout (`quoteRoyaltyBuyout`)

A separate, one-time transaction. Deterministic discounted-cash-flow of the
projected royalty stream:

```
PV = Σ (t=1..H)  income₀ · (1+g)^t / (1+r)^t
```

- `income₀` = trailing-12-month royalty income, re-scaled to the **effective
  keep** (so a freshly-purchased keep boost raises the offer).
- `g` = expected annual growth (default 6%).
- `r` = tier discount rate (Legacy 12% < Premium 16% < Free 22% — higher tier =
  better offer).
- `H` = horizon years (default 10, capped 1–30).

Returns `{ offerCents, projectedIncomeCents, effectiveMultiple, … }`.

## Surfaces & routes

- **UI**: `apps/collector-vault/app/pricing` — tier grid (server, reads the
  module) + `BuyoutCalculator` (client; live keep + buyout math).
- **Gateway (read-only, additive)** — `services/api-gateway/src/routes/crownx.ts`:
  - `GET  /api/pricing/tiers`
  - `POST /api/pricing/buyout-quote`
  - `POST /api/pricing/breakdown`

None of these compute or alter a platform fee; they expose the consumer pricing
module so every surface reads the same numbers.
