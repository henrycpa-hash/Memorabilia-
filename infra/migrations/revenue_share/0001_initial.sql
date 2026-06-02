-- CrownX Jewel — revenue-share-service initial migration (Wave 8)
CREATE TABLE IF NOT EXISTS revenue_share_trees (
  id                  TEXT PRIMARY KEY,
  scope_type          TEXT NOT NULL,
  scope_id            TEXT NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT NOT NULL,
  effective_date      TIMESTAMPTZ NOT NULL,
  expiration_date     TIMESTAMPTZ,
  rules_json          JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_share_calculations (
  id                  TEXT PRIMARY KEY,
  tree_id             TEXT NOT NULL REFERENCES revenue_share_trees(id) ON DELETE CASCADE,
  reference_type      TEXT NOT NULL,
  reference_id        TEXT NOT NULL,
  total_cents         INTEGER NOT NULL,
  outcomes_json       JSONB NOT NULL,
  remainder_cents     INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_statements (
  id                  TEXT PRIMARY KEY,
  partner_id          TEXT NOT NULL,
  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,
  total_cents         INTEGER NOT NULL,
  line_items_json     JSONB NOT NULL,
  output_uri          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trees_scope ON revenue_share_trees(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_trees_status ON revenue_share_trees(status);
CREATE INDEX IF NOT EXISTS idx_calcs_reference ON revenue_share_calculations(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_calcs_tree ON revenue_share_calculations(tree_id);
CREATE INDEX IF NOT EXISTS idx_partner_stmts_partner ON partner_statements(partner_id);
