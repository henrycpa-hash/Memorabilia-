import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAthleteRoutes } from "./routes/athletes";

export async function buildAthleteIndexApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "athlete-index-service" }));
  registerAthleteRoutes(app);
  return app;
}
