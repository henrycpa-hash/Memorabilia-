import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerLedgerRoutes } from "./routes/ledger";
import { registerPayoutRoutes } from "./routes/payouts";

export async function buildLedgerApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "ledger-payout-service" }));
  registerLedgerRoutes(app);
  registerPayoutRoutes(app);
  return app;
}
