-- =====================================================================
-- CrownX × Jewel — Revamp additive migration (Wave 11+)
--
-- ADDITIVE ONLY. This migration introduces the new surfaces' data layer
-- (XP / passkeys / share-card attribution / royalty config / streaks).
-- It does NOT alter any existing table beyond adding foreign-key references,
-- and it touches NO pricing/billing/checkout schema (see MERGE_NOTES.md →
-- PRICING-LOCK). All money splits below are configuration the existing
-- settlement/royalty engine reads; this file never computes a fee.
-- =====================================================================

-- ---------------------------------------------------------------------
-- /LV99 — append-only XP ledger (source of truth for rank)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_ledger (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  delta         INTEGER NOT NULL,                 -- XP granted (never negative in normal play)
  reason        TEXT NOT NULL,                    -- 'mint' | 'streak' | 'invite' | 'floor_call' | ...
  ref_type      TEXT,                             -- on-chain/event source kind
  ref_id        TEXT,                             -- references the originating event/asset
  multiplier    NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON xp_ledger(user_id, created_at);
-- append-only guard: block UPDATE/DELETE
CREATE OR REPLACE FUNCTION xp_ledger_append_only() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'xp_ledger is append-only';
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_xp_ledger_immutable ON xp_ledger;
CREATE TRIGGER trg_xp_ledger_immutable
  BEFORE UPDATE OR DELETE ON xp_ledger
  FOR EACH ROW EXECUTE FUNCTION xp_ledger_append_only();

-- materialized-ish rank cache (cheap reads for the LV99 ring)
CREATE TABLE IF NOT EXISTS lv99_rank_cache (
  user_id       TEXT PRIMARY KEY,
  total_xp      BIGINT NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,       -- 1..99
  tier          TEXT NOT NULL DEFAULT 'INITIATE',
  pct_to_next   NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- WebAuthn / FIDO2 — passkeys (PUBLIC KEY ONLY; never biometric data)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id              TEXT PRIMARY KEY,               -- credential id (base64url)
  user_id         TEXT NOT NULL,
  public_key      BYTEA NOT NULL,                 -- COSE public key — the ONLY secret-adjacent value stored
  sign_count      BIGINT NOT NULL DEFAULT 0,      -- replay/clone detection
  transports      TEXT[],                         -- 'internal' | 'hybrid' | ...
  aaguid          TEXT,
  rp_id           TEXT NOT NULL,                  -- bound CrownX origin (phishing-resistant)
  device_label    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_passkey_user ON passkey_credentials(user_id);

-- short-lived registration/authentication challenges
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  email         TEXT,
  challenge     TEXT NOT NULL,                    -- base64url
  kind          TEXT NOT NULL,                    -- 'register' | 'login'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkey_challenge_exp ON passkey_challenges(expires_at);

-- ---------------------------------------------------------------------
-- Share-card attribution funnel: render → view → install → mint → invite
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renders (
  id            TEXT PRIMARY KEY,                 -- render-id stamped onto the share card
  user_id       TEXT NOT NULL,                    -- who generated/shared it
  asset_id      TEXT,                             -- the slab on the card
  template      TEXT NOT NULL DEFAULT 'mint',     -- 'mint' | 'levelup' | 'royalty' | 'floor'
  channel       TEXT,                             -- 'ig' | 'x' | 'imsg' | 'link'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renders_user ON renders(user_id);

CREATE TABLE IF NOT EXISTS render_views (
  id            TEXT PRIMARY KEY,
  render_id     TEXT NOT NULL REFERENCES renders(id),
  viewer_fp     TEXT,                             -- coarse fingerprint (privacy-safe)
  referer       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_render_views_render ON render_views(render_id);

CREATE TABLE IF NOT EXISTS referrals_attribution (
  id              TEXT PRIMARY KEY,
  render_id       TEXT REFERENCES renders(id),
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT,                          -- set once the invitee installs/mints
  stage           TEXT NOT NULL DEFAULT 'view',   -- view → install → mint → invited
  invite_xp       INTEGER NOT NULL DEFAULT 0,     -- XP minted into xp_ledger on conversion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ref_attr_referrer ON referrals_attribution(referrer_user_id);

-- ---------------------------------------------------------------------
-- Royalty Vault — per-asset 10% split config + held athlete slices
-- (configuration only; the settlement/royalty engine reads these splits.
--  Subscription tier that scales the collector's keep comes FROM pricing
--  code — it is never written here.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS royalty_config (
  asset_id          TEXT PRIMARY KEY,
  scenario          TEXT NOT NULL,                -- 1..4 split scenarios (see Royalty Vault Contract)
  originator_bps    INTEGER NOT NULL,             -- basis points of the 10% royalty
  athlete_bps       INTEGER NOT NULL,
  crownx_bps        INTEGER NOT NULL,
  athlete_claimable BOOLEAN NOT NULL DEFAULT false,
  donation_flag     BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT royalty_bps_sum CHECK (originator_bps + athlete_bps + crownx_bps = 10000)
);

CREATE TABLE IF NOT EXISTS athlete_claims (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL REFERENCES royalty_config(asset_id),
  athlete_id    TEXT NOT NULL,
  state         TEXT NOT NULL DEFAULT 'held',     -- 'held' | 'claimed' | 'verified' | 'donated'
  held_bps      INTEGER NOT NULL,                 -- athlete slice held for marketing/claim
  donation_org  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_athlete_claims_athlete ON athlete_claims(athlete_id);

CREATE TABLE IF NOT EXISTS treasury_holds (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL,
  reason        TEXT NOT NULL,                    -- 'athlete_unclaimed' | 'donation_pending'
  bps           INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- Streaks + weekly leaderboard cache
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streaks (
  user_id        TEXT PRIMARY KEY,
  current_days   INTEGER NOT NULL DEFAULT 0,
  longest_days   INTEGER NOT NULL DEFAULT 0,
  multiplier     NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  last_active_on DATE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id            TEXT PRIMARY KEY,
  period        TEXT NOT NULL,                    -- ISO week, e.g. '2026-W23'
  user_id       TEXT NOT NULL,
  xp            BIGINT NOT NULL DEFAULT 0,
  rank          INTEGER NOT NULL,
  refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON leaderboard_cache(period, rank);
