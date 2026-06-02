import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerSignatureRoutes } from "./routes/signature";

export async function buildSignatureApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "signature-integration-service" }));
  registerSignatureRoutes(app);
  return app;
}
