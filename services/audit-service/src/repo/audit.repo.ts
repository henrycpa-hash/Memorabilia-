import type { AuditEnvelope } from "@crownx-jewel/shared-audit";

const log: AuditEnvelope[] = [];

export const auditRepo = {
  insert(entry: AuditEnvelope): AuditEnvelope {
    log.push(entry);
    return entry;
  },
  list(): AuditEnvelope[] {
    return [...log].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  listByAggregate(aggregateType: string, aggregateId: string): AuditEnvelope[] {
    return log
      .filter(
        (e) => e.aggregateType === aggregateType && e.aggregateId === aggregateId
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  listByActor(actorId: string): AuditEnvelope[] {
    return log
      .filter((e) => e.actorId === actorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  count(): number {
    return log.length;
  }
};
