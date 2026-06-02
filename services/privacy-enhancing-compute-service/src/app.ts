import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerPrivacyComputeRoutes } from "./routes/privacy-compute";

export async function buildPrivacyComputeApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "privacy-enhancing-compute-service" }));
  registerPrivacyComputeRoutes(app);
  return app;
}
