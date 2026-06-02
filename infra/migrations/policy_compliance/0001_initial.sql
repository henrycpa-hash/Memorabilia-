-- CrownX Jewel — policy-compliance-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS policy_packs (
  id            TEXT PRIMARY KEY,
  policy_type   TEXT NOT NULL,
  name          TEXT NOT NULL,
  version       TEXT NOT NULL,
  status        TEXT NOT NULL,
  rules_json    JSONB NOT NULL,
  tenant_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_evaluations (
  id                  TEXT PRIMARY KEY,
  policy_pack_id      TEXT NOT NULL REFERENCES policy_packs(id) ON DELETE CASCADE,
  subject_type        TEXT NOT NULL,
  subject_id          TEXT NOT NULL,
  subject_json        JSONB NOT NULL,
  result              TEXT NOT NULL,
  reasons_json        JSONB NOT NULL,
  matched_rules_json  JSONB NOT NULL,
  conditions_json     JSONB NOT NULL,
  tenant_id           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_packs_type ON policy_packs(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_packs_tenant ON policy_packs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_eval_pack ON compliance_evaluations(policy_pack_id);
CREATE INDEX IF NOT EXISTS idx_compliance_eval_subject ON compliance_evaluations(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_compliance_eval_result ON compliance_evaluations(result);
