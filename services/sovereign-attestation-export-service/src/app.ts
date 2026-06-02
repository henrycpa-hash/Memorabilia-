import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAttestationExportRoutes } from "./routes/attestation-export";

export async function buildAttestationExportApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({ ok: true, service: "sovereign-attestation-export-service" }));
  registerAttestationExportRoutes(app);
  return app;
}
