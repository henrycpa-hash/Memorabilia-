import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerReportingRoutes } from "./routes/reports";

export async function buildReportingApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "reporting-service" }));
  registerReportingRoutes(app);
  return app;
}
