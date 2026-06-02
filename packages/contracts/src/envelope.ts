export type DomainEvent<T = unknown> = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  causationId?: string;
  actor?: { id: string; type: string };
  version: number;
  payload: T;
};
