-- CrownX Jewel — ml-risk-inference-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS feature_snapshots (
  id                    TEXT PRIMARY KEY,
  subject_type          TEXT NOT NULL,
  subject_id            TEXT NOT NULL,
  feature_vector_json   JSONB NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_registry (
  id                       TEXT PRIMARY KEY,
  model_name               TEXT NOT NULL,
  model_version            TEXT NOT NULL,
  model_type               TEXT NOT NULL,
  status                   TEXT NOT NULL,
  threshold_config_json    JSONB NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inference_logs (
  id                    TEXT PRIMARY KEY,
  subject_type          TEXT NOT NULL,
  subject_id            TEXT NOT NULL,
  model_name            TEXT NOT NULL,
  model_version         TEXT NOT NULL,
  champion_score        NUMERIC(5, 4) NOT NULL,
  champion_decision     TEXT NOT NULL,
  challenger_score      NUMERIC(5, 4),
  challenger_decision   TEXT,
  divergence            BOOLEAN NOT NULL DEFAULT FALSE,
  explanation_json      JSONB NOT NULL,
  realized_outcome      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_subject ON feature_snapshots(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_inference_logs_subject ON inference_logs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_inference_logs_decision ON inference_logs(champion_decision);
CREATE INDEX IF NOT EXISTS idx_model_registry_status ON model_registry(status);
