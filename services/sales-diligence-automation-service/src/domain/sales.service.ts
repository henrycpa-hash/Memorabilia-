import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  DEFAULT_DILIGENCE_CHECKLIST,
  advanceStage,
  estimateRemainingEffort,
  workspaceCompleteness,
  type DiligenceChecklistItem,
  type DiligenceWorkspaceStatus,
  type ResponseItemStatus,
  type SalesStage
} from "@crownx-jewel/shared-sales";

export type SalesOpportunity = {
  id: string;
  accountName: string;
  buyerKey: string;
  stage: SalesStage;
  ownerUserId: string | null;
  scopeJson: Record<string, unknown>;
  estimatedDealCents: number | null;
  expectedCloseDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiligenceWorkspace = {
  id: string;
  opportunityId: string;
  status: DiligenceWorkspaceStatus;
  checklist: DiligenceChecklistItem[];
  outputUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiligenceResponseItem = {
  id: string;
  workspaceId: string;
  itemKey: string;
  title: string;
  category: DiligenceChecklistItem["category"];
  status: ResponseItemStatus;
  body: string;
  evidenceRef: string | null;
  buyerSpecific: boolean;
  estimatedEffortHours: number;
  /** Workspace IDs from which content was reused. */
  reusedFromWorkspaceIds: string[];
  reviewerUserId: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const opportunities: SalesOpportunity[] = [];
const workspaces: DiligenceWorkspace[] = [];
const responseItems: DiligenceResponseItem[] = [];

export const salesService = {
  async createOpportunity(input: {
    accountName: string;
    buyerKey: string;
    ownerUserId?: string;
    estimatedDealCents?: number;
    expectedCloseDate?: string;
    scopeJson?: Record<string, unknown>;
  }): Promise<SalesOpportunity> {
    const o: SalesOpportunity = {
      id: newId(),
      accountName: input.accountName,
      buyerKey: input.buyerKey,
      stage: "discovery",
      ownerUserId: input.ownerUserId || null,
      scopeJson: input.scopeJson || {},
      estimatedDealCents: input.estimatedDealCents ?? null,
      expectedCloseDate: input.expectedCloseDate ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    opportunities.push(o);
    await publishOutbox({
      id: newId(),
      eventType: "sales.opportunity.created",
      aggregateId: o.id,
      aggregateType: "sales_opportunity",
      payload: { id: o.id, accountName: o.accountName, buyerKey: o.buyerKey },
      occurredAt: nowIso()
    });
    return o;
  },

  setStage(id: string, stage: SalesStage) {
    const o = opportunities.find((x) => x.id === id);
    if (!o) return null;
    o.stage = stage;
    o.updatedAt = nowIso();
    return o;
  },

  /** Advance to the next stage. Returns null if already terminal or not found. */
  advance(id: string) {
    const o = opportunities.find((x) => x.id === id);
    if (!o) return null;
    const next = advanceStage(o.stage);
    if (!next) return null;
    o.stage = next;
    o.updatedAt = nowIso();
    return o;
  },

  /** Open a diligence workspace. Auto-fills the default checklist when none provided. */
  async openWorkspace(input: {
    opportunityId: string;
    checklistOverride?: DiligenceChecklistItem[];
  }): Promise<DiligenceWorkspace | null> {
    const opp = opportunities.find((o) => o.id === input.opportunityId);
    if (!opp) return null;
    const checklist = input.checklistOverride && input.checklistOverride.length > 0
      ? input.checklistOverride
      : DEFAULT_DILIGENCE_CHECKLIST;

    const w: DiligenceWorkspace = {
      id: newId(),
      opportunityId: opp.id,
      status: "preparing",
      checklist,
      outputUri: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    workspaces.push(w);

    for (const item of checklist) {
      const ri: DiligenceResponseItem = {
        id: newId(),
        workspaceId: w.id,
        itemKey: item.itemKey,
        title: item.title,
        category: item.category,
        status: "pending",
        body: "",
        evidenceRef: item.defaultEvidenceRef || null,
        buyerSpecific: item.buyerSpecific,
        estimatedEffortHours: item.estimatedEffortHours,
        reusedFromWorkspaceIds: [],
        reviewerUserId: null,
        deliveredAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      responseItems.push(ri);
    }

    // Auto-advance opportunity to diligence stage if not yet there
    if (opp.stage === "discovery" || opp.stage === "qualification" || opp.stage === "evaluation") {
      opp.stage = "diligence";
      opp.updatedAt = nowIso();
    }

    await publishOutbox({
      id: newId(),
      eventType: "diligence.workspace.opened",
      aggregateId: w.id,
      aggregateType: "diligence_workspace",
      payload: { id: w.id, opportunityId: opp.id, itemCount: checklist.length },
      occurredAt: nowIso()
    });

    return w;
  },

  setWorkspaceStatus(id: string, status: DiligenceWorkspaceStatus) {
    const w = workspaces.find((x) => x.id === id);
    if (!w) return null;
    w.status = status;
    w.updatedAt = nowIso();
    return w;
  },

  /**
   * Submit a workspace for buyer review. Marks status, emits event,
   * advances opportunity to negotiation if completeness is 100%.
   */
  async submitWorkspace(id: string): Promise<DiligenceWorkspace | null> {
    const w = workspaces.find((x) => x.id === id);
    if (!w) return null;
    const items = responseItems.filter((r) => r.workspaceId === id);
    const stats = workspaceCompleteness(items);
    w.status = "buyer_review";
    w.outputUri = `s3://crownx-diligence/${w.id}/data-room.zip`;
    w.updatedAt = nowIso();
    if (stats.completenessPct === 100) {
      const opp = opportunities.find((o) => o.id === w.opportunityId);
      if (opp && (opp.stage === "diligence" || opp.stage === "evaluation")) {
        opp.stage = "negotiation";
        opp.updatedAt = nowIso();
      }
      w.status = "completed";
      await publishOutbox({
        id: newId(),
        eventType: "diligence.workspace.completed",
        aggregateId: w.id,
        aggregateType: "diligence_workspace",
        payload: { id: w.id, opportunityId: w.opportunityId },
        occurredAt: nowIso()
      });
    }
    return w;
  },

  updateResponseItem(input: {
    id: string;
    status?: ResponseItemStatus;
    body?: string;
    evidenceRef?: string | null;
    reviewerUserId?: string;
  }) {
    const ri = responseItems.find((r) => r.id === input.id);
    if (!ri) return null;
    if (input.status) ri.status = input.status;
    if (input.body !== undefined) ri.body = input.body;
    if (input.evidenceRef !== undefined) ri.evidenceRef = input.evidenceRef;
    if (input.reviewerUserId !== undefined) ri.reviewerUserId = input.reviewerUserId;
    if (input.status === "delivered") ri.deliveredAt = nowIso();
    ri.updatedAt = nowIso();
    return ri;
  },

  /**
   * Find prior delivered responses for the same itemKey across other
   * workspaces — used to suggest reuse to accelerate buyer-specific drafting.
   */
  reuseSuggestions(workspaceId: string): Array<{ itemKey: string; suggestions: DiligenceResponseItem[] }> {
    const items = responseItems.filter((r) => r.workspaceId === workspaceId);
    const out: Array<{ itemKey: string; suggestions: DiligenceResponseItem[] }> = [];
    for (const ri of items) {
      const suggestions = responseItems.filter(
        (r) => r.workspaceId !== workspaceId
          && r.itemKey === ri.itemKey
          && r.status === "delivered"
      );
      if (suggestions.length > 0) out.push({ itemKey: ri.itemKey, suggestions });
    }
    return out;
  },

  /**
   * Apply a reused response from a prior workspace to a target item.
   * Records the source workspace ID for governance/audit trails.
   */
  applyReuse(input: { targetItemId: string; sourceItemId: string }) {
    const target = responseItems.find((r) => r.id === input.targetItemId);
    const source = responseItems.find((r) => r.id === input.sourceItemId);
    if (!target || !source) return null;
    target.body = source.body;
    target.evidenceRef = source.evidenceRef;
    target.status = "ready";
    target.reusedFromWorkspaceIds = [...new Set([...target.reusedFromWorkspaceIds, source.workspaceId])];
    target.updatedAt = nowIso();
    return target;
  },

  // Read APIs
  listOpportunities: (stage?: SalesStage) =>
    opportunities.filter((o) => !stage || o.stage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findOpportunity: (id: string) => opportunities.find((o) => o.id === id) || null,
  listWorkspaces: (opportunityId?: string) =>
    workspaces.filter((w) => !opportunityId || w.opportunityId === opportunityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findWorkspace: (id: string) => workspaces.find((w) => w.id === id) || null,
  itemsForWorkspace: (workspaceId: string) =>
    responseItems.filter((r) => r.workspaceId === workspaceId).sort((a, b) => a.itemKey.localeCompare(b.itemKey)),
  findItem: (id: string) => responseItems.find((r) => r.id === id) || null,
  workspaceStats(workspaceId: string) {
    const w = workspaces.find((x) => x.id === workspaceId);
    if (!w) return null;
    const items = responseItems.filter((r) => r.workspaceId === workspaceId);
    return {
      ...workspaceCompleteness(items),
      remainingEffortHours: estimateRemainingEffort(items, w.checklist)
    };
  }
};
