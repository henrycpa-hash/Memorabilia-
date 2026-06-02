import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  calculateWaterfall,
  type RevenueShareScope,
  type RevenueShareTreeStatus,
  type SplitOutcome,
  type SplitTree
} from "@crownx-jewel/shared-revenue-share";

export type RevenueShareTree = {
  id: string;
  scopeType: RevenueShareScope;
  scopeId: string;
  name: string;
  status: RevenueShareTreeStatus;
  effectiveDate: string;
  expirationDate: string | null;
  rules: SplitTree;
  createdAt: string;
};

export type RevenueShareCalculation = {
  id: string;
  treeId: string;
  referenceType: "settlement" | "payout" | "campaign" | "manual";
  referenceId: string;
  totalCents: number;
  outcomes: SplitOutcome[];
  remainderCents: number;
  createdAt: string;
};

export type PartnerStatement = {
  id: string;
  partnerId: string;
  periodStart: string;
  periodEnd: string;
  totalCents: number;
  lineItems: Array<{ calculationId: string; referenceType: string; referenceId: string; amountCents: number }>;
  outputUri: string | null;
  createdAt: string;
};

const trees: RevenueShareTree[] = [];
const calcs: RevenueShareCalculation[] = [];
const statements: PartnerStatement[] = [];

export const revShareService = {
  async createTree(input: {
    scopeType: RevenueShareScope;
    scopeId: string;
    name: string;
    effectiveDate: string;
    expirationDate?: string;
    rules: SplitTree;
  }): Promise<RevenueShareTree> {
    // Supersede prior active tree with same scope
    for (const t of trees) {
      if (t.scopeType === input.scopeType && t.scopeId === input.scopeId && t.status === "active") {
        t.status = "superseded";
      }
    }
    const tree: RevenueShareTree = {
      id: newId(),
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      name: input.name,
      status: "active",
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate || null,
      rules: input.rules,
      createdAt: nowIso()
    };
    trees.push(tree);
    await publishOutbox({
      id: newId(),
      eventType: "revshare.tree.activated",
      aggregateId: tree.id,
      aggregateType: "revenue_share_tree",
      payload: tree,
      occurredAt: nowIso()
    });
    return tree;
  },

  archiveTree(id: string) {
    const t = trees.find((x) => x.id === id);
    if (!t) return null;
    t.status = "archived";
    return t;
  },

  /**
   * Resolve the active tree for a (scopeType, scopeId) pair as of now.
   * If tenant tree not found, falls back to platform-wide.
   */
  resolveTree(scopeType: RevenueShareScope, scopeId: string): RevenueShareTree | null {
    const now = Date.now();
    const candidates = trees.filter((t) =>
      t.status === "active"
      && t.scopeType === scopeType
      && t.scopeId === scopeId
      && new Date(t.effectiveDate).getTime() <= now
      && (!t.expirationDate || new Date(t.expirationDate).getTime() >= now)
    );
    if (candidates.length > 0) return candidates[0];
    if (scopeType === "tenant") {
      return trees.find((t) => t.status === "active" && t.scopeType === "platform") || null;
    }
    return null;
  },

  /**
   * Calculate the waterfall for a transaction. Caller specifies the scope
   * to resolve and the total cents to split. Pure deterministic math.
   */
  async calculate(input: {
    scopeType: RevenueShareScope;
    scopeId: string;
    referenceType: "settlement" | "payout" | "campaign" | "manual";
    referenceId: string;
    totalCents: number;
  }): Promise<RevenueShareCalculation | null> {
    const tree = this.resolveTree(input.scopeType, input.scopeId);
    if (!tree) return null;
    const result = calculateWaterfall(input.totalCents, tree.rules);
    const calc: RevenueShareCalculation = {
      id: newId(),
      treeId: tree.id,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      totalCents: input.totalCents,
      outcomes: result.outcomes,
      remainderCents: result.remainderCents,
      createdAt: nowIso()
    };
    calcs.push(calc);
    await publishOutbox({
      id: newId(),
      eventType: "revshare.calculation.completed",
      aggregateId: calc.id,
      aggregateType: "revenue_share_calculation",
      payload: { calcId: calc.id, treeId: tree.id, totalCents: calc.totalCents, beneficiaries: calc.outcomes.length },
      occurredAt: nowIso()
    });
    return calc;
  },

  /**
   * Build a partner statement covering a period — sums all calculation
   * outcomes for that beneficiary in window.
   */
  async buildPartnerStatement(input: {
    partnerId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<PartnerStatement> {
    const startMs = new Date(input.periodStart).getTime();
    const endMs = new Date(input.periodEnd).getTime();
    const lineItems: PartnerStatement["lineItems"] = [];
    let total = 0;
    for (const c of calcs) {
      const ms = new Date(c.createdAt).getTime();
      if (ms < startMs || ms > endMs) continue;
      const matched = c.outcomes.filter((o) => o.beneficiaryId === input.partnerId);
      for (const o of matched) {
        lineItems.push({
          calculationId: c.id,
          referenceType: c.referenceType,
          referenceId: c.referenceId,
          amountCents: o.amountCents
        });
        total += o.amountCents;
      }
    }
    const stmt: PartnerStatement = {
      id: newId(),
      partnerId: input.partnerId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalCents: total,
      lineItems,
      outputUri: `s3://crownx-revshare/partners/${input.partnerId}/${input.periodStart}_${input.periodEnd}.csv`,
      createdAt: nowIso()
    };
    statements.push(stmt);
    return stmt;
  },

  // Read APIs
  listTrees: () => [...trees].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findTree: (id: string) => trees.find((t) => t.id === id) || null,
  treesForScope: (scopeType: RevenueShareScope, scopeId: string) =>
    trees.filter((t) => t.scopeType === scopeType && t.scopeId === scopeId),

  listCalculations: (treeId?: string) =>
    calcs.filter((c) => !treeId || c.treeId === treeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findCalculation: (id: string) => calcs.find((c) => c.id === id) || null,
  calculationsByReference: (referenceType: string, referenceId: string) =>
    calcs.filter((c) => c.referenceType === referenceType && c.referenceId === referenceId),

  listStatements: (partnerId?: string) =>
    statements.filter((s) => !partnerId || s.partnerId === partnerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findStatement: (id: string) => statements.find((s) => s.id === id) || null
};
