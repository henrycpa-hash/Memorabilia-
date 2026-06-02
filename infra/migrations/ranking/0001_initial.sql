-- CrownX Jewel — growth-ranking-service initial migration (Wave 3)
CREATE TABLE IF NOT EXISTS asset_rankings (
  asset_id        TEXT PRIMARY KEY,
  trending_score  NUMERIC(14, 4) NOT NULL,
  watchlist_count INT NOT NULL DEFAULT 0,
  view_count      INT NOT NULL DEFAULT 0,
  bid_count       INT NOT NULL DEFAULT 0,
  share_count     INT NOT NULL DEFAULT 0,
  sale_count      INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_cards (
  id          TEXT PRIMARY KEY,
  asset_id    TEXT NOT NULL,
  card_type   TEXT NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL,
  image_url   TEXT,
  public_url  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_rankings_score ON asset_rankings(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_share_cards_asset_id ON share_cards(asset_id);
