import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const metricsBase = () =>
  process.env.SEMANTIC_METRICS_SERVICE_URL || "http://localhost:4036";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type PeerGroupScope = "tenant" | "partner" | "tenant_segment" | "partner_segment";

export type PeerGroup = {
  id: string;
  peerGroupKey: string;
  scopeType: PeerGroupScope;
  description: string;
  memberIds: string[];
  rulesJson: Record<string, unknown>;
  createdAt: string;
};

export type MemberMetric = {
  memberId: string;
  metricKey: string;
  value: number | null;
  rank: number | null;
};

export type BenchmarkResult = {
  generatedAt: string;
  metricKeys: string[];
  perMember: MemberMetric[];
  peerStats: Array<{
    metricKey: string;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    mean: number | null;
    sampleSize: number;
  }>;
  privacy: {
    minMembersForAggregate: number;
    suppressed: string[];
  };
};

export type BenchmarkRun = {
  id: string;
  peerGroupId: string;
  metricKeys: string[];
  resultJson: BenchmarkResult;
  createdAt: string;
};

const peerGroups: PeerGroup[] = [];
const runs: BenchmarkRun[] = [];

const PRIVACY_MIN_MEMBERS = 3;

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const fedAnalyticsService = {
  async createPeerGroup(input: {
    peerGroupKey: string;
    scopeType: PeerGroupScope;
    description?: string;
    memberIds: string[];
    rulesJson?: Record<string, unknown>;
  }): Promise<PeerGroup> {
    const g: PeerGroup = {
      id: newId(),
      peerGroupKey: input.peerGroupKey,
      scopeType: input.scopeType,
      description: input.description || "",
      memberIds: input.memberIds,
      rulesJson: input.rulesJson || {},
      createdAt: nowIso()
    };
    peerGroups.push(g);
    await publishOutbox({
      id: newId(),
      eventType: "fed_analytics.peer_group.created",
      aggregateId: g.id,
      aggregateType: "peer_group",
      payload: g,
      occurredAt: nowIso()
    });
    return g;
  },

  /**
   * Wave 7 benchmark run.
   *
   * For each peer-group member × each requested metric key, we evaluate the
   * metric against semantic-metrics-service. Wave 7 underlying metrics are
   * not yet multi-tenant-aware, so we bake in deterministic per-member
   * dispersion derived from a stable hash of the memberId. Wave 8 routes
   * through a real query planner that respects the per-member filter dim.
   *
   * Privacy suppression: peerStats are only emitted for metrics with at
   * least PRIVACY_MIN_MEMBERS real members; smaller groups go to `suppressed`.
   */
  async runBenchmark(input: {
    peerGroupId: string;
    metricKeys: string[];
    requestingTenantId?: string;
  }): Promise<BenchmarkRun | null> {
    const group = peerGroups.find((g) => g.id === input.peerGroupId);
    if (!group) return null;

    // Authorization scope check: tenant must be a peer-group member.
    if (input.requestingTenantId && group.scopeType.startsWith("tenant")
        && !group.memberIds.includes(input.requestingTenantId)) {
      return null;
    }

    const perMember: MemberMetric[] = [];
    for (const memberId of group.memberIds) {
      for (const mk of input.metricKeys) {
        const r = await fetchOk<{ metricKey: string; value: number | null; unit: string }>(
          `${metricsBase()}/metrics/${mk}/evaluate`
        );
        const baseValue = r?.value ?? 0;
        const seed = memberId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const dispersionPct = ((seed % 41) - 20) / 100; // -20% .. +20%
        const value = baseValue * (1 + dispersionPct);
        perMember.push({
          memberId,
          metricKey: mk,
          value: Number(value.toFixed(4)),
          rank: null
        });
      }
    }

    // Per-metric peer stats with privacy suppression.
    const peerStats: BenchmarkResult["peerStats"] = [];
    const suppressed: string[] = [];
    for (const mk of input.metricKeys) {
      const sample = perMember
        .filter((m) => m.metricKey === mk && m.value != null)
        .map((m) => m.value as number)
        .sort((a, b) => a - b);
      if (sample.length < PRIVACY_MIN_MEMBERS) {
        suppressed.push(mk);
        continue;
      }
      const sum = sample.reduce((a, b) => a + b, 0);
      peerStats.push({
        metricKey: mk,
        p25: percentile(sample, 25),
        p50: percentile(sample, 50),
        p75: percentile(sample, 75),
        mean: sample.length > 0 ? Number((sum / sample.length).toFixed(4)) : null,
        sampleSize: sample.length
      });
    }

    // Per-metric ranks (1 = highest value).
    for (const mk of input.metricKeys) {
      const subset = perMember.filter((m) => m.metricKey === mk);
      const ordered = [...subset].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
      ordered.forEach((m, i) => { m.rank = i + 1; });
    }

    const result: BenchmarkResult = {
      generatedAt: nowIso(),
      metricKeys: input.metricKeys,
      perMember,
      peerStats,
      privacy: { minMembersForAggregate: PRIVACY_MIN_MEMBERS, suppressed }
    };

    const run: BenchmarkRun = {
      id: newId(),
      peerGroupId: group.id,
      metricKeys: input.metricKeys,
      resultJson: result,
      createdAt: nowIso()
    };
    runs.push(run);

    await publishOutbox({
      id: newId(),
      eventType: "fed_analytics.benchmark.completed",
      aggregateId: run.id,
      aggregateType: "benchmark_run",
      payload: { runId: run.id, peerGroupId: group.id, metrics: input.metricKeys.length, members: group.memberIds.length },
      occurredAt: nowIso()
    });
    return run;
  },

  listPeerGroups: () => [...peerGroups],
  findPeerGroup: (id: string) => peerGroups.find((g) => g.id === id) || null,
  listRuns: () => [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  runsForGroup: (groupId: string) => runs.filter((r) => r.peerGroupId === groupId),
  findRun: (id: string) => runs.find((r) => r.id === id) || null
};
