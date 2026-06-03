const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const get = (p) => fetch(`${GW}${p}`).then((r) => r.json());
const post = (p, b) => fetch(`${GW}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) });
const postj = async (p, b) => { const r = await post(p, b); return { status: r.status, json: await r.json().catch(() => ({})) }; };

for (let i = 0; i < 25; i++) { try { if ((await fetch(`${GW}/health`)).ok && (await fetch("http://localhost:4079/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1500)); }

console.log("=== aggregate health (now includes networkFeed) ===");
const h = await get("/api/health");
console.log("  ok=" + h.ok, Object.entries(h.services).map(([k, v]) => k + ":" + v).join(" "));

console.log("=== feed (seeded market news) ===");
let feed = await get("/api/feed");
console.log("  " + feed.map((p) => `[${p.kind}] ${p.title.slice(0, 28)}`).join("\n  "));

const aid = (await get("/api/athletes"))[0].id;
const aname = (await get("/api/athletes"))[0].name;

console.log("=== athlete news MOVES the tokenized athlete value ===");
const before = (await get(`/api/athletes/${aid}`)).priceDisplay;
const news = await postj("/api/feed/athlete-news", { authorId: "house", authorName: "CrownX House", athleteId: aid, athleteName: aname, title: `${aname} signs major endorsement`, body: "Brand deal lifts the index.", signalPatch: { pressSentiment: 95, onFieldPerformance: 96 } });
console.log(`  ${aname}: ${before} → ${news.json.priceDisplay} (${news.json.valueDelta}) · news posted to feed`);

console.log("=== comment on news (ALLOWED) vs on a market item (BLOCKED) ===");
feed = await get("/api/feed");
const promo = feed.find((p) => p.kind === "promo");
const listing = feed.find((p) => p.kind === "listing");
const auction = feed.find((p) => p.kind === "auction");
const c1 = await postj(`/api/feed/${promo.id}/comment`, { userId: "fan_a", userName: "fan_a", text: "I'm in! 🔥" });
console.log(`  comment on promo → ${c1.status} ${c1.json.ok ? "(posted)" : c1.json.error}`);
const c2 = await postj(`/api/feed/${listing.id}/comment`, { userId: "fan_a", userName: "fan_a", text: "nice" });
console.log(`  comment on listing → ${c2.status} ${c2.json.error || "(posted)"} (market items stay clean)`);

console.log("=== live bid on auction ===");
const b1 = await postj(`/api/feed/${auction.id}/bid`, { userId: "fan_b", userName: "fan_b", amountCents: 35_000_00 });
console.log(`  bid $35K → ${b1.json.ok ? `high bid ${b1.json.currentBidDisplay} by ${b1.json.highBidder}` : b1.json.error}`);
const b2 = await postj(`/api/feed/${auction.id}/bid`, { userId: "fan_c", userName: "fan_c", amountCents: 30_000_00 });
console.log(`  underbid $30K → ${b2.json.error} (rejected)`);

console.log("=== click-to-buy listing → flows into Pack-N-Ship ===");
const buy = await postj(`/api/feed/${listing.id}/buy`, { buyerId: "fan_b" });
console.log(`  bought ${buy.json.priceDisplay} → ${buy.json.next} trade ${(buy.json.tradeId || "").slice(0, 12)}…`);
const trade = await get(`/api/trades/${buy.json.tradeId}`);
console.log(`  pack-n-ship trade state: ${trade.state} (escrow ${trade.escrowDisplay})`);

console.log("=== boost (viral amplification → XP) ===");
const boost = await postj(`/api/feed/${feed.find((p) => p.kind === "mint").id}/boost`, { userId: "fan_d" });
console.log(`  boosted → ${boost.json.boosts} boosts, ${boost.json.reactions} reactions`);
