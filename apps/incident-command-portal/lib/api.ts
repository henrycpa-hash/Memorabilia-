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

export type SovereigntyIncident = {
  id: string;
  tenantId: string;
  sovereigntyClassKey: string;
  incidentType: string;
  title: string;
  baseSeverity: string;
  severity: string;
  status: string;
  classification: {
    legalEscalationRequired: boolean;
    regulatorNoticeRequired: boolean;
    freezeExports: boolean;
    residencyReviewRequired: boolean;
    reasoning: string[];
  };
  affectedRegions: string[];
  involvesRegulatedData: boolean;
  linkedLegalEscalationId: string | null;
  linkedRegulatorNoticeIds: string[];
  linkedResidencyReviewId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type IncidentRunbookAction = {
  id: string;
  incidentId: string;
  runbookKey: string;
  actionType: string;
  sequence: number;
  status: string;
  externalRef: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type IncidentPipelineSummary = {
  totalIncidents: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  bySovereigntyClass: Record<string, number>;
  totalActions: number;
  pendingActions: number;
  totalPostmortems: number;
};
