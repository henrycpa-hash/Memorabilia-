import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerIncidentOrchRoutes } from "./routes/incident-orch";

export async function buildIncidentOrchApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sovereignty-incident-orchestration-service" }));
  registerIncidentOrchRoutes(app);
  return app;
}
