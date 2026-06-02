-- CrownX Jewel — watchlist-service initial migration (Wave 3)
CREATE TABLE IF NOT EXISTS watchlists (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  asset_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS watchlists_user_asset_unique
  ON watchlists (user_id, asset_id);

CREATE TABLE IF NOT EXISTS watchlist_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  asset_id    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_asset_id ON watchlists(asset_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_events_asset_id ON watchlist_events(asset_id);
