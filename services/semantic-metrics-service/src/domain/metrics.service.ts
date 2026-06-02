import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  DEFAULT_METRICS,
  findMetric,
  type DimensionKey,
  type MetricDefinition
} from "@crownx-jewel/shared-metrics";

const warehouseBase = () =>
  process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4020";
const fraudBase = () =>
  process.env.FRAUD_SERVICE_URL || "http://localhost:4017";
const expBase = () =>
  process.env.EXPERIMENT_SERVICE_URL || "http://localhost:4026";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type CustomMetric = MetricDefinition & {
  id: string;
  tenantId: string | null;
  governance: "platform" | "tenant";
  createdAt: string;
};

export type MetricEvaluation = {
  metricKey: string;
  value: number | null;
  unit: string;
  filters: Partial<Record<DimensionKey, string>>;
  evaluatedAt: string;
};

const customMetrics: CustomMetric[] = [];

function listAll(): MetricDefinition[] {
  return [...DEFAULT_METRICS, ...customMetrics];
}

/**
 * Wave 6 metric evaluator. Pulls from warehouse + fraud + experiment services
 * to satisfy the seven default metrics. Wave 7 layers a real query planner
 * that can resolve any custom metric against the warehouse.
 */
async function evaluateMetric(
  metricKey: string,
  filters: Partial<Record<DimensionKey, string>>
): Promise<MetricEvaluation> {
  const def = findMetric(metricKey) || customMetrics.find((c) => c.key === metricKey);
  const evaluatedAt = nowIso();
  if (!def) {
    return { metricKey, value: null, unit: "count", filters, evaluatedAt };
  }

  const wMetrics = await fetchOk<{
    market: Record<string, number | string>;
    growth: Record<string, number>;
    trust: Record<string, number>;
  }>(`${warehouseBase()}/warehouse/metrics`);

  let value: number | null = null;

  if (metricKey === "gmv_completed") {
    value = wMetrics?.market?.gmv != null ? Number(wMetrics.market.gmv) : null;
  } else if (metricKey === "auction_close_success_rate") {
    value = wMetrics?.market?.auctionCloseSuccessRate as number | undefined ?? null;
  } else if (metricKey === "campaign_ctr") {
    value = wMetrics?.growth?.campaignCtr ?? null;
  } else if (metricKey === "settlement_hold_rate") {
    value = wMetrics?.trust?.settlementHoldRate ?? null;
  } else if (metricKey === "fraud_alert_volume") {
    const alerts = await fetchOk<unknown[]>(`${fraudBase()}/fraud/alerts`);
    value = (alerts || []).length;
  } else if (metricKey === "experiment_conversion_rate") {
    const expId = filters.experiment_id;
    if (expId) {
      const r = await fetchOk<{ totalExposures: number; totalConversions: number }>(
        `${expBase()}/experiments/${expId}/results`
      );
      value = r ? (r.totalExposures > 0 ? r.totalConversions / r.totalExposures : 0) : null;
    } else {
      value = null;
    }
  } else if (metricKey === "compliance_evaluations") {
    // Wave 6 placeholder — would query policy-compliance-service in Wave 7.
    value = 0;
  }

  return { metricKey, value, unit: def.unit, filters, evaluatedAt };
}

export const metricsService = {
  listDefaults: () => DEFAULT_METRICS,
  listAll,

  async registerCustom(input: Omit<MetricDefinition, "category"> & {
    category: MetricDefinition["category"];
    tenantId?: string;
  }): Promise<CustomMetric> {
    const m: CustomMetric = {
      id: newId(),
      key: input.key,
      label: input.label,
      category: input.category,
      source: input.source,
      unit: input.unit,
      description: input.description,
      dimensions: input.dimensions,
      tenantId: input.tenantId || null,
      governance: input.tenantId ? "tenant" : "platform",
      createdAt: nowIso()
    };
    customMetrics.push(m);
    await publishOutbox({
      id: newId(),
      eventType: "metrics.custom.registered",
      aggregateId: m.id,
      aggregateType: "metric",
      payload: m,
      occurredAt: nowIso()
    });
    return m;
  },

  findByKey: (key: string) => findMetric(key) || customMetrics.find((c) => c.key === key) || null,
  evaluate: evaluateMetric,

  async evaluateAll(filters: Partial<Record<DimensionKey, string>> = {}): Promise<MetricEvaluation[]> {
    const out: MetricEvaluation[] = [];
    for (const def of DEFAULT_METRICS) {
      out.push(await evaluateMetric(def.key, filters));
    }
    return out;
  }
};
