-- CrownX Jewel — auction-service initial migration (Wave 3)
CREATE TABLE IF NOT EXISTS auctions (
  id                 TEXT PRIMARY KEY,
  asset_id           TEXT NOT NULL,
  seller_id          TEXT NOT NULL,
  status             TEXT NOT NULL,
  reserve_price      NUMERIC(12, 2) NOT NULL,
  starting_bid       NUMERIC(12, 2) NOT NULL,
  current_bid        NUMERIC(12, 2),
  current_winner_id  TEXT,
  min_increment      NUMERIC(12, 2) NOT NULL,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auction_bids (
  id          TEXT PRIMARY KEY,
  auction_id  TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id   TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  is_winning  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_asset_id ON auctions(asset_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
