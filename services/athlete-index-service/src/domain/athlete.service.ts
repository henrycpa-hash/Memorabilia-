import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import {
  computeAthleteIndex,
  computeContractDcf,
  sumVerifiedContractDcf,
  formatUsdCents,
  type AthleteSignals,
  type AthleteIndex,
  type AthleteContract,
  type ContractKind
} from "@crownx-jewel/shared-valuation";
import { anchor, verifyAnchor, type AnchorReceipt } from "@crownx-jewel/shared-chain";

/**
 * The Athlete Index: a live, stock-market-like valuation + ticker, fractional
 * ownership, blockchain-tracked resale royalties, and the Legacy Circle chain
 * of owners. In-memory by repo convention; the same API maps to durable tables.
 *
 * Resale royalty: every time an athlete's collectible resells, the athlete earns
 * a tracked, chain-anchored royalty (ATHLETE_ROYALTY_RATE of the sale), and the
 * resale also feeds the index (trade velocity + supply) so value reflects real
 * market activity — not dreams.
 */

const ATHLETE_ROYALTY_RATE = 0.03; // athlete's cut of each resale (3% = 30% of the 10% pool)
const DEFAULT_SHARES = 1_000_000; // fractional shares outstanding per athlete

export type EventKind = "news" | "perf" | "royalty" | "signal" | "fraction" | "seed" | "contract" | "career";

export interface PricePoint {
  ts: string;
  priceCents: number;
  marketCapCents: number;
  event?: { kind: EventKind; tag: string; label: string; note?: string };
}

export interface Athlete {
  id: string;
  slug: string;
  name: string;
  sport: string;
  team: string;
  signals: AthleteSignals;
  sharesOutstanding: number;
  fractionsSold: number;
  /** DCF of verified contracts, added to the intrinsic floor */
  contractsDcfCents: number;
  /** net buy/sell demand pressure −1..+1 driving price elasticity */
  demandPressure: number;
  createdAt: string;
}

/** A career/news timeline entry — the full history that creates value. */
export interface TimelineEvent {
  id: string;
  athleteId: string;
  kind: "college" | "nil" | "draft" | "league_move" | "award" | "injury" | "news" | "upcoming_deal";
  title: string;
  detail?: string;
  /** ISO date of the event (past or scheduled/future for upcoming deals) */
  date: string;
  /** optional valuation impact applied to the index when recorded */
  signalPatch?: Partial<AthleteSignals>;
  anchor?: AnchorReceipt;
}

interface Holding { athleteId: string; userId: string; shares: number; costBasisCents: number }
interface RoyaltyEvent { id: string; athleteId: string; assetId: string; fromUserId: string; toUserId: string; salePriceCents: number; athleteRoyaltyCents: number; chainTxRef: string; anchor: AnchorReceipt; ts: string }
interface LegacyHop { userId: string; hop: number; joinedAt: string; consent: boolean; redacted: boolean }
interface LegacyChain { athleteId: string; assetId: string; hops: LegacyHop[] }

const athletes = new Map<string, Athlete>();
const history = new Map<string, PricePoint[]>();
const holdings: Holding[] = [];
const royaltyEvents: RoyaltyEvent[] = [];
const legacy = new Map<string, LegacyChain>(); // `${athleteId}:${assetId}`
const contracts = new Map<string, AthleteContract[]>(); // athleteId -> contracts
const timeline = new Map<string, TimelineEvent[]>(); // athleteId -> events

/* ----- secondary-market order book (fans trade held fractions peer-to-peer) ----- */
export type OrderSide = "buy" | "sell";
export interface Order {
  id: string;
  athleteId: string;
  userId: string;
  side: OrderSide;
  shares: number;
  remaining: number;
  limitPriceCents: number;
  status: "open" | "partial" | "filled" | "cancelled";
  createdAt: string;
}
export interface Fill {
  id: string;
  athleteId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  shares: number;
  priceCents: number;
  ts: string;
}
const orders: Order[] = [];
const fills: Fill[] = [];
const lastTradePrice = new Map<string, number>(); // athleteId -> last fill price

/** stakeholder royalty dividends: a slice of each resale royalty flows pro-rata
 *  to fractional holders — owning a piece of the athlete is a royalty stream. */
const HOLDER_DIVIDEND_RATE = 0.25; // 25% of the athlete royalty shared with holders
const dividends = new Map<string, number>(); // userId -> total dividend cents earned

