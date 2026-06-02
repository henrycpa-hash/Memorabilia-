-- CrownX Jewel — sso-federation-service initial migration (Wave 7)
CREATE TABLE IF NOT EXISTS identity_providers (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  provider_type   TEXT NOT NULL,
  issuer          TEXT NOT NULL,
  metadata_json   JSONB NOT NULL,
  status          TEXT NOT NULL,
  domains_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sso_role_mappings (
  id              TEXT PRIMARY KEY,
  provider_id     TEXT NOT NULL REFERENCES identity_providers(id) ON DELETE CASCADE,
  external_group  TEXT NOT NULL,
  internal_role   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scim_sync_runs (
  id                  TEXT PRIMARY KEY,
  provider_id         TEXT NOT NULL REFERENCES identity_providers(id) ON DELETE CASCADE,
  status              TEXT NOT NULL,
  total_users         INTEGER NOT NULL,
  created_users       INTEGER NOT NULL,
  updated_users       INTEGER NOT NULL,
  deactivated_users   INTEGER NOT NULL,
  errors_json         JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provisioned_users (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  provider_id           TEXT NOT NULL REFERENCES identity_providers(id) ON DELETE CASCADE,
  external_user_id      TEXT NOT NULL,
  email                 TEXT NOT NULL,
  given_name            TEXT,
  family_name           TEXT,
  active                BOOLEAN NOT NULL,
  internal_roles_json   JSONB NOT NULL,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idp_tenant ON identity_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_mappings_provider ON sso_role_mappings(provider_id);
CREATE INDEX IF NOT EXISTS idx_scim_runs_provider ON scim_sync_runs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provisioned_users_provider ON provisioned_users(provider_id);
CREATE INDEX IF NOT EXISTS idx_provisioned_users_email ON provisioned_users(email);
