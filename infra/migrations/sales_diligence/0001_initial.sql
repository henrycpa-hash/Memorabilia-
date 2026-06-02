-- CrownX Jewel — sales-diligence-automation-service initial migration (Wave 9)
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id                      TEXT PRIMARY KEY,
  account_name            TEXT NOT NULL,
  stage                   TEXT NOT NULL,
  owner_user_id           TEXT,
  estimated_acv_cents     INTEGER NOT NULL,
  scope_json              JSONB NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diligence_workspaces (
  id              TEXT PRIMARY KEY,
  opportunity_id  TEXT NOT NULL REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  checklist_json  JSONB NOT NULL,
  output_uri      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diligence_response_items (
  id                          TEXT PRIMARY KEY,
  workspace_id                TEXT NOT NULL REFERENCES diligence_workspaces(id) ON DELETE CASCADE,
  item_key                    TEXT NOT NULL,
  status                      TEXT NOT NULL,
  response_body               TEXT NOT NULL,
  evidence_ref                TEXT,
  reused_from_workspace_id    TEXT,
  owner_user_id               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opps_stage ON sales_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_workspaces_opportunity ON diligence_workspaces(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON diligence_workspaces(status);
CREATE INDEX IF NOT EXISTS idx_items_workspace ON diligence_response_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_items_key ON diligence_response_items(item_key);
