-- CrownX Jewel — settlement-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS settlements (
  id                     TEXT PRIMARY KEY,
  source_type            TEXT NOT NULL,
  source_id              TEXT NOT NULL,
  asset_id               TEXT NOT NULL,
  buyer_id               TEXT NOT NULL,
  seller_id              TEXT NOT NULL,
  gross_amount           NUMERIC(12, 2) NOT NULL,
  platform_fee_amount    NUMERIC(12, 2) NOT NULL,
  royalty_amount         NUMERIC(12, 2) NOT NULL,
  seller_net_amount      NUMERIC(12, 2) NOT NULL,
  escrow_state           TEXT NOT NULL,
  settlement_state       TEXT NOT NULL,
  hold_reason            TEXT,
  risk_score             INTEGER,
  risk_band              TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlement_events (
  id              TEXT PRIMARY KEY,
  settlement_id   TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_state ON settlements(settlement_state);
CREATE INDEX IF NOT EXISTS idx_settlements_source ON settlements(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_settlements_buyer ON settlements(buyer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_seller ON settlements(seller_id);
CREATE INDEX IF NOT EXISTS idx_settlement_events_settlement_id ON settlement_events(settlement_id);
