import { newId, nowIso } from "@crownx-jewel/shared-kernel";

/**
 * The CrownX Network Feed — market news + viral moments in one stream.
 *
 *   • mint     — a minted slab moment (3D/4D floating item in the UI)
 *   • listing  — an item for sale; click-to-buy flows straight into Pack-N-Ship
 *   • auction  — a live-bid item with a countdown
 *   • athlete_news — a tokenized-athlete moment that MOVES the athlete's value
 *   • promo    — a promotion of an item or player
 *
 * Comments are allowed ONLY on athlete_news + promo posts, so chatter never
 * crowds the items on the market (mint/listing/auction stay clean).
 */

const ATH = () => process.env.ATHLETE_INDEX_SERVICE_URL || "http://localhost:4076";
const PNS = () => process.env.PACK_N_SHIP_SERVICE_URL || "http://localhost:4077";
const XP = () => process.env.XP_SERVICE_URL || "http://localhost:4073";
const ATTR = () => process.env.ATTRIBUTION_SERVICE_URL || "http://localhost:4074";

export type PostKind = "mint" | "listing" | "auction" | "athlete_news" | "promo";

export interface Item {
  assetId: string;
  name: string;
  grade?: string;
  floorDisplay?: string;
  lv?: string;
  athleteId?: string;
  athleteSlug?: string;
}
export interface Bid { userId: string; userName: string; amountCents: number; ts: string }
export interface Comment { id: string; userId: string; userName: string; text: string; ts: string }

export interface Post {
  id: string;
  kind: PostKind;
  authorId: string;
  authorName: string;
  title: string;
  body?: string;
  item?: Item;
  priceCents?: number;
  auction?: { currentBidCents: number; highBidderId?: string; highBidderName?: string; endsAt: string; bids: Bid[] };
  athleteId?: string;
  athleteName?: string;
  valueDelta?: string;
  priceDisplay?: string;
  reactions: number;
  boosts: number;
  commentsAllowed: boolean;
  comments: Comment[];
  sold?: boolean;
  tradeId?: string;
  createdAt: string;
}

const posts: Post[] = [];
const usd = (c: number) => (c >= 100_000 ? `$${(c / 100_000).toFixed(1)}K` : `$${(c / 100).toFixed(2)}`);
const commentsAllowedFor = (k: PostKind) => k === "athlete_news" || k === "promo";

