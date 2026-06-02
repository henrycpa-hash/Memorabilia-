import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { regulatoryService } from "../domain/regulatory.service";

const FILING_TYPES = [
  "vat_return", "withholding_summary", "1099_misc", "1042_s",
  "annual_revenue_summary", "kyc_summary", "data_protection_register", "cross_border_data_export"
] as const;

const profileSchema = z.object({
  jurisdictionKey: z.string().min(1),
  filingType: z.enum(FILING_TYPES),
  displayName: z.string().min(1),
  rules: z.object({
    requiredLineItems: z.array(z.string()),
    periodType: z.enum(["monthly", "quarterly", "annual"]),
    deadlineDaysAfterPeriodEnd: z.number().int().nonnegative(),
    outputFormat: z.enum(["csv", "xml", "json", "pdf"])
  })
});

const runSchema = z.object({
  profileId: z.string(),
  periodEnd: z.string(),
  data: z.record(z.unknown())
});

export function registerRegulatoryRoutes(app: FastifyInstance) {
  app.post("/regulatory/profiles", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = await regulatoryService.createProfile(input as never);
    reply.code(201).send(p);
  });
  app.get("/regulatory/profiles", async (request) => {
    const { jurisdiction } = request.query as { jurisdiction?: string };
    return jurisdiction ? regulatoryService.profilesByJurisdiction(jurisdiction) : regulatoryService.listProfiles();
  });
  app.get("/regulatory/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = regulatoryService.findProfile(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/regulatory/filings", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = runSchema.parse(request.body);
    const r = await regulatoryService.startRun(input);
    if (!r) return reply.code(404).send({ error: "profile_not_found" });
    reply.code(201).send(r);
  });
  app.post("/regulatory/filings/:id/file", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await regulatoryService.fileRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/regulatory/filings/:id/reject", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };
    const r = regulatoryService.rejectRun(id, reason);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/regulatory/filings", async (request) => {
    const { status, jurisdiction } = request.query as { status?: string; jurisdiction?: string };
    if (jurisdiction) return regulatoryService.runsByJurisdiction(jurisdiction);
    return regulatoryService.listRuns(status);
  });
  app.get("/regulatory/filings/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = regulatoryService.findRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/regulatory/upcoming-deadlines", async () => regulatoryService.upcomingDeadlines());
}
