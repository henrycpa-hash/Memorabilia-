import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerEscalationRoutes } from "./routes/escalation";

export async function buildEscalationApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "legal-escalation-service" }));
  registerEscalationRoutes(app);
  return app;
}
