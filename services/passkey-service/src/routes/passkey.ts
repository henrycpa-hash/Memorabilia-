import type { FastifyInstance } from "fastify";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { passkeyService } from "../domain/passkey.service";

export function registerPasskeyRoutes(app: FastifyInstance) {
  app.post("/passkey/register/options", async (request, reply) => {
    const b = (request.body || {}) as { email?: string; displayName?: string };
    if (!b.email) return reply.code(400).send({ error: "email_required" });
    return passkeyService.registrationOptions(b.email, b.displayName);
  });

  app.post("/passkey/register/verify", async (request, reply) => {
    const b = (request.body || {}) as { email?: string; response?: RegistrationResponseJSON };
    if (!b.email || !b.response) return reply.code(400).send({ error: "email_and_response_required" });
    const result = await passkeyService.registrationVerify(b.email, b.response);
    reply.code(result.verified ? 200 : 401).send(result);
  });

  app.post("/passkey/login/options", async (request, reply) => {
    const b = (request.body || {}) as { email?: string };
    if (!b.email) return reply.code(400).send({ error: "email_required" });
    if (!passkeyService.hasCredential(b.email)) return reply.code(404).send({ error: "no_passkey" });
    return passkeyService.authenticationOptions(b.email);
  });

  app.post("/passkey/login/verify", async (request, reply) => {
    const b = (request.body || {}) as { email?: string; response?: AuthenticationResponseJSON };
    if (!b.email || !b.response) return reply.code(400).send({ error: "email_and_response_required" });
    const result = await passkeyService.authenticationVerify(b.email, b.response);
    reply.code(result.verified ? 200 : 401).send(result);
  });
}
