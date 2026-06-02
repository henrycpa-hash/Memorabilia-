-- CrownX Jewel — dispute-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS disputes (
  id                  TEXT PRIMARY KEY,
  settlement_id       TEXT NOT NULL,
  opened_by_user_id   TEXT NOT NULL,
  dispute_type        TEXT NOT NULL,
  status              TEXT NOT NULL,
  reason              TEXT NOT NULL,
  resolution_type     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id          TEXT PRIMARY KEY,
  dispute_id  TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  actor_id    TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_settlement ON disputes(settlement_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
