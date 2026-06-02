import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerContractRoutes } from "./routes/contract";

export async function buildContractApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "contract-lifecycle-service" }));
  registerContractRoutes(app);
  return app;
}
