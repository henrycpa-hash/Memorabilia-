import type { FastifyInstance } from "fastify";

const base = () => process.env.AUTOMATION_SERVICE_URL || "http://localhost:4021";

function authHeaders(request: { headers: { authorization?: string } }) {
  return {
    "content-type": "application/json",
    authorization: request.headers.authorization || ""
  };
}

export function registerAutomationRoutes(app: FastifyInstance) {
  app.get("/api/automation/rules", async (_request, reply) => {
    const response = await fetch(`${base()}/automation/rules`);
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/automation/rules", async (request, reply) => {
    const response = await fetch(`${base()}/automation/rules`, {
      method: "POST",
      headers: authHeaders(request),
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.delete("/api/automation/rules/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const response = await fetch(`${base()}/automation/rules/${id}`, {
      method: "DELETE",
      headers: { authorization: request.headers.authorization || "" }
    });
    reply.code(response.status).send(await response.json());
  });

  app.post("/api/automation/events", async (request, reply) => {
    const response = await fetch(`${base()}/automation/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body)
    });
    reply.code(response.status).send(await response.json());
  });

  app.get("/api/automation/executions", async (_request, reply) => {
    const response = await fetch(`${base()}/automation/executions`);
    reply.code(response.status).send(await response.json());
  });
}
