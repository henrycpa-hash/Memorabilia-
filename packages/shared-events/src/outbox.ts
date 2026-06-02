export interface OutboxEvent<T = unknown> {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  occurredAt: string;
}

/**
 * Wave 1 outbox publisher: console-only.
 * Wave 2+ replaces this with NATS / Kafka / Redis Streams plus a
 * Postgres outbox table polled by a background publisher.
 */
export async function publishOutbox(event: OutboxEvent): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("OUTBOX_EVENT", JSON.stringify(event));
}
