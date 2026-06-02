-- CrownX Jewel — ledger-payout-service initial migration (Wave 3)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL,
  direction       TEXT NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL,
  reference_type  TEXT NOT NULL,
  reference_id    TEXT NOT NULL,
  memo            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_batches (
  id          TEXT PRIMARY KEY,
  status      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_items (
  id              TEXT PRIMARY KEY,
  payout_batch_id TEXT REFERENCES payout_batches(id),
  payee_id        TEXT NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL,
  reference_type  TEXT NOT NULL,
  reference_id    TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_payee_id ON payout_items(payee_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_status ON payout_items(status);
