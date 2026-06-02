-- CrownX Jewel — privacy-governance-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS privacy_policies (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  scope_type      TEXT NOT NULL,
  scope_id        TEXT,
  rules_json      JSONB NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privacy_release_checks (
  id                            TEXT PRIMARY KEY,
  policy_id                     TEXT NOT NULL REFERENCES privacy_policies(id),
  subject_json                  JSONB NOT NULL,
  decision                      TEXT NOT NULL,
  reasons_json                  JSONB NOT NULL,
  suppression_reasons_json      JSONB NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_policies_scope ON privacy_policies(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_privacy_policies_status ON privacy_policies(status);
CREATE INDEX IF NOT EXISTS idx_release_checks_policy ON privacy_release_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_release_checks_decision ON privacy_release_checks(decision);
