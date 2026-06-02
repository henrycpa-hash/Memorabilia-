-- CrownX Jewel — shipping-logistics-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS shipments (
  id                TEXT PRIMARY KEY,
  settlement_id     TEXT NOT NULL,
  asset_id          TEXT NOT NULL,
  from_address      TEXT NOT NULL,
  to_address        TEXT NOT NULL,
  carrier           TEXT NOT NULL,
  tracking_number   TEXT NOT NULL,
  label_url         TEXT NOT NULL,
  declared_value    NUMERIC(12, 2) NOT NULL,
  weight_oz         INTEGER NOT NULL,
  delivery_mode     TEXT NOT NULL,
  status            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id            TEXT PRIMARY KEY,
  shipment_id   TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  description   TEXT NOT NULL,
  location      TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_settlement ON shipments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
