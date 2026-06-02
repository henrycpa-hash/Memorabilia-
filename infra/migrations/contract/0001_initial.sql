-- CrownX Jewel — contract-lifecycle-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS agreements (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT,
  agreement_type      TEXT NOT NULL,
  counterparty_type   TEXT NOT NULL,
  counterparty_name   TEXT NOT NULL,
  counterparty_id     TEXT,
  status              TEXT NOT NULL,
  effective_date      TIMESTAMPTZ NOT NULL,
  expiration_date     TIMESTAMPTZ,
  terms_json          JSONB NOT NULL,
  signature_state     TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agreement_amendments (
  id                  TEXT PRIMARY KEY,
  agreement_id        TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  amendment_number    INTEGER NOT NULL,
  status              TEXT NOT NULL,
  effective_date      TIMESTAMPTZ NOT NULL,
  changes_json        JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_obligations (
  id                  TEXT PRIMARY KEY,
  agreement_id        TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  obligation_type     TEXT NOT NULL,
  due_date            TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL,
  owner_role          TEXT NOT NULL,
  payload_json        JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  satisfied_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agreements_tenant ON agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_counterparty ON agreements(counterparty_type, counterparty_id);
CREATE INDEX IF NOT EXISTS idx_amendments_agreement ON agreement_amendments(agreement_id);
CREATE INDEX IF NOT EXISTS idx_obligations_agreement ON contract_obligations(agreement_id);
CREATE INDEX IF NOT EXISTS idx_obligations_due ON contract_obligations(due_date);
