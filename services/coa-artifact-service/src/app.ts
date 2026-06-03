import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCoaArtifactRoutes } from "./routes/coa";

export async function buildCoaArtifactApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "coa-artifact-service" }));
  registerCoaArtifactRoutes(app);
  return app;
}
