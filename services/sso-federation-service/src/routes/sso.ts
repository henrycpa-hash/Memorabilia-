import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { ssoService } from "../domain/sso.service";

const createProviderSchema = z.object({
  tenantId: z.string(),
  providerType: z.enum(["saml", "oidc", "google_workspace", "azure_ad", "okta"]),
  issuer: z.string().min(1),
  metadataJson: z.record(z.unknown()).optional(),
  domains: z.array(z.string()).optional()
});

const mappingSchema = z.object({
  externalGroup: z.string().min(1),
  internalRole: z.string().min(1)
});

const scimSchema = z.object({
  payload: z.array(z.object({
    externalUserId: z.string(),
    email: z.string().email(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    active: z.boolean(),
    groups: z.array(z.string())
  }))
});

const sessionSchema = z.object({
  claims: z.object({
    email: z.string().email(),
    externalUserId: z.string(),
    externalGroups: z.array(z.string()),
    givenName: z.string().optional(),
    familyName: z.string().optional()
  })
});

export function registerSsoRoutes(app: FastifyInstance) {
  app.post("/sso/providers", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createProviderSchema.parse(request.body);
    const p = await ssoService.createProvider(input);
    reply.code(201).send(p);
  });
  app.get("/sso/providers", async () => ssoService.listProviders());
  app.get("/sso/providers/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return ssoService.providersForTenant(tenantId);
  });
  app.get("/sso/providers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = ssoService.findProvider(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/sso/providers/:id/suspend", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = ssoService.suspendProvider(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/sso/resolve-domain", async (request, reply) => {
    const { email } = request.query as { email: string };
    if (!email) return reply.code(400).send({ error: "email_required" });
    const p = ssoService.resolveByDomain(email);
    if (!p) return reply.code(404).send({ error: "no_provider_for_domain" });
    return p;
  });

  app.post("/sso/providers/:id/role-mappings", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = mappingSchema.parse(request.body);
    const m = await ssoService.addRoleMapping({ providerId: id, ...input });
    if (!m) return reply.code(404).send({ error: "provider_not_found" });
    reply.code(201).send(m);
  });
  app.get("/sso/providers/:id/role-mappings", async (request) => {
    const { id } = request.params as { id: string };
    return ssoService.mappingsForProvider(id);
  });

  app.post("/sso/providers/:id/scim/sync", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = scimSchema.parse(request.body);
    const run = await ssoService.runScimSync({ providerId: id, payload: input.payload });
    if (!run) return reply.code(404).send({ error: "provider_not_found" });
    reply.code(201).send(run);
  });

  app.get("/sso/scim/runs", async (request) => {
    const { providerId } = request.query as { providerId?: string };
    return ssoService.listRuns(providerId);
  });

  app.get("/sso/users", async (request) => {
    const { providerId } = request.query as { providerId?: string };
    return ssoService.listUsers(providerId);
  });

  app.post("/sso/providers/:id/sessions/build", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = sessionSchema.parse(request.body);
    const claims = ssoService.buildSessionClaims({ providerId: id, claims: input.claims });
    if (!claims) return reply.code(404).send({ error: "provider_not_found" });
    return claims;
  });
}
