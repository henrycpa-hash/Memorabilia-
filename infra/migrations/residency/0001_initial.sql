-- CrownX Jewel — data-residency-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS residency_regions (
  id              TEXT PRIMARY KEY,
  region_key      TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  policy_json     JSONB NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_residency_assignments (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  region_id       TEXT NOT NULL REFERENCES residency_regions(id),
  region_key      TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS residency_evaluations (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT,
  region_id           TEXT NOT NULL REFERENCES residency_regions(id),
  subject_type        TEXT NOT NULL,
  subject_id          TEXT NOT NULL,
  input_json          JSONB NOT NULL,
  evaluation_json     JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON tenant_residency_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON tenant_residency_assignments(status);
CREATE INDEX IF NOT EXISTS idx_residency_evals_tenant ON residency_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_residency_evals_subject ON residency_evaluations(subject_type, subject_id);
