-- CrownX Jewel — social-publishing-service initial migration (Wave 5)
CREATE TABLE IF NOT EXISTS social_posts (
  id                TEXT PRIMARY KEY,
  creator_id        TEXT NOT NULL,
  channel           TEXT NOT NULL,
  text              TEXT NOT NULL,
  media_urls_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_url          TEXT,
  status            TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  external_post_id  TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_creator ON social_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_channel ON social_posts(channel);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
