import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerLegalPacketRoutes } from "./routes/legal";

export async function buildLegalApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "legal-packet-service" }));
  registerLegalPacketRoutes(app);
  return app;
}
