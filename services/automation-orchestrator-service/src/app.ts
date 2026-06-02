import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAutomationRoutes } from "./routes/automation";
import { automationService } from "./domain/automation.service";

export async function buildAutomationApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  app.get("/health", async () => ({
    ok: true,
    service: "automation-orchestrator-service"
  }));
  registerAutomationRoutes(app);

  // Seed Wave 4 default rules on boot.
  automationService.seedDefaults();

  return app;
}
