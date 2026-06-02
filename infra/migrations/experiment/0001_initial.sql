-- CrownX Jewel — experimentation-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS experiments (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  target_surface  TEXT NOT NULL,
  status          TEXT NOT NULL,
  hypothesis      TEXT NOT NULL,
  variants_json   JSONB NOT NULL,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  success_metric  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exposures (
  id              TEXT PRIMARY KEY,
  experiment_id   TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,
  variant_key     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, subject_id)
);

CREATE TABLE IF NOT EXISTS conversions (
  id              TEXT PRIMARY KEY,
  experiment_id   TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  subject_id      TEXT NOT NULL,
  variant_key     TEXT NOT NULL,
  metric_key      TEXT NOT NULL,
  value           NUMERIC(12, 4) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_exposures_experiment ON exposures(experiment_id);
CREATE INDEX IF NOT EXISTS idx_conversions_experiment ON conversions(experiment_id);
