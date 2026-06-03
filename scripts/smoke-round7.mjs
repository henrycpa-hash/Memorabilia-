const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const get = (p) => fetch(`${GW}${p}`).then((r) => r.json());
const post = (p, b) => fetch(`${GW}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) }).then((r) => r.json());

// wait for gateway
for (let i = 0; i < 20; i++) { try { const h = await fetch(`${GW}/health`); if (h.ok) break; } catch {} await new Promise((r) => setTimeout(r, 1500)); }

const aid = (await get("/api/athletes"))[0].id;

console.log("=== A. FRACTIONAL ORDER MATCHING (fans trade peer-to-peer) ===");
// give two fans some shares from the float first
await post(`/api/athletes/${aid}/fractions/buy`, { userId: "fan_seller", shares: 2000 });
await post(`/api/athletes/${aid}/fractions/buy`, { userId: "fan_buyer", shares: 100 });
// seller posts an ask, buyer crosses it
const ask = await post(`/api/athletes/${aid}/orders`, { userId: "fan_seller", side: "sell", shares: 800, limitPriceCents: 6000 });
console.log(`   seller ASK 800 @ $60.00 → status ${ask.order.status} (resting)`);
const bid = await post(`/api/athletes/${aid}/orders`, { userId: "fan_buyer", side: "buy", shares: 500, limitPriceCents: 6500 });
console.log(`   buyer BID 500 @ $65.00 → ${bid.fills.length} fill(s): ${bid.fills.map((f) => f.shares + "@" + f.priceDisplay).join(", ")} · last trade ${bid.lastTradeDisplay}`);
const book = await get(`/api/athletes/${aid}/orderbook`);
console.log(`   book now: bids=${book.bids.length} asks=${book.asks.map((x) => x.shares + "@" + x.priceDisplay).join(",")} · last ${book.lastTradeDisplay}`);
const sellerHold = await get(`/api/athletes/${aid}/holdings/fan_seller`);
const buyerHold = await get(`/api/athletes/${aid}/holdings/fan_buyer`);
console.log(`   holdings transferred: seller ${sellerHold.shares} · buyer ${buyerHold.shares}`);
const top = await get(`/api/athletes/${aid}/top-stakeholders`);
console.log(`   top stakeholders: ${top.holders.slice(0, 3).map((h) => `#${h.rank} ${h.userId}(${h.shares})`).join("  ")}`);

console.log("=== B. APPRAISER HUMAN-IN-THE-LOOP QUEUE ===");
const req = await post(`/api/athletes/${aid}/appraisal`, { assetId: "ast_jersey1", requestedBy: "fan_buyer" });
console.log(`   requested → ${req.status} · model-implied ${req.modelImpliedDisplay} · id ${req.appraisalId.slice(0, 8)}`);
let queue = await get("/api/appraisals?status=queued");
console.log(`   appraiser sees ${queue.length} queued`);
await post(`/api/appraisals/${req.appraisalId}/claim`, { appraiserId: "appraiser_jordan" });
const done = await post(`/api/appraisals/${req.appraisalId}/submit`, { appraiserId: "appraiser_jordan", appraisedValueCents: 4800000, notes: "Human-verified vs COA + index." });
console.log(`   appraiser submitted ${done.appraisal.appraisedDisplay} · anchored ${done.anchor.txRef.slice(0, 16)}…`);

console.log("=== C. STAKEHOLDER XP (liquidity rewards) wired to xp-service ===");
const rank = await get(`/api/xp/rank/fan_buyer`);
console.log(`   fan_buyer XP rank: LV${rank.level} ${rank.tier} (${rank.xp} VXP) — earned from buying + trading`);
