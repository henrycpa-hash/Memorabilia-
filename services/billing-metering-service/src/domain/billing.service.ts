import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  computeStatementAmountCents,
  type PlanEntitlements,
  type PricingModel,
  type StatementStatus,
  type SubscriptionStatus,
  type UsageType
} from "@crownx-jewel/shared-billing";

export type BillingPlan = {
  id: string;
  planKey: string;
  displayName: string;
  pricingModel: PricingModel;
  baseFeeCents: number;
  entitlements: PlanEntitlements;
  status: "active" | "deprecated";
  createdAt: string;
};

export type TenantSubscription = {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
};

export type UsageEvent = {
  id: string;
  tenantId: string;
  usageType: UsageType;
  quantity: number;
  referenceId: string | null;
  occurredAt: string;
  createdAt: string;
};

export type BillingStatement = {
  id: string;
  tenantId: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  baseFeeCents: number;
  overageCents: number;
  totalCents: number;
  perUsageCents: Partial<Record<UsageType, number>>;
  usageTotals: Partial<Record<UsageType, number>>;
  status: StatementStatus;
  createdAt: string;
};

const plans: BillingPlan[] = [];
const subs: TenantSubscription[] = [];
const events: UsageEvent[] = [];
const statements: BillingStatement[] = [];

/** Seed three default plans on boot. */
function seedPlans() {
  if (plans.length > 0) return;
  plans.push(
    {
      id: newId(),
      planKey: "starter",
      displayName: "Starter",
      pricingModel: "flat",
      baseFeeCents: 50000,
      entitlements: {
        includedUnits: { settlements_count: 100, active_creators: 5, policy_evaluations: 500 },
        features: ["auctions", "campaigns"],
        unitPriceCentsPerUnit: { settlements_count: 50, active_creators: 5000, policy_evaluations: 2 }
      },
      status: "active",
      createdAt: nowIso()
    },
    {
      id: newId(),
      planKey: "growth",
      displayName: "Growth",
      pricingModel: "tiered_usage",
      baseFeeCents: 250000,
      entitlements: {
        includedUnits: { settlements_count: 1000, active_creators: 25, policy_evaluations: 5000, ml_inferences: 10000 },
        features: ["auctions", "campaigns", "experiments", "social_publishing"],
        unitPriceCentsPerUnit: { settlements_count: 30, active_creators: 4000, policy_evaluations: 1, ml_inferences: 1 }
      },
      status: "active",
      createdAt: nowIso()
    },
    {
      id: newId(),
      planKey: "enterprise",
      displayName: "Enterprise",
      pricingModel: "hybrid",
      baseFeeCents: 1000000,
      entitlements: {
        includedUnits: {
          settlements_count: 10000,
          active_creators: 250,
          policy_evaluations: 100000,
          ml_inferences: 250000,
          partner_inventory_synced: 50000
        },
        features: ["all"],
        unitPriceCentsPerUnit: { settlements_count: 20, active_creators: 3000, policy_evaluations: 1, ml_inferences: 1, partner_inventory_synced: 1 }
      },
      status: "active",
      createdAt: nowIso()
    }
  );
}
seedPlans();

