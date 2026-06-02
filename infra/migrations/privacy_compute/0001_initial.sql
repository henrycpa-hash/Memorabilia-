-- CrownX Jewel — privacy-enhancing-compute-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS privacy_compute_jobs (
  id                  TEXT PRIMARY KEY,
  job_type            TEXT NOT NULL,
  metric_sets_json    JSONB NOT NULL,
  epsilon             REAL NOT NULL,
  policy_id           TEXT,
  status              TEXT NOT NULL,
  result_uri          TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS privacy_release_artifacts (
  id                      TEXT PRIMARY KEY,
  compute_job_id          TEXT NOT NULL REFERENCES privacy_compute_jobs(id) ON DELETE CASCADE,
  metric_key              TEXT NOT NULL,
  decision                TEXT NOT NULL,
  protected_value         REAL,
  noise_added_abs         INTEGER NOT NULL,
  output_uri              TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_jobs_status ON privacy_compute_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pc_artifacts_job ON privacy_release_artifacts(compute_job_id);
CREATE INDEX IF NOT EXISTS idx_pc_artifacts_metric ON privacy_release_artifacts(metric_key);
