-- CrownX Jewel — authentication-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS authentication_cases (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  ai_score        NUMERIC(5, 4) NOT NULL,
  reviewer_id     TEXT,
  decision_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authentication_cases_status ON authentication_cases(status);
CREATE INDEX IF NOT EXISTS idx_authentication_cases_asset_id ON authentication_cases(asset_id);
