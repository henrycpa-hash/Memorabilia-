import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import type { AuditEnvelope } from "@crownx-jewel/shared-audit";
import { auditRepo } from "../repo/audit.repo";

export const auditService = {
  async append(input: {
    actorId: string;
    actorRole: string;
    actionType: string;
    aggregateType: string;
    aggregateId: string;
    correlationId?: string;
    payloadJson?: Record<string, unknown>;
  }): Promise<AuditEnvelope> {
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
    auditRepo.insert(envelope);
    return envelope;
  },

  list() {
    return auditRepo.list();
  },

  listByAggregate(aggregateType: string, aggregateId: string) {
    return auditRepo.listByAggregate(aggregateType, aggregateId);
  },

  listByActor(actorId: string) {
    return auditRepo.listByActor(actorId);
  },

  count() {
    return auditRepo.count();
  }
};
