import type { FastifyInstance } from "fastify";

const authBase = () => process.env.AUTH_SERVICE_URL || "http://localhost:4003";
const assetBase = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";
const coaBase = () => process.env.COA_SERVICE_URL || "http://localhost:4004";
const notifBase = () =>
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008";

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth-cases", async (request, reply) => {
    const response = await fetch(`${authBase()}/cases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/auth-cases", async (request, reply) => {
    const response = await fetch(`${authBase()}/cases`, {
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/auth-cases/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${authBase()}/cases/${id}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: request.headers.authorization || ""
      },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  /**
   * Wave 2 finalize orchestration.
   *
   *   1. authentication-service.approve(caseId)
   *   2. asset-registry-service.markApproved(assetId)   (also flips visibility -> public)
   *   3. coa-provenance-service.issue(assetId, caseId)
   *   4. notification-service.create(coa_issued, ownerId)
   *
   * Body: { reviewerId, decisionReason?, assetId, ownerId? }
   *
   * If ownerId is supplied, the owner gets a notification when the COA is issued.
   * (Wave 3 will replace this with a domain event subscription.)
   */
  app.post("/api/auth-cases/:id/finalize", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      reviewerId: string;
      decisionReason?: string;
      assetId: string;
      ownerId?: string;
    };
    const auth = request.headers.authorization || "";

    const authResponse = await fetch(`${authBase()}/cases/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({
        reviewerId: body.reviewerId,
        decisionReason: body.decisionReason || "Approved"
      })
    });
    if (!authResponse.ok) {
      return reply.code(authResponse.status).send(await authResponse.json());
    }
    const authCase = await authResponse.json();

    await fetch(`${assetBase()}/internal/assets/${body.assetId}/approve`, {
      method: "POST"
    });

    const coaResponse = await fetch(`${coaBase()}/coa/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: body.assetId, authCaseId: authCase.id })
    });
    const coa = await coaResponse.json();

    // Fire-and-forget notification (Wave 2). Failures here are logged but don't
    // fail the finalize call — the COA is already issued.
    if (body.ownerId) {
      try {
        await fetch(`${notifBase()}/notifications`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: body.ownerId,
            type: "coa_issued",
            title: "Your collectible is authenticated",
            body: `COA ${coa.coaNumber} has been issued for your collectible.`
          })
        });
      } catch (err) {
        request.log.error({ err }, "notification fanout failed");
      }
    }

    reply.send({ authCase, coa });
  });
}
