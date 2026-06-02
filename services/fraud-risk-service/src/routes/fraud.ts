import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { fraudService, reputationService } from "../domain/fraud.service";

const evalSchema = z.object({
  subjectType: z.enum(["user", "settlement", "auction", "offer"]),
  subjectId: z.string(),
  signals: z.array(z.string())
});

const recomputeUserSchema = z.object({
  userId: z.string(),
  successfulTrades: z.number().int().nonnegative(),
  disputeRate: z.number().min(0).max(1),
  fraudFlags: z.number().int().nonnegative(),
  watchFollowers: z.number().int().nonnegative()
});

const recomputeCreatorSchema = z.object({
  creatorId: z.string(),
  authenticatedAssetCount: z.number().int().nonnegative(),
  resaleVelocity: z.number().nonnegative(),
  campaignConversionRate: z.number().min(0).max(1),
  referralConversionRate: z.number().min(0).max(1)
});

export function registerFraudRoutes(app: FastifyInstance) {
  // ---- Fraud scoring ----
  app.post("/fraud/scores", async (request, reply) => {
    const input = evalSchema.parse(request.body);
    const row = await fraudService.evaluate(input);
    reply.code(201).send(row);
  });

  app.get(
    "/fraud/scores",
    { preHandler: requireRole("admin") },
    async () => fraudService.listScores()
  );

  app.get(
    "/fraud/scores/by-subject/:subjectType/:subjectId",
    async (request) => {
      const { subjectType, subjectId } = request.params as {
        subjectType: string;
        subjectId: string;
      };
      return fraudService.scoresFor(subjectType, subjectId);
    }
  );

  app.get("/fraud/scores/latest/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as {
      subjectType: string;
      subjectId: string;
    };
    const s = fraudService.latestScore(subjectType, subjectId);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // ---- Alerts (admin only) ----
  app.get(
    "/fraud/alerts",
    { preHandler: requireRole("admin") },
    async () => fraudService.listAlerts()
  );

  app.post(
    "/fraud/alerts/:id/acknowledge",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const a = fraudService.acknowledgeAlert(id);
      if (!a) return reply.code(404).send({ error: "not_found" });
      return a;
    }
  );

  app.post(
    "/fraud/alerts/:id/dismiss",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const a = fraudService.dismissAlert(id);
      if (!a) return reply.code(404).send({ error: "not_found" });
      return a;
    }
  );

  // ---- Reputation: users ----
  app.post("/reputation/users/recompute", async (request, reply) => {
    const input = recomputeUserSchema.parse(request.body);
    const r = reputationService.recomputeUser(input);
    reply.code(201).send(r);
  });

  app.get("/reputation/users/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const r = reputationService.findUser(userId);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.get(
    "/reputation/users",
    { preHandler: requireRole("admin") },
    async () => reputationService.listUsers()
  );

  // ---- Reputation: creators ----
  app.post("/reputation/creators/recompute", async (request, reply) => {
    const input = recomputeCreatorSchema.parse(request.body);
    const r = reputationService.recomputeCreator(input);
    reply.code(201).send(r);
  });

  app.get("/reputation/creators/:creatorId", async (request, reply) => {
    const { creatorId } = request.params as { creatorId: string };
    const r = reputationService.findCreator(creatorId);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.get("/reputation/creators", async () => reputationService.listCreators());
}
