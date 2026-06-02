-- CrownX Jewel — royalty-engine-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS royalty_rules (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL,
  beneficiaries JSONB NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS royalty_distributions (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL,
  beneficiary_id  TEXT NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_royalty_rules_asset_id ON royalty_rules(asset_id);
CREATE INDEX IF NOT EXISTS idx_royalty_distributions_order_id ON royalty_distributions(order_id);
