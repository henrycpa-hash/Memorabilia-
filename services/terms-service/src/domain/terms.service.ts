import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { anchor } from "@crownx-jewel/shared-chain";

/**
 * The CrownX Terms & Agreements registry — the transparent, versioned,
 * chain-anchored source of truth for every smart contract, data-usage/consent
 * policy, authenticity-risk disclosure, and the athlete/celebrity Royalty Vault.
 *
 * · Public registry: anyone can read the full terms of every agreement + version.
 * · Sign-up acceptance: a user signs the active bundle at account creation; each
 *   acceptance is anchored, forming an immutable audit trail of who agreed to
 *   which version, when, and how (passkey/click).
 * · Amendments require GOVERNANCE + LEGAL + COA sign-off approvals before a new
 *   version activates; on activation, users must re-accept.
 *
 * In-memory by repo convention; every version/approval/acceptance anchored.
 */

export interface Section { heading: string; body: string }
export interface AgreementVersion {
  version: number;
  title: string;
  summary: string;
  sections: Section[];
  status: "active" | "superseded" | "pending";
  effectiveAt: string;
  hash: string;       // content hash (the integrity proof)
  anchorTx: string;
  supersedes?: number;
}
interface Agreement { key: string; name: string; kind: string; versions: AgreementVersion[] }
interface Acceptance { id: string; userId: string; bundleHash: string; items: { key: string; version: number }[]; method: string; acceptedAt: string; anchorTx: string }
const REQUIRED_ROLES = ["governance", "legal", "coa_signoff"] as const;
type Role = (typeof REQUIRED_ROLES)[number];
interface Approval { role: Role; approver: string; at: string }
interface Amendment {
  id: string; key: string; title: string; changesNote: string; sections: Section[];
  proposedVersion: number; status: "proposed" | "approved" | "rejected" | "activated";
  approvals: Approval[]; createdAt: string; activatedAt?: string; anchorTx?: string;
}

const agreements = new Map<string, Agreement>();
const acceptances: Acceptance[] = [];
const amendments: Amendment[] = [];

function contentHash(key: string, version: number, sections: Section[]): string {
  return anchor("terms.version", { key, version, sections }, "genesis").hash;
}

function publishVersion(key: string, name: string, kind: string, title: string, summary: string, sections: Section[], version: number, supersedes?: number): AgreementVersion {
  const hash = contentHash(key, version, sections);
  const receipt = anchor("terms.published", { key, version, hash, title }, nowIso());
  const v: AgreementVersion = { version, title, summary, sections, status: "active", effectiveAt: nowIso(), hash, anchorTx: receipt.txRef, supersedes };
  let ag = agreements.get(key);
  if (!ag) { ag = { key, name, kind, versions: [] }; agreements.set(key, ag); }
  for (const old of ag.versions) if (old.status === "active") old.status = "superseded";
  ag.versions.push(v);
  return v;
}

