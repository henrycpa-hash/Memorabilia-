import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  DEFAULT_RETRY,
  type CircuitBreakerState,
  type ConnectorHealth,
  type ConnectorKind,
  type ConnectorStatus,
  type RetryPolicy
} from "@crownx-jewel/shared-connectors";

export type Connector = {
  id: string;
  kind: ConnectorKind;
  providerKey: string;
  displayName: string;
  tenantId: string | null;
  credentialRef: string | null;
  status: ConnectorStatus;
  retryPolicy: RetryPolicy;
  configJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ConnectorCallLog = {
  id: string;
  connectorId: string;
  operation: string;
  attempt: number;
  outcome: "success" | "failure";
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
};

const connectors: Connector[] = [];
const calls: ConnectorCallLog[] = [];
const health = new Map<string, ConnectorHealth>();

const FAILURE_TRIP_THRESHOLD = 5;

function ensureHealth(connectorId: string): ConnectorHealth {
  let h = health.get(connectorId);
  if (!h) {
    h = {
      connectorId,
      status: "registered",
      circuitState: "closed",
      consecutiveFailures: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastErrorMessage: null
    };
    health.set(connectorId, h);
  }
  return h;
}

export const connectorService = {
  /** Register a new managed connector. */
  async register(input: {
    kind: ConnectorKind;
    providerKey: string;
    displayName: string;
    tenantId?: string;
    configJson?: Record<string, unknown>;
    retryPolicy?: RetryPolicy;
  }): Promise<Connector> {
    const c: Connector = {
      id: newId(),
      kind: input.kind,
      providerKey: input.providerKey,
      displayName: input.displayName,
      tenantId: input.tenantId || null,
      credentialRef: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "healthy",
      retryPolicy: input.retryPolicy || DEFAULT_RETRY,
      configJson: input.configJson || {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    connectors.push(c);
    ensureHealth(c.id).status = "healthy";

    await publishOutbox({
      id: newId(),
      eventType: "connector.registered",
      aggregateId: c.id,
      aggregateType: "connector",
      payload: c,
      occurredAt: nowIso()
    });
    return c;
  },

  disable(id: string) {
    const c = connectors.find((x) => x.id === id);
    if (!c) return null;
    c.status = "disabled";
    c.updatedAt = nowIso();
    const h = ensureHealth(c.id);
    h.status = "disabled";
    h.circuitState = "open";
    return c;
  },

  /**
   * Wave 6 invocation simulator. Records the call, advances the circuit
   * breaker, and returns a synthesized response. Wave 7 dispatches the
   * actual provider call.
   */
  async invoke(input: {
    connectorId: string;
    operation: string;
    payload?: Record<string, unknown>;
    forceFailure?: boolean;
  }) {
    const c = connectors.find((x) => x.id === input.connectorId);
    if (!c) return null;
    const h = ensureHealth(c.id);

    if (c.status === "disabled" || h.circuitState === "open") {
      return {
        ok: false,
        circuit: h.circuitState,
        message: "circuit_open_or_disabled"
      };
    }

    const started = Date.now();
    const willFail = !!input.forceFailure;
    const attempt = 1;

    const log: ConnectorCallLog = {
      id: newId(),
      connectorId: c.id,
      operation: input.operation,
      attempt,
      outcome: willFail ? "failure" : "success",
      durationMs: Math.max(1, Date.now() - started + Math.floor(Math.random() * 30)),
      errorMessage: willFail ? "simulated_provider_failure" : null,
      createdAt: nowIso()
    };
    calls.push(log);

    if (willFail) {
      h.consecutiveFailures += 1;
      h.lastFailureAt = log.createdAt;
      h.lastErrorMessage = log.errorMessage;
      if (h.consecutiveFailures >= FAILURE_TRIP_THRESHOLD) {
        h.circuitState = "open";
        h.status = "circuit_open";
      } else {
        h.status = "degraded";
      }
    } else {
      h.consecutiveFailures = 0;
      h.lastSuccessAt = log.createdAt;
      h.lastErrorMessage = null;
      h.status = "healthy";
      h.circuitState = "closed";
    }

    return {
      ok: !willFail,
      log,
      circuit: h.circuitState as CircuitBreakerState
    };
  },

  /** Manually flip an open circuit back to half_open for retry. */
  resetCircuit(id: string) {
    const h = ensureHealth(id);
    h.circuitState = "half_open";
    h.status = "degraded";
    h.consecutiveFailures = 0;
    return h;
  },

  list: () => [...connectors].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byKind: (kind: ConnectorKind) => connectors.filter((c) => c.kind === kind),
  findById: (id: string) => connectors.find((c) => c.id === id) || null,
  health: (id: string) => health.get(id) || null,
  allHealth: () => Array.from(health.values()),
  callsFor: (connectorId: string) =>
    calls
      .filter((c) => c.connectorId === connectorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
};
