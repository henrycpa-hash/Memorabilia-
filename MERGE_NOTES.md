# CrownX × Jewel — Merge & Revamp Notes

Execution log for the merge spec (`CrownX_Jewel_Merge_Instructions.docx`). This
folds the **CrownX** design system, viral mechanics, and new surfaces into the
existing **Jewel** platform — one unified product, **pricing preserved**.

> ⚠ **Pricing, billing, fee, checkout, and payout logic are SOURCE OF TRUTH and
> were NOT changed.** This is a design + experience revamp plus an additive
> feature merge. Every commercial-logic file in the PRICING-LOCK list below was
> treated read-only.

---

## 0 · Repo reality vs. spec

- **Not a git repository** (`git init` has not been run). The spec asks for a
  `feature/crownx-revamp` branch; create one before committing:
  `git init && git checkout -b feature/crownx-revamp`. All work here is additive
  and reskins existing files, so it diffs cleanly once initialized.
- **Dependencies are not installed** (no `node_modules`, no `pnpm-lock.yaml`).
  Build-gate the work with: `pnpm install && pnpm typecheck && pnpm build`.

## 1 · Stack & structure

- **Monorepo**: pnpm workspaces + Turborepo. `apps/*` (13 Next.js 15 App-Router
  apps, React 18), `services/*` (70 Node/TS services), `packages/*` (shared TS
  libraries, consumed directly from `src` and transpiled by Next/tsc).
- **Styling system (before)**: no Tailwind, no CSS files — every app used
  **inline styles with hardcoded hex** (`#0e1320`, `#3a86ff`, …) duplicated per
  surface. There was **no shared UI/token package**.
- **Styling system (after)**: a new `@crownx-jewel/shared-design` package is the
  single source of truth — `tokens.ts` (inline-style consumers), `theme.css`
  (CSS variables + fonts + keyframes), and server-safe React primitives.

## 2 · Design tokens (installed)

`packages/shared-design/src/tokens.ts` + `theme.css`, ported 1:1 from the
canonical `crownx-vault-v2.html`:

```
void #04060d · ink #0c1120 · panel #121c30 · deep #0a2540
cyan #3fd9d4 · cyan-hi #8ff5f1 · cyan-dk #1c6f6b   (dominant)
gold #d9a82e · gold-hi #f7e08a                     (accent)
txt #eef1f8 · mut #7d869c · line rgba(255,255,255,.08)
win #37d39a · hot #ff4d6d
display Bebas Neue · body Sora · mono Azeret Mono
radius 8–22px · dark-first · holo on reveals
```

CSS consumers use the mirrored custom properties (`--cx-cyan`, `--cx-gold`, …);
inline consumers import `{ color, font, radius, … }`.

## 3 · PRICING-LOCK list (DO NOT EDIT — wire UI to these, never rewrite)

Commercial logic identified via `grep -niE 'price|billing|checkout|stripe|plan|tier|subscription|invoice|fee|payout|settlement|royalty'`.
Get human sign-off before any change that would touch these:

**Services**
- `services/billing-metering-service/**` (billing.service.ts, routes/billing.ts, db/schema.ts)
- `services/marketplace-service/src/domain/checkout.service.ts`, `routes/checkout.ts`, `db/schema.ts`
- `services/royalty-engine-service/src/routes/royalty.ts`
- `services/revenue-share-service/**`, `services/settlement-service/**`
- `services/payment-integration-service/**`, `services/ledger-payout-service/**`
- `services/tax-remittance-service/**`, `services/tax-localization-service/**`
- `services/finance-export-service/**`, `services/erp-gl-connector-service/**`
- `services/api-gateway/src/routes/billing.ts`, `routes/marketplace.ts`, `routes/finance-export.ts`

**Packages**
- `packages/shared-billing/**`, `packages/shared-payments/**`
- `packages/shared-finance-export/**`, `packages/shared-tax/**`
- `packages/shared-revenue-share/**`, `packages/shared-ledger/**`
- `packages/contracts/src/marketplace.ts` (pricing/offer types)

