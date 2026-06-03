import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { anchor } from "@crownx-jewel/shared-chain";
import {
  computeDataWeight,
  tokenBindingHash,
  allocatePool,
  distributeCompensation,
  rollupByHolder,
  formatUsdCents,
  DEFAULT_BOARD_ALLOC_BPS,
  type DataContributionToken,
  type Modality
} from "@crownx-jewel/shared-datadividend";

/**
 * The AI-Modeling Data Dividend engine.
 *
 * Sovereignty data consent → as the authentication AI improves it learns from
 * CONSENTED capture data. Each consented contribution mints a Data Contribution
 * Token with a dynamically-weighted value (complexity / rarity / matrix /
 * confidence / novelty). Tokens are hashed to the model-improvement update they
 * fed; once that update ships to the live PRO product the token is "in
 * utilization" and earns a pro-rata share of an AI-modeling compensation pool —
 * allocated from profit by the board, honored on-chain, paid BEFORE shareholder
 * dividends, and funded by (tied to) the revenue the AI cash-flows.
 *
 * In-memory by repo convention; every consent/mint/update/dividend anchored.
 */

interface Consent { userId: string; aiModeling: boolean; scopes: string[]; updatedAt: string; revokedAt?: string }
interface ModelUpdate { id: string; version: string; note: string; tokenIds: string[]; createdAt: string; deployed: boolean; deployedAt?: string; anchorTx: string }
interface RevenueEntry { id: string; source: string; cents: number; at: string }
interface Epoch { id: string; poolCents: number; boardAllocBps: number; attributableProfitCents: number; status: "open" | "distributed"; createdAt: string; distributedAt?: string; distributedCents?: number; payoutCount?: number; anchorTx?: string }
interface HolderBalance { userId: string; lifetimePaidCents: number; payouts: number }

const PROFIT_MARGIN_BPS = 4200; // board assumption: ~42% of AI-attributable revenue is profit

const consents = new Map<string, Consent>();
const tokens: DataContributionToken[] = [];
const modelUpdates: ModelUpdate[] = [];
const revenue: RevenueEntry[] = [];
const epochs: Epoch[] = [];
const balances = new Map<string, HolderBalance>();
let revenueConsumedCents = 0; // revenue already paid out in prior epochs

function bal(userId: string): HolderBalance {
  let b = balances.get(userId);
  if (!b) { b = { userId, lifetimePaidCents: 0, payouts: 0 }; balances.set(userId, b); }
  return b;
}

function tokenView(t: DataContributionToken) {
  return { ...t, weightDisplay: `${(t.weightBps / 10000).toFixed(2)}×` };
}

/** Seed a believable dataset so the dividend surfaces render immediately. */
function seed() {
  if (tokens.length) return;
  const demo: { holderId: string; assetClass: string; modalities: Modality[]; confidence: number; anomaly: number; commonness: number; novel: boolean }[] = [
    { holderId: "henry", assetClass: "memorabilia", modalities: ["photoMatch", "nfcWave", "hairlineDetail", "materialComposition", "thermalHeat", "biometric"], confidence: 96, anomaly: 8, commonness: 0.2, novel: true },
    { holderId: "henry", assetClass: "memorabilia", modalities: ["photoMatch", "materialComposition"], confidence: 88, anomaly: 3, commonness: 0.7, novel: false },
    { holderId: "raul", assetClass: "art", modalities: ["photoMatch", "uvIr", "materialComposition", "hairlineDetail", "ultrasonic"], confidence: 94, anomaly: 12, commonness: 0.1, novel: true },
    { holderId: "eric", assetClass: "luxury", modalities: ["photoMatch", "nfcWave", "dnaTaggant", "uvIr", "hairlineDetail", "materialComposition", "thermalHeat"], confidence: 98, anomaly: 15, commonness: 0.05, novel: true }
  ];
  for (const u of demo) {
    consents.set(u.holderId, { userId: u.holderId, aiModeling: true, scopes: ["capture", "sensor_fusion"], updatedAt: nowIso() });
    mint({ holderId: u.holderId, assetId: `ast_${u.holderId}_${newId().slice(0, 6)}`, modalities: u.modalities, confidence: u.confidence, anomalyScore: u.anomaly, commonness: u.commonness, novel: u.novel, assetClass: u.assetClass });
  }
  // ship the first model improvement to the live product → those tokens earn
  const upd = recordModelUpdate({ version: "auth-v1.4", note: "Hairline + material-composition recall +6.2pts on memorabilia & luxury." });
  activateUpdate(upd.id);
  // revenue the AI cash-flows (authentication fees, pro subscriptions)
  recordRevenue({ source: "authentication_fees", cents: 2_400_000_00 });
  recordRevenue({ source: "pro_subscriptions", cents: 1_100_000_00 });
}

