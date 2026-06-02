/**
 * Wave 6 connector runtime primitives.
 *
 * The connector-runtime-service brokers calls to "real" external providers
 * (carriers, insurers, payroll, banking). Wave 6 ships a managed shape with
 * health, retry policy, and circuit breaker; Wave 7 wires real SDKs.
 */
export type ConnectorKind =
  | "carrier"
  | "insurance"
  | "payment_processor"
  | "payroll"
  | "banking"
  | "erp_gl"
  | "document_signing"
  | "tax_filing";

export type ConnectorStatus =
  | "registered"
  | "healthy"
  | "degraded"
  | "circuit_open"
  | "disabled";

export type RetryPolicy = {
  maxAttempts: number;
  initialBackoffMs: number;
  multiplier: number;
};

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 3,
  initialBackoffMs: 500,
  multiplier: 2
};

export type CircuitBreakerState = "closed" | "half_open" | "open";

export type ConnectorHealth = {
  connectorId: string;
  status: ConnectorStatus;
  circuitState: CircuitBreakerState;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorMessage: string | null;
};
