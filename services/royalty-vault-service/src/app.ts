import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoyaltyVaultRoutes } from "./routes/vault";

export async function buildRoyaltyVaultApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "royalty-vault-service" }));
  registerRoyaltyVaultRoutes(app);
  return app;
}
