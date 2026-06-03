import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerAthleteRoutes } from "./routes/athletes";

export async function buildAthleteIndexApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "athlete-index-service" }));
  registerAthleteRoutes(app);
  hardenFastify(app, "athlete-index-service");
  return app;
}
