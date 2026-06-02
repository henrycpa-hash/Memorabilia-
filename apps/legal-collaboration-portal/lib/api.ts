const GATEWAY = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export async function gatewayFetch<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${GATEWAY}${path}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type RedlineWorkspace = {
  id: string;
  agreementId: string;
  currentVersionId: string | null;
  status: string;
  reviewers: Array<{ userId: string; role: string; assignedAt: string }>;
  createdAt: string;
};

export type WorkspaceSummary = {
  workspace: RedlineWorkspace;
  totalComments: number;
  openComments: number;
  totalPositions: number;
  checkpoints: number;
  latestCheckpoint: {
    id: string;
    checkpointType: string;
    status: string;
    snapshot: { unresolvedComments: number; clausesWithPositions: number };
    createdAt: string;
  } | null;
};

export type RedlineComment = {
  id: string;
  workspaceId: string;
  clauseKey: string | null;
  parentCommentId: string | null;
  actorUserId: string;
  body: string;
  status: string;
  createdAt: string;
};

export type ClausePosition = {
  id: string;
  workspaceId: string;
  clauseKey: string;
  actorUserId: string;
  actorRole: string;
  positionType: string;
  proposedLanguage: string | null;
  createdAt: string;
};

export type LegalEscalation = {
  id: string;
  sourceType: string;
  sourceId: string;
  severity: string;
  status: string;
  matterId: string | null;
  packetId: string | null;
  playbook: {
    routingTarget: string;
    packetAssemblyRequired: boolean;
    noticeObligationCheck: boolean;
    legalHoldRecommended: boolean;
    executiveNotificationFlag: boolean;
    rationale: string[];
  };
  createdAt: string;
};

export type EscalationPipelineSummary = {
  totalEscalations: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  pendingNoticeObligations: number;
  pendingLegalHolds: number;
};
