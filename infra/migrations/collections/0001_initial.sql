-- CrownX Jewel — collections-dunning-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS receivables (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  statement_id        TEXT NOT NULL,
  amount_due_cents    INTEGER NOT NULL,
  amount_paid_cents   INTEGER NOT NULL,
  due_date            TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL,
  aging_bucket        TEXT NOT NULL,
  days_past_due       INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dunning_runs (
  id              TEXT PRIMARY KEY,
  receivable_id   TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  cadence_step    INTEGER NOT NULL,
  template_key    TEXT NOT NULL,
  channel         TEXT NOT NULL,
  status          TEXT NOT NULL,
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promise_to_pay (
  id                       TEXT PRIMARY KEY,
  receivable_id            TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  promised_amount_cents    INTEGER NOT NULL,
  promised_date            TIMESTAMPTZ NOT NULL,
  status                   TEXT NOT NULL,
  notes                    TEXT NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS writeoff_requests (
  id                       TEXT PRIMARY KEY,
  receivable_id            TEXT NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  requested_by_user_id     TEXT NOT NULL,
  amount_cents             INTEGER NOT NULL,
  reason                   TEXT NOT NULL,
  status                   TEXT NOT NULL,
  approver_user_id         TEXT,
  decision_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receivables_tenant ON receivables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_bucket ON receivables(aging_bucket);
CREATE INDEX IF NOT EXISTS idx_dunning_receivable ON dunning_runs(receivable_id);
CREATE INDEX IF NOT EXISTS idx_p2p_receivable ON promise_to_pay(receivable_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_receivable ON writeoff_requests(receivable_id);
CREATE INDEX IF NOT EXISTS idx_writeoff_status ON writeoff_requests(status);
