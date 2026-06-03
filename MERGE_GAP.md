# CrownX × Jewel — Merge Gap Analysis

Answers three questions: **what was in the ZIP**, **where the Jewel services are**,
and **what didn't come over** (now closed). Companion to `MERGE_NOTES.md`.

---

## A · ZIP contents → merge status

The ZIP (`MEMORABILIA PLATFORM V11.zip`) held 7 HTML prototypes + 9 docs.

| ZIP file | Type | Status | Where it landed |
|---|---|---|---|
| `crownx-vault-v2.html` | design + 10 mechanics | ✅ ported | `packages/shared-design` (tokens/components), dashboard, feed, slab, mint |
| `crownx-landing.html` | landing + funnel | ✅ ported | `public-story-web/app/welcome` |
| `crownx-biometric-login.html` | passkey login | ✅ ported | `collector-vault/app/login` + `lib/webauthn.ts` |
| `share-card-pipeline.html` | mint → share card | ✅ ported | `collector-vault/app/_components/MintReveal.tsx` |
| `lv99-prototype.html` | /LV99 XP engine | ✅ **now ported** | `collector-vault/app/status` (interactive) + `LevelRing` |
| `crownx-royalty-rights.html` | sell/pool rights | ✅ **now ported** | `shared-pricing/rights.ts` + `collector-vault/app/rights` |
| `crownx-athlete-onboarding.html` | athlete claim funnel | ✅ **now ported** | `creator-portal/app/athlete` |
| `CrownX_Subscription_Model.docx` | consumer pricing | ✅ ported | `shared-pricing/tiers.ts` + `collector-vault/app/pricing` |
| `CrownX_LV99_Economy.docx` | XP curve / 99 ladder | ◑ partial | `status` page implements curve + tiers; full 99-row ladder values are a follow-up |
| `CrownX_Referral_Attribution.docx` | render→install→mint funnel | ◑ schema only | `infra/migrations/crownx` tables; service wiring is a follow-up |
| `CrownX_Royalty_Vault_Contract.docx` | on-chain split | ◑ config only | `royalty_config`/`athlete_claims`/`treasury_holds` tables |
| Exec Summary / Financial Model / GTM / Investor Deck | narrative | n/a | reference only (informed marketing copy) |

**The two conversion funnels that "didn't come over" — now built:**
- **Athlete claim funnel** (`/athlete`): hook → biometric verify → fork (claim / claim+subscribe / donate / sell stream) → done.
- **Royalty-rights funnel** (`/rights`): sell-your-stream DPV calculator + subscription-vs-buyout + lapse rule + rights secondary market (per-item + pooled).
- Plus the **§4.2 marketing funnel pages** (How It Works, Royalties for Life, For Creators, For Collectors, Trust & Security) and the interactive **/LV99** page.

---

## B · Where are all the Jewel services?

There are **70 services** in `services/*` (Wave 1–11), all Fastify + **in-memory**
(no DB needed to boot; they hardcode ports 4001–4072). They split into:

**Consumer-revamp core (11) — running, power the new surfaces:**
`identity :4001`, `asset-registry :4002`, `authentication :4003`, `coa-provenance :4004`,
`royalty-engine :4006`, `referral :4007`, `notification :4008`, `auction :4009`,
`offer :4010`, `watchlist :4011`, `growth-ranking :4013` (+ `api-gateway :4000`).

**Public-story enrichment (best-effort, optional):** `fraud-risk :4017`,
`campaign :4018`, `render-worker :4019`, `settlement :4015`, `analytics-warehouse :4020`,
`marketplace :4005`. The story page degrades gracefully when these are down.

**Enterprise / sovereign / legal / regulatory / tax / procurement (~52):**
billing-metering, sso-federation, erp-gl, contract-lifecycle, legal-*, regulator-*,
sovereign-*, tax-*, privacy-*, procurement-*, redlining-*, enterprise-planning,
crm-revops, etc. These back the **admin/governance portals**, not the consumer
revamp — not required for the funnel.

