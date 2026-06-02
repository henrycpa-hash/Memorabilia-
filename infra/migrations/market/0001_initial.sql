-- CrownX Jewel — marketplace-service initial migration (Wave 2)
CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL,
  asset_id        TEXT NOT NULL,
  buyer_id        TEXT NOT NULL,
  seller_id       TEXT NOT NULL,
  gross_amount    NUMERIC(14, 2) NOT NULL,
  royalty_amount  NUMERIC(14, 2) NOT NULL,
  net_to_seller   NUMERIC(14, 2) NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkout_attempts (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT NOT NULL,
  buyer_id    TEXT NOT NULL,
  status      TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
