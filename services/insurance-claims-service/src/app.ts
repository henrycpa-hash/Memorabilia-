import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerInsuranceRoutes } from "./routes/insurance";

export async function buildInsuranceApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "insurance-claims-service" }));
  registerInsuranceRoutes(app);
  return app;
}
