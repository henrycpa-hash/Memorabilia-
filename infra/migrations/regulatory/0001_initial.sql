-- CrownX Jewel — regulatory-filing-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS filing_profiles (
  id                  TEXT PRIMARY KEY,
  jurisdiction_key    TEXT NOT NULL,
  filing_type         TEXT NOT NULL,
  display_name        TEXT NOT NULL,
  rules_json          JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS filing_runs (
  id                  TEXT PRIMARY KEY,
  profile_id          TEXT NOT NULL REFERENCES filing_profiles(id),
  jurisdiction_key    TEXT NOT NULL,
  filing_type         TEXT NOT NULL,
  period_key          TEXT NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,
  deadline            TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL,
  data_json           JSONB NOT NULL,
  completeness_json   JSONB,
  bundle_json         JSONB,
  filed_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_jurisdiction ON filing_profiles(jurisdiction_key, filing_type);
CREATE INDEX IF NOT EXISTS idx_runs_status ON filing_runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_period ON filing_runs(jurisdiction_key, period_key);
CREATE INDEX IF NOT EXISTS idx_runs_deadline ON filing_runs(deadline);