**App surfaces that DISPLAY pricing (reskin shell only; numbers come FROM the code above)**
- `apps/market-web/app/listings/**`, `apps/market-web/app/auctions/**`
- `apps/creator-portal/app/listings/page.tsx`

The new `royalty_config` table (migration below) stores **split configuration**
the existing royalty/settlement engine reads — it never computes a fee, and the
subscription tier that scales the collector's keep still comes from pricing code.

## 4 · MERGE-MAP (Jewel concept → CrownX treatment)

| Jewel concept | App / file | CrownX treatment |
|---|---|---|
| Global shell / nav / theme | every `app/layout.tsx` | `AppShell` + `theme.css`, crown crest, dark cyan/gold palette |
| Auth screens | `collector-vault/app/login` | **Biometric WebAuthn passkey** login; existing email/password preserved as fallback |
| Home / feed | `collector-vault/app/dashboard` | Stat cards + `LiveFloor` sparkline + `/LV99` ring + `ActivityFeed` (mint/level/royalty/floor events) |
| Asset / listing | `collector-vault/app/portfolio` | **Living Slab** cards (graded, chain-anchored, live floor) |
| Public marketing | `public-story-web/app/welcome` | Landing + 4-step funnel (Land→Verify→Mint→Ascend), social proof, feature grid, founder-slab capture |
| Market | `market-web` | CrownX shell + tokens (listing/auction pages bind to existing market data) |
| Creator | `creator-portal` | CrownX shell + tokens |
| Pricing pages | `market-web` listings | **Reskin only** — numbers read from PRICING-LOCK code |

## 5 · What was executed

**Phase 2 — Design system (done)**
- `packages/shared-design`: `tokens.ts`, `theme.css`, `components.tsx`
  (`AppShell`, `Brand`, `Crown`, `Panel`, `Stat`, `Badge`, `SectionTag`,
  `ButtonLink`, `LevelRing`, `Sparkline`, `SlabCard`, `ActivityFeed`, `Hero`).

**Phase 2 — Reskin (done: flagship + shells)**
- `collector-vault` fully reskinned: layout shell, home hero, dashboard,
  portfolio (Living Slabs), notifications, biometric login.
- `market-web`, `public-story-web`, `creator-portal`: layouts/shell + theme
  adopted (each wired with `transpilePackages` + `workspace:*` dep).

**Phase 3 — Viral mechanics (ported into components, feature-flag-ready)**
- `/LV99` status ring + XP model → `LevelRing` + `xp_ledger` table.
- Live market floor + sparkline → `LiveFloor` (binds to asset price/order data;
  simulates until wired).
- Social feed (mint/level/royalty/floor events) → `ActivityFeed`.
- Royalty Vault split scenarios → `royalty_config` / `athlete_claims` /
  `treasury_holds`.
- Share-card attribution funnel → `renders` / `render_views` /
  `referrals_attribution`.
- Integrity guardrails carried over: disclosed-odds rarity only, Floor Call is
  XP-only (no cash wager), "quantum-resistant" wording.

**Phase 4 — New surfaces (done)**
- Landing + funnel: `public-story-web/app/welcome`.
- Biometric login on real WebAuthn: `collector-vault/app/login` +
  `lib/webauthn.ts` (registration/login via `navigator.credentials`, public key
  only stored server-side, bound to CrownX origin, email/password fallback).

**Phase 5 — Data additions (done, additive)**
- `infra/migrations/crownx/0001_crownx_revamp.sql` — `xp_ledger` (append-only,
  immutability trigger), `lv99_rank_cache`, `passkey_credentials` +
  `passkey_challenges`, `renders`/`render_views`/`referrals_attribution`,
  `royalty_config`/`athlete_claims`/`treasury_holds`, `streaks`,
  `leaderboard_cache`. Run with `pnpm db:migrate:crownx` (`CROWNX_DB_URL`).

## 6 · Backend routes (DONE — additive, no pricing-lock files touched)

Implemented in `services/api-gateway/src/routes/crownx.ts`, registered in
`app.ts` (additive wiring only; locked `billing.ts` untouched):

