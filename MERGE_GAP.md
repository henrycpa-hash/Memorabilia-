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

## D · Net: the merge is comprehensive

Every consumer-facing ZIP surface is now in the product, on one design system,
reading from one pricing module, behind one gateway — with the two missing
conversion funnels (athlete claim, royalty rights), the interactive /LV99, and
the full marketing funnel all built. Remaining items are persistence/hardening,
not missing features.