### Why not all 70 at once
Attempting to run the remaining ~59 simultaneously **exhausted system memory**
(`cannot allocate memory`, `paging file too small`, `failed to create OS thread`).
Each is a `tsx watch` (esbuild) process; ~70 watchers + 5 Next dev servers is too
much for this machine. **The core 11 are the right footprint** for the consumer
revamp. To run a governance portal's backend, start its specific services on
demand (they're all in `.claude/launch.json` patterns) or use `docker compose`
once Docker is available (compose file exists at `infra/compose/`).

### Service-layer gap (intentional)
No **new** CrownX microservice was added. The new mechanics live as: a shared
library (`shared-pricing`), additive gateway routes (`routes/crownx.ts`), and
additive tables (`infra/migrations/crownx`). XP/streaks/passkey persistence is
currently in-memory in the gateway + schema-ready in migrations; promoting them
to a dedicated `xp-service` / `passkey-service` is the documented next step.

---

## C · What's genuinely still open

1. ✅ **Mechanics promoted to live services** — `xp-service :4073` (append-only
   ledger, rank, leaderboard, anti-abuse), `attribution-service :4074`
   (render→view→activate→first-mint funnel), `passkey-service :4075`. Gateway
   proxies `/api/xp/*`, `/api/renders`, `/api/r/:id`, `/api/attribution/*`,
   `/api/auth/passkey/*`. **Smoke-tested end-to-end.**
2. ✅ **Full FIDO2** — `passkey-service` uses `@simplewebauthn/server` for real
   registration/authentication signature verification; client uses
   `@simplewebauthn/browser`. Gateway mints the JWT only on `verified:true`.
3. ✅ **Server-side share-card render** — `attribution-service` renders a
   deterministic **SVG** card + an OG/Twitter-card unfurl page at `/api/r/:id`
   (cacheable; client canvas remains the live preview). A raster step
   (resvg/sharp) can wrap it later for PNG-only platforms.
4. ✅ **Exact LV99 economy** — `@crownx-jewel/shared-xp` encodes the canonical
   curve `round(60·N^1.95)`, the 7 tiers, all XP action values, and the
   anti-abuse caps — shared by the client `/status` page and the xp-service.
5. ✅ **Referral attribution loop** — render_id (HMAC-signed) → deduped views
   (+60, capped) → activation edge → first-mint conversion (+800 ×1.5 for
   VANGUARD/LV45+, +500 invitee). K-factor + per-surface metrics computed.
6. ◑ **Postgres durability** — services remain in-memory by repo convention
   (Docker isn't installed here). The `crownx` migration is wired into
   `infra/migrations/all.sql`, and `xp/attribution/passkey-service` are added to
   `infra/compose/docker-compose.yml` — bring up compose for durable Postgres.

---

## C2 · Athlete Index, fractionalization & Legacy Circle (DONE)

- **`@crownx-jewel/shared-valuation`** — a dynamic, multi-factor athlete index so
  value reflects reality, not dreams: a hard **royalty-DCF floor** (signed
  contracts + sponsor smart contracts) plus a weighted brand index over on-field
  performance, off-field conduct/values, press sentiment (±), memorabilia trade
  velocity, market supply (scarcity factor), social reach, and **pluggable custom
  data points**. Outputs a stock-like price-per-share + a transparent breakdown.
- **`athlete-index-service :4076`** — the live exchange: ticker + price history
  with event annotations, **fractional ownership** (anyone owns a piece; shares,
  holdings, buy), **blockchain-tracked resale royalties** (athlete earns on every
  resale, on-chain tx ref; the resale also feeds the index), and the **Legacy
  Circle** ownership chain (Fan A → Fan B → …) tied directly to the athlete.
- **UI**: `/athletes` (stock ticker) + `/athletes/[slug]` (price chart with
  annotations, valuation breakdown, fractional buy, royalty ledger, Legacy Circle
  chain, share-to-go-viral). Live **leaderboard** + **athlete ticker** widgets on
  the dashboard.
- **Viral**: `ShareAthlete` mints an attribution render for the index card;
  **deferred-deep-link install attribution** added (view tags a device → install
  binds the render_id → first-mint converts).
- Gateway proxies `/api/athletes/*`; smoke-tested directly and through the
  gateway. NOTE: the api-gateway preview can hang after many hot-reloads under
  heavy process load — stop+start it (preview) to recover; the proxies are fine.

## C3 · Settlement, contracts, escrow, audit, on-chain (DONE)

- **`@crownx-jewel/shared-chain`** — pluggable on-chain anchoring adapter
  (default deterministic CrownX-genesis ledger, quantum-resistant sig label).
  COAs, royalties, valuations, and every escrow step are anchored + verifiable.
- **Contract DCF + price elasticity** (`shared-valuation`): upload a
  contract/NIL/sponsor smart contract → **CrownX-verified before it enters the
  valuation** → DCF over the life of the contract feeds the intrinsic floor; net
  buy/sell demand pressure swings the price via an elasticity band.
- **`athlete-index-service`** extended: contracts (upload→verify→DCF),
  career/news timeline (college → NIL → draft → pro/European upcoming deals),
  buy **and sell** (easy conversion), sovereignty **consent + redaction** on the
  owner chain, royalty events anchored + pushed to settlement, **insurance
  verification**, **appraiser pipeline**, and a **real-time audit package** for
  auditors/regulators.
- **`pack-n-ship-service`** — CrownX Authentication Pack-N-Ship: Sell → pay to
  **escrow** → Package COA → Ship COA → track → delivered → **buyer live-AI
  re-authentication GATES Genesis-COA release + funds release** to the seller.
  No-response → **investigation** with connected-accounts-by-invite detection,
  asset-under-another-user monitoring, and an anomaly score before any release.
- **UI**: `/trade` Pack-N-Ship pipeline tracker; athlete detail gains contract
  upload/verify, career/news timeline, audit + insurance tools, elasticity badge.
- Gateway proxies all of the above; smoke-tested end-to-end through the gateway.

## D · Net: the merge is comprehensive

Every consumer-facing ZIP surface is now in the product, on one design system,
reading from one pricing module, behind one gateway — with the two missing
conversion funnels (athlete claim, royalty rights), the interactive /LV99, and
the full marketing funnel all built. Remaining items are persistence/hardening,
not missing features.
