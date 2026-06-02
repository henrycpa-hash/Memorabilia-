-- CrownX Jewel — model-training-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS label_entries (
  id                  TEXT PRIMARY KEY,
  subject_type        TEXT NOT NULL,
  subject_id          TEXT NOT NULL,
  feature_snapshot_id TEXT,
  label_class         TEXT NOT NULL,
  labeled_by_user_id  TEXT,
  label_source        TEXT NOT NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS datasets (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL,
  row_count       INTEGER NOT NULL,
  label_mix_json  JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_jobs (
  id                       TEXT PRIMARY KEY,
  dataset_id               TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  model_name               TEXT NOT NULL,
  candidate_version        TEXT NOT NULL,
  status                   TEXT NOT NULL,
  validation_metrics_json  JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS candidate_models (
  id                       TEXT PRIMARY KEY,
  training_job_id          TEXT NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  model_name               TEXT NOT NULL,
  model_version            TEXT NOT NULL,
  status                   TEXT NOT NULL,
  validation_metrics_json  JSONB NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_label_entries_subject ON label_entries(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_label_entries_class ON label_entries(label_class);
CREATE INDEX IF NOT EXISTS idx_training_jobs_dataset ON training_jobs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidate_models_status ON candidate_models(status);
