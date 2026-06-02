/**
 * Wave 7 billing & metering primitives. Tenant subscriptions, plan
 * entitlements, usage events, billing statements, overages.
 */
export type PricingModel = "flat" | "per_seat" | "per_transaction" | "tiered_usage" | "hybrid";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export type UsageType =
  | "settlement_volume_usd"
  | "settlements_count"
  | "active_creators"
  | "active_users"
  | "auctions_run"
  | "campaigns_launched"
  | "social_posts_published"
  | "policy_evaluations"
  | "partner_inventory_synced"
  | "ml_inferences";

export type StatementStatus = "open" | "issued" | "paid" | "overdue" | "void";

export type PlanEntitlements = {
  includedUnits: Partial<Record<UsageType, number>>;
  hardCaps?: Partial<Record<UsageType, number>>;
  features: string[];
  unitPriceCentsPerUnit?: Partial<Record<UsageType, number>>;
};

/** Deterministic statement calculator: includes overage if usage exceeds plan units. */
export function computeStatementAmountCents(input: {
  baseFeeCents: number;
  usage: Partial<Record<UsageType, number>>;
  entitlements: PlanEntitlements;
}): { totalCents: number; overageCents: number; perUsage: Partial<Record<UsageType, number>> } {
  let overage = 0;
  const perUsage: Partial<Record<UsageType, number>> = {};
  for (const [k, qty] of Object.entries(input.usage) as Array<[UsageType, number]>) {
    const included = input.entitlements.includedUnits[k] ?? 0;
    const above = Math.max(0, qty - included);
    const unit = input.entitlements.unitPriceCentsPerUnit?.[k] ?? 0;
    const charge = Math.round(above * unit);
    overage += charge;
    perUsage[k] = charge;
  }
  return {
    totalCents: input.baseFeeCents + overage,
    overageCents: overage,
    perUsage
  };
}
