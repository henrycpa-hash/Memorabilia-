-- Wave 10 sovereign key custody
CREATE TABLE IF NOT EXISTS custody_profiles (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  custody_mode text NOT NULL,
  region_key text NOT NULL,
  policy_json jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custody_profiles_tenant ON custody_profiles (tenant_id, status);

CREATE TABLE IF NOT EXISTS signing_keys (
  id text PRIMARY KEY,
  custody_profile_id text NOT NULL REFERENCES custody_profiles(id) ON DELETE CASCADE,
  key_alias text NOT NULL,
  region_key text NOT NULL,
  key_type text NOT NULL,
  status text NOT NULL,
  rotated_from_key_id text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signing_keys_profile ON signing_keys (custody_profile_id, status);

CREATE TABLE IF NOT EXISTS signing_events (
  id text PRIMARY KEY,
  key_id text NOT NULL REFERENCES signing_keys(id),
  custody_profile_id text NOT NULL REFERENCES custody_profiles(id),
  reference_type text NOT NULL,
  reference_id text NOT NULL,
  caller_region text NOT NULL,
  caller_role text NOT NULL,
  is_break_glass boolean NOT NULL,
  evaluation_json jsonb NOT NULL,
  attestation_receipt_id text,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signing_events_key_date ON signing_events (key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signing_events_reference ON signing_events (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS custody_attestations (
  id text PRIMARY KEY,
  receipt_id text NOT NULL,
  key_id text NOT NULL REFERENCES signing_keys(id),
  custody_profile_id text NOT NULL REFERENCES custody_profiles(id),
  reference_type text NOT NULL,
  reference_id text NOT NULL,
  signing_event_id text NOT NULL REFERENCES signing_events(id),
  attested_at timestamptz NOT NULL,
  control_state text NOT NULL,
  context_digest text NOT NULL,
  notes text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custody_attestations_reference ON custody_attestations (reference_type, reference_id);
