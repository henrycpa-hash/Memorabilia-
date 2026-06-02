import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSlaRoutes } from "./routes/sla";

export async function buildSlaApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sla-governance-service" }));
  registerSlaRoutes(app);
  return app;
}
