import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { agencyService } from "../domain/agency.service";

const orgSchema = z.object({
  orgType: z.enum(["agency", "tenant_team", "league_office", "school_program"]),
  name: z.string().min(1),
  tenantId: z.string().optional()
});

const memberSchema = z.object({
  userId: z.string(),
  role: z.enum(["owner", "manager", "assistant", "finance", "campaign_operator", "compliance_reviewer", "content_approver"])
});

const affiliateSchema = z.object({ creatorId: z.string() });

const approvalSchema = z.object({
  aggregateType: z.enum(["campaign", "social_post", "settlement_release", "policy_override", "partner_listing"]),
  aggregateId: z.string(),
  payloadJson: z.record(z.unknown()).optional()
});

const decideSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

export function registerAgencyRoutes(app: FastifyInstance) {
  app.post("/orgs", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = orgSchema.parse(request.body);
    const o = await agencyService.createOrg(input);
    reply.code(201).send(o);
  });

  app.get("/orgs", async () => agencyService.listOrgs());
  app.get("/orgs/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return agencyService.orgsByTenant(tenantId);
  });
  app.get("/orgs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = agencyService.findOrg(id);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });

  app.post("/orgs/:id/members", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = memberSchema.parse(request.body);
    const m = await agencyService.addMember({ organizationId: id, ...input });
    if (!m) return reply.code(404).send({ error: "org_not_found" });
    reply.code(201).send(m);
  });

  app.get("/orgs/:id/members", async (request) => {
    const { id } = request.params as { id: string };
    return agencyService.membersOf(id);
  });

  app.post("/orgs/:id/affiliate", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = affiliateSchema.parse(request.body);
    const a = await agencyService.affiliateCreator({ organizationId: id, ...input });
    if (!a) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(a);
  });

  app.get("/orgs/:id/affiliations", async (request) => {
    const { id } = request.params as { id: string };
    return agencyService.affiliationsOf(id);
  });

  // Approvals
  app.post("/orgs/:id/approvals", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = approvalSchema.parse(request.body);
    const tasks = await agencyService.openApproval({ organizationId: id, ...input });
    if (!tasks) return reply.code(404).send({ error: "org_not_found" });
    reply.code(201).send(tasks);
  });

  app.get("/orgs/:id/approvals", async (request) => {
    const { id } = request.params as { id: string };
    return agencyService.tasksFor(id);
  });

  app.get("/orgs/:id/approvals/pending", async (request) => {
    const { id } = request.params as { id: string };
    return agencyService.pendingTasksFor(id);
  });

  app.post("/approvals/:taskId/decide", { preHandler: requireAuth }, async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const input = decideSchema.parse(request.body);
    const t = await agencyService.decideTask({
      taskId,
      decidedByUserId: request.auth!.userId,
      decision: input.decision
    });
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });
}
