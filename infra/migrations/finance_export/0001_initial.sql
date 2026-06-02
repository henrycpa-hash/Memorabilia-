-- CrownX Jewel — finance-export-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,
  settlement_id   TEXT NOT NULL,
  tenant_id       TEXT,
  invoice_number  TEXT NOT NULL,
  invoice_type    TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL,
  status          TEXT NOT NULL,
  party_id        TEXT NOT NULL,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS export_packages (
  id              TEXT PRIMARY KEY,
  export_type     TEXT NOT NULL,
  format          TEXT NOT NULL,
  scope_json      JSONB NOT NULL,
  payload_json    JSONB NOT NULL,
  csv_body        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_settlement ON invoices(settlement_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_export_packages_type ON export_packages(export_type);
