import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerCaseRoutes } from "./routes/cases";

export async function buildAuthApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "authentication-service" }));
  registerCaseRoutes(app);
  return app;
}
