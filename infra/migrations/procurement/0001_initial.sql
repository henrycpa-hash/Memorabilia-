-- CrownX Jewel — procurement-automation-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS procurement_questionnaires (
  id              TEXT PRIMARY KEY,
  template_key    TEXT NOT NULL,
  title           TEXT NOT NULL,
  questions_json  JSONB NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procurement_responses (
  id                          TEXT PRIMARY KEY,
  questionnaire_id            TEXT NOT NULL REFERENCES procurement_questionnaires(id),
  tenant_id                   TEXT NOT NULL,
  buyer_name                  TEXT NOT NULL,
  status                      TEXT NOT NULL,
  answers_json                JSONB NOT NULL,
  reviewer_user_ids_json      JSONB NOT NULL,
  output_uri                  TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at                TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS procurement_evidence_maps (
  id                  TEXT PRIMARY KEY,
  questionnaire_id    TEXT NOT NULL REFERENCES procurement_questionnaires(id) ON DELETE CASCADE,
  question_key        TEXT NOT NULL,
  evidence_ref        TEXT NOT NULL,
  evidence_type       TEXT NOT NULL,
  description         TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_template ON procurement_questionnaires(template_key);
CREATE INDEX IF NOT EXISTS idx_responses_tenant ON procurement_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON procurement_responses(status);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_q ON procurement_evidence_maps(questionnaire_id);