export const billingService = {
  // Plans
  async createPlan(input: {
    planKey: string;
    displayName: string;
    pricingModel: PricingModel;
    baseFeeCents: number;
    entitlements: PlanEntitlements;
  }): Promise<BillingPlan> {
    const p: BillingPlan = {
      id: newId(),
      planKey: input.planKey,
      displayName: input.displayName,
      pricingModel: input.pricingModel,
      baseFeeCents: input.baseFeeCents,
      entitlements: input.entitlements,
      status: "active",
      createdAt: nowIso()
    };
    plans.push(p);
    return p;
  },
  listPlans: () => [...plans],
  findPlan: (id: string) => plans.find((p) => p.id === id) || null,
  findPlanByKey: (key: string) => plans.find((p) => p.planKey === key) || null,

  // Subscriptions
  async createSubscription(input: {
    tenantId: string;
    planId: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<TenantSubscription | null> {
    if (!plans.find((p) => p.id === input.planId)) return null;
    const start = input.periodStart || nowIso();
    const end = input.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const s: TenantSubscription = {
      id: newId(),
      tenantId: input.tenantId,
      planId: input.planId,
      status: "active",
      periodStart: start,
      periodEnd: end,
      createdAt: nowIso()
    };
    subs.push(s);
    await publishOutbox({
      id: newId(),
      eventType: "billing.subscription.created",
      aggregateId: s.id,
      aggregateType: "subscription",
      payload: s,
      occurredAt: nowIso()
    });
    return s;
  },
  listSubscriptions: () => [...subs],
  subscriptionsForTenant: (tenantId: string) => subs.filter((s) => s.tenantId === tenantId),
  findSubscription: (id: string) => subs.find((s) => s.id === id) || null,

  // Usage
  async recordUsage(input: {
    tenantId: string;
    usageType: UsageType;
    quantity: number;
    referenceId?: string;
    occurredAt?: string;
  }): Promise<{ event: UsageEvent; capExceeded: boolean }> {
    const e: UsageEvent = {
      id: newId(),
      tenantId: input.tenantId,
      usageType: input.usageType,
      quantity: input.quantity,
      referenceId: input.referenceId || null,
      occurredAt: input.occurredAt || nowIso(),
      createdAt: nowIso()
    };
    events.push(e);

    // Check hard caps for active sub
    let capExceeded = false;
    const sub = subs.find((s) => s.tenantId === input.tenantId && s.status === "active");
    if (sub) {
      const plan = plans.find((p) => p.id === sub.planId);
      const cap = plan?.entitlements.hardCaps?.[input.usageType];
      if (cap != null) {
        const total = events
          .filter((x) => x.tenantId === input.tenantId && x.usageType === input.usageType
            && x.occurredAt >= sub.periodStart && x.occurredAt <= sub.periodEnd)
          .reduce((a, x) => a + x.quantity, 0);
        if (total > cap) capExceeded = true;
      }
    }

    return { event: e, capExceeded };
  },

  usageForTenant(tenantId: string, periodStart?: string, periodEnd?: string): Partial<Record<UsageType, number>> {
    const out: Partial<Record<UsageType, number>> = {};
    for (const e of events) {
      if (e.tenantId !== tenantId) continue;
      if (periodStart && e.occurredAt < periodStart) continue;
      if (periodEnd && e.occurredAt > periodEnd) continue;
      out[e.usageType] = (out[e.usageType] || 0) + e.quantity;
    }
    return out;
  },

  /** Close out a subscription period: build a statement deterministically. */
  async closeStatement(subscriptionId: string): Promise<BillingStatement | null> {
    const sub = subs.find((s) => s.id === subscriptionId);
    if (!sub) return null;
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan) return null;

    const usageTotals = this.usageForTenant(sub.tenantId, sub.periodStart, sub.periodEnd);
    const calc = computeStatementAmountCents({
      baseFeeCents: plan.baseFeeCents,
      usage: usageTotals,
      entitlements: plan.entitlements
    });

    const stmt: BillingStatement = {
      id: newId(),
      tenantId: sub.tenantId,
      subscriptionId: sub.id,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      baseFeeCents: plan.baseFeeCents,
      overageCents: calc.overageCents,
      totalCents: calc.totalCents,
      perUsageCents: calc.perUsage,
      usageTotals,
      status: "issued",
      createdAt: nowIso()
    };
    statements.push(stmt);
    await publishOutbox({
      id: newId(),
      eventType: "billing.statement.issued",
      aggregateId: stmt.id,
      aggregateType: "billing_statement",
      payload: stmt,
      occurredAt: nowIso()
    });
    return stmt;
  },

  listStatements: () => [...statements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  statementsForTenant: (tenantId: string) => statements.filter((s) => s.tenantId === tenantId),

  /** Entitlement check: does this tenant have access to a feature flag? */
  hasFeature(tenantId: string, feature: string): boolean {
    const sub = subs.find((s) => s.tenantId === tenantId && s.status === "active");
    if (!sub) return false;
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan) return false;
    return plan.entitlements.features.includes("all") || plan.entitlements.features.includes(feature);
  }
};
