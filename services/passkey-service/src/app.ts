import Fastify from "fastify";
import cors from "@fastify/cors";
import { hardenFastify } from "@crownx-jewel/shared-kernel";
import { registerPasskeyRoutes } from "./routes/passkey";

export async function buildPasskeyApp() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "passkey-service" }));
  registerPasskeyRoutes(app);
  hardenFastify(app, "passkey-service");
  return app;
}
