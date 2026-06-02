-- CrownX Jewel — payment-integration-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS payment_intents (
  id                    TEXT PRIMARY KEY,
  settlement_id         TEXT NOT NULL,
  provider              TEXT NOT NULL,
  provider_intent_id    TEXT NOT NULL,
  amount                NUMERIC(12, 2) NOT NULL,
  currency              TEXT NOT NULL,
  status                TEXT NOT NULL,
  payment_method_type   TEXT NOT NULL,
  client_secret         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id                  TEXT PRIMARY KEY,
  payment_intent_id   TEXT NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  payload_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payouts_v2 (
  id                  TEXT PRIMARY KEY,
  settlement_id       TEXT NOT NULL,
  payee_id            TEXT NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,
  currency            TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_payout_id  TEXT NOT NULL,
  status              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_settlement ON payment_intents(settlement_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_intent ON payment_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payouts_v2_settlement ON payouts_v2(settlement_id);