- `POST /api/auth/passkey/{register,login}/{options,verify}` → WebAuthn passkey
  auth. Stores ONLY the public credential, enforces challenge binding +
  sign-count monotonicity, mints the existing JWT session. (Full FIDO2 signature
  verification = add `@simplewebauthn/server` in prod — noted in the file.)
- `POST /api/public-story/waitlist` → founder-slab capture, best-effort CRM
  fan-out.
- `GET /api/pricing/tiers`, `POST /api/pricing/buyout-quote`,
  `POST /api/pricing/breakdown` → read-only reads of `@crownx-jewel/shared-pricing`.

## 6b · Consumer pricing model (DONE — see PRICING.md)

`packages/shared-pricing` implements the consumer plan ladder from
"✅ Subscription Model.docx" as **three stacking, separately-priced dimensions**:
subscription tiers (Free/Premium/Legacy), royalty-keep add-ons (better royalties
= different price), and royalty buyouts (lump-sum PV = different price). This is
**separate from** the locked enterprise billing in `shared-billing`. UI surface:
`apps/collector-vault/app/pricing` (+ `BuyoutCalculator`).

## 7 · Done this round + remaining polish

**Done**
- Passkey + waitlist + pricing gateway routes (§6).
- Consumer pricing module + Pricing UI + buyout calculator (§6b).
- Mint → reveal → share-card canvas (`apps/collector-vault/app/_components/MintReveal.tsx`)
  with disclosed-odds rarity; wired into the portfolio header.
- `market-web` listings inner page reskinned to `SlabCard` (price read verbatim
  from listing data — display only).

**Remaining (follow-up)**
- Deep-reskin the rest of `market-web` / `creator-portal` inner pages
  (auction/listing detail, asset register) to `Panel`/`SlabCard`.
- Server-side share-card render (Satori/headless canvas) for reliable OG/Twitter
  unfurls + caching by asset hash (client canvas is the live preview today).
- Wire `LiveFloor`, `ActivityFeed`, `LevelRing` to live service data behind flags;
  add full FIDO2 signature verification to the passkey routes.

## 8 · Verify — RESULTS

Run on this machine (`feature/crownx-revamp`):

- `pnpm install` → ✅ done in ~87s (only pre-existing peer warnings, e.g.
  incident-command-portal React 19 vs Next 15 — unrelated to this work).
- `pnpm --filter <pkg> typecheck` → ✅ **clean** for: `@crownx-jewel/shared-design`,
  `@crownx-jewel/shared-pricing`, `api-gateway`, `collector-vault`, `market-web`,
  `public-story-web`, `creator-portal`.
- `pnpm --filter collector-vault build` → ✅ **`Compiled successfully`** +
  `Generating static pages (9/9)`. The build then errors ONLY in the
  `output: "standalone"` symlink-copy step with `EPERM: symlink` — a Windows +
  OneDrive permission limitation (symlinks need Developer Mode / non-OneDrive
  path), NOT a code error. To get a fully green `build` here, enable Windows
  Developer Mode or build outside OneDrive; deployment (Docker/Linux) is
  unaffected.

**Pricing untouched — proof by change-set.** Files created/edited are limited to:
`packages/shared-design/*` (new), `packages/shared-pricing/*` (new),
`infra/migrations/crownx/*` (new), `services/api-gateway/src/routes/crownx.ts`
(new) + 2 additive lines in `services/api-gateway/src/app.ts` + 1 dep in its
`package.json`, 1 migrate script in root `package.json`, and `apps/*` UI files.
**Zero** changes under `billing-metering-service`, `marketplace-service`
(checkout), `royalty-engine-service`, `settlement-service`,
`payment-integration-service`, `ledger-payout-service`, `shared-billing`,
`shared-payments`, `shared-finance-export`, `shared-tax`, `shared-revenue-share`,
`shared-ledger`, or `contracts/marketplace.ts`.

```bash
pnpm db:migrate:crownx                   # apply the additive tables
```