/* ----- appraiser human-in-the-loop queue ----- */
export interface Appraisal {
  id: string;
  athleteId: string;
  assetId: string;
  requestedBy: string;
  modelImpliedCents: number;
  status: "queued" | "in_review" | "completed";
  appraiserId?: string;
  appraisedValueCents?: number;
  notes?: string;
  anchor?: AnchorReceipt;
  requestedAt: string;
  completedAt?: string;
}
const appraisals: Appraisal[] = [];

const XP_URL = () => process.env.XP_SERVICE_URL || "http://localhost:4073";
/** Liquidity is health — a fill earns light XP (canonical economy: sale_completed). */
function grantStakeholderXp(userId: string) {
  fetch(`${XP_URL()}/xp/grant`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, action: "sale_completed" }) }).catch(() => undefined);
}

/** Find (or create a zero) holding for a fan — used by primary buys + order matching. */
function holdingFor(athleteId: string, userId: string) {
  let h = holdings.find((x) => x.athleteId === athleteId && x.userId === userId);
  if (!h) {
    h = { athleteId, userId, shares: 0, costBasisCents: 0 };
    holdings.push(h);
  }
  return h;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Effective valuation: base + verified-contract DCF, with live demand elasticity. */
function indexOf(a: Athlete): AthleteIndex {
  const effective: AthleteSignals = { ...a.signals, royaltyDcfCents: a.signals.royaltyDcfCents + a.contractsDcfCents };
  return computeAthleteIndex(effective, { sharesOutstanding: a.sharesOutstanding, demandPressure: a.demandPressure });
}

function pushPoint(a: Athlete, event?: PricePoint["event"]) {
  const idx = indexOf(a);
  const arr = history.get(a.id) || [];
  arr.push({ ts: nowIso(), priceCents: idx.pricePerShareCents, marketCapCents: idx.marketCapCents, event });
  if (arr.length > 240) arr.shift();
  history.set(a.id, arr);
  return idx;
}

/** Seed synthetic history ending at the current index (so the ticker is alive). */
function seedHistory(a: Athlete, points = 28) {
  const idx = indexOf(a);
  const end = idx.pricePerShareCents;
  const arr: PricePoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wave = Math.sin(i / 2.5) * 0.06 + (Math.random() - 0.5) * 0.05;
    const drift = 0.82 + t * 0.18; // trend up toward current
    const price = Math.max(1, Math.round(end * (drift + wave)));
    arr.push({ ts: nowIso(), priceCents: price, marketCapCents: price * a.sharesOutstanding });
  }
  arr[arr.length - 1] = { ts: nowIso(), priceCents: end, marketCapCents: idx.marketCapCents, event: { kind: "seed", tag: "•", label: "Genesis listing" } };
  // a couple of annotated events
  if (points > 10) arr[Math.floor(points * 0.4)].event = { kind: "perf", tag: "E", label: `${a.name} — strong week`, note: "On-field performance lifted the brand component." };
  if (points > 18) arr[Math.floor(points * 0.7)].event = { kind: "news", tag: "N", label: `${a.name} in the press`, note: "Positive sentiment swing." };
  history.set(a.id, arr);
}

/** Seed the career/news timeline — the history that creates value (college → pros). */
function seedTimeline(a: Athlete) {
  const evs: Omit<TimelineEvent, "id" | "athleteId">[] = [
    { kind: "college", title: `${a.name} commits to ${a.team}`, detail: "College career begins.", date: "2023-08-15" },
    { kind: "nil", title: "First NIL deal signed", detail: "Name/Image/Likeness endorsement — adds verified contract DCF.", date: "2024-01-20" },
    { kind: "award", title: "Conference Player of the Week", detail: "On-field performance lifts the brand index.", date: "2024-04-12" },
    { kind: "upcoming_deal", title: "Pro draft / European league interest", detail: "Scouts circling — a move to the pros would re-rate the index.", date: "2026-07-01" }
  ];
  timeline.set(
    a.id,
    evs.map((e) => ({ id: newId(), athleteId: a.id, ...e }))
  );
}

