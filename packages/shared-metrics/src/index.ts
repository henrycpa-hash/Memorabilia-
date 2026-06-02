/**
 * Wave 6 governed semantic metrics primitives.
 *
 * The semantic-metrics-service holds a metric dictionary that's reusable
 * across Wave 5 reporting + the Wave 6 institutional dashboards. Each metric
 * has a stable key, a human label, a computation hint, and the source data
 * domain it pulls from. Wave 7 layers a real query planner; Wave 6 produces
 * the registry + a deterministic-evaluator stub.
 */
export type MetricCategory = "market" | "growth" | "trust" | "operations" | "compliance";

export type MetricSource = "warehouse" | "settlement" | "fraud" | "campaign" | "experiment";

export type DimensionKey =
  | "creator_id"
  | "tenant_id"
  | "asset_type"
  | "campaign_type"
  | "experiment_id"
  | "settlement_state"
  | "channel"
  | "period_day";

export type MetricDefinition = {
  key: string;
  label: string;
  category: MetricCategory;
  source: MetricSource;
  unit: "count" | "currency" | "percent" | "ratio" | "duration_seconds";
  description: string;
  dimensions: DimensionKey[];
};

export const DEFAULT_METRICS: MetricDefinition[] = [
  {
    key: "gmv_completed",
    label: "GMV (completed settlements)",
    category: "market",
    source: "warehouse",
    unit: "currency",
    description: "Sum of completed-settlement gross amounts in USD",
    dimensions: ["creator_id", "tenant_id", "asset_type", "period_day"]
  },
  {
    key: "auction_close_success_rate",
    label: "Auction close success rate",
    category: "market",
    source: "warehouse",
    unit: "ratio",
    description: "Auction closures that resulted in a sale",
    dimensions: ["tenant_id", "period_day"]
  },
  {
    key: "campaign_ctr",
    label: "Campaign CTR",
    category: "growth",
    source: "warehouse",
    unit: "ratio",
    description: "Campaign clicks divided by launches",
    dimensions: ["creator_id", "campaign_type", "tenant_id"]
  },
  {
    key: "settlement_hold_rate",
    label: "Settlement hold rate",
    category: "trust",
    source: "warehouse",
    unit: "ratio",
    description: "Share of new settlements that entered on_hold",
    dimensions: ["tenant_id", "period_day"]
  },
  {
    key: "experiment_conversion_rate",
    label: "Experiment conversion rate",
    category: "operations",
    source: "experiment",
    unit: "ratio",
    description: "Per-variant conversion rate aggregated across exposures",
    dimensions: ["experiment_id"]
  },
  {
    key: "fraud_alert_volume",
    label: "Fraud alert volume",
    category: "trust",
    source: "fraud",
    unit: "count",
    description: "Open fraud alerts (warning + critical)",
    dimensions: ["tenant_id"]
  },
  {
    key: "compliance_evaluations",
    label: "Policy evaluations run",
    category: "compliance",
    source: "warehouse",
    unit: "count",
    description: "Wave 6 policy evaluations performed",
    dimensions: ["tenant_id"]
  }
];

export function findMetric(key: string): MetricDefinition | null {
  return DEFAULT_METRICS.find((m) => m.key === key) || null;
}
