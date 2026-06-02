-- CrownX Jewel — offer-service initial migration (Wave 3)
CREATE TABLE IF NOT EXISTS offers (
  id              TEXT PRIMARY KEY,
  asset_id        TEXT NOT NULL,
  listing_id      TEXT,
  buyer_id        TEXT NOT NULL,
  seller_id       TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL,
  counter_amount  NUMERIC(12, 2),
  status          TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_events (
  id          TEXT PRIMARY KEY,
  offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  actor_id    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  amount      NUMERIC(12, 2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_asset_id ON offers(asset_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offer_events_offer_id ON offer_events(offer_id);
