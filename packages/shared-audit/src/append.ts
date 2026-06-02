import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import type { AuditEnvelope } from "./envelope";

const auditUrl = () =>
  process.env.AUDIT_SERVICE_URL || "http://localhost:4014";

/**
 * Fire-and-forget audit append. Failures are logged but never thrown — losing
 * an audit row should never break the user-visible flow. Wave 4 swaps this for
 * an outbox-backed durable publisher.
 */
export async function appendAudit(input: {
  actorId: string;
  actorRole: string;
  actionType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  payloadJson?: Record<string, unknown>;
}): Promise<AuditEnvelope | null> {
  const envelope: AuditEnvelope = {
    id: newId(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    actionType: input.actionType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    correlationId: input.correlationId,
    payloadJson: input.payloadJson || {},
    createdAt: nowIso()
  };
  try {
    const res = await fetch(`${auditUrl()}/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope)
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`audit append non-2xx: ${res.status}`);
      return envelope;
    }
    return envelope;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("audit append failed:", (err as Error).message);
    return null;
  }
}
