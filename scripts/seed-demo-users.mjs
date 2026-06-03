// Seed the three demo accounts with assets, XP, athlete holdings, and royalties.
//   node scripts/seed-demo-users.mjs    (core services + athlete-index must be up)
const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const ASSET = process.env.ASSET_SERVICE_URL || "http://localhost:4002";
const PASSWORD = "CrownXDemo!2026";

const post = (base, p, b, token) =>
  fetch(`${base}${p}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(b) }).then((r) => r.json().catch(() => ({})));
const get = (p, token) => fetch(`${GW}${p}`, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then((r) => r.json());
const subOf = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64").toString()).sub;

const USERS = [
  { email: "henry@crownx.ai", name: "Henry", role: "creator", slabs: ["Founder Genesis Slab 1/1", "Game-Worn Finals Jersey", "Signed Debut Card PSA 10"] },
  { email: "raul@crownx.ai", name: "Raul", role: "creator", slabs: ["Championship Ring Replica", "Match-Used Boots 1/1"] },
  { email: "eric@crownx.ai", name: "Eric", role: "creator", slabs: ["Rookie Pennant", "Title-Fight Glove 1/1"] }
];

const athletes = await get("/api/athletes");
console.log(`Athletes on the exchange: ${athletes.map((a) => a.name).join(", ")}\n`);

for (const u of USERS) {
  // register (or re-register with a unique alias if taken) → token
  let reg = await post(GW, "/api/register", { email: u.email, displayName: u.name, password: PASSWORD, role: u.role });
  let token = reg.accessToken;
  if (!token) {
    // already exists → log in
    reg = await post(GW, "/api/login", { email: u.email, password: PASSWORD });
    token = reg.accessToken;
  }
  if (!token) {
    console.log(`✗ ${u.email}: could not register or login (${JSON.stringify(reg).slice(0, 80)})`);
    continue;
  }
  const uid = subOf(token);
  console.log(`● ${u.email}  (id ${uid.slice(0, 8)})`);

  // mint + approve their slabs
  let owned = 0;
  for (const title of u.slabs) {
    const a = await post(GW, "/api/assets", { originatorId: uid, currentOwnerId: uid, assetType: "memorabilia", title, editionType: "one_of_one" }, token);
    if (a.id) {
      const ap = await fetch(`${ASSET}/internal/assets/${a.id}/approve`, { method: "POST" });
      if (ap.ok) owned++;
    }
  }

  // XP: a top-grade mint + first mint + daily check-in
  await post(GW, "/api/xp/grant", { userId: uid, action: "mint_top" });
  await post(GW, "/api/xp/grant", { userId: uid, action: "first_mint" });
  await post(GW, "/api/xp/streak/checkin", { userId: uid });

  // become a stakeholder in two athletes (fractional ownership → royalty stream)
  for (const a of athletes.slice(0, 2)) {
    await post(GW, `/api/athletes/${a.id}/fractions/buy`, { userId: uid, shares: 800 + Math.floor(Math.random() * 1200) }, token);
  }

  const [rank, pf] = await Promise.all([get(`/api/xp/rank/${uid}`), get(`/api/portfolio/${uid}`)]);
  console.log(`   slabs ${owned} · LV${rank.level} ${rank.tier} (${rank.xp} VXP) · net worth ${pf.display.netWorth} · holdings ${pf.display.holdingsValue}\n`);
}

// trigger resale royalties so stakeholders earn dividends
const a0 = athletes[0];
await post(GW, `/api/athletes/${a0.id}/royalty-event`, { assetId: "ast_demo1", fromUserId: "fan_x", toUserId: "fan_y", salePriceCents: 5800000 });
await post(GW, `/api/athletes/${a0.id}/royalty-event`, { assetId: "ast_demo2", fromUserId: "fan_y", toUserId: "fan_z", salePriceCents: 7200000 });
console.log(`Triggered resale royalties on ${a0.name} → stakeholders now earn dividends.`);

console.log(`\nDemo accounts ready. Password for all: ${PASSWORD}`);
console.log("Sign in at the collector-vault /login with any of: henry@crownx.ai, raul@crownx.ai, eric@crownx.ai");
