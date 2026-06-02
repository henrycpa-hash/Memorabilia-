-- CrownX Jewel — fraud-risk-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS fraud_scores (
  id              TEXT PRIMARY KEY,
  subject_type    TEXT NOT NULL,
  subject_id      TEXT NOT NULL,
  score           INTEGER NOT NULL,
  risk_band       TEXT NOT NULL,
  reasons         JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id              TEXT PRIMARY KEY,
  subject_type    TEXT NOT NULL,
  subject_id      TEXT NOT NULL,
  alert_type      TEXT NOT NULL,
  severity        TEXT NOT NULL,
  status          TEXT NOT NULL,
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_reputations (
  user_id              TEXT PRIMARY KEY,
  score                NUMERIC(10, 2) NOT NULL,
  tier                 TEXT NOT NULL,
  successful_trades    INTEGER NOT NULL DEFAULT 0,
  dispute_rate         NUMERIC(5, 4) NOT NULL DEFAULT 0,
  fraud_flags          INTEGER NOT NULL DEFAULT 0,
  watch_followers      INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_reputations (
  creator_id                  TEXT PRIMARY KEY,
  momentum                    NUMERIC(12, 2) NOT NULL,
  authenticated_asset_count   INTEGER NOT NULL DEFAULT 0,
  resale_velocity             NUMERIC(8, 2) NOT NULL DEFAULT 0,
  campaign_conversion_rate    NUMERIC(5, 4) NOT NULL DEFAULT 0,
  referral_conversion_rate    NUMERIC(5, 4) NOT NULL DEFAULT 0,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_scores_subject ON fraud_scores(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_fraud_scores_band ON fraud_scores(risk_band);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);
