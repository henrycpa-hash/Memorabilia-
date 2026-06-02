import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const redliningBase = () => process.env.REDLINING_NEGOTIATION_SERVICE_URL || "http://localhost:4055";

export type RedlineWorkspaceStatus =
  | "open"
  | "in_review"
  | "checkpoint_pending"
  | "approved"
  | "promoted_to_signature"
  | "abandoned";

export type CommentStatus = "open" | "resolved" | "rejected" | "deferred";

export type ClausePositionType = "accept" | "reject" | "propose_alternative" | "request_review";

export type CheckpointType = "draft_review" | "internal_legal_review" | "counterparty_review" | "final_approval";

export type CheckpointStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type ReviewerRole = "internal_legal" | "external_counsel" | "business_owner" | "counterparty" | "executive_approver";

export type RedlineWorkspace = {
  id: string;
  agreementId: string;
  /** Latest contract version this workspace is editing (from redlining-negotiation-service). */
  currentVersionId: string | null;
  status: RedlineWorkspaceStatus;
  /** Reviewer assignments (userId + role). */
  reviewers: Array<{ userId: string; role: ReviewerRole; assignedAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type RedlineComment = {
  id: string;
  workspaceId: string;
  clauseKey: string | null;
  /** Comment thread anchor — null for workspace-wide comments. */
  parentCommentId: string | null;
  actorUserId: string;
  body: string;
  status: CommentStatus;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type ClausePosition = {
  id: string;
  workspaceId: string;
  clauseKey: string;
  actorUserId: string;
  actorRole: ReviewerRole;
  positionType: ClausePositionType;
  /** Free-form alternate language when positionType = propose_alternative. */
  proposedLanguage: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type NegotiationCheckpoint = {
  id: string;
  workspaceId: string;
  checkpointType: CheckpointType;
  status: CheckpointStatus;
  /** Snapshot of unresolved comment count and per-clause position summary. */
  snapshot: {
    unresolvedComments: number;
    clausesWithPositions: number;
    clausesByPositionType: Record<ClausePositionType, number>;
  };
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
};

const workspaces: RedlineWorkspace[] = [];
const comments: RedlineComment[] = [];
const positions: ClausePosition[] = [];
const checkpoints: NegotiationCheckpoint[] = [];

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const collabRedliningService = {
  async openWorkspace(input: {
    agreementId: string;
    currentVersionId?: string;
    reviewers?: Array<{ userId: string; role: ReviewerRole }>;
  }): Promise<RedlineWorkspace> {
    let versionId: string | null = input.currentVersionId || null;
    if (!versionId) {
      // Pull latest version from redlining-negotiation-service if available
      const versions = await fetchOk<Array<{ id: string }>>(
        `${redliningBase()}/redlines/versions?agreementId=${input.agreementId}`
      );
      if (versions && versions.length > 0) versionId = versions[0].id;
    }
    const w: RedlineWorkspace = {
      id: newId(),
      agreementId: input.agreementId,
      currentVersionId: versionId,
      status: "open",
      reviewers: (input.reviewers || []).map((r) => ({ ...r, assignedAt: nowIso() })),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    workspaces.push(w);
    await publishOutbox({
      id: newId(),
      eventType: "collab.redline.workspace.opened",
      aggregateId: w.id,
      aggregateType: "redline_workspace",
      payload: { id: w.id, agreementId: w.agreementId, currentVersionId: w.currentVersionId, reviewerCount: w.reviewers.length },
      occurredAt: nowIso()
    });
    return w;
  },

  setWorkspaceStatus(id: string, status: RedlineWorkspaceStatus) {
    const w = workspaces.find((x) => x.id === id);
    if (!w) return null;
    w.status = status;
    w.updatedAt = nowIso();
    return w;
  },

  setCurrentVersion(id: string, versionId: string) {
    const w = workspaces.find((x) => x.id === id);
    if (!w) return null;
    w.currentVersionId = versionId;
    w.updatedAt = nowIso();
    return w;
  },

  assignReviewer(workspaceId: string, userId: string, role: ReviewerRole) {
    const w = workspaces.find((x) => x.id === workspaceId);
    if (!w) return null;
    w.reviewers.push({ userId, role, assignedAt: nowIso() });
    w.updatedAt = nowIso();
    return w;
  },

  async addComment(input: {
    workspaceId: string;
    clauseKey?: string;
    parentCommentId?: string;
    actorUserId: string;
    body: string;
  }): Promise<RedlineComment | null> {
    const w = workspaces.find((x) => x.id === input.workspaceId);
    if (!w) return null;
    const c: RedlineComment = {
      id: newId(),
      workspaceId: w.id,
      clauseKey: input.clauseKey || null,
      parentCommentId: input.parentCommentId || null,
      actorUserId: input.actorUserId,
      body: input.body,
      status: "open",
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: nowIso()
    };
    comments.push(c);
    return c;
  },

  resolveComment(id: string, byUserId: string, status: CommentStatus = "resolved") {
    const c = comments.find((x) => x.id === id);
    if (!c) return null;
    c.status = status;
    c.resolvedByUserId = byUserId;
    c.resolvedAt = nowIso();
    return c;
  },

  async recordPosition(input: {
    workspaceId: string;
    clauseKey: string;
    actorUserId: string;
    actorRole: ReviewerRole;
    positionType: ClausePositionType;
    proposedLanguage?: string;
    payload?: Record<string, unknown>;
  }): Promise<ClausePosition | null> {
    const w = workspaces.find((x) => x.id === input.workspaceId);
    if (!w) return null;
    const p: ClausePosition = {
      id: newId(),
      workspaceId: w.id,
      clauseKey: input.clauseKey,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      positionType: input.positionType,
      proposedLanguage: input.proposedLanguage || null,
      payload: input.payload || {},
      createdAt: nowIso()
    };
    positions.push(p);
    return p;
  },

  /**
   * Publish a checkpoint snapshotting unresolved comments and clause positions.
   * Status starts pending until decided by an authorized reviewer.
   */
  async publishCheckpoint(input: {
    workspaceId: string;
    checkpointType: CheckpointType;
  }): Promise<NegotiationCheckpoint | null> {
    const w = workspaces.find((x) => x.id === input.workspaceId);
    if (!w) return null;
    const wsComments = comments.filter((c) => c.workspaceId === w.id);
    const wsPositions = positions.filter((p) => p.workspaceId === w.id);
    const positionTypes: Record<ClausePositionType, number> = {
      accept: 0, reject: 0, propose_alternative: 0, request_review: 0
    };
    const clausesSeen = new Set<string>();
    for (const p of wsPositions) {
      positionTypes[p.positionType]++;
      clausesSeen.add(p.clauseKey);
    }

    const cp: NegotiationCheckpoint = {
      id: newId(),
      workspaceId: w.id,
      checkpointType: input.checkpointType,
      status: "pending",
      snapshot: {
        unresolvedComments: wsComments.filter((c) => c.status === "open").length,
        clausesWithPositions: clausesSeen.size,
        clausesByPositionType: positionTypes
      },
      decidedByUserId: null,
      decidedAt: null,
      createdAt: nowIso()
    };
    checkpoints.push(cp);
    w.status = "checkpoint_pending";
    w.updatedAt = nowIso();
    await publishOutbox({
      id: newId(),
      eventType: "collab.redline.checkpoint.published",
      aggregateId: cp.id,
      aggregateType: "negotiation_checkpoint",
      payload: { id: cp.id, workspaceId: w.id, checkpointType: cp.checkpointType, snapshot: cp.snapshot },
      occurredAt: nowIso()
    });
    return cp;
  },

  decideCheckpoint(input: { id: string; decidedByUserId: string; status: "approved" | "rejected" | "withdrawn" }) {
    const cp = checkpoints.find((x) => x.id === input.id);
    if (!cp) return null;
    cp.status = input.status;
    cp.decidedByUserId = input.decidedByUserId;
    cp.decidedAt = nowIso();
    const w = workspaces.find((x) => x.id === cp.workspaceId);
    if (w) {
      if (input.status === "approved" && cp.checkpointType === "final_approval") {
        w.status = "approved";
      } else if (input.status === "rejected") {
        w.status = "in_review";
      } else if (input.status === "withdrawn") {
        w.status = "in_review";
      }
      w.updatedAt = nowIso();
    }
    return cp;
  },

  /** Promote an approved workspace to the signature workflow. */
  async promoteToSignature(workspaceId: string): Promise<RedlineWorkspace | null> {
    const w = workspaces.find((x) => x.id === workspaceId);
    if (!w) return null;
    if (w.status !== "approved") return null;
    w.status = "promoted_to_signature";
    w.updatedAt = nowIso();
    await publishOutbox({
      id: newId(),
      eventType: "collab.redline.promoted",
      aggregateId: w.id,
      aggregateType: "redline_workspace",
      payload: { id: w.id, agreementId: w.agreementId, currentVersionId: w.currentVersionId },
      occurredAt: nowIso()
    });
    return w;
  },

  // Read APIs
  listWorkspaces: (agreementId?: string) =>
    workspaces.filter((w) => !agreementId || w.agreementId === agreementId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findWorkspace: (id: string) => workspaces.find((w) => w.id === id) || null,
  workspacesByStatus: (status: RedlineWorkspaceStatus) => workspaces.filter((w) => w.status === status),
  listComments: (workspaceId: string, status?: CommentStatus) =>
    comments.filter((c) => c.workspaceId === workspaceId && (!status || c.status === status))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  listPositions: (workspaceId: string) =>
    positions.filter((p) => p.workspaceId === workspaceId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  listCheckpoints: (workspaceId: string) =>
    checkpoints.filter((c) => c.workspaceId === workspaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  workspaceSummary(workspaceId: string) {
    const w = workspaces.find((x) => x.id === workspaceId);
    if (!w) return null;
    const wsComments = comments.filter((c) => c.workspaceId === w.id);
    const wsPositions = positions.filter((p) => p.workspaceId === w.id);
    const wsCheckpoints = checkpoints.filter((c) => c.workspaceId === w.id);
    return {
      workspace: w,
      totalComments: wsComments.length,
      openComments: wsComments.filter((c) => c.status === "open").length,
      totalPositions: wsPositions.length,
      checkpoints: wsCheckpoints.length,
      latestCheckpoint: wsCheckpoints[0] || null
    };
  }
};
