import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { tenancyService } from "../domain/tenancy.service";

const brandingSchema = z.object({
  displayName: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  customDomain: z.string().optional()
});

const settingsSchema = z.object({
  defaultCurrency: z.string().optional(),
  timeZone: z.string().optional(),
  defaultLocale: z.string().optional(),
  policyPackId: z.string().optional(),
  enabledChannels: z.array(z.string()).optional()
});

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  branding: brandingSchema.optional(),
  settings: settingsSchema.optional()
});

const flagSchema = z.object({ flagKey: z.string().min(1), enabled: z.boolean() });
const assignPolicySchema = z.object({
  policyPackId: z.string(),
  scope: z.enum(["platform", "campaigns", "social", "partner_listings"])
});

export function registerTenancyRoutes(app: FastifyInstance) {
  app.post("/tenants", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createSchema.parse(request.body);
    const t = await tenancyService.create(input);
    if (!t) return reply.code(409).send({ error: "slug_taken" });
    reply.code(201).send(t);
  });

  app.get("/tenants", async () => tenancyService.list());

  app.get("/tenants/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = tenancyService.findById(id);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });

  app.get("/tenants/by-slug/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const t = tenancyService.findBySlug(slug);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });

  app.post("/tenants/:id/branding", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = brandingSchema.parse(request.body);
    const t = tenancyService.updateBranding(id, input);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });

  app.post("/tenants/:id/settings", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = settingsSchema.parse(request.body);
    const t = tenancyService.updateSettings(id, input);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });

  app.post("/tenants/:id/flags", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = flagSchema.parse(request.body);
    const f = tenancyService.setFlag(id, input.flagKey, input.enabled);
    return f;
  });

  app.get("/tenants/:id/flags", async (request) => {
    const { id } = request.params as { id: string };
    return tenancyService.flagsFor(id);
  });

  app.post("/tenants/:id/policies", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = assignPolicySchema.parse(request.body);
    const p = await tenancyService.assignPolicy(id, input.policyPackId, input.scope);
    if (!p) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(p);
  });

  app.get("/tenants/:id/policies", async (request) => {
    const { id } = request.params as { id: string };
    return tenancyService.policiesFor(id);
  });

  app.post("/tenants/:id/suspend", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = tenancyService.suspend(id);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });
}
