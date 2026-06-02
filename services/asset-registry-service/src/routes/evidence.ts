import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { evidenceService } from "../domain/evidence.service";

const createIntentSchema = z.object({
  assetId: z.string(),
  objectType: z.enum(["image", "video", "document", "signature_capture"]),
  fileName: z.string().min(1)
});

const completeSchema = z.object({
  assetId: z.string(),
  uploadIntentId: z.string(),
  objectType: z.enum(["image", "video", "document", "signature_capture"]),
  storageUri: z.string(),
  fileHash: z.string(),
  capturedAt: z.string()
});

const directSchema = z.object({
  assetId: z.string(),
  objectType: z.enum(["image", "video", "document", "signature_capture"]),
  storageUri: z.string(),
  fileHash: z.string(),
  capturedAt: z.string()
});

export function registerEvidenceRoutes(app: FastifyInstance) {
  // Wave 2: presigned upload intent flow.
  app.post(
    "/evidence/upload-intents",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createIntentSchema.parse(request.body);
      const intent = await evidenceService.createIntent(input);
      reply.code(201).send(intent);
    }
  );

  app.post(
    "/evidence/complete",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = completeSchema.parse(request.body);
      try {
        const evidence = await evidenceService.complete(input);
        reply.code(201).send(evidence);
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  // Wave 1 backwards-compat: direct evidence creation (no intent).
  app.post("/evidence", async (request, reply) => {
    const input = directSchema.parse(request.body);
    const evidence = await evidenceService.createDirect(input);
    reply.code(201).send(evidence);
  });

  app.get("/evidence/by-asset/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return evidenceService.listByAsset(assetId);
  });
}
