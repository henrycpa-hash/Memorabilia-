import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerHealthRoutes } from "./routes/health";
import { registerUserRoutes } from "./routes/users";
import { registerCreatorRoutes } from "./routes/creators";

export async function buildIdentityApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  registerHealthRoutes(app);
  registerUserRoutes(app);
  registerCreatorRoutes(app);
  return app;
}
