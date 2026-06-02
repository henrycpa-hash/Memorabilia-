import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCoaRoutes } from "./routes/coa";
import { registerProvenanceRoutes } from "./routes/provenance";

export async function buildCoaApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "coa-provenance-service" }));
  registerCoaRoutes(app);
  registerProvenanceRoutes(app);
  return app;
}
