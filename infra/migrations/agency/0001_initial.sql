-- CrownX Jewel — agency-team-service initial migration (Wave 6)
CREATE TABLE IF NOT EXISTS organizations (
  id          TEXT PRIMARY KEY,
  org_type    TEXT NOT NULL,
  name        TEXT NOT NULL,
  tenant_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  role            TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_affiliations (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  creator_id      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_tasks (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aggregate_type     TEXT NOT NULL,
  aggregate_id       TEXT NOT NULL,
  assigned_role      TEXT NOT NULL,
  status             TEXT NOT NULL,
  payload_json       JSONB NOT NULL,
  decided_by_user_id TEXT,
  decided_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_aff_org ON creator_affiliations(organization_id);
CREATE INDEX IF NOT EXISTS idx_creator_aff_creator ON creator_affiliations(creator_id);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_org_status ON approval_tasks(organization_id, status);
