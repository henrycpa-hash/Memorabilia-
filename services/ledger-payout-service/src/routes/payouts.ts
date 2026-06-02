import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { ledgerService } from "../domain/ledger.service";

const createSchema = z.object({
  payeeId: z.string(),
  amount: z.string(),
  referenceType: z.string(),
  referenceId: z.string()
});

export function registerPayoutRoutes(app: FastifyInstance) {
  // Marketplace-service calls this on sale completion to register payouts
  // for the seller and each royalty beneficiary.
  app.post("/payouts", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const item = await ledgerService.createPayoutItem(input);
    reply.code(201).send(item);
  });

  app.get(
    "/payouts",
    { preHandler: requireRole("admin") },
    async () => ledgerService.listPayouts()
  );

  app.get(
    "/payouts/me",
    { preHandler: requireAuth },
    async (request) => ledgerService.listPayoutsForPayee(request.auth!.userId)
  );
}
