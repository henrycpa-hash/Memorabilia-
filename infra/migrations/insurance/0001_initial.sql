-- CrownX Jewel — insurance-claims-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                TEXT PRIMARY KEY,
  shipment_id       TEXT,
  asset_id          TEXT NOT NULL,
  provider          TEXT NOT NULL,
  policy_number     TEXT NOT NULL,
  insured_amount    NUMERIC(12, 2) NOT NULL,
  policy_state      TEXT NOT NULL,
  description       TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id                  TEXT PRIMARY KEY,
  policy_id           TEXT NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  settlement_id       TEXT,
  external_claim_id   TEXT,
  claim_type          TEXT NOT NULL,
  status              TEXT NOT NULL,
  description         TEXT NOT NULL,
  evidence_count      INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS claim_evidence (
  id          TEXT PRIMARY KEY,
  claim_id    TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  uri         TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_asset ON insurance_policies(asset_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_shipment ON insurance_policies(shipment_id);
CREATE INDEX IF NOT EXISTS idx_claims_settlement ON claims(settlement_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_claim ON claim_evidence(claim_id);
