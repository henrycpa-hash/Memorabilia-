import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  computeFilingDeadline,
  periodKeyForDate,
  validateFilingCompleteness,
  type FilingArtifactBundle,
  type FilingPeriodKey,
  type FilingProfileRules,
  type RegulatoryFilingStatus,
  type RegulatoryFilingType
} from "@crownx-jewel/shared-regulatory";

export type FilingProfile = {
  id: string;
  jurisdictionKey: string;
  filingType: RegulatoryFilingType;
  displayName: string;
  rules: FilingProfileRules;
  createdAt: string;
};

export type FilingRun = {
  id: string;
  profileId: string;
  jurisdictionKey: string;
  filingType: RegulatoryFilingType;
  periodKey: FilingPeriodKey;
  periodEnd: string;
  deadline: string;
  status: RegulatoryFilingStatus;
  data: Record<string, unknown>;
  completeness: { complete: boolean; missing: string[] } | null;
  bundle: FilingArtifactBundle | null;
  filedAt: string | null;
  createdAt: string;
};

const profiles: FilingProfile[] = [];
const runs: FilingRun[] = [];

/** Seed a few common filing profiles on boot. */
function seed() {
  if (profiles.length > 0) return;
  const seeds: Array<{ jur: string; type: RegulatoryFilingType; name: string; rules: FilingProfileRules }> = [
    {
      jur: "GB", type: "vat_return", name: "UK VAT Return (HMRC)",
      rules: {
        requiredLineItems: ["sales_total", "purchases_total", "vat_due", "vat_reclaimed"],
        periodType: "quarterly",
        deadlineDaysAfterPeriodEnd: 37,
        outputFormat: "xml"
      }
    },
    {
      jur: "US-FED", type: "1099_misc", name: "US 1099-MISC (IRS)",
      rules: {
        requiredLineItems: ["payee_name", "payee_tin", "amount_paid", "withheld"],
        periodType: "annual",
        deadlineDaysAfterPeriodEnd: 31,
        outputFormat: "csv"
      }
    },
    {
      jur: "DE", type: "vat_return", name: "Germany VAT Return",
      rules: {
        requiredLineItems: ["sales_total", "purchases_total", "vat_due"],
        periodType: "monthly",
        deadlineDaysAfterPeriodEnd: 10,
        outputFormat: "xml"
      }
    },
    {
      jur: "EU", type: "data_protection_register", name: "GDPR Article 30 Register",
      rules: {
        requiredLineItems: ["controller", "processor", "purposes", "categories", "recipients", "transfers"],
        periodType: "annual",
        deadlineDaysAfterPeriodEnd: 90,
        outputFormat: "pdf"
      }
    }
  ];
  for (const s of seeds) {
    profiles.push({
      id: newId(),
      jurisdictionKey: s.jur,
      filingType: s.type,
      displayName: s.name,
      rules: s.rules,
      createdAt: nowIso()
    });
  }
}
seed();

export const regulatoryService = {
  async createProfile(input: {
    jurisdictionKey: string;
    filingType: RegulatoryFilingType;
    displayName: string;
    rules: FilingProfileRules;
  }): Promise<FilingProfile> {
    const p: FilingProfile = {
      id: newId(),
      jurisdictionKey: input.jurisdictionKey,
      filingType: input.filingType,
      displayName: input.displayName,
      rules: input.rules,
      createdAt: nowIso()
    };
    profiles.push(p);
    return p;
  },

  async startRun(input: {
    profileId: string;
    periodEnd: string;
    data: Record<string, unknown>;
  }): Promise<FilingRun | null> {
    const profile = profiles.find((p) => p.id === input.profileId);
    if (!profile) return null;
    const periodKey = periodKeyForDate(new Date(input.periodEnd), profile.rules.periodType);
    const deadline = computeFilingDeadline(input.periodEnd, profile.rules);
    const completeness = validateFilingCompleteness(input.data, profile.rules);

    const run: FilingRun = {
      id: newId(),
      profileId: profile.id,
      jurisdictionKey: profile.jurisdictionKey,
      filingType: profile.filingType,
      periodKey,
      periodEnd: input.periodEnd,
      deadline,
      status: completeness.complete ? "ready_to_file" : "draft",
      data: input.data,
      completeness,
      bundle: null,
      filedAt: null,
      createdAt: nowIso()
    };
    runs.push(run);
    await publishOutbox({
      id: newId(),
      eventType: "regulatory.filing.started",
      aggregateId: run.id,
      aggregateType: "filing_run",
      payload: { runId: run.id, jurisdiction: run.jurisdictionKey, filingType: run.filingType, periodKey: run.periodKey, complete: completeness.complete },
      occurredAt: nowIso()
    });
    return run;
  },

  /** Build the artifact bundle and mark filed. Wave 9 simulates the regulator submission. */
  async fileRun(id: string): Promise<FilingRun | null> {
    const run = runs.find((r) => r.id === id);
    if (!run) return null;
    if (run.status !== "ready_to_file" && run.status !== "draft") return run;
    const profile = profiles.find((p) => p.id === run.profileId);
    if (!profile) return null;

    const bundle: FilingArtifactBundle = {
      filingId: run.id,
      jurisdictionKey: run.jurisdictionKey,
      filingType: run.filingType,
      periodKey: run.periodKey,
      artifacts: [
        { artifactType: "filing_payload", uri: `s3://crownx-regulatory/${run.id}/payload.${profile.rules.outputFormat}`, sizeBytes: 4096 },
        { artifactType: "submission_receipt", uri: `s3://crownx-regulatory/${run.id}/receipt.json`, sizeBytes: 512 }
      ],
      generatedAt: nowIso()
    };
    run.bundle = bundle;
    run.status = "filed";
    run.filedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "regulatory.filing.filed",
      aggregateId: run.id,
      aggregateType: "filing_run",
      payload: { runId: run.id, jurisdiction: run.jurisdictionKey, filingType: run.filingType, periodKey: run.periodKey },
      occurredAt: nowIso()
    });

    return run;
  },

  rejectRun(id: string, reason: string) {
    const run = runs.find((r) => r.id === id);
    if (!run) return null;
    run.status = "rejected";
    run.data = { ...run.data, _rejectReason: reason };
    return run;
  },

  // Read APIs
  listProfiles: () => [...profiles],
  findProfile: (id: string) => profiles.find((p) => p.id === id) || null,
  profilesByJurisdiction: (jur: string) => profiles.filter((p) => p.jurisdictionKey === jur),
  listRuns: (status?: string) => runs.filter((r) => !status || r.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findRun: (id: string) => runs.find((r) => r.id === id) || null,
  runsByJurisdiction: (jur: string) => runs.filter((r) => r.jurisdictionKey === jur),

  /** Filings approaching their deadline (within 14 days). */
  upcomingDeadlines() {
    const now = Date.now();
    const window = 14 * 24 * 60 * 60 * 1000;
    return runs
      .filter((r) => r.status !== "filed" && r.status !== "rejected")
      .filter((r) => {
        const d = new Date(r.deadline).getTime();
        return d > now && d - now <= window;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }
};