function mint(input: { holderId: string; assetId: string; coaId?: string; modalities: (Modality | string)[]; confidence: number; anomalyScore?: number; commonness?: number; novel?: boolean; assetClass?: string }) {
  const w = computeDataWeight({ modalities: input.modalities, confidence: input.confidence, anomalyScore: input.anomalyScore, commonness: input.commonness, novel: input.novel, assetClass: input.assetClass });
  const t: DataContributionToken = {
    id: `dct_${newId()}`,
    holderId: input.holderId,
    assetId: input.assetId,
    coaId: input.coaId,
    weightBps: w.weightBps,
    assetClass: input.assetClass,
    mintedAt: nowIso(),
    inUtilization: false
  };
  tokens.push(t);
  const receipt = anchor("data.token.minted", { id: t.id, holderId: t.holderId, assetId: t.assetId, weightBps: t.weightBps }, t.mintedAt);
  return { token: t, weight: w, anchor: receipt };
}

function recordModelUpdate(input: { version: string; note: string; tokenIds?: string[] }) {
  const bound = (input.tokenIds && input.tokenIds.length ? tokens.filter((t) => input.tokenIds!.includes(t.id)) : tokens.filter((t) => !t.modelUpdateId));
  const at = nowIso();
  const id = `mu_${newId()}`;
  const receipt = anchor("model.update", { id, version: input.version, tokenIds: bound.map((t) => t.id) }, at);
  for (const t of bound) { t.modelUpdateId = id; t.hashedToUpdate = tokenBindingHash(t.id, id, t.weightBps); }
  const upd: ModelUpdate = { id, version: input.version, note: input.note, tokenIds: bound.map((t) => t.id), createdAt: at, deployed: false, anchorTx: receipt.txRef };
  modelUpdates.push(upd);
  return upd;
}

function activateUpdate(updateId: string) {
  const upd = modelUpdates.find((u) => u.id === updateId);
  if (!upd) return { error: "update_not_found" as const };
  upd.deployed = true; upd.deployedAt = nowIso();
  for (const t of tokens) if (t.modelUpdateId === updateId) t.inUtilization = true;
  const receipt = anchor("model.deployed", { updateId, version: upd.version, at: upd.deployedAt }, upd.deployedAt);
  return { ok: true as const, update: upd, anchor: receipt };
}

function recordRevenue(input: { source: string; cents: number }) {
  const e: RevenueEntry = { id: `rev_${newId()}`, source: input.source, cents: Math.max(0, Math.floor(input.cents)), at: nowIso() };
  revenue.push(e);
  return e;
}

seed();

