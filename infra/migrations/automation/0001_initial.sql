-- CrownX Jewel — automation-orchestrator-service initial migration (Wave 4)
CREATE TABLE IF NOT EXISTS automation_rules (
  id              TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  audience_type   TEXT NOT NULL,
  template_key    TEXT NOT NULL,
  channels        JSONB NOT NULL,
  delay_minutes   INTEGER NOT NULL DEFAULT 0,
  enabled         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS automation_executions (
  id                TEXT PRIMARY KEY,
  rule_id           TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  channels          JSONB NOT NULL,
  recipient_count   INTEGER NOT NULL,
  status            TEXT NOT NULL,
  payload_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_event ON automation_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
