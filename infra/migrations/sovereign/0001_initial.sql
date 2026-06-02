-- CrownX Jewel — sovereign-deployment-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS sovereign_classes (
  id              TEXT PRIMARY KEY,
  class_key       TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  tier            TEXT NOT NULL,
  policy_json     JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_sovereign_assignments (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  sovereign_class_id  TEXT NOT NULL REFERENCES sovereign_classes(id),
  class_key           TEXT NOT NULL,
  status              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sovereign_export_controls (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  control_type    TEXT NOT NULL,
  rules_json      JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sovereign_export_evaluations (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  control_type        TEXT NOT NULL,
  destination_region  TEXT NOT NULL,
  evaluation_json     JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sovereign_promotion_requests (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  from_environment    TEXT NOT NULL,
  to_environment      TEXT NOT NULL,
  status              TEXT NOT NULL,
  approver_user_id    TEXT,
  decision_at         TIMESTAMPTZ,
  rationale           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sov_assignments_tenant ON tenant_sovereign_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sov_export_evals_tenant ON sovereign_export_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sov_promo_status ON sovereign_promotion_requests(status);
