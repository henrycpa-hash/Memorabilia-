import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerEscrowRoutes } from "./routes/escrow";

export async function buildPackNShipApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "pack-n-ship-service" }));
  registerEscrowRoutes(app);
  hardenFastify(app, "pack-n-ship-service");
  return app;
}
