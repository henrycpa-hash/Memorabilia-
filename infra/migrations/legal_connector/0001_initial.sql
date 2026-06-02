-- CrownX Jewel — legal-systems-connector-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS legal_matters (
  id                              TEXT PRIMARY KEY,
  external_matter_id              TEXT NOT NULL,
  provider                        TEXT NOT NULL,
  matter_title                    TEXT NOT NULL,
  status                          TEXT NOT NULL,
  associated_agreement_ids_json   JSONB NOT NULL,
  associated_dispute_ids_json     JSONB NOT NULL,
  payload_json                    JSONB NOT NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_exports (
  id                      TEXT PRIMARY KEY,
  matter_id               TEXT REFERENCES legal_matters(id) ON DELETE SET NULL,
  packet_id               TEXT NOT NULL,
  packet_type             TEXT NOT NULL,
  provider                TEXT NOT NULL,
  status                  TEXT NOT NULL,
  output_uri              TEXT,
  external_document_id    TEXT,
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS legal_holds (
  id                  TEXT PRIMARY KEY,
  matter_id           TEXT NOT NULL REFERENCES legal_matters(id) ON DELETE CASCADE,
  custodian_ids_json  JSONB NOT NULL,
  description         TEXT NOT NULL,
  status              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matters_external ON legal_matters(provider, external_matter_id);
CREATE INDEX IF NOT EXISTS idx_matters_status ON legal_matters(status);
CREATE INDEX IF NOT EXISTS idx_exports_matter ON legal_exports(matter_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON legal_exports(status);
CREATE INDEX IF NOT EXISTS idx_holds_matter ON legal_holds(matter_id);
CREATE INDEX IF NOT EXISTS idx_holds_status ON legal_holds(status);
