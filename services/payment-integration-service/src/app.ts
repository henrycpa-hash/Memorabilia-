import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPaymentRoutes } from "./routes/payments";

export async function buildPaymentApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "payment-integration-service" }));
  registerPaymentRoutes(app);
  return app;
}
