-- CrownX Jewel — billing-metering-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS billing_plans (
  id                  TEXT PRIMARY KEY,
  plan_key            TEXT NOT NULL UNIQUE,
  display_name        TEXT NOT NULL,
  pricing_model       TEXT NOT NULL,
  base_fee_cents      INTEGER NOT NULL,
  entitlements_json   JSONB NOT NULL,
  status              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  plan_id         TEXT NOT NULL REFERENCES billing_plans(id),
  status          TEXT NOT NULL,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  usage_type    TEXT NOT NULL,
  quantity      NUMERIC(14, 4) NOT NULL,
  reference_id  TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_statements (
  id                       TEXT PRIMARY KEY,
  tenant_id                TEXT NOT NULL,
  subscription_id          TEXT NOT NULL REFERENCES tenant_subscriptions(id),
  period_start             TIMESTAMPTZ NOT NULL,
  period_end               TIMESTAMPTZ NOT NULL,
  base_fee_cents           INTEGER NOT NULL,
  overage_cents            INTEGER NOT NULL,
  total_cents              INTEGER NOT NULL,
  per_usage_cents_json     JSONB NOT NULL,
  usage_totals_json        JSONB NOT NULL,
  status                   TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_type ON usage_events(tenant_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_occurred ON usage_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_statements_tenant ON billing_statements(tenant_id);
