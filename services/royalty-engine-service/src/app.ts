import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoyaltyRoutes } from "./routes/royalty";

export async function buildRoyaltyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "royalty-engine-service" }));
  registerRoyaltyRoutes(app);
  return app;
}
