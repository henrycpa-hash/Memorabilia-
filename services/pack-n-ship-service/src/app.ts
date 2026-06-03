import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerEscrowRoutes } from "./routes/escrow";

export async function buildPackNShipApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "pack-n-ship-service" }));
  registerEscrowRoutes(app);
  return app;
}
