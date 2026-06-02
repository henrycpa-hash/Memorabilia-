import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerShippingRoutes } from "./routes/shipping";

export async function buildShippingApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "shipping-logistics-service" }));
  registerShippingRoutes(app);
  return app;
}
