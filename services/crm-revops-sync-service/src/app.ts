import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCrmRevopsRoutes } from "./routes/crm-revops";

export async function buildCrmRevopsApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "crm-revops-sync-service" }));
  registerCrmRevopsRoutes(app);
  return app;
}
