-- CrownX Jewel — redlining-negotiation-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS contract_versions (
  id                      TEXT PRIMARY KEY,
  agreement_id            TEXT NOT NULL,
  version_number          INTEGER NOT NULL,
  content_uri             TEXT NOT NULL,
  clause_bodies_json      JSONB NOT NULL,
  status                  TEXT NOT NULL,
  author_user_id          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redline_diffs (
  id                  TEXT PRIMARY KEY,
  base_version_id     TEXT NOT NULL REFERENCES contract_versions(id),
  compare_version_id  TEXT NOT NULL REFERENCES contract_versions(id),
  status              TEXT NOT NULL,
  summary_json        JSONB NOT NULL,
  diff_uri            TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS negotiation_issues (
  id              TEXT PRIMARY KEY,
  agreement_id    TEXT NOT NULL,
  issue_type      TEXT NOT NULL,
  status          TEXT NOT NULL,
  clause_key      TEXT,
  description     TEXT NOT NULL,
  payload_json    JSONB NOT NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clause_library (
  id                          TEXT PRIMARY KEY,
  clause_key                  TEXT NOT NULL,
  category                    TEXT NOT NULL,
  language_body               TEXT NOT NULL,
  fallback_rank               INTEGER NOT NULL,
  requires_legal_review       BOOLEAN NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_versions_agreement ON contract_versions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_versions_status ON contract_versions(status);
CREATE INDEX IF NOT EXISTS idx_diffs_base ON redline_diffs(base_version_id);
CREATE INDEX IF NOT EXISTS idx_issues_agreement ON negotiation_issues(agreement_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON negotiation_issues(status);
CREATE INDEX IF NOT EXISTS idx_clauses_key_rank ON clause_library(clause_key, fallback_rank);
