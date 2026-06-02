import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { signatureService } from "../domain/signature.service";

const signerSchema = z.object({
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  signerRole: z.enum(["initial_signer", "counter_signer", "approver", "witness"]),
  signingOrder: z.number().int().positive()
});

const envelopeSchema = z.object({
  agreementId: z.string(),
  provider: z.enum(["docusign", "adobe_sign", "hellosign", "dropbox_sign", "native"]),
  subject: z.string().min(1),
  documentRef: z.string().optional(),
  signers: z.array(signerSchema).min(1)
});

const callbackSchema = z.object({
  callbackType: z.enum([
    "envelope_sent", "signer_viewed", "signer_signed",
    "signer_declined", "envelope_completed", "envelope_voided", "envelope_expired"
  ]),
  signerEmail: z.string().email().optional(),
  payload: z.record(z.unknown()).optional()
});

export function registerSignatureRoutes(app: FastifyInstance) {
  app.post("/signatures/envelopes", { preHandler: requireAuth }, async (request, reply) => {
    const input = envelopeSchema.parse(request.body);
    const result = await signatureService.createEnvelope({
      ...input,
      createdByUserId: request.auth!.userId
    });
    if ("error" in result) return reply.code(400).send(result);
    reply.code(201).send(result);
  });
  app.post("/signatures/envelopes/:id/send", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const env = await signatureService.sendEnvelope(id);
    if (!env) return reply.code(404).send({ error: "not_found" });
    return env;
  });
  app.post("/signatures/envelopes/:id/callbacks", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = callbackSchema.parse(request.body);
    const result = await signatureService.recordCallback({ envelopeId: id, ...input });
    if (!result) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(result);
  });
  app.post("/signatures/envelopes/:id/void", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const env = signatureService.voidEnvelope(id);
    if (!env) return reply.code(404).send({ error: "not_found" });
    return env;
  });
  app.get("/signatures/envelopes", async () => signatureService.list());
  app.get("/signatures/envelopes/by-agreement/:agreementId", async (request) => {
    const { agreementId } = request.params as { agreementId: string };
    return signatureService.byAgreement(agreementId);
  });
  app.get("/signatures/envelopes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const env = signatureService.findById(id);
    if (!env) return reply.code(404).send({ error: "not_found" });
    return env;
  });
  app.get("/signatures/envelopes/:id/signers", async (request) => {
    const { id } = request.params as { id: string };
    return signatureService.signersFor(id);
  });
  app.get("/signatures/envelopes/:id/callbacks", async (request) => {
    const { id } = request.params as { id: string };
    return signatureService.callbacksFor(id);
  });
}
