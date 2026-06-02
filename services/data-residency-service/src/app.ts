import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerResidencyRoutes } from "./routes/residency";

export async function buildResidencyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "data-residency-service" }));
  registerResidencyRoutes(app);
  return app;
}
