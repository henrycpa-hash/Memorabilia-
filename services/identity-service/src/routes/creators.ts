import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { creatorService } from "../domain/creator.service";

const createCreatorSchema = z.object({
  userId: z.string().min(1),
  publicHandle: z.string().min(1),
  creatorType: z.enum(["athlete", "artist", "musician", "celebrity"])
});

export function registerCreatorRoutes(app: FastifyInstance) {
  app.post("/creators", async (request, reply) => {
    const input = createCreatorSchema.parse(request.body);
    const creator = await creatorService.create(input);
    reply.code(201).send(creator);
  });

  app.get("/creators", async () => creatorService.list());
}
