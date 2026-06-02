import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const noticeBase = () => process.env.REGULATOR_NOTICE_SERVICE_URL || "http://localhost:4064";

export type PortalProvider =
  | "edpb_portal"
  | "ico_portal"
  | "bfdi_portal"
  | "hmrc_gateway"
  | "irs_efile"
  | "ny_dfs_portal"
  | "cisa_portal"
  | "manual_email";

export type PortalStatus = "active" | "degraded" | "suspended";

export type PortalRefStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type InboundResponseType =
  | "acknowledgement"
  | "request_for_info"
  | "decision_letter"
  | "rejection_notice"
  | "extension_grant"
  | "closure_notice";

export type RegulatorPortal = {
  id: string;
  jurisdictionKey: string;
  regulatorKey: string;
  provider: PortalProvider;
  status: PortalStatus;
  config: Record<string, unknown>;
  createdAt: string;
};

export type RegulatorPortalRef = {
  id: string;
  noticeId: string;
  portalId: string;
  externalRef: string;
  status: PortalRefStatus;
  /** Original deadline at submission time. */
  originalDueDate: string;
  /** Current deadline after any regulator-granted extensions. */
  effectiveDueDate: string;
  createdAt: string;
  updatedAt: string;
};

export type RegulatorInboundResponse = {
  id: string;
  portalRefId: string;
  responseType: InboundResponseType;
  payload: Record<string, unknown>;
  /** Optional new deadline if regulator extended. */
  newDueDate: string | null;
  /** Whether platform should generate a response packet. */
  responsePackRequired: boolean;
  /** Optional response packet URI once generated. */
  responsePackUri: string | null;
  receivedAt: string;
  createdAt: string;
};

const portals: RegulatorPortal[] = [];
const portalRefs: RegulatorPortalRef[] = [];
const inboundResponses: RegulatorInboundResponse[] = [];

/** Seed common regulator portal connectors on boot. */
function seed() {
  if (portals.length > 0) return;
  const seeds: Array<Omit<RegulatorPortal, "id" | "createdAt">> = [
    { jurisdictionKey: "EU", regulatorKey: "edpb", provider: "edpb_portal", status: "active", config: { endpoint: "https://breach.edpb.example/api" } },
    { jurisdictionKey: "GB", regulatorKey: "ico", provider: "ico_portal", status: "active", config: { endpoint: "https://ico.example.gov.uk/api" } },
    { jurisdictionKey: "DE", regulatorKey: "bfdi", provider: "bfdi_portal", status: "active", config: { endpoint: "https://bfdi.example.bund.de/api" } },
    { jurisdictionKey: "GB", regulatorKey: "hmrc", provider: "hmrc_gateway", status: "active", config: { endpoint: "https://gateway.hmrc.example.gov.uk/api" } },
    { jurisdictionKey: "US-FED", regulatorKey: "irs", provider: "irs_efile", status: "active", config: { endpoint: "https://efile.irs.example.gov/api" } },
    { jurisdictionKey: "US-NY", regulatorKey: "ny_dfs", provider: "ny_dfs_portal", status: "active", config: { endpoint: "https://dfs.ny.example.gov/api" } },
    { jurisdictionKey: "US-FED", regulatorKey: "cisa", provider: "cisa_portal", status: "active", config: { endpoint: "https://cisa.example.gov/api" } }
  ];
  for (const s of seeds) portals.push({ id: newId(), createdAt: nowIso(), ...s });
}
seed();

