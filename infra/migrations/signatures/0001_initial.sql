-- CrownX Jewel — signature-integration-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS signature_envelopes (
  id                       TEXT PRIMARY KEY,
  agreement_id             TEXT NOT NULL,
  provider                 TEXT NOT NULL,
  provider_envelope_id     TEXT NOT NULL,
  subject                  TEXT NOT NULL,
  status                   TEXT NOT NULL,
  document_ref             TEXT,
  signed_artifact_uri      TEXT,
  created_by_user_id       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at             TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS signature_signers (
  id              TEXT PRIMARY KEY,
  envelope_id     TEXT NOT NULL REFERENCES signature_envelopes(id) ON DELETE CASCADE,
  signer_name     TEXT NOT NULL,
  signer_email    TEXT NOT NULL,
  signer_role     TEXT NOT NULL,
  signing_order   INTEGER NOT NULL,
  status          TEXT NOT NULL,
  signed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signature_callbacks (
  id              TEXT PRIMARY KEY,
  envelope_id     TEXT NOT NULL REFERENCES signature_envelopes(id) ON DELETE CASCADE,
  callback_type   TEXT NOT NULL,
  payload_json    JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_envelopes_agreement ON signature_envelopes(agreement_id);
CREATE INDEX IF NOT EXISTS idx_envelopes_status ON signature_envelopes(status);
CREATE INDEX IF NOT EXISTS idx_signers_envelope ON signature_signers(envelope_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_envelope ON signature_callbacks(envelope_id);
