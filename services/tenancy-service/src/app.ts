import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerTenancyRoutes } from "./routes/tenants";

export async function buildTenancyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "tenancy-service" }));
  registerTenancyRoutes(app);
  return app;
}
