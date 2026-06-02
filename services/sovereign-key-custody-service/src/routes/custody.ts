import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { custodyService } from "../domain/custody.service";

const CUSTODY_MODES = [
  "platform_managed_standard",
  "tenant_dedicated_managed",
  "sovereign_isolated_managed",
  "external_customer_managed_reference"
] as const;

const KEY_TYPES = ["ed25519", "rsa_2048", "rsa_4096", "ecdsa_p256", "external_kms_reference"] as const;

const policySchema = z.object({
  allowedReferenceTypes: z.array(z.string()),
  allowedRegions: z.array(z.string()),
  attestationRequired: z.boolean(),
  externalExportAllowed: z.boolean(),
  breakGlassApproverRoles: z.array(z.string()),
  dailyUsageCap: z.number().int().nonnegative()
});

const profileSchema = z.object({
  tenantId: z.string(),
  custodyMode: z.enum(CUSTODY_MODES),
  regionKey: z.string(),
  policy: policySchema
});

const keySchema = z.object({
  custodyProfileId: z.string(),
  keyAlias: z.string().min(1),
  regionKey: z.string(),
  keyType: z.enum(KEY_TYPES)
});

const signSchema = z.object({
  keyId: z.string(),
  referenceType: z.string(),
  referenceId: z.string(),
  callerRegion: z.string(),
  callerRole: z.string(),
  isBreakGlass: z.boolean().optional()
});

export function registerCustodyRoutes(app: FastifyInstance) {
  app.post("/custody/profiles", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = await custodyService.createProfile(input);
    reply.code(201).send(p);
  });
  app.put("/custody/profiles/:id/status", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: never };
    const p = custodyService.setProfileStatus(id, status);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/custody/profiles", async (request) => {
    const { tenantId } = request.query as { tenantId?: string };
    return custodyService.listProfiles(tenantId);
  });
  app.get("/custody/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = custodyService.findProfile(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/custody/profiles/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const p = custodyService.profileForTenant(tenantId);
    if (!p) return reply.code(404).send({ error: "no_active_profile" });
    return p;
  });

  app.post("/custody/keys", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = keySchema.parse(request.body);
    const k = await custodyService.createKey(input);
    if (!k) return reply.code(404).send({ error: "profile_not_found" });
    reply.code(201).send(k);
  });
  app.post("/custody/keys/:id/rotate", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const k = await custodyService.rotateKey(id);
    if (!k) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(k);
  });
  app.post("/custody/keys/:id/revoke", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const k = custodyService.revokeKey(id);
    if (!k) return reply.code(404).send({ error: "not_found" });
    return k;
  });
  app.get("/custody/keys", async (request) => {
    const { profileId } = request.query as { profileId?: string };
    return custodyService.listKeys(profileId);
  });
  app.get("/custody/keys/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const k = custodyService.findKey(id);
    if (!k) return reply.code(404).send({ error: "not_found" });
    return k;
  });

  app.post("/custody/sign", { preHandler: requireAuth }, async (request, reply) => {
    const input = signSchema.parse(request.body);
    const r = await custodyService.sign(input);
    if (!r) return reply.code(404).send({ error: "key_or_profile_inactive" });
    if (r.event.evaluation.decision === "deny") return reply.code(403).send(r);
    if (r.event.evaluation.decision === "review_required") return reply.code(202).send(r);
    return r;
  });

  app.get("/custody/signing-events", async (request) => {
    const { limit, keyId } = request.query as { limit?: string; keyId?: string };
    if (keyId) return custodyService.signingEventsForKey(keyId);
    return custodyService.listSigningEvents(limit ? Number(limit) : undefined);
  });

  app.get("/custody/attestations", async (request) => {
    const { limit } = request.query as { limit?: string };
    return custodyService.listAttestations(limit ? Number(limit) : undefined);
  });
  app.get("/custody/attestations/by-reference/:type/:id", async (request) => {
    const { type, id } = request.params as { type: string; id: string };
    return custodyService.attestationsForReference(type, id);
  });
}