/** Seed the founding agreement set (v1 of every document). */
function seed() {
  if (agreements.size) return;

  publishVersion("tos", "Terms of Service", "platform", "CrownX Terms of Service", "The agreement governing your CrownX account and use of the platform.", [
    { heading: "1. Your account", body: "You must provide accurate information and secure your device passkey. You are responsible for activity under your account. You must be of legal age in your jurisdiction." },
    { heading: "2. Platform use", body: "CrownX provides authentication, provenance, fractional ownership, a secondary market, and royalty settlement. You agree not to misuse, reverse-engineer, or attempt to forge Certificates of Authenticity (COAs)." },
    { heading: "3. Acceptance & amendments", body: "By creating an account you accept the active version of every CrownX agreement. Material changes require governance + legal + COA sign-off approval and your re-acceptance before they bind you." },
    { heading: "4. Limitation of liability", body: "CrownX is provided on a best-efforts basis. Nothing here is financial, legal, or tax advice." }
  ], 1);

  publishVersion("data_ai_consent", "Data Usage, Consent & AI Modeling", "data", "Data Usage, Consent & AI-Modeling Agreement", "How your capture data is used, your consent, and the AI-modeling data dividend.", [
    { heading: "1. What we capture", body: "When you authenticate an asset, multi-sensor capture data (images, NFC/RF, thermal, material, hairline micro-detail, liveness, biometric templates) is processed to issue a COA. Raw biometric signals are template-based and sealed in your device enclave." },
    { heading: "2. Consent is yours", body: "AI-modeling use of your CONSENTED data is opt-in and revocable at any time. Without consent, your data is used only to issue your COA and is not used to train models." },
    { heading: "3. The model improves over time", body: "As CrownX's authentication AI trains on more consented data it gets better. You acknowledge model accuracy evolves; past results do not guarantee future authentication outcomes." },
    { heading: "4. Your data dividend", body: "Consented contributions mint a weighted Data Contribution Token. Tokens whose data is in utilization in the live product earn a pro-rata share of an AI-modeling compensation pool — board-allocated from profit (currently 3%, scaling to a 5% ceiling on board approval), honored on-chain, paid before shareholder dividends." },
    { heading: "5. Privacy", body: "Differential privacy is applied to aggregate analytics; raw signals never leave your enclave without consent. You may erase local caches and revoke consent for future use." }
  ], 1);

  publishVersion("authenticity_risk", "Authenticity Risk Disclosure", "risk", "Authenticity Risk Disclosure", "Important risks about AI authentication and Certificates of Authenticity.", [
    { heading: "1. Probabilistic authentication", body: "CrownX authentication is AI-assisted and probabilistic. A Genesis COA reflects a confidence score and anomaly analysis at the time of capture — it is strong evidence of authenticity, not an absolute guarantee." },
    { heading: "2. Confidence & decisions", body: "Items may be graded Genesis, Verified, or flagged Counterfeit. Borderline items route to human appraisers. Confidence thresholds and models change as the AI improves." },
    { heading: "3. Residual risk", body: "Sophisticated forgery, sensor spoofing, or post-capture tampering may not be detected. You accept residual authenticity risk and agree CrownX is not liable for losses arising from undetected counterfeits beyond its protocol remedies." },
    { heading: "4. Re-authentication", body: "Resale and pack-n-ship receipt re-authentication may change an item's status. The on-chain provenance record is the authoritative history." }
  ], 1);

  publishVersion("royalty_vault", "Athlete & Celebrity Royalty Vault Terms", "royalty", "Athlete & Celebrity Royalty Vault Terms", "The 10% perpetual royalty, held-until-claim treasury, NIL, donation, and lapse rules.", [
    { heading: "1. The 10% royalty", body: "A fixed 10% royalty pays out on every resale of an authenticated asset, in perpetuity. The 10% rate does not change; the SPLIT between originator, athlete/celebrity, and CrownX changes by scenario and subscription tier." },
    { heading: "2. Held-until-claim", body: "An athlete/celebrity's share accrues and is HELD in the CrownX treasury, earmarked to their account, until they verify their identity (biometric/passkey) and claim. Unclaimed balances are held, not forfeited." },
    { heading: "3. NIL & identity", body: "Name, image, and likeness royalties require verified identity. CrownX does not transfer NIL rights; it routes royalties to the verified rights-holder." },
    { heading: "4. Donation & lapse", body: "An athlete may elect to donate their slice (tracked, timestamped contribution record — not tax advice); the election locks at first resale. Subscription boosts revert to base on lapse; CrownX retains a protocol floor." },
    { heading: "5. Sell-the-stream", body: "A rights-holder may sell the present value of their future royalty to a buyer who inherits the stream, subject to CrownX's floor. All transfers are anchored on-chain." }
  ], 1);

  publishVersion("smart_contracts", "Smart Contract Terms", "contracts", "CrownX Smart Contract Terms", "The on-chain contracts governing royalties, COAs, escrow, and the data dividend.", [
    { heading: "1. On-chain anchoring", body: "Every COA issuance, royalty settlement, escrow step, appraisal sign-off, consent, and dividend is anchored to a tamper-evident, quantum-resistant ledger. The anchor (content hash + tx) is the integrity proof; it is publicly verifiable." },
    { heading: "2. Royalty engine", body: "The royalty smart contract computes the fixed 10% split per scenario/tier and settles each resale automatically. Splits are enforced in code; CrownX always retains a protocol floor." },
    { heading: "3. Pack-N-Ship escrow", body: "Sale funds are held in escrow and released ONLY when the buyer re-authenticates the received item (COA-gated) or a no-response investigation clears. Fraud controls (connected-accounts, anomaly) may hold release for review." },
    { heading: "4. Data-dividend contract", body: "The AI-modeling compensation pool is allocated from profit by the board (3%, capped at 5%) and distributed pro-rata to in-utilization data tokens BEFORE shareholder dividends. The ceiling is smart-contract enforced." },
    { heading: "5. Governance", body: "Contract terms may only change through a governed amendment with governance + legal + COA sign-off approvals, after which the new version is published on-chain and users re-accept." }
  ], 1);
}
seed();

