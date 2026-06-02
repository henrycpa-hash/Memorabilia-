import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCrmRoutes } from "./routes/crm";

export async function buildCrmApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "creator-crm-service" }));
  registerCrmRoutes(app);
  return app;
}
