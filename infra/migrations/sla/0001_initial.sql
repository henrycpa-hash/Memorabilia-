-- CrownX Jewel — sla-governance-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS sla_profiles (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT,
  partner_id      TEXT,
  profile_name    TEXT NOT NULL,
  targets_json    JSONB NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sla_breaches (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL REFERENCES sla_profiles(id) ON DELETE CASCADE,
  target_key    TEXT NOT NULL,
  observed      NUMERIC(14, 4) NOT NULL,
  target        NUMERIC(14, 4) NOT NULL,
  delta         NUMERIC(14, 4) NOT NULL,
  severity      TEXT NOT NULL,
  reason        TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,
  payload_json  JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_profiles_tenant ON sla_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_profiles_partner ON sla_profiles(partner_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_profile ON sla_breaches(profile_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_severity ON sla_breaches(severity);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_open ON sla_breaches(ended_at);
