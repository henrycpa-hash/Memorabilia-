-- CrownX Jewel — partner-integration-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS partners (
  id              TEXT PRIMARY KEY,
  partner_type    TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL,
  credential_ref  TEXT,
  config_json     JSONB NOT NULL,
  tenant_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_inventory_items (
  id                 TEXT PRIMARY KEY,
  partner_id         TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  external_item_id   TEXT NOT NULL,
  external_lot_id    TEXT,
  mapped_asset_id    TEXT,
  sync_state         TEXT NOT NULL,
  payload_json       JSONB NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_webhook_events (
  id            TEXT PRIMARY KEY,
  partner_id    TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  payload_json  JSONB NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partner_inventory_partner ON partner_inventory_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_inventory_state ON partner_inventory_items(sync_state);
CREATE INDEX IF NOT EXISTS idx_partner_webhook_partner ON partner_webhook_events(partner_id);
