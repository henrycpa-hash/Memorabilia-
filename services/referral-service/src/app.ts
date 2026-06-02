import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerReferralRoutes } from "./routes/referrals";

export async function buildReferralApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "referral-service" }));
  registerReferralRoutes(app);
  return app;
}
