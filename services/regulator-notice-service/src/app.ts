import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRegulatorNoticeRoutes } from "./routes/regulator-notice";

export async function buildRegulatorNoticeApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "regulator-notice-service" }));
  registerRegulatorNoticeRoutes(app);
  return app;
}
