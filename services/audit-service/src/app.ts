import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuditRoutes } from "./routes/audit";

export async function buildAuditApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "audit-service" }));
  registerAuditRoutes(app);
  return app;
}
