import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerFraudRoutes } from "./routes/fraud";

export async function buildFraudApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "fraud-risk-service" }));
  registerFraudRoutes(app);
  return app;
}
