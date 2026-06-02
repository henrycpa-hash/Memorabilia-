-- CrownX Jewel — legal-packet-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS legal_packets (
  id                    TEXT PRIMARY KEY,
  packet_type           TEXT NOT NULL,
  subject_type          TEXT NOT NULL,
  subject_id            TEXT NOT NULL,
  status                TEXT NOT NULL,
  manifest_json         JSONB NOT NULL,
  output_uri            TEXT,
  prepared_by_user_id   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS legal_packet_items (
  id            TEXT PRIMARY KEY,
  packet_id     TEXT NOT NULL REFERENCES legal_packets(id) ON DELETE CASCADE,
  item_type     TEXT NOT NULL,
  sequence      INTEGER NOT NULL,
  source_ref    TEXT,
  payload_json  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packets_type ON legal_packets(packet_type);
CREATE INDEX IF NOT EXISTS idx_packets_subject ON legal_packets(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_packets_status ON legal_packets(status);
CREATE INDEX IF NOT EXISTS idx_packet_items_packet ON legal_packet_items(packet_id);
