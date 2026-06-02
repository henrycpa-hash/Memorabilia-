-- CrownX Jewel — render-worker-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS render_jobs (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  template_key    TEXT NOT NULL,
  payload_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL,
  output_url      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_asset ON render_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
