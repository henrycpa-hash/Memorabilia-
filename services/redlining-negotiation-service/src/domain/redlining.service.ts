import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  computeRedlineSummary,
  nextFallback,
  type ClauseCategory,
  type ClauseLibraryEntry,
  type ContractVersionStatus,
  type NegotiationIssueStatus,
  type NegotiationIssueType,
  type RedlineDiffStatus,
  type RedlineDiffSummary
} from "@crownx-jewel/shared-redlining";

export type ContractVersion = {
  id: string;
  agreementId: string;
  versionNumber: number;
  contentUri: string;
  /** Map of clauseKey -> body for diff computation. */
  clauseBodies: Record<string, string>;
  status: ContractVersionStatus;
  authorUserId: string | null;
  createdAt: string;
};

export type RedlineDiff = {
  id: string;
  baseVersionId: string;
  compareVersionId: string;
  status: RedlineDiffStatus;
  summary: RedlineDiffSummary;
  diffUri: string;
  createdAt: string;
};

export type NegotiationIssue = {
  id: string;
  agreementId: string;
  issueType: NegotiationIssueType;
  status: NegotiationIssueStatus;
  clauseKey: string | null;
  description: string;
  payload: Record<string, unknown>;
  resolvedAt: string | null;
  createdAt: string;
};

const versions: ContractVersion[] = [];
const diffs: RedlineDiff[] = [];
const issues: NegotiationIssue[] = [];
const clauseLibrary: ClauseLibraryEntry[] = [];

/** Seed a starter clause library on boot. */
function seed() {
  if (clauseLibrary.length > 0) return;
  const seeds: ClauseLibraryEntry[] = [
    { clauseKey: "indemnification_standard", category: "indemnification", languageBody: "Each party shall indemnify the other for losses arising from its breach of this Agreement, capped at fees paid in the prior 12 months.", fallbackRank: 0, requiresLegalReview: false },
    { clauseKey: "indemnification_standard", category: "indemnification", languageBody: "Each party shall indemnify the other for losses arising from its breach of this Agreement, capped at 24 months of fees.", fallbackRank: 1, requiresLegalReview: true },
    { clauseKey: "liability_limit_standard", category: "liability_limit", languageBody: "Aggregate liability is limited to fees paid in the prior 12 months.", fallbackRank: 0, requiresLegalReview: false },
    { clauseKey: "liability_limit_standard", category: "liability_limit", languageBody: "Aggregate liability is limited to 2x fees paid in the prior 12 months.", fallbackRank: 1, requiresLegalReview: true },
    { clauseKey: "termination_for_convenience", category: "termination", languageBody: "Either party may terminate for convenience with 90 days' notice.", fallbackRank: 0, requiresLegalReview: false },
    { clauseKey: "termination_for_convenience", category: "termination", languageBody: "Either party may terminate for convenience with 30 days' notice.", fallbackRank: 1, requiresLegalReview: true },
    { clauseKey: "data_processing_addendum", category: "data_processing", languageBody: "Standard DPA applies (incorporated by reference); SCCs apply for EU transfers.", fallbackRank: 0, requiresLegalReview: false }
  ];
  clauseLibrary.push(...seeds);
}
seed();

