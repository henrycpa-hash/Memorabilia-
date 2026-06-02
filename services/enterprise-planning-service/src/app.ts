import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPlanningRoutes } from "./routes/planning";

export async function buildPlanningApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "enterprise-planning-service" }));
  registerPlanningRoutes(app);
  return app;
}
