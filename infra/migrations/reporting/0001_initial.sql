-- CrownX Jewel — reporting-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS generated_reports (
  id              TEXT PRIMARY KEY,
  report_type     TEXT NOT NULL,
  format          TEXT NOT NULL,
  scope_json      JSONB,
  sections_json   JSONB NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_at ON generated_reports(generated_at DESC);
