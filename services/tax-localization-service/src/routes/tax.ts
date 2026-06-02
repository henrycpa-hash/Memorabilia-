import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { taxService } from "../domain/tax.service";

const ruleEntrySchema = z.object({
  ruleKey: z.string(),
  ruleType: z.enum(["vat", "gst", "sales_tax", "withholding", "exempt"]),
  rateBps: z.number().int().nonnegative(),
  final: z.boolean().optional(),
  inclusive: z.boolean().optional(),
  reverseCharge: z.boolean().optional()
});

const jurisdictionSchema = z.object({
  countryCode: z.string().length(2),
  regionCode: z.string().optional(),
  displayName: z.string().min(1),
  rules: z.object({ entries: z.array(ruleEntrySchema).min(1) })
});

const determineSchema = z.object({
  jurisdictionId: z.string(),
  referenceType: z.enum(["invoice_line", "royalty_payout", "campaign_fee", "subscription_fee"]),
  referenceId: z.string(),
  netAmountCents: z.number().int().nonnegative(),
  isB2B: z.boolean(),
  buyerRegion: z.string(),
  sellerRegion: z.string()
});

const profileSchema = z.object({
  scopeType: z.enum(["tenant", "partner", "creator"]),
  scopeId: z.string(),
  defaultJurisdictionId: z.string().optional(),
  withholdingRateBps: z.number().int().nonnegative().optional(),
  vatNumber: z.string().optional(),
  exemptionCertificate: z.string().optional()
});

const withholdingSchema = z.object({
  grossAmountCents: z.number().int().nonnegative(),
  rateBps: z.number().int().nonnegative()
});

export function registerTaxRoutes(app: FastifyInstance) {
  app.post("/tax/jurisdictions", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = jurisdictionSchema.parse(request.body);
    const j = await taxService.createJurisdiction(input as never);
    reply.code(201).send(j);
  });
  app.post("/tax/jurisdictions/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const j = taxService.archiveJurisdiction(id);
    if (!j) return reply.code(404).send({ error: "not_found" });
    return j;
  });
  app.get("/tax/jurisdictions", async () => taxService.listJurisdictions());
  app.get("/tax/jurisdictions/by-country/:country", async (request, reply) => {
    const { country } = request.params as { country: string };
    const { region } = request.query as { region?: string };
    const j = taxService.jurisdictionByCountry(country, region);
    if (!j) return reply.code(404).send({ error: "not_found" });
    return j;
  });
  app.get("/tax/jurisdictions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const j = taxService.findJurisdiction(id);
    if (!j) return reply.code(404).send({ error: "not_found" });
    return j;
  });

  app.post("/tax/determinations", async (request, reply) => {
    const input = determineSchema.parse(request.body);
    const d = await taxService.determine(input);
    if (!d) return reply.code(404).send({ error: "jurisdiction_not_found" });
    reply.code(201).send(d);
  });
  app.get("/tax/determinations", async (request) => {
    const { limit } = request.query as { limit?: string };
    return taxService.listDeterminations(limit ? Number(limit) : undefined);
  });
  app.get("/tax/determinations/by-reference/:type/:id", async (request) => {
    const { type, id } = request.params as { type: string; id: string };
    return taxService.determinationsByReference(type, id);
  });

  app.post("/tax/withholding/compute", async (request) => {
    const input = withholdingSchema.parse(request.body);
    return taxService.computeWithholding(input.grossAmountCents, input.rateBps);
  });

  app.post("/tax/profiles", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = await taxService.createProfile(input);
    reply.code(201).send(p);
  });
  app.get("/tax/profiles", async () => taxService.listProfiles());
  app.get("/tax/profiles/by-scope/:scopeType/:scopeId", async (request, reply) => {
    const { scopeType, scopeId } = request.params as { scopeType: string; scopeId: string };
    const p = taxService.profileByScope(scopeType, scopeId);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
}
