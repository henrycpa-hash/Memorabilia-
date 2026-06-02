-- CrownX Jewel — creator-crm-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS crm_segments (
  id                  TEXT PRIMARY KEY,
  creator_id          TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  definition_json     JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_fan_profiles (
  user_id                       TEXT PRIMARY KEY,
  role                          TEXT NOT NULL,
  owned_assets                  INTEGER NOT NULL DEFAULT 0,
  watchlist_count               INTEGER NOT NULL DEFAULT 0,
  total_spend                   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  last_activity_days_ago        INTEGER NOT NULL DEFAULT 0,
  last_purchase_days_ago        INTEGER,
  creator_affinity_ids_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  collector_tier                TEXT NOT NULL DEFAULT 'casual',
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_segment_materializations (
  id              TEXT PRIMARY KEY,
  segment_id      TEXT NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  user_ids_json   JSONB NOT NULL,
  size            INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_lifecycle_journeys (
  id                  TEXT PRIMARY KEY,
  creator_id          TEXT NOT NULL,
  name                TEXT NOT NULL,
  segment_id          TEXT NOT NULL,
  trigger_event_type  TEXT NOT NULL,
  template_key        TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_segments_creator ON crm_segments(creator_id);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_creator ON crm_lifecycle_journeys(creator_id);
CREATE INDEX IF NOT EXISTS idx_crm_journeys_event ON crm_lifecycle_journeys(trigger_event_type);
