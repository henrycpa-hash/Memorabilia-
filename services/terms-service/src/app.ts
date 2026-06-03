import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerTermsRoutes } from "./routes/terms";

export async function buildTermsApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "terms-service" }));
  registerTermsRoutes(app);
  hardenFastify(app, "terms-service");
  return app;
}
