import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAssuranceRoutes } from "./routes/assurance";

export async function buildAssuranceApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "revenue-assurance-service" }));
  registerAssuranceRoutes(app);
  return app;
}
