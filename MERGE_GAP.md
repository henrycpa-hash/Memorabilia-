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

## C9 · Genesis COA — dynamic 3D/4D artifact + AR/VR (WebXR) (DONE)

From `Genesis COA Artifact Specification.docx` + the Provisional/Non-Provisional
Addendum: the Genesis COA is no longer a static record — it is a dynamic,
dual-sided, cryptographically sealed 3D/4D artifact, fully viewable in the
market, in viral shares, and in immersive AR/VR.

- **`@crownx-jewel/shared-coa`** — the canonical artifact model + `buildGenesisCoa()`:
  §1 dual-pane (Pane A live-capture video with rolling-nonce / session-DNA /
  biometric overlays; Pane B RFC-3161 timestamp, geostamp, TEE/TPM device,
  ownership lineage, redundancy); §4 micro-detail `artifactDescriptor` (surface
  scan, imperfections/perfections, autograph, invisible UV/IR/taggant/Raman
  traits, canonical fusion vector); §5 cryptographic anchors (session DNA,
  vector hash, tri-code proof, provenance evidence, dual L2/L1 chain anchor,
  SHA3-512 + Kyber/Dilithium/Falcon, entropy score); the 15 expanded
  identifiers; §3 unlockable gamified layers (owner/wallet-gated, time-gated,
  re-sealed on transfer); §2 `XrAccessSpec` (60fps/1080p, immersive-ar/vr,
  Meta Quest / AR glasses, 2D fallback); ISO 20022 + royalty hooks. Pure +
  deterministic. `unlockLayer()`, `resealOnTransfer()`, `coaLayers()`, `verifyOverlays()`.
- **`coa-artifact-service :4081`** — stores/serves artifacts; issues on mint;
  §3 unlock (tamper-proof record, owner-gated → 403); §2 opens immersive WebXR
  sessions (PQC session token, gesture logging); transfer re-seal; market/feed
  gallery. Every issuance/unlock/session anchored via shared-chain. Seeded with
  4 viewable COAs.
- **Minting wired**: `authentication-engine-service` now issues a Genesis COA
  Artifact on every authenticated mint (additive, non-blocking) and returns its
  `viewUrl`. Counterfeit → no artifact.
- **`CoaViewer3D`** (shared-design, `"use client"`) — the centerpiece viewer:
  drag-to-rotate dual-pane holographic card (auto-orbits = the 4D/time axis),
  flip front↔back, depth-tab inspector (live capture, micro-detail, identifiers,
  anchors, unlockables with tap-to-unlock), and **real WebXR** — "Enter VR" /
  "Enter AR" feature-detect `navigator.xr`, request an immersive session, and
  render the COA as textured quads in the headset via a dependency-free WebGL
  loop (select flips panes; gestures logged); graceful 2D fallback when no XR.
- **Surfaced everywhere**: public `/coa` gallery + `/coa/[id]` viewer in
  collector-vault (nav "COA 3D/AR") with a viral `ShareCoa` (native share +
  copy link); same viewer/gallery in market-web (buyers inspect before buy);
  "View COA in 3D/AR" CTA on the mint result; athlete pages link their Genesis
  COA. Gateway proxies `/api/coa-artifact/*`; `/api/health` covers `coaArtifact`.
- Smoke (`scripts/smoke-coa-artifact.mjs`): gallery → full artifact (11 3D
  layers, 11/15 identifiers, overlay valid) → public unlock → owner-only blocked
  403 → VR session on Meta Quest + gesture log → fresh issue — all green through
  the gateway. Plus mint→artifact verified live (genesis → viewUrl, xrViewable).
  Ports now 4073–4081.

## C8 · Royalty Vault — held-until-claim treasury + athlete claim funnel (DONE)

- **`@crownx-jewel/shared-royalty`** — the canonical smart-contract split engine
  from `CrownX_Royalty_Vault_Contract.docx`: a fixed **10% royalty** (1000 bps) on
  every resale, split across **4 scenarios** (`default`, `athlete_originated`,
  `live_authenticated`, `donation`) and **tiers** — fan Free/Collector+/Sovereign
  (60/75/85%) and athlete Free/Pro/Elite (70/80/90%) — with a hard
  `PROTOCOL_FLOOR_BPS` (5%) CrownX floor enforced. `computeShares()` →
  `settleSale()` returns originator / athlete / CrownX cents + seller-nets.
- **`royalty-vault-service :4080`** — the on-chain royalty engine keyed by an
  **athleteId that maps 1:1 to the athlete-index account** (slug). Each resale
  settles the split, **holds the athlete's slice in the CrownX treasury**
  earmarked to their account until they verify & claim (the acquisition
  flywheel), anchors `royalty.paid` on-chain, and grants the originator **+400 XP**
  (`royalty_originated`). Donation election locks after first resale; lapse
  reverts boosted tiers to default. Seeded held balances connect real athletes
  (dylan-crews $24.8K/7pc, a-vanguard, k-solace, m-aurelia).
- **Connection to the athlete account**: the `/athletes/[slug]` page now renders a
  **Royalty Vault panel** (held-for-athlete / claimed-lifetime / donated-forward +
  claim CTA), reading the same vault the claim funnel writes.
- **Claim funnel** (`creator-portal /athlete`) is now **wired LIVE** to the vault:
  hook shows the real held balance → biometric verify → fork (claim / claim+
  subscribe / donate / sell-stream) calls the real endpoints through the gateway,
  so claiming releases the held balance and post-claim resales pay direct.