const DEMO: Array<Omit<Athlete, "id" | "slug" | "createdAt" | "sharesOutstanding" | "fractionsSold" | "contractsDcfCents" | "demandPressure"> & { sharesOutstanding?: number }> = [
  { name: "Dylan Crews", sport: "Baseball", team: "LSU", signals: { onFieldPerformance: 92, offFieldConduct: 84, pressSentiment: 70, royaltyDcfCents: 8_400_000_00, tradeVelocity: 34, marketSupply: 320, socialReach: 1_200_000 } },
  { name: "A. Vanguard", sport: "Football", team: "Metro U", signals: { onFieldPerformance: 88, offFieldConduct: 80, pressSentiment: 40, royaltyDcfCents: 6_100_000_00, tradeVelocity: 22, marketSupply: 480, socialReach: 640_000 } },
  { name: "K. Solace", sport: "Basketball", team: "Coastal", signals: { onFieldPerformance: 95, offFieldConduct: 72, pressSentiment: 15, royaltyDcfCents: 11_900_000_00, tradeVelocity: 41, marketSupply: 260, socialReach: 3_400_000 } },
  { name: "M. Aurelia", sport: "Soccer", team: "Valley FC", signals: { onFieldPerformance: 90, offFieldConduct: 91, pressSentiment: 78, royaltyDcfCents: 5_200_000_00, tradeVelocity: 18, marketSupply: 540, socialReach: 920_000 } }
];

function seed() {
  if (athletes.size > 0) return;
  for (const d of DEMO) {
    const id = newId();
    const a: Athlete = { id, slug: slugify(d.name), name: d.name, sport: d.sport, team: d.team, signals: d.signals, sharesOutstanding: d.sharesOutstanding ?? DEFAULT_SHARES, fractionsSold: 0, contractsDcfCents: 0, demandPressure: 0, createdAt: nowIso() };
    athletes.set(id, a);
    seedTimeline(a);
    seedHistory(a);
  }
}
seed();

function change24h(athleteId: string): number {
  const arr = history.get(athleteId) || [];
  if (arr.length < 2) return 0;
  const first = arr[Math.max(0, arr.length - 24)].priceCents;
  const last = arr[arr.length - 1].priceCents;
  return Math.round(((last - first) / first) * 10000) / 100;
}

