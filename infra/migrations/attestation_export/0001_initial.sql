-- Wave 11 sovereign attestation export
CREATE TABLE IF NOT EXISTS sovereign_attestation_packets (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  packet_type text NOT NULL,
  period_key text NOT NULL,
  status text NOT NULL,
  manifest_json jsonb NOT NULL,
  output_uri text,
  legal_packet_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attestation_packets_tenant ON sovereign_attestation_packets (tenant_id, packet_type, created_at DESC);

CREATE TABLE IF NOT EXISTS sovereign_attestation_exports (
  id text PRIMARY KEY,
  packet_id text NOT NULL REFERENCES sovereign_attestation_packets(id) ON DELETE CASCADE,
  export_target_type text NOT NULL,
  export_target_id text,
  approval_status text NOT NULL,
  approver_user_id text,
  receipt_json jsonb,
  external_verification_uri text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attestation_exports_pending ON sovereign_attestation_exports (approval_status) WHERE approval_status = 'pending';