- Gateway proxies `/api/royalty-vault/*` (namespaced to avoid the existing
  `/api/vault/me`); aggregate `/api/health` covers `royaltyVault`. Smoke
  (`scripts/smoke-royalty-vault.mjs`) verifies **held → claim → direct** end-to-end
  through the gateway: COA 6000/1000/3000 bps, $10K resale holds $100, claim
  releases it, next $15K resale pays $150 direct, ELITE subscribe → 90%, donation
  locks 409 after first resale.

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

## C7 · Network feed: 3D mints, live bids, click-to-buy, athlete news (DONE)

- **`network-feed-service :4079`** — one stream of market news + viral moments:
  `mint` (3D floating slab), `listing` (click-to-buy), `auction` (live bids),
  `athlete_news` (moves the tokenized athlete value), `promo`.
- **Comments scoped**: allowed only on athlete_news + promo so chatter never
  crowds the items on the market (mint/listing/auction stay clean — verified
  `comments_disabled_on_market_items`).
- **Athlete news re-prices the token**: posting news calls athlete-index signals
  and shows the live delta (verified +3.7% on a major-endorsement post).
- **Live bids** on auctions (higher-or-reject); **click-to-buy** a listing opens
  a **Pack-N-Ship escrow trade** (the purchase flows straight into pack/ship);
  **boost** amplifies reach and grants XP + a share-card render (viral loop).
- **UI `/feed`** with a drag-to-spin **3D/4D holographic FloatingSlab3D** on mint
  moments, buy/bid/boost/comment inline. Gateway proxies `/api/feed/*`;
  aggregate `/api/health` now covers networkFeed.

## C6 · Live authentication engine + minting dashboard (DONE — from the SOP)

- **`@crownx-jewel/shared-authcore`**: deterministic multi-sensor fusion +
  COA decision + weighted pricing from the SOP. Fuses AI photo-matching, NFC/RF
  wave, Wi-Fi reflection, thermal/heat, material composition, and **fractional
  hairline micro-detail** (plus tri-code, liveness, biometric, event correlation)
  → confidence + anomaly → Genesis/Verified/Counterfeit. `priceMemorabilia()`
  computes a **weighted dynamic value** from PSA / Beckett / JSA / WorthPoint /
  eBay-sold comps (the Memorabilia Database sources), scaled by live-auth
  confidence. `TRAINING_SOURCES` registry exposes the reference authorities.
- **`authentication-engine-service :4078`** runs the SOP pipeline end-to-end:
  Step 0 sealed session → Step 1 live-capture Proof-of-Origin → Steps 2–4
  multi-sensor fusion + event correlation → Step 3 tri-code → Step 5 COA decision
  → Step 6 AI fingerprint hash → Step 7 blockchain provenance anchor → **Step 8:
  an authenticated mint CLIMBS /LV99** (grants first_mint/mint_top/mint_standard
  XP via the xp-service). Verified: an authentic mint issued a Genesis COA worth
  $7.6K and gave +1700 VXP (leveled up); a tampered item was flagged counterfeit
  with the COA blocked and no rank credit.
- **`/mint` dashboard** (collector-vault): live-capture scanner → animated
  multi-sensor fusion bars (photo/NFC/Wi-Fi/heat/material/hairline) → COA verdict
  → fingerprint + on-chain anchor → Genesis COA + weighted value + **rank-climb
  panel**, plus the AI reference-data-sources panel. Gateway proxies `/api/auth/*`.

## C5 · Auto-market-making + net-worth hero (DONE)

- **Automated market maker** in `athlete-index-service`: a designated MM holds
  inventory per athlete and quotes a fresh bid/ask ladder (5 levels each side,
  ~1.2% spread, 500 shares/level) around the index price — seeded on boot and
  re-quoted on an interval. The book always has liquidity, so a fan can buy/sell
  fractions instantly without waiting for a human counterparty (verified: a
  buy crossed the MM ask and filled immediately). The MM is excluded from
  stakeholder XP, dividends, and the top-stakeholders leaderboard. Manual
  re-quote: `POST /api/athletes/:id/market-make`.
- **Net-worth hero on the dashboard**: server-side `currentUserId()` decodes the
  session, fetches `/api/portfolio/:userId`, and renders a gold net-worth banner
  (net worth + royalties + P&L) linking into `/wealth` — the daily loop entry.

## C4 · Wealth daily-loop, hardening & demo users (DONE)

- **Wealth daily-loop** (`/wealth`): net-worth hero, daily check-in streak (→XP),
  athlete portfolio with P&L, royalty income + projected-annual-royalty stream,
  and a three-move daily loop geared toward building wealth + royalty streams.
- **Royalty dividends**: a 25% slice of each resale royalty is distributed
  pro-rata to fractional holders — owning a piece of an athlete is a live royalty
  stream (verified: a seeded user earned **$236 royalty income** from holdings).
- **`portfolio(userId)`** endpoint: holdings P&L, cost basis, unrealized, royalty
  income, projected yield, net worth. Gateway proxy `/api/portfolio/:userId`.
- **Production hardening**: resilient gateway proxies (AbortController timeout →
  `503 upstream_unavailable` instead of hanging/crashing), aggregate
  `/api/health` readiness across all 5 CrownX services, input validation/clamps.
- **Demo users**: `node scripts/seed-demo-users.mjs` → henry/raul/eric@crownx.ai
  (password `CrownXDemo!2026`) with slabs, XP, athlete holdings, and royalties.
- **Design**: premium fixed cyan→gold top-accent hairline across every app.
- **QA**: all 15 CrownX packages/services/apps typecheck clean; round-6/round-7
  regression smokes pass; aggregate health green.

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
