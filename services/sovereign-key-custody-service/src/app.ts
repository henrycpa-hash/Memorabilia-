import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCustodyRoutes } from "./routes/custody";

export async function buildCustodyApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sovereign-key-custody-service" }));
  registerCustodyRoutes(app);
  return app;
}
