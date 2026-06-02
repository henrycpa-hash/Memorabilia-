import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerBillingRoutes } from "./routes/billing";

export async function buildBillingApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "billing-metering-service" }));
  registerBillingRoutes(app);
  return app;
}
