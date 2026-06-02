import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { computeAthleteIndex, formatUsdCents, type AthleteSignals, type AthleteIndex } from "@crownx-jewel/shared-valuation";

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

export type EventKind = "news" | "perf" | "royalty" | "signal" | "fraction" | "seed";

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
  createdAt: string;
}

interface Holding { athleteId: string; userId: string; shares: number; costBasisCents: number }
interface RoyaltyEvent { id: string; athleteId: string; assetId: string; fromUserId: string; toUserId: string; salePriceCents: number; athleteRoyaltyCents: number; chainTxRef: string; ts: string }
interface LegacyChain { athleteId: string; assetId: string; hops: { userId: string; hop: number; joinedAt: string }[] }

const athletes = new Map<string, Athlete>();
const history = new Map<string, PricePoint[]>();
const holdings: Holding[] = [];
const royaltyEvents: RoyaltyEvent[] = [];
const legacy = new Map<string, LegacyChain>(); // `${athleteId}:${assetId}`

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fakeTx = () => "0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

function indexOf(a: Athlete): AthleteIndex {
  return computeAthleteIndex(a.signals, { sharesOutstanding: a.sharesOutstanding });
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

const DEMO: Array<Omit<Athlete, "id" | "slug" | "createdAt" | "sharesOutstanding" | "fractionsSold"> & { sharesOutstanding?: number }> = [
  { name: "Dylan Crews", sport: "Baseball", team: "LSU", signals: { onFieldPerformance: 92, offFieldConduct: 84, pressSentiment: 70, royaltyDcfCents: 8_400_000_00, tradeVelocity: 34, marketSupply: 320, socialReach: 1_200_000 } },
  { name: "A. Vanguard", sport: "Football", team: "Metro U", signals: { onFieldPerformance: 88, offFieldConduct: 80, pressSentiment: 40, royaltyDcfCents: 6_100_000_00, tradeVelocity: 22, marketSupply: 480, socialReach: 640_000 } },
  { name: "K. Solace", sport: "Basketball", team: "Coastal", signals: { onFieldPerformance: 95, offFieldConduct: 72, pressSentiment: 15, royaltyDcfCents: 11_900_000_00, tradeVelocity: 41, marketSupply: 260, socialReach: 3_400_000 } },
  { name: "M. Aurelia", sport: "Soccer", team: "Valley FC", signals: { onFieldPerformance: 90, offFieldConduct: 91, pressSentiment: 78, royaltyDcfCents: 5_200_000_00, tradeVelocity: 18, marketSupply: 540, socialReach: 920_000 } }
];

function seed() {
  if (athletes.size > 0) return;
  for (const d of DEMO) {
    const id = newId();
    const a: Athlete = { id, slug: slugify(d.name), name: d.name, sport: d.sport, team: d.team, signals: d.signals, sharesOutstanding: d.sharesOutstanding ?? DEFAULT_SHARES, fractionsSold: 0, createdAt: nowIso() };
    athletes.set(id, a);
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
    pushPoint(a, { kind: "fraction", tag: "B", label: `${shares.toLocaleString()} shares bought`, note: `Stakeholder ${userId}` });
    return { ok: true as const, shares, costBasisCents, costDisplay: formatUsdCents(costBasisCents), pricePerShareCents: idx.pricePerShareCents, holding: h, fractionsAvailable: a.sharesOutstanding - a.fractionsSold };
  },

  holding(id: string, userId: string) {
    const a = athletes.get(id);
    const h = holdings.find((x) => x.athleteId === id && x.userId === userId);
    if (!a || !h) return { shares: 0, valueCents: 0, costBasisCents: 0 };
    const idx = indexOf(a);
    const valueCents = h.shares * idx.pricePerShareCents;
    return { shares: h.shares, costBasisCents: h.costBasisCents, valueCents, valueDisplay: formatUsdCents(valueCents), unrealizedCents: valueCents - h.costBasisCents };
  },

  /** A resale: athlete earns a tracked, chain-anchored royalty; index reacts;
   *  the new owner joins the asset's Legacy Circle chain. */
  royaltyEvent(id: string, input: { assetId: string; fromUserId: string; toUserId: string; salePriceCents: number }) {
    const a = athletes.get(id);
    if (!a) return { error: "athlete_not_found" } as const;
    const athleteRoyaltyCents = Math.round(input.salePriceCents * ATHLETE_ROYALTY_RATE);
    const ev: RoyaltyEvent = { id: newId(), athleteId: id, assetId: input.assetId, fromUserId: input.fromUserId, toUserId: input.toUserId, salePriceCents: input.salePriceCents, athleteRoyaltyCents, chainTxRef: fakeTx(), ts: nowIso() };
    royaltyEvents.push(ev);

    // resale activity feeds the index: velocity up, future-royalty DCF up a touch
    a.signals.tradeVelocity = Math.min(100, a.signals.tradeVelocity + 1);
    a.signals.royaltyDcfCents += athleteRoyaltyCents * 8; // crude forward-looking lift
    const idx = pushPoint(a, { kind: "royalty", tag: "R", label: `Resale +${formatUsdCents(athleteRoyaltyCents)} royalty`, note: `Tx ${ev.chainTxRef.slice(0, 10)}…` });

    // Legacy Circle: the buyer joins the chain after the seller
    const key = `${id}:${input.assetId}`;
    let chain = legacy.get(key);
    if (!chain) { chain = { athleteId: id, assetId: input.assetId, hops: [{ userId: input.fromUserId, hop: 0, joinedAt: nowIso() }] }; legacy.set(key, chain); }
    if (!chain.hops.find((h) => h.userId === input.toUserId)) {
      chain.hops.push({ userId: input.toUserId, hop: chain.hops.length, joinedAt: nowIso() });
    }
    return { ok: true as const, event: ev, athleteRoyaltyDisplay: formatUsdCents(athleteRoyaltyCents), index: idx, legacyChain: chain };
  },

  legacyChain: (id: string, assetId: string) => legacy.get(`${id}:${assetId}`) || { athleteId: id, assetId, hops: [] },

  /** All Legacy Circle members for an athlete (unique owners across every asset). */
  legacyCircle(id: string) {
    const members = new Map<string, { userId: string; assets: number; firstJoined: string }>();
    for (const chain of legacy.values()) {
      if (chain.athleteId !== id) continue;
      for (const h of chain.hops) {
        const m = members.get(h.userId) || { userId: h.userId, assets: 0, firstJoined: h.joinedAt };
        m.assets += 1;
        if (h.joinedAt < m.firstJoined) m.firstJoined = h.joinedAt;
        members.set(h.userId, m);
      }
    }
    return { athleteId: id, memberCount: members.size, members: [...members.values()] };
  },

  royaltyLedger: (id: string) => royaltyEvents.filter((e) => e.athleteId === id).sort((a, b) => b.ts.localeCompare(a.ts))
};