export const aiModeling = {
  /* ---- sovereignty data consent ---- */
  setConsent(userId: string, aiModeling: boolean, scopes?: string[]) {
    const c: Consent = { userId, aiModeling, scopes: scopes && scopes.length ? scopes : ["capture", "sensor_fusion"], updatedAt: nowIso(), revokedAt: aiModeling ? undefined : nowIso() };
    consents.set(userId, c);
    anchor("data.consent", { userId, aiModeling, scopes: c.scopes }, c.updatedAt);
    return { ok: true as const, consent: c };
  },
  getConsent(userId: string) {
    const c = consents.get(userId);
    return { userId, aiModeling: !!c?.aiModeling, scopes: c?.scopes || [], updatedAt: c?.updatedAt || null };
  },

  /* ---- token mint at a consented COA authentication ---- */
  mintContributionToken(input: { holderId: string; assetId: string; coaId?: string; modalities: (Modality | string)[]; confidence: number; anomalyScore?: number; commonness?: number; novel?: boolean; assetClass?: string }) {
    const c = consents.get(input.holderId);
    if (!c?.aiModeling) return { ok: false as const, skipped: true, reason: "no_ai_modeling_consent" };
    const r = mint(input);
    if (!r.weight.eligible) {
      // ineligible (low confidence) — record but never earns
      r.token.retired = true;
      return { ok: true as const, eligible: false, token: tokenView(r.token), weight: r.weight };
    }
    return { ok: true as const, eligible: true, token: tokenView(r.token), weight: r.weight, anchor: r.anchor };
  },

  /* ---- model improvement updates (hash the contributing tokens) ---- */
  recordModelUpdate: (input: { version: string; note: string; tokenIds?: string[] }) => recordModelUpdate(input),
  deployModelUpdate: (updateId: string) => activateUpdate(updateId),
  modelUpdates: () => modelUpdates.slice().reverse().map((u) => ({ ...u, tokenCount: u.tokenIds.length })),

  /* ---- revenue (the cash-flow the pool is tied to) ---- */
  recordRevenue: (input: { source: string; cents: number }) => ({ ok: true as const, entry: recordRevenue(input) }),
  revenueTotal: () => revenue.reduce((a, e) => a + e.cents, 0),

  /* ---- compensation epochs: allocate from profit BEFORE dividends, distribute pro-rata ---- */
  openEpoch(input: { attributableProfitCents?: number; boardAllocBps?: number }) {
    const totalRev = revenue.reduce((a, e) => a + e.cents, 0);
    const newRevenue = Math.max(0, totalRev - revenueConsumedCents);
    const attributableProfitCents = input.attributableProfitCents != null ? Math.max(0, Math.floor(input.attributableProfitCents)) : Math.floor((newRevenue * PROFIT_MARGIN_BPS) / 10000);
    const alloc = allocatePool(attributableProfitCents, input.boardAllocBps ?? DEFAULT_BOARD_ALLOC_BPS);
    const ep: Epoch = { id: `ep_${newId()}`, poolCents: alloc.poolCents, boardAllocBps: alloc.boardAllocBps, attributableProfitCents, status: "open", createdAt: nowIso() };
    epochs.push(ep);
    revenueConsumedCents = totalRev;
    return {
      ok: true as const,
      epoch: { ...ep, poolDisplay: formatUsdCents(ep.poolCents), profitDisplay: formatUsdCents(attributableProfitCents) },
      residualForDividendsDisplay: formatUsdCents(alloc.residualForDividendsCents),
      note: "Pool allocated from AI-attributable profit BEFORE shareholder dividends."
    };
  },
  distributeEpoch(epochId: string) {
    const ep = epochs.find((e) => e.id === epochId);
    if (!ep) return { error: "epoch_not_found" as const };
    if (ep.status === "distributed") return { error: "already_distributed" as const };
    const { payouts, distributedCents, totalWeightBps } = distributeCompensation(tokens, ep.poolCents);
    for (const p of payouts) { const b = bal(p.holderId); b.lifetimePaidCents += p.payoutCents; b.payouts += 1; }
    ep.status = "distributed"; ep.distributedAt = nowIso(); ep.distributedCents = distributedCents; ep.payoutCount = payouts.length;
    const receipt = anchor("modeling.dividend.paid", { epochId, poolCents: ep.poolCents, distributedCents, payoutCount: payouts.length, beforeShareholderDividends: true }, ep.distributedAt);
    ep.anchorTx = receipt.txRef;
    return {
      ok: true as const,
      epochId,
      poolDisplay: formatUsdCents(ep.poolCents),
      distributedDisplay: formatUsdCents(distributedCents),
      activeTokens: tokens.filter((t) => t.inUtilization && !t.retired).length,
      totalWeightBps,
      byHolder: rollupByHolder(payouts).map((h) => ({ ...h, payoutDisplay: formatUsdCents(h.payoutCents) })),
      payouts: payouts.map((p) => ({ ...p, payoutDisplay: formatUsdCents(p.payoutCents), sharePct: (p.shareBps / 100).toFixed(1) })),
      anchor: receipt
    };
  },
  epochs: () => epochs.slice().reverse().map((e) => ({ ...e, poolDisplay: formatUsdCents(e.poolCents), distributedDisplay: e.distributedCents != null ? formatUsdCents(e.distributedCents) : null })),

  /* ---- user + pool views ---- */
  userDashboard(userId: string) {
    const mine = tokens.filter((t) => t.holderId === userId && !t.retired);
    const active = mine.filter((t) => t.inUtilization);
    const b = bal(userId);
    const totalWeightActive = tokens.filter((t) => t.inUtilization && !t.retired).reduce((a, t) => a + t.weightBps, 0) || 1;
    const myWeight = active.reduce((a, t) => a + t.weightBps, 0);
    return {
      userId,
      consent: this.getConsent(userId),
      tokens: mine.map(tokenView),
      counts: { total: mine.length, inUtilization: active.length },
      shareOfPoolPct: ((myWeight / totalWeightActive) * 100).toFixed(2),
      lifetimePaidDisplay: formatUsdCents(b.lifetimePaidCents),
      lifetimePaidCents: b.lifetimePaidCents
    };
  },
  poolStatus() {
    const totalRev = revenue.reduce((a, e) => a + e.cents, 0);
    const active = tokens.filter((t) => t.inUtilization && !t.retired);
    const lastEpoch = epochs[epochs.length - 1];
    return {
      revenueTotalDisplay: formatUsdCents(totalRev),
      unallocatedRevenueDisplay: formatUsdCents(Math.max(0, totalRev - revenueConsumedCents)),
      tokensTotal: tokens.length,
      tokensInUtilization: active.length,
      totalActiveWeightBps: active.reduce((a, t) => a + t.weightBps, 0),
      modelUpdates: modelUpdates.length,
      deployedUpdates: modelUpdates.filter((u) => u.deployed).length,
      epochs: epochs.length,
      boardAllocBps: DEFAULT_BOARD_ALLOC_BPS,
      profitMarginBps: PROFIT_MARGIN_BPS,
      lastEpoch: lastEpoch ? { id: lastEpoch.id, poolDisplay: formatUsdCents(lastEpoch.poolCents), status: lastEpoch.status } : null,
      paidBeforeDividends: true
    };
  }
};