async function postOk<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const portalConnectorService = {
  async createPortal(input: Omit<RegulatorPortal, "id" | "createdAt">): Promise<RegulatorPortal> {
    const p: RegulatorPortal = { id: newId(), createdAt: nowIso(), ...input };
    portals.push(p);
    return p;
  },

  /**
   * Submit a regulator notice through its matching portal connector.
   * Stores the externalRef + portalRef status and emits an event upstream.
   */
  async submitNotice(input: {
    noticeId: string;
    jurisdictionKey: string;
    regulatorKey: string;
    originalDueDate: string;
  }): Promise<RegulatorPortalRef | null> {
    const portal = portals.find(
      (p) => p.jurisdictionKey === input.jurisdictionKey
        && p.regulatorKey === input.regulatorKey
        && p.status === "active"
    );
    if (!portal) return null;

    const ref: RegulatorPortalRef = {
      id: newId(),
      noticeId: input.noticeId,
      portalId: portal.id,
      externalRef: `${portal.provider}_${input.noticeId.slice(0, 8)}_${Date.now().toString(36)}`,
      status: "pending",
      originalDueDate: input.originalDueDate,
      effectiveDueDate: input.originalDueDate,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    portalRefs.push(ref);

    await publishOutbox({
      id: newId(),
      eventType: "regulator.portal.submitted",
      aggregateId: ref.id,
      aggregateType: "regulator_portal_ref",
      payload: { id: ref.id, noticeId: ref.noticeId, externalRef: ref.externalRef, jurisdictionKey: portal.jurisdictionKey, regulatorKey: portal.regulatorKey },
      occurredAt: nowIso()
    });
    return ref;
  },

  /**
   * Ingest an inbound regulator response. Looks up the portalRef by
   * externalRef. Re-computes effective due-date for `request_for_info` /
   * `extension_grant`. Best-effort upstream sync to regulator-notice-service:
   *   acknowledgement -> /regulator-notices/submissions/:id/acknowledge (Wave 10)
   *   decision_letter -> /regulator-notices/:noticeId/respond
   *   closure_notice  -> /regulator-notices/:noticeId/close
   */
  async ingestInboundResponse(input: {
    externalRef: string;
    responseType: InboundResponseType;
    payload?: Record<string, unknown>;
    /** Caller-supplied new deadline override. */
    newDueDate?: string;
    /** When deadline is supplied as days-from-now. */
    extensionDays?: number;
  }): Promise<RegulatorInboundResponse | null> {
    const ref = portalRefs.find((r) => r.externalRef === input.externalRef);
    if (!ref) return null;

    let newDueDate: string | null = input.newDueDate || null;
    if (!newDueDate && input.extensionDays && input.extensionDays > 0) {
      newDueDate = new Date(Date.now() + input.extensionDays * 24 * 60 * 60 * 1000).toISOString();
    }

    if (newDueDate) {
      ref.effectiveDueDate = newDueDate;
      ref.updatedAt = nowIso();
    }

    const responsePackRequired = input.responseType === "request_for_info" || input.responseType === "decision_letter";

    const r: RegulatorInboundResponse = {
      id: newId(),
      portalRefId: ref.id,
      responseType: input.responseType,
      payload: input.payload || {},
      newDueDate,
      responsePackRequired,
      responsePackUri: null,
      receivedAt: nowIso(),
      createdAt: nowIso()
    };
    inboundResponses.push(r);

    // Refstatus transitions
    if (input.responseType === "acknowledgement") ref.status = "accepted";
    else if (input.responseType === "rejection_notice") ref.status = "rejected";
    else if (input.responseType === "closure_notice") ref.status = "accepted";
    ref.updatedAt = nowIso();

    // Best-effort upstream sync
    if (input.responseType === "acknowledgement") {
      // Wave 10 endpoint accepts a submission ID — we use the externalRef as the closest equivalent.
      // In Wave 12 the upstream service will accept portalRefs natively.
      await postOk(`${noticeBase()}/regulator-notices/submissions/${ref.externalRef}/acknowledge`, {});
    } else if (input.responseType === "decision_letter") {
      await postOk(`${noticeBase()}/regulator-notices/${ref.noticeId}/respond`, {
        responsePackUri: `s3://crownx-regulator-portal-responses/${ref.id}/decision_letter.pdf`
      });
    } else if (input.responseType === "closure_notice") {
      await postOk(`${noticeBase()}/regulator-notices/${ref.noticeId}/close`, {});
    }

    await publishOutbox({
      id: newId(),
      eventType: "regulator.portal.response.ingested",
      aggregateId: r.id,
      aggregateType: "regulator_inbound_response",
      payload: { id: r.id, portalRefId: ref.id, responseType: r.responseType, newDueDate: r.newDueDate },
      occurredAt: nowIso()
    });
    return r;
  },

  /** Generate a response packet for a previously-received `request_for_info`. */
  async generateResponsePack(input: { responseId: string; outputUri?: string }) {
    const r = inboundResponses.find((x) => x.id === input.responseId);
    if (!r) return null;
    if (!r.responsePackRequired) return r;
    r.responsePackUri = input.outputUri || `s3://crownx-regulator-portal-responses/${r.id}/response_pack.pdf`;
    return r;
  },

  // Read APIs
  listPortals: (jurisdictionKey?: string) => portals.filter((p) => !jurisdictionKey || p.jurisdictionKey === jurisdictionKey),
  findPortal: (id: string) => portals.find((p) => p.id === id) || null,
  listPortalRefs: (status?: PortalRefStatus) =>
    portalRefs
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findPortalRef: (id: string) => portalRefs.find((r) => r.id === id) || null,
  refByExternalRef: (externalRef: string) => portalRefs.find((r) => r.externalRef === externalRef) || null,
  listInboundResponses: (portalRefId?: string) =>
    inboundResponses
      .filter((r) => !portalRefId || r.portalRefId === portalRefId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  pipelineSummary() {
    const byRefStatus: Record<PortalRefStatus, number> = { pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
    for (const r of portalRefs) byRefStatus[r.status]++;
    const byResponseType: Record<InboundResponseType, number> = {
      acknowledgement: 0, request_for_info: 0, decision_letter: 0, rejection_notice: 0, extension_grant: 0, closure_notice: 0
    };
    for (const r of inboundResponses) byResponseType[r.responseType]++;
    return { totalPortals: portals.length, totalRefs: portalRefs.length, byRefStatus, totalResponses: inboundResponses.length, byResponseType };
  }
};
