-- CrownX Jewel — policy-sandbox-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS policy_simulations (
  id                    TEXT PRIMARY KEY,
  policy_pack_id        TEXT NOT NULL,
  policy_type           TEXT,
  subject_facts_json    JSONB NOT NULL,
  variants_json         JSONB NOT NULL,
  status                TEXT NOT NULL,
  result_json           JSONB,
  prepared_by_user_id   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_simulations_pack ON policy_simulations(policy_pack_id);
CREATE INDEX IF NOT EXISTS idx_simulations_type ON policy_simulations(policy_type);