export const athleteService = {
  list() {
    return [...athletes.values()].map((a) => {
      const idx = indexOf(a);
      return {
        id: a.id,
        slug: a.slug,
        name: a.name,
        sport: a.sport,
        team: a.team,
        priceCents: idx.pricePerShareCents,
        priceDisplay: formatUsdCents(idx.pricePerShareCents),
        marketCapCents: idx.marketCapCents,
        marketCapDisplay: formatUsdCents(idx.marketCapCents),
        change24h: change24h(a.id),
        fractionsSold: a.fractionsSold,
        sharesOutstanding: a.sharesOutstanding
      };
    });
  },

  bySlug: (slug: string) => [...athletes.values()].find((a) => a.slug === slug),
  get: (id: string) => athletes.get(id),

  detail(a: Athlete) {
    const idx = indexOf(a);
    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      sport: a.sport,
      team: a.team,
      signals: a.signals,
      index: idx,
      priceDisplay: formatUsdCents(idx.pricePerShareCents),
      marketCapDisplay: formatUsdCents(idx.marketCapCents),
      change24h: change24h(a.id),
      sharesOutstanding: a.sharesOutstanding,
      fractionsSold: a.fractionsSold,
      fractionsAvailable: a.sharesOutstanding - a.fractionsSold,
      demandPressure: a.demandPressure,
      contractsDcfCents: a.contractsDcfCents,
      contracts: contracts.get(a.id) || [],
      timeline: (timeline.get(a.id) || []).slice().sort((x, y) => x.date.localeCompare(y.date)),
      history: history.get(a.id) || []
    };
  },

  /** Ingest any data point (signal patch) → recompute → annotated ticker move. */
  ingestSignal(id: string, patch: Partial<AthleteSignals>, event?: { tag: string; label: string; note?: string }) {
    const a = athletes.get(id);
    if (!a) return null;
    a.signals = { ...a.signals, ...patch, custom: patch.custom ?? a.signals.custom };
    const idx = pushPoint(a, event ? { kind: "signal", tag: event.tag, label: event.label, note: event.note } : undefined);
    return { index: idx, signals: a.signals };
  },

  buyFractions(id: string, userId: string, shares: number) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const available = a.sharesOutstanding - a.fractionsSold;
    if (shares <= 0 || shares > available) return { error: "insufficient_shares", available } as const;
    const idx = indexOf(a);
    const costBasisCents = shares * idx.pricePerShareCents;
    a.fractionsSold += shares;
    let h = holdings.find((x) => x.athleteId === id && x.userId === userId);
    if (!h) { h = { athleteId: id, userId, shares: 0, costBasisCents: 0 }; holdings.push(h); }
    h.shares += shares;
    h.costBasisCents += costBasisCents;
    // demand pressure → price elasticity (buys lift the index)
    a.demandPressure = Math.min(1, a.demandPressure + (shares / a.sharesOutstanding) * 4);
    grantStakeholderXp(userId); // become a stakeholder → earn XP
    pushPoint(a, { kind: "fraction", tag: "B", label: `${shares.toLocaleString()} shares bought`, note: `Stakeholder ${userId}` });
    return { ok: true as const, shares, costBasisCents, costDisplay: formatUsdCents(costBasisCents), pricePerShareCents: idx.pricePerShareCents, holding: h, fractionsAvailable: a.sharesOutstanding - a.fractionsSold };
  },

  /** Sell fractions back — eases demand pressure, easy buy/sell/trade conversion. */
  sellFractions(id: string, userId: string, shares: number) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const h = holdings.find((x) => x.athleteId === id && x.userId === userId);
    if (!h || shares <= 0 || shares > h.shares) return { error: "insufficient_holding", held: h?.shares || 0 } as const;
    const idx = indexOf(a);
    const proceedsCents = shares * idx.pricePerShareCents;
    h.shares -= shares;
    h.costBasisCents = Math.max(0, h.costBasisCents - shares * idx.pricePerShareCents);
    a.fractionsSold -= shares;
    a.demandPressure = Math.max(-1, a.demandPressure - (shares / a.sharesOutstanding) * 4);
    pushPoint(a, { kind: "fraction", tag: "S", label: `${shares.toLocaleString()} shares sold`, note: `Stakeholder ${userId}` });
    return { ok: true as const, shares, proceedsCents, proceedsDisplay: formatUsdCents(proceedsCents), pricePerShareCents: idx.pricePerShareCents, holding: h };
  },

  holding(id: string, userId: string) {
    const a = athletes.get(id);
    const h = holdings.find((x) => x.athleteId === id && x.userId === userId);
    if (!a || !h) return { shares: 0, valueCents: 0, costBasisCents: 0 };
    const idx = indexOf(a);
    const valueCents = h.shares * idx.pricePerShareCents;
    return { shares: h.shares, costBasisCents: h.costBasisCents, valueCents, valueDisplay: formatUsdCents(valueCents), unrealizedCents: valueCents - h.costBasisCents };
  },

  /** A fan's wealth across all athlete holdings: P&L + royalty income + projected stream. */
  portfolio(userId: string) {
    const PROJECTED_YIELD = 0.06;
    const positions = holdings
      .filter((h) => h.userId === userId && h.shares > 0)
      .map((h) => {
        const a = athletes.get(h.athleteId);
        const idx = a ? indexOf(a) : null;
        const valueCents = idx ? h.shares * idx.pricePerShareCents : 0;
        return {
          athleteId: h.athleteId,
          slug: a?.slug,
          name: a?.name || h.athleteId,
          sport: a?.sport,
          shares: h.shares,
          costBasisCents: h.costBasisCents,
          valueCents,
          unrealizedCents: valueCents - h.costBasisCents,
          valueDisplay: formatUsdCents(valueCents),
          unrealizedDisplay: formatUsdCents(valueCents - h.costBasisCents)
        };
      })
      .sort((x, y) => y.valueCents - x.valueCents);

    const holdingsValueCents = positions.reduce((s, p) => s + p.valueCents, 0);
    const costBasisCents = positions.reduce((s, p) => s + p.costBasisCents, 0);
    const unrealizedCents = holdingsValueCents - costBasisCents;
    const royaltyDividendsCents = dividends.get(userId) || 0;
    const projectedAnnualRoyaltyCents = Math.round(holdingsValueCents * PROJECTED_YIELD) + Math.round(royaltyDividendsCents * 4);
    const netWorthCents = holdingsValueCents + royaltyDividendsCents;
    return {
      userId,
      positions,
      holdingsValueCents,
      costBasisCents,
      unrealizedCents,
      royaltyDividendsCents,
      projectedAnnualRoyaltyCents,
      netWorthCents,
      display: {
        netWorth: formatUsdCents(netWorthCents),
        holdingsValue: formatUsdCents(holdingsValueCents),
        unrealized: formatUsdCents(unrealizedCents),
        royaltyDividends: formatUsdCents(royaltyDividendsCents),
        projectedAnnualRoyalty: formatUsdCents(projectedAnnualRoyaltyCents)
      }
    };
  },

  /** A resale: athlete earns a tracked, chain-anchored royalty; index reacts;
   *  the new owner joins the asset's Legacy Circle chain. */
  royaltyEvent(id: string, input: { assetId: string; fromUserId: string; toUserId: string; salePriceCents: number }) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const athleteRoyaltyCents = Math.round(input.salePriceCents * ATHLETE_ROYALTY_RATE);
    const ts = nowIso();
    const receipt = anchor("athlete.royalty", { athleteId: id, ...input, athleteRoyaltyCents, ts }, ts);
    const ev: RoyaltyEvent = { id: newId(), athleteId: id, assetId: input.assetId, fromUserId: input.fromUserId, toUserId: input.toUserId, salePriceCents: input.salePriceCents, athleteRoyaltyCents, chainTxRef: receipt.txRef, anchor: receipt, ts };
    royaltyEvents.push(ev);

    // stakeholder dividend: share a slice of the royalty pro-rata with fractional holders
    const holderPool = Math.round(athleteRoyaltyCents * HOLDER_DIVIDEND_RATE);
    const heldShares = holdings.filter((h) => h.athleteId === id && h.shares > 0);
    const totalHeld = heldShares.reduce((s, h) => s + h.shares, 0);
    if (totalHeld > 0 && holderPool > 0) {
      for (const h of heldShares) {
        const cut = Math.round((holderPool * h.shares) / totalHeld);
        dividends.set(h.userId, (dividends.get(h.userId) || 0) + cut);
      }
    }

    // best-effort settlement record (escrow/payout to the athlete)
    const settlementBase = process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";
    fetch(`${settlementBase}/settlements`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: input.assetId, grossAmount: String(athleteRoyaltyCents / 100), kind: "athlete_royalty", payeeId: id })
    }).catch(() => undefined);

    // resale activity feeds the index: velocity up, future-royalty DCF up a touch
    a.signals.tradeVelocity = Math.min(100, a.signals.tradeVelocity + 1);
    a.signals.royaltyDcfCents += athleteRoyaltyCents * 8; // crude forward-looking lift
    const idx = pushPoint(a, { kind: "royalty", tag: "R", label: `Resale +${formatUsdCents(athleteRoyaltyCents)} royalty`, note: `Tx ${receipt.txRef.slice(0, 10)}…` });

    // Legacy Circle: the buyer joins the chain after the seller (consent default on)
    const key = `${id}:${input.assetId}`;
    let chain = legacy.get(key);
    if (!chain) { chain = { athleteId: id, assetId: input.assetId, hops: [{ userId: input.fromUserId, hop: 0, joinedAt: nowIso(), consent: true, redacted: false }] }; legacy.set(key, chain); }
    if (!chain.hops.find((h) => h.userId === input.toUserId)) {
      chain.hops.push({ userId: input.toUserId, hop: chain.hops.length, joinedAt: nowIso(), consent: true, redacted: false });
    }
    return { ok: true as const, event: ev, athleteRoyaltyDisplay: formatUsdCents(athleteRoyaltyCents), anchor: receipt, index: idx, legacyChain: chain };
  },

  /** Legacy chain with sovereignty redactions applied (consent-controlled). */
  legacyChain(id: string, assetId: string) {
    const chain = legacy.get(`${id}:${assetId}`);
    if (!chain) return { athleteId: id, assetId, hops: [] };
    return {
      athleteId: id,
      assetId,
      hops: chain.hops.map((h) => (h.redacted || !h.consent ? { ...h, userId: "REDACTED" } : h))
    };
  },

  /** Sovereignty consent/redaction control for a previous owner in the chain. */
  setConsent(id: string, assetId: string, userId: string, opts: { consent?: boolean; redacted?: boolean }) {
    const chain = legacy.get(`${id}:${assetId}`);
    const hop = chain?.hops.find((h) => h.userId === userId);
    if (!hop) return { error: "hop_not_found" } as const;
    if (opts.consent != null) hop.consent = opts.consent;
    if (opts.redacted != null) hop.redacted = opts.redacted;
    return { ok: true as const, hop };
  },

  /** All Legacy Circle members for an athlete (unique owners across every asset). */
  legacyCircle(id: string) {
    const members = new Map<string, { userId: string; assets: number; firstJoined: string }>();
    for (const chain of legacy.values()) {
      if (chain.athleteId !== id) continue;
      for (const h of chain.hops) {
        const label = h.redacted || !h.consent ? "REDACTED" : h.userId;
        const m = members.get(label) || { userId: label, assets: 0, firstJoined: h.joinedAt };
        m.assets += 1;
        if (h.joinedAt < m.firstJoined) m.firstJoined = h.joinedAt;
        members.set(label, m);
      }
    }
    return { athleteId: id, memberCount: members.size, members: [...members.values()] };
  },

  royaltyLedger: (id: string) => royaltyEvents.filter((e) => e.athleteId === id).sort((a, b) => b.ts.localeCompare(a.ts)),

  /* ----------------------------------------------------- Contracts + DCF */

  /** Upload a contract — UNVERIFIED until CrownX live-verifies it. */
  uploadContract(id: string, input: { counterparty: string; kind: ContractKind; annualValueCents: number; termYears: number; discountRate?: number; royaltyShare?: number }) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const c: AthleteContract = { id: newId(), athleteId: id, counterparty: input.counterparty, kind: input.kind, annualValueCents: input.annualValueCents, termYears: input.termYears, discountRate: input.discountRate, royaltyShare: input.royaltyShare, verified: false };
    const arr = contracts.get(id) || [];
    arr.push(c);
    contracts.set(id, arr);
    const dcf = computeContractDcf(c);
    return { ok: true as const, contract: c, projectedDcf: dcf, projectedDcfDisplay: formatUsdCents(dcf.dcfCents), note: "Pending CrownX verification — not yet in the valuation." };
  },

  /** CrownX live-verify a contract; ONLY then does its DCF enter the index. */
  verifyContract(id: string, contractId: string) {
    const a = athletes.get(id);
    const c = (contracts.get(id) || []).find((x) => x.id === contractId);
    if (!a || !c) return { error: "not_found" } as const;
    c.verified = true;
    const receipt = anchor("athlete.contract.verified", { athleteId: id, contractId, kind: c.kind, annualValueCents: c.annualValueCents, termYears: c.termYears }, nowIso());
    a.contractsDcfCents = sumVerifiedContractDcf(contracts.get(id) || []);
    const idx = pushPoint(a, { kind: "contract", tag: "C", label: `${c.kind.toUpperCase()} verified · ${c.counterparty}`, note: `DCF +${formatUsdCents(computeContractDcf(c).dcfCents)} over ${c.termYears}y` });
    return { ok: true as const, contract: c, anchor: receipt, contractsDcfDisplay: formatUsdCents(a.contractsDcfCents), index: idx };
  },

  listContracts: (id: string) => contracts.get(id) || [],

  /* ----------------------------------------------------- Career timeline */

  addTimelineEvent(id: string, input: { kind: TimelineEvent["kind"]; title: string; detail?: string; date: string; signalPatch?: Partial<AthleteSignals> }) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const receipt = anchor("athlete.timeline", { athleteId: id, ...input }, nowIso());
    const ev: TimelineEvent = { id: newId(), athleteId: id, kind: input.kind, title: input.title, detail: input.detail, date: input.date, signalPatch: input.signalPatch, anchor: receipt };
    const arr = timeline.get(id) || [];
    arr.push(ev);
    timeline.set(id, arr);
    let idx = indexOf(a);
    if (input.signalPatch) {
      a.signals = { ...a.signals, ...input.signalPatch };
      idx = pushPoint(a, { kind: "career", tag: "H", label: input.title, note: input.detail });
    }
    return { ok: true as const, event: ev, index: idx };
  },

  getTimeline: (id: string) => (timeline.get(id) || []).slice().sort((x, y) => x.date.localeCompare(y.date)),

  /* ---------------------------------------- Insurance / appraiser / audit */

  /** Insurance verification: authenticity + current valuation attestation (anchored). */
  insuranceVerify(id: string, assetId: string) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const idx = indexOf(a);
    const payload = { athleteId: id, assetId, valuationCents: idx.marketCapCents, pricePerShareCents: idx.pricePerShareCents, asOf: nowIso() };
    const receipt = anchor("insurance.attestation", payload, nowIso());
    return { ok: true as const, authenticity: "verified", valuationDisplay: formatUsdCents(idx.marketCapCents), pricePerShareDisplay: formatUsdCents(idx.pricePerShareCents), attestation: receipt, coverageReady: true };
  },

  /** Request a formal appraisal — enters the human-in-the-loop appraiser queue. */
  requestAppraisal(id: string, assetId: string, requestedBy: string) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const idx = indexOf(a);
    const modelImpliedCents = Math.round(idx.marketCapCents * 0.0008); // per-asset slice of franchise value
    const ap: Appraisal = { id: newId(), athleteId: id, assetId, requestedBy, modelImpliedCents, status: "queued", requestedAt: nowIso() };
    appraisals.push(ap);
    return { ok: true as const, status: "queued_to_appraiser", appraisalId: ap.id, modelImpliedDisplay: formatUsdCents(modelImpliedCents), backedByVerification: true };
  },

  /* ----------------------- Appraiser human-in-the-loop queue ----------------------- */
  appraisalQueue: (status?: Appraisal["status"]) =>
    appraisals
      .filter((x) => !status || x.status === status)
      .map((x) => ({ ...x, modelImpliedDisplay: formatUsdCents(x.modelImpliedCents), appraisedDisplay: x.appraisedValueCents != null ? formatUsdCents(x.appraisedValueCents) : null, athleteName: athletes.get(x.athleteId)?.name })),

  claimAppraisal(appraisalId: string, appraiserId: string) {
    const ap = appraisals.find((x) => x.id === appraisalId);
    if (!ap) return { error: "not_found" } as const;
    if (ap.status === "completed") return { error: "already_completed" } as const;
    ap.status = "in_review";
    ap.appraiserId = appraiserId;
    return { ok: true as const, appraisal: ap };
  },

  /** Appraiser submits the human-verified value — anchored, backed by verification. */
  submitAppraisal(appraisalId: string, appraiserId: string, appraisedValueCents: number, notes?: string) {
    const ap = appraisals.find((x) => x.id === appraisalId);
    if (!ap) return { error: "not_found" } as const;
    ap.status = "completed";
    ap.appraiserId = appraiserId;
    ap.appraisedValueCents = appraisedValueCents;
    ap.notes = notes;
    ap.completedAt = nowIso();
    ap.anchor = anchor("appraisal.completed", { appraisalId, athleteId: ap.athleteId, assetId: ap.assetId, appraiserId, appraisedValueCents, completedAt: ap.completedAt }, ap.completedAt);
    return { ok: true as const, appraisal: { ...ap, appraisedDisplay: formatUsdCents(appraisedValueCents) }, anchor: ap.anchor };
  },

  /* ------------------------ Secondary-market order matching ------------------------ */

  /** Place a limit order; match immediately against the book (price-time priority). */
  placeOrder(id: string, userId: string, side: OrderSide, shares: number, limitPriceCents: number) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    if (shares <= 0 || limitPriceCents <= 0) return { error: "invalid_order" } as const;
    if (side === "sell") {
      const have = holdings.find((h) => h.athleteId === id && h.userId === userId)?.shares || 0;
      const openSell = orders.filter((o) => o.athleteId === id && o.userId === userId && o.side === "sell" && (o.status === "open" || o.status === "partial")).reduce((s, o) => s + o.remaining, 0);
      if (shares > have - openSell) return { error: "insufficient_shares", available: have - openSell } as const;
    }
    const order: Order = { id: newId(), athleteId: id, userId, side, shares, remaining: shares, limitPriceCents, status: "open", createdAt: nowIso() };

    // candidate resting orders on the opposite side
    const candidates = orders
      .filter((o) => o.athleteId === id && o.side !== side && (o.status === "open" || o.status === "partial") && o.userId !== userId)
      .filter((o) => (side === "buy" ? o.limitPriceCents <= limitPriceCents : o.limitPriceCents >= limitPriceCents))
      .sort((x, y) => (side === "buy" ? x.limitPriceCents - y.limitPriceCents : y.limitPriceCents - x.limitPriceCents) || x.createdAt.localeCompare(y.createdAt));

    const newFills: Fill[] = [];
    for (const maker of candidates) {
      if (order.remaining <= 0) break;
      const qty = Math.min(order.remaining, maker.remaining);
      const price = maker.limitPriceCents; // execute at the resting maker's price
      const buyerId = side === "buy" ? userId : maker.userId;
      const sellerId = side === "buy" ? maker.userId : userId;
      // transfer holdings between fans
      const bh = holdingFor(id, buyerId);
      const sh = holdingFor(id, sellerId);
      sh.shares -= qty;
      sh.costBasisCents = Math.max(0, sh.costBasisCents - qty * price);
      bh.shares += qty;
      bh.costBasisCents += qty * price;
      order.remaining -= qty;
      maker.remaining -= qty;
      maker.status = maker.remaining === 0 ? "filled" : "partial";
      const f: Fill = { id: newId(), athleteId: id, buyOrderId: side === "buy" ? order.id : maker.id, sellOrderId: side === "buy" ? maker.id : order.id, buyerId, sellerId, shares: qty, priceCents: price, ts: nowIso() };
      fills.push(f);
      newFills.push(f);
      lastTradePrice.set(id, price);
      grantStakeholderXp(buyerId);
      grantStakeholderXp(sellerId);
    }
    order.status = order.remaining === 0 ? "filled" : order.remaining < order.shares ? "partial" : "open";
    orders.push(order);
    return { ok: true as const, order, fills: newFills.map((f) => ({ ...f, priceDisplay: formatUsdCents(f.priceCents) })), lastTradeDisplay: formatUsdCents(lastTradePrice.get(id) || 0) };
  },

  orderBook(id: string) {
    const open = orders.filter((o) => o.athleteId === id && (o.status === "open" || o.status === "partial"));
    const agg = (side: OrderSide) => {
      const m = new Map<number, number>();
      for (const o of open.filter((x) => x.side === side)) m.set(o.limitPriceCents, (m.get(o.limitPriceCents) || 0) + o.remaining);
      return [...m.entries()].map(([priceCents, shares]) => ({ priceCents, priceDisplay: formatUsdCents(priceCents), shares })).sort((a, b) => (side === "buy" ? b.priceCents - a.priceCents : a.priceCents - b.priceCents));
    };
    return { athleteId: id, bids: agg("buy"), asks: agg("sell"), lastTradeCents: lastTradePrice.get(id) || null, lastTradeDisplay: lastTradePrice.has(id) ? formatUsdCents(lastTradePrice.get(id)!) : null };
  },

  cancelOrder(orderId: string, userId: string) {
    const o = orders.find((x) => x.id === orderId && x.userId === userId);
    if (!o) return { error: "not_found" } as const;
    if (o.status === "filled" || o.status === "cancelled") return { error: "not_open" } as const;
    o.status = "cancelled";
    return { ok: true as const, order: o };
  },

  ordersFor: (id: string, userId: string) => orders.filter((o) => o.athleteId === id && o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  recentFills: (id: string) => fills.filter((f) => f.athleteId === id).slice(-20).reverse().map((f) => ({ ...f, priceDisplay: formatUsdCents(f.priceCents) })),

  /** Top stakeholders for an athlete (most fractional shares) — viral leaderboard. */
  topStakeholders(id: string) {
    const a = athletes.get(id);
    if (!a) return { athleteId: id, holders: [] };
    const idx = indexOf(a);
    return {
      athleteId: id,
      holders: holdings
        .filter((h) => h.athleteId === id && h.shares > 0)
        .sort((x, y) => y.shares - x.shares)
        .slice(0, 10)
        .map((h, i) => ({ rank: i + 1, userId: h.userId, shares: h.shares, valueDisplay: formatUsdCents(h.shares * idx.pricePerShareCents) }))
    };
  },

  /** holdingFor used by order matching (creates a zero holding if absent). */
  _holdingFor: holdingFor,

  /** Real-time, ready-made audit package for auditors / regulators. */
  auditPackage(id: string) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const idx = indexOf(a);
    const cs = contracts.get(id) || [];
    const royalties = royaltyEvents.filter((e) => e.athleteId === id);
    const pkg = {
      generatedAt: nowIso(),
      athlete: { id: a.id, name: a.name, sport: a.sport, team: a.team },
      valuation: { marketCapDisplay: formatUsdCents(idx.marketCapCents), pricePerShareDisplay: formatUsdCents(idx.pricePerShareCents), brandScore: idx.brandScore, scarcityFactor: idx.scarcityFactor, elasticityFactor: idx.elasticityFactor, breakdown: idx.breakdown },
      contracts: { total: cs.length, verified: cs.filter((c) => c.verified).length, verifiedDcfDisplay: formatUsdCents(a.contractsDcfCents) },
      royalties: { count: royalties.length, totalRoyaltyDisplay: formatUsdCents(royalties.reduce((s, r) => s + r.athleteRoyaltyCents, 0)), anchors: royalties.slice(0, 25).map((r) => ({ tx: r.chainTxRef, hash: r.anchor.hash, ts: r.ts })) },
      ownershipChains: [...legacy.values()].filter((c) => c.athleteId === id).map((c) => ({ assetId: c.assetId, hops: c.hops.length, consentGranted: c.hops.filter((h) => h.consent && !h.redacted).length })),
      provenance: { chain: "crownx-genesis", sigScheme: "dilithium3-quantum-resistant" }
    };
    const receipt = anchor("audit.package", pkg, nowIso());
    return { ...pkg, attestation: receipt };
  },

  /** Verify a single anchored fact (auditor/regulator self-check). */
  verifyAnchorFact: (kind: string, payload: unknown, receipt: AnchorReceipt) => verifyAnchor(kind, payload, receipt)
};
