import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAgencyRoutes } from "./routes/agency";

export async function buildAgencyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "agency-team-service" }));
  registerAgencyRoutes(app);
  return app;
}