async function call(method: "GET" | "POST", url: string, body?: unknown): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { method, headers: method === "POST" ? { "content-type": "application/json" } : undefined, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined, signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
function grantXp(userId: string, action: string) {
  call("POST", `${XP()}/xp/grant`, { userId, action }).catch(() => undefined);
}

function add(p: Omit<Post, "id" | "reactions" | "boosts" | "commentsAllowed" | "comments" | "createdAt"> & Partial<Pick<Post, "createdAt">>): Post {
  const post: Post = { id: `pst_${newId()}`, reactions: 0, boosts: 0, commentsAllowed: commentsAllowedFor(p.kind), comments: [], createdAt: p.createdAt || nowIso(), ...p };
  posts.unshift(post);
  if (posts.length > 200) posts.pop();
  return post;
}

function seed() {
  if (posts.length) return;
  add({ kind: "mint", authorId: "vaultmaster", authorName: "vaultmaster", title: "Minted a Genesis slab", body: "Game-worn, graded 10, COA anchored on-chain.", item: { assetId: "ast_seed1", name: "GAME-WORN '24", grade: "10", floorDisplay: "$42K", lv: "72" } });
  add({ kind: "listing", authorId: "kc_collector", authorName: "kc_collector", title: "For sale — Championship Ball", body: "Signed, JSA verified. Buy now → escrow + pack-n-ship.", item: { assetId: "ast_seed2", name: "SIGNED CHAMP BALL", grade: "9.5", floorDisplay: "$38K", lv: "41" }, priceCents: 38_000_00 });
  add({ kind: "auction", authorId: "house", authorName: "CrownX House", title: "LIVE AUCTION — Title-Fight Glove 1/1", body: "Bidding open. Highest bid wins → straight to pack-n-ship.", item: { assetId: "ast_seed3", name: "TITLE-FIGHT GLOVE", grade: "10", floorDisplay: "$90K", lv: "88" }, auction: { currentBidCents: 31_900_00, endsAt: new Date(Date.now() + 36e5).toISOString(), bids: [] } });
  add({ kind: "promo", authorId: "house", authorName: "CrownX House", title: "Founder drop — 250 Genesis slabs", body: "Royalty for life + a /LV99 head-start. Comment your pick." });
}
seed();

export const feedService = {
  list: (limit = 40) => posts.slice(0, limit),
  get: (id: string) => posts.find((p) => p.id === id),

  createMint: (i: { authorId: string; authorName: string; item: Item; renderShare?: boolean }) => {
    const p = add({ kind: "mint", authorId: i.authorId, authorName: i.authorName, title: "Minted a Genesis slab", body: `${i.item.name} · grade ${i.item.grade}`, item: i.item });
    grantXp(i.authorId, "slab_shared");
    return p;
  },

  createListing: (i: { authorId: string; authorName: string; item: Item; priceCents: number }) =>
    add({ kind: "listing", authorId: i.authorId, authorName: i.authorName, title: `For sale — ${i.item.name}`, body: "Click-to-buy → escrow + pack-n-ship.", item: i.item, priceCents: i.priceCents }),

  createAuction: (i: { authorId: string; authorName: string; item: Item; startBidCents: number; durationMins?: number }) =>
    add({ kind: "auction", authorId: i.authorId, authorName: i.authorName, title: `LIVE AUCTION — ${i.item.name}`, body: "Bidding open. Highest bid wins → pack-n-ship.", item: i.item, auction: { currentBidCents: i.startBidCents, endsAt: new Date(Date.now() + (i.durationMins ?? 60) * 60000).toISOString(), bids: [] } }),

  createPromo: (i: { authorId: string; authorName: string; title: string; body: string }) =>
    add({ kind: "promo", authorId: i.authorId, authorName: i.authorName, title: i.title, body: i.body }),

  /** Athlete news — a tokenized-athlete moment that MOVES the athlete's value. */
  async createAthleteNews(i: { authorId: string; authorName: string; athleteId: string; athleteName: string; title: string; body: string; signalPatch?: Record<string, number> }) {
    const before = (await call("GET", `${ATH()}/athletes/${i.athleteId}`)) as { priceDisplay?: string; index?: { pricePerShareCents: number } } | null;
    const beforeCents = before?.index?.pricePerShareCents ?? 0;
    let delta = "";
    let priceDisplay = before?.priceDisplay || "";
    if (i.signalPatch) {
      const after = (await call("POST", `${ATH()}/athletes/${i.athleteId}/signals`, { patch: i.signalPatch, event: { tag: "N", label: i.title, note: i.body } })) as { index?: { pricePerShareCents: number } } | null;
      const afterCents = after?.index?.pricePerShareCents ?? beforeCents;
      if (beforeCents > 0) {
        const pct = ((afterCents - beforeCents) / beforeCents) * 100;
        delta = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
      }
      priceDisplay = usd(afterCents);
    }
    return add({ kind: "athlete_news", authorId: i.authorId, authorName: i.authorName, title: i.title, body: i.body, athleteId: i.athleteId, athleteName: i.athleteName, valueDelta: delta, priceDisplay });
  },

  /** Comment — allowed only on athlete_news + promo so market items stay clean. */
  comment(id: string, userId: string, userName: string, text: string) {
    const p = posts.find((x) => x.id === id);
    if (!p) return { error: "not_found" } as const;
    if (!p.commentsAllowed) return { error: "comments_disabled_on_market_items" } as const;
    const c: Comment = { id: newId(), userId, userName, text: text.slice(0, 500), ts: nowIso() };
    p.comments.push(c);
    return { ok: true as const, comment: c, total: p.comments.length };
  },

  /** Boost = viral amplification: +reach, +XP, best-effort share-card render. */
  boost(id: string, userId: string) {
    const p = posts.find((x) => x.id === id);
    if (!p) return { error: "not_found" } as const;
    p.boosts += 1;
    p.reactions += 1;
    grantXp(userId, "slab_shared");
    if (p.item) {
      call("POST", `${ATTR()}/renders`, { assetId: p.item.assetId, sharerId: userId, surface: "link", card: { name: p.item.name, grade: p.item.grade || "10", floor: p.item.floorDisplay || "", lv: p.item.lv || "1" } }).catch(() => undefined);
    }
    return { ok: true as const, boosts: p.boosts, reactions: p.reactions };
  },

  react(id: string) {
    const p = posts.find((x) => x.id === id);
    if (!p) return { error: "not_found" } as const;
    p.reactions += 1;
    return { ok: true as const, reactions: p.reactions };
  },

  /** Place a live bid on an auction post. */
  bid(id: string, userId: string, userName: string, amountCents: number) {
    const p = posts.find((x) => x.id === id);
    if (!p || !p.auction) return { error: "not_an_auction" } as const;
    if (p.sold) return { error: "auction_closed" } as const;
    if (amountCents <= p.auction.currentBidCents) return { error: "bid_too_low", currentBidCents: p.auction.currentBidCents, currentBidDisplay: usd(p.auction.currentBidCents) } as const;
    p.auction.currentBidCents = amountCents;
    p.auction.highBidderId = userId;
    p.auction.highBidderName = userName;
    p.auction.bids.push({ userId, userName, amountCents, ts: nowIso() });
    p.reactions += 1;
    return { ok: true as const, currentBidDisplay: usd(amountCents), highBidder: userName, bids: p.auction.bids.length };
  },

  /** Click-to-buy a listing → opens a Pack-N-Ship escrow trade (the loop). */
  async buy(id: string, buyerId: string) {
    const p = posts.find((x) => x.id === id);
    if (!p) return { error: "not_found" } as const;
    if (p.kind !== "listing" || !p.priceCents) return { error: "not_for_sale" } as const;
    if (p.sold) return { error: "already_sold" } as const;
    const trade = (await call("POST", `${PNS()}/trades`, { assetId: p.item?.assetId || p.id, sellerId: p.authorId, buyerId, priceCents: p.priceCents })) as { id?: string } | null;
    if (!trade?.id) return { error: "pack_n_ship_unavailable" } as const;
    p.sold = true;
    p.tradeId = trade.id;
    grantXp(buyerId, "sale_completed");
    grantXp(p.authorId, "sale_completed");
    return { ok: true as const, tradeId: trade.id, next: "pack_n_ship", priceDisplay: usd(p.priceCents) };
  },

  /** Settle an auction → winner enters Pack-N-Ship. */
  async settleAuction(id: string) {
    const p = posts.find((x) => x.id === id);
    if (!p || !p.auction) return { error: "not_an_auction" } as const;
    if (!p.auction.highBidderId) return { error: "no_bids" } as const;
    const trade = (await call("POST", `${PNS()}/trades`, { assetId: p.item?.assetId || p.id, sellerId: p.authorId, buyerId: p.auction.highBidderId, priceCents: p.auction.currentBidCents })) as { id?: string } | null;
    if (!trade?.id) return { error: "pack_n_ship_unavailable" } as const;
    p.sold = true;
    p.tradeId = trade.id;
    return { ok: true as const, winner: p.auction.highBidderName, winningBidDisplay: usd(p.auction.currentBidCents), tradeId: trade.id, next: "pack_n_ship" };
  }
};