export const redliningService = {
  async createVersion(input: {
    agreementId: string;
    versionNumber?: number;
    contentUri: string;
    clauseBodies: Record<string, string>;
    authorUserId?: string;
  }): Promise<ContractVersion> {
    const existing = versions.filter((v) => v.agreementId === input.agreementId);
    const number = input.versionNumber ?? (existing.length + 1);
    // Supersede any prior in-review versions for this agreement
    for (const v of existing) if (v.status === "in_review") v.status = "superseded";

    const v: ContractVersion = {
      id: newId(),
      agreementId: input.agreementId,
      versionNumber: number,
      contentUri: input.contentUri,
      clauseBodies: input.clauseBodies,
      status: "draft",
      authorUserId: input.authorUserId || null,
      createdAt: nowIso()
    };
    versions.push(v);
    await publishOutbox({
      id: newId(),
      eventType: "redline.version.created",
      aggregateId: v.id,
      aggregateType: "contract_version",
      payload: { id: v.id, agreementId: v.agreementId, versionNumber: v.versionNumber },
      occurredAt: nowIso()
    });
    return v;
  },

  updateVersionStatus(id: string, status: ContractVersionStatus) {
    const v = versions.find((x) => x.id === id);
    if (!v) return null;
    v.status = status;
    return v;
  },

  /**
   * Compute the diff between two versions of the same agreement.
   * Returns a summary record persisted to the diff registry.
   */
  async computeDiff(input: { baseVersionId: string; compareVersionId: string }): Promise<RedlineDiff | null> {
    const base = versions.find((v) => v.id === input.baseVersionId);
    const compare = versions.find((v) => v.id === input.compareVersionId);
    if (!base || !compare) return null;
    const summary = computeRedlineSummary(base.clauseBodies, compare.clauseBodies);
    summary.baseVersionId = base.id;
    summary.compareVersionId = compare.id;

    const diff: RedlineDiff = {
      id: newId(),
      baseVersionId: base.id,
      compareVersionId: compare.id,
      status: "computed",
      summary,
      diffUri: `s3://crownx-redlines/${base.agreementId}/${base.versionNumber}_to_${compare.versionNumber}.diff`,
      createdAt: nowIso()
    };
    diffs.push(diff);
    await publishOutbox({
      id: newId(),
      eventType: "redline.diff.computed",
      aggregateId: diff.id,
      aggregateType: "redline_diff",
      payload: { id: diff.id, agreementId: base.agreementId, added: summary.clausesAdded, removed: summary.clausesRemoved, modified: summary.clausesModified },
      occurredAt: nowIso()
    });
    return diff;
  },

  reviewDiff(id: string, accept: boolean) {
    const d = diffs.find((x) => x.id === id);
    if (!d) return null;
    d.status = accept ? "accepted" : "rejected";
    return d;
  },

  async createIssue(input: {
    agreementId: string;
    issueType: NegotiationIssueType;
    clauseKey?: string;
    description: string;
    payload?: Record<string, unknown>;
  }): Promise<NegotiationIssue> {
    const i: NegotiationIssue = {
      id: newId(),
      agreementId: input.agreementId,
      issueType: input.issueType,
      status: "open",
      clauseKey: input.clauseKey || null,
      description: input.description,
      payload: input.payload || {},
      resolvedAt: null,
      createdAt: nowIso()
    };
    issues.push(i);
    await publishOutbox({
      id: newId(),
      eventType: "redline.issue.opened",
      aggregateId: i.id,
      aggregateType: "negotiation_issue",
      payload: { id: i.id, agreementId: i.agreementId, issueType: i.issueType },
      occurredAt: nowIso()
    });
    return i;
  },

  resolveIssue(id: string, status: "resolved" | "deferred" | "rejected") {
    const i = issues.find((x) => x.id === id);
    if (!i) return null;
    i.status = status;
    i.resolvedAt = nowIso();
    return i;
  },

  /** Get the next fallback clause language when a preferred clause is rejected. */
  getNextFallback(clauseKey: string, rejectedRank: number) {
    return nextFallback(clauseKey, rejectedRank, clauseLibrary);
  },

  async addToClauseLibrary(input: ClauseLibraryEntry): Promise<ClauseLibraryEntry> {
    clauseLibrary.push(input);
    return input;
  },

  // Read APIs
  listVersions: (agreementId?: string) =>
    versions.filter((v) => !agreementId || v.agreementId === agreementId).sort((a, b) => b.versionNumber - a.versionNumber),
  findVersion: (id: string) => versions.find((v) => v.id === id) || null,
  listDiffs: (agreementId?: string) => {
    const all = [...diffs];
    if (!agreementId) return all;
    const versionsForAgreement = new Set(versions.filter((v) => v.agreementId === agreementId).map((v) => v.id));
    return all.filter((d) => versionsForAgreement.has(d.baseVersionId));
  },
  findDiff: (id: string) => diffs.find((d) => d.id === id) || null,
  listIssues: (agreementId?: string) =>
    issues.filter((i) => !agreementId || i.agreementId === agreementId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  openIssues: () => issues.filter((i) => i.status === "open"),
  listClauseLibrary: () => [...clauseLibrary],
  clausesByCategory: (category: ClauseCategory) => clauseLibrary.filter((c) => c.category === category)
};
