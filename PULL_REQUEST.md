# CrownX × Jewel — Merge, Revamp & Athlete Economy

**Branch:** `feature/crownx-revamp` · **Pricing preserved (PRICING-LOCK honored)**

Folds the CrownX design system, viral mechanics, consumer pricing, the Athlete
Index economy, settlement/escrow, and an on-chain trust layer into the Jewel
platform — one unified product. No changes to billing/checkout/settlement/
royalty-engine logic.

## Highlights

### Design system & surfaces
- `@crownx-jewel/shared-design` — tokens, `theme.css`, React primitives (crown crest).
- Reskinned `collector-vault`, `market-web`, `public-story-web`, `creator-portal`.
- New surfaces: `/welcome` landing + funnel, biometric login, `/pricing`,
  `/rights`, `/status` (LV99), athlete claim funnel, mint→reveal→share-card,
  marketing pages (how-it-works / royalties / creators / collectors / trust).

### Consumer pricing (separate from locked enterprise billing)
- `@crownx-jewel/shared-pricing` — Free/Premium/Legacy tiers, royalty-keep
  add-ons, royalty buyouts (DCF), rights market. Numbers from the subscription doc.

### Live services (additive, in-memory; ports 4073–4077)
- `@crownx-jewel/shared-xp` + `xp-service` — canonical LV99 economy
  (`round(60·N^1.95)`, 7 tiers), append-only ledger, leaderboard, anti-abuse.
- `attribution-service` — render_id funnel, server-side SVG share card + OG
  unfurl, deferred-deep-link install attribution.
- `passkey-service` — real FIDO2 via `@simplewebauthn`; gateway mints JWT on verify.
- `@crownx-jewel/shared-valuation` + `athlete-index-service` — dynamic athlete
  index (royalty-DCF floor from verified contracts + weighted brand signals +
  scarcity + **price elasticity**), stock ticker, **fractional ownership**,
  blockchain-tracked resale royalties, **Legacy Circle** owner chain with
  sovereignty consent/redaction, career/news timeline, **peer-to-peer order
  matching**, **human-in-the-loop appraiser queue**, insurance verify, real-time
  auditor/regulator package.
- `@crownx-jewel/shared-chain` — pluggable on-chain anchoring adapter
  (quantum-resistant sig); anchors COAs, royalties, valuations, escrow steps.
- `pack-n-ship-service` — CrownX Authentication Pack-N-Ship: Sell → pay escrow →
  Package COA → Ship COA → track → delivered → buyer live-AI re-auth GATES
  Genesis-COA + funds release; no-response investigation with connected-accounts-
  by-invite detection + anomaly scoring.

### Data & infra
- `infra/migrations/crownx` additive tables wired into `all.sql` + `docker-compose`.
- `api-gateway` additive routes: `/api/{pricing,rights,xp,renders,attribution,
  auth/passkey,athletes,trades,appraisals,invites}`.

## Verification
- `pnpm install && pnpm --filter <pkg> typecheck` — clean across all new packages,
  services, and apps.
- `collector-vault` Next build compiles (9+ routes); standalone-copy step fails
  only on Windows+OneDrive symlinks (deploy unaffected).
- End-to-end smoke tests through the gateway:
  `node scripts/seed-crownx.mjs`, `scripts/smoke-round6.mjs`, `scripts/smoke-round7.mjs`.

## Notes / follow-ups
- Services are in-memory by repo convention; Postgres durability via
  `infra/compose` once Docker is available.
- The api-gateway dev (tsx watch) can hang after many hot-reloads under heavy
  process load — stop+start recovers it; proxies are unaffected.

See `MERGE_NOTES.md`, `MERGE_GAP.md`, `PRICING.md` for the full map and the
pricing-lock proof.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
