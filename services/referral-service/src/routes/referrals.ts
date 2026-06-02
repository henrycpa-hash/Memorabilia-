import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { referralService } from "../domain/referral.service";

const convertSchema = z.object({
  referralCode: z.string(),
  referredUserId: z.string()
});

export function registerReferralRoutes(app: FastifyInstance) {
  app.post(
    "/referrals",
    { preHandler: requireAuth },
    async (request, reply) => {
      const referral = await referralService.create(request.auth!.userId);
      const inviteBase = process.env.PUBLIC_STORY_URL || "http://localhost:3004";
      reply.code(201).send({
        ...referral,
        inviteUrl: `${inviteBase}/signup?ref=${referral.referralCode}`
      });
    }
  );

  app.post("/referrals/convert", async (request, reply) => {
    const input = convertSchema.parse(request.body);
    const result = await referralService.convert(input.referralCode, input.referredUserId);
    if (!result) return reply.code(404).send({ error: "not_found" });
    reply.send(result);
  });

  app.get(
    "/referrals/me",
    { preHandler: requireAuth },
    async (request) => referralService.listByReferrer(request.auth!.userId)
  );

  app.get("/referrals", async () => referralService.list());
}
