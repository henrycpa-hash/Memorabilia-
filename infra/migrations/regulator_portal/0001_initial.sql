-- Wave 11 regulator portal connector
CREATE TABLE IF NOT EXISTS regulator_portals (
  id text PRIMARY KEY,
  jurisdiction_key text NOT NULL,
  regulator_key text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL,
  config_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regulator_portals_jur ON regulator_portals (jurisdiction_key, regulator_key, status);

CREATE TABLE IF NOT EXISTS regulator_portal_refs (
  id text PRIMARY KEY,
  notice_id text NOT NULL,
  portal_id text NOT NULL REFERENCES regulator_portals(id),
  external_ref text NOT NULL,
  status text NOT NULL,
  original_due_date timestamptz NOT NULL,
  effective_due_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regulator_portal_refs_external ON regulator_portal_refs (external_ref);
CREATE INDEX IF NOT EXISTS idx_regulator_portal_refs_notice ON regulator_portal_refs (notice_id);

CREATE TABLE IF NOT EXISTS regulator_inbound_responses (
  id text PRIMARY KEY,
  portal_ref_id text NOT NULL REFERENCES regulator_portal_refs(id) ON DELETE CASCADE,
  response_type text NOT NULL,
  payload_json jsonb NOT NULL,
  new_due_date timestamptz,
  response_pack_required text NOT NULL,
  response_pack_uri text,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regulator_inbound_responses_ref ON regulator_inbound_responses (portal_ref_id, created_at);
