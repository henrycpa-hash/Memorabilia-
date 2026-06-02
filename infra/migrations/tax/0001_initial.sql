-- CrownX Jewel — tax-localization-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS tax_jurisdictions (
  id              TEXT PRIMARY KEY,
  country_code    TEXT NOT NULL,
  region_code     TEXT,
  display_name    TEXT NOT NULL,
  rules_json      JSONB NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_determinations (
  id                      TEXT PRIMARY KEY,
  jurisdiction_id         TEXT NOT NULL REFERENCES tax_jurisdictions(id),
  jurisdiction_display    TEXT NOT NULL,
  reference_type          TEXT NOT NULL,
  reference_id            TEXT NOT NULL,
  net_amount_cents        INTEGER NOT NULL,
  result_json             JSONB NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_profiles (
  id                          TEXT PRIMARY KEY,
  scope_type                  TEXT NOT NULL,
  scope_id                    TEXT NOT NULL,
  default_jurisdiction_id     TEXT REFERENCES tax_jurisdictions(id),
  withholding_rate_bps        INTEGER NOT NULL,
  vat_number                  TEXT,
  exemption_certificate       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_jur_country ON tax_jurisdictions(country_code, region_code);
CREATE INDEX IF NOT EXISTS idx_tax_det_reference ON tax_determinations(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_tax_profiles_scope ON tax_profiles(scope_type, scope_id);
