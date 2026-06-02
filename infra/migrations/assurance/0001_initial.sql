-- CrownX Jewel — revenue-assurance-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS assurance_audits (
  id              TEXT PRIMARY KEY,
  audit_type      TEXT NOT NULL,
  scope_type      TEXT NOT NULL,
  scope_id        TEXT,
  status          TEXT NOT NULL,
  summary_json    JSONB,
  notes           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assurance_variances (
  id                  TEXT PRIMARY KEY,
  audit_id            TEXT NOT NULL REFERENCES assurance_audits(id) ON DELETE CASCADE,
  variance_type       TEXT NOT NULL,
  severity            TEXT NOT NULL,
  reference_type      TEXT NOT NULL,
  reference_id        TEXT NOT NULL,
  expected_cents      INTEGER,
  actual_cents        INTEGER,
  drift_cents         INTEGER,
  detail              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audits_type ON assurance_audits(audit_type);
CREATE INDEX IF NOT EXISTS idx_audits_status ON assurance_audits(status);
CREATE INDEX IF NOT EXISTS idx_variances_audit ON assurance_variances(audit_id);
CREATE INDEX IF NOT EXISTS idx_variances_severity ON assurance_variances(severity);
