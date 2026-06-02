import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { driverForecastService } from "../domain/driver-forecast.service";

const CATEGORIES = ["revenue", "usage", "procurement", "partner", "residency", "sovereignty", "implementation", "renewal"] as const;
const UNITS = ["bps", "days", "score_0_100", "cents", "count", "pct"] as const;
const SCENARIO_TYPES = ["best_case", "base_case", "conservative", "worst_case"] as const;

const driverSchema = z.object({
  driverKey: z.string().min(1),
  category: z.enum(CATEGORIES),
  displayName: z.string().min(1),
  defaultValue: z.number(),
  unit: z.enum(UNITS),
  description: z.string()
});

const runSchema = z.object({
  accountId: z.string(),
  periodKey: z.string(),
  scenarioType: z.enum(SCENARIO_TYPES),
  driverInputs: z.array(z.object({ driverKey: z.string(), value: z.number() }))
});

const sensitivitySchema = z.object({
  runId: z.string(),
  driverKey: z.string(),
  deltaType: z.enum(["absolute", "percent"]),
  deltaValue: z.number()
});

export function registerDriverForecastRoutes(app: FastifyInstance) {
  // Drivers
  app.post("/forecast-drivers/drivers", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = driverSchema.parse(request.body);
    const d = await driverForecastService.addDriver(input as never);
    reply.code(201).send(d);
  });
  app.get("/forecast-drivers/drivers", async (request) => {
    const { category } = request.query as { category?: typeof CATEGORIES[number] };
    return driverForecastService.listDrivers(category);
  });
  app.get("/forecast-drivers/drivers/by-key/:k", async (request, reply) => {
    const { k } = request.params as { k: string };
    const d = driverForecastService.driverByKey(k);
    if (!d) return reply.code(404).send({ error: "not_found" });
    return d;
  });

  // Model runs
  app.post("/forecast-drivers/runs", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = runSchema.parse(request.body);
    const r = await driverForecastService.runModel(input);
    reply.code(201).send(r);
  });
  app.get("/forecast-drivers/runs", async (request) => {
    const { accountId } = request.query as { accountId?: string };
    return driverForecastService.listRuns(accountId);
  });
  app.get("/forecast-drivers/runs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = driverForecastService.findRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // Sensitivities
  app.post("/forecast-drivers/sensitivities", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = sensitivitySchema.parse(request.body);
    const s = await driverForecastService.runSensitivity(input);
    if (!s) return reply.code(404).send({ error: "run_not_found" });
    reply.code(201).send(s);
  });
  app.get("/forecast-drivers/runs/:id/sensitivities", async (request) => {
    const { id } = request.params as { id: string };
    return driverForecastService.sensitivitiesForRun(id);
  });

  app.get("/forecast-drivers/pipeline-summary", async () => driverForecastService.pipelineSummary());
}
