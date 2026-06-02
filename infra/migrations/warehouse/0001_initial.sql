-- CrownX Jewel — analytics-warehouse-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS fact_market_events (
  id          TEXT PRIMARY KEY,
  event_date  TIMESTAMPTZ NOT NULL,
  asset_id    TEXT NOT NULL,
  creator_id  TEXT,
  event_type  TEXT NOT NULL,
  amount      NUMERIC(12, 2),
  user_id     TEXT,
  source_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_market_events_type ON fact_market_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fact_market_events_asset ON fact_market_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_fact_market_events_date ON fact_market_events(event_date DESC);