function activeVersion(ag: Agreement): AgreementVersion {
  return ag.versions.find((v) => v.status === "active") || ag.versions[ag.versions.length - 1];
}

export const terms = {
  /** Public registry — the active version of every agreement (transparency). */
  registry() {
    return [...agreements.values()].map((ag) => {
      const v = activeVersion(ag);
      return { key: ag.key, name: ag.name, kind: ag.kind, version: v.version, title: v.title, summary: v.summary, hash: v.hash, anchorTx: v.anchorTx, effectiveAt: v.effectiveAt, versionCount: ag.versions.length };
    });
  },

  /** Full content of one agreement (active version by default, or a specific one). */
  getAgreement(key: string, version?: number) {
    const ag = agreements.get(key);
    if (!ag) return null;
    const v = version ? ag.versions.find((x) => x.version === version) : activeVersion(ag);
    if (!v) return null;
    return { key: ag.key, name: ag.name, kind: ag.kind, ...v, history: ag.versions.map((x) => ({ version: x.version, status: x.status, hash: x.hash, anchorTx: x.anchorTx, effectiveAt: x.effectiveAt })) };
  },

  /** The active bundle a new user must sign at sign-up, with a combined hash. */
  currentBundle() {
    const items = [...agreements.values()].map((ag) => { const v = activeVersion(ag); return { key: ag.key, name: ag.name, version: v.version, title: v.title, hash: v.hash }; });
    const bundleHash = anchor("terms.bundle", { items: items.map((i) => ({ key: i.key, version: i.version, hash: i.hash })) }, "genesis").hash;
    return { items, bundleHash, count: items.length };
  },

  /** Sign-up acceptance — the user signs the active bundle (audit-trailed). */
  accept(userId: string, method = "click") {
    const bundle = this.currentBundle();
    const at = nowIso();
    const receipt = anchor("terms.accepted", { userId, bundleHash: bundle.bundleHash, items: bundle.items.map((i) => ({ key: i.key, version: i.version })), method }, at);
    const rec: Acceptance = { id: `acc_${newId()}`, userId, bundleHash: bundle.bundleHash, items: bundle.items.map((i) => ({ key: i.key, version: i.version })), method, acceptedAt: at, anchorTx: receipt.txRef };
    acceptances.push(rec);
    return { ok: true as const, acceptance: rec, bundleHash: bundle.bundleHash, signedCount: bundle.items.length };
  },

  /** What a user has accepted, and whether they are current (need to re-accept?). */
  acceptancesFor(userId: string) {
    const mine = acceptances.filter((a) => a.userId === userId).sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt));
    const current = this.currentBundle();
    const latest = mine[0];
    const upToDate = !!latest && latest.bundleHash === current.bundleHash;
    return { userId, accepted: mine.length > 0, upToDate, needsReAcceptance: mine.length > 0 && !upToDate, latest: latest || null, history: mine, currentBundleHash: current.bundleHash };
  },

  /* ---- governance amendment workflow ---- */

  /** Propose a change to an agreement → enters governance review. */
  propose(input: { key: string; title?: string; changesNote: string; sections: Section[] }) {
    const ag = agreements.get(input.key);
    if (!ag) return { error: "agreement_not_found" as const };
    const proposedVersion = activeVersion(ag).version + 1;
    const a: Amendment = {
      id: `amd_${newId()}`, key: input.key, title: input.title || activeVersion(ag).title,
      changesNote: input.changesNote, sections: input.sections, proposedVersion,
      status: "proposed", approvals: [], createdAt: nowIso()
    };
    amendments.push(a);
    anchor("terms.amendment.proposed", { id: a.id, key: a.key, proposedVersion }, a.createdAt);
    return { ok: true as const, amendment: a, requiredRoles: REQUIRED_ROLES };
  },

  /** Add a required approval (governance / legal / coa_signoff). */
  approve(amendmentId: string, role: string, approver: string) {
    const a = amendments.find((x) => x.id === amendmentId);
    if (!a) return { error: "amendment_not_found" as const };
    if (a.status === "activated" || a.status === "rejected") return { error: "amendment_closed" as const };
    if (!REQUIRED_ROLES.includes(role as Role)) return { error: "invalid_role" as const, requiredRoles: REQUIRED_ROLES };
    if (!a.approvals.some((p) => p.role === role)) a.approvals.push({ role: role as Role, approver, at: nowIso() });
    const have = new Set(a.approvals.map((p) => p.role));
    const allApproved = REQUIRED_ROLES.every((r) => have.has(r));
    if (allApproved && a.status === "proposed") a.status = "approved";
    anchor("terms.amendment.approval", { id: a.id, role, approver }, nowIso());
    return { ok: true as const, amendment: a, approved: a.status === "approved", remaining: REQUIRED_ROLES.filter((r) => !have.has(r)) };
  },

  /** Activate an approved amendment → publish the new version; users must re-accept. */
  activate(amendmentId: string) {
    const a = amendments.find((x) => x.id === amendmentId);
    if (!a) return { error: "amendment_not_found" as const };
    if (a.status !== "approved") return { error: "not_fully_approved" as const, approvals: a.approvals.map((p) => p.role) };
    const ag = agreements.get(a.key)!;
    const prev = activeVersion(ag);
    const v = publishVersion(a.key, ag.name, ag.kind, a.title, a.changesNote, a.sections, a.proposedVersion, prev.version);
    a.status = "activated"; a.activatedAt = nowIso(); a.anchorTx = v.anchorTx;
    return { ok: true as const, key: a.key, newVersion: v.version, hash: v.hash, anchorTx: v.anchorTx, note: "Published on-chain. All users must re-accept the updated bundle." };
  },

  amendments: () => amendments.slice().reverse(),

  /** The audit trail — versions, governance approvals, and acceptance counts. */
  auditTrail(key?: string) {
    const ags = key ? [agreements.get(key)].filter(Boolean) as Agreement[] : [...agreements.values()];
    return {
      agreements: ags.map((ag) => ({
        key: ag.key, name: ag.name,
        versions: ag.versions.map((v) => ({ version: v.version, status: v.status, title: v.title, hash: v.hash, anchorTx: v.anchorTx, effectiveAt: v.effectiveAt, acceptances: acceptances.filter((a) => a.items.some((i) => i.key === ag.key && i.version === v.version)).length }))
      })),
      amendments: amendments.filter((a) => !key || a.key === key).map((a) => ({ id: a.id, key: a.key, proposedVersion: a.proposedVersion, status: a.status, approvals: a.approvals, createdAt: a.createdAt, activatedAt: a.activatedAt, anchorTx: a.anchorTx })),
      totalAcceptances: acceptances.length,
      generatedAt: nowIso()
    };
  }
};
