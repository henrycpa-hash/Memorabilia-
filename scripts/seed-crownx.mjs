// Seed demo assets/listings so the CrownX vault + market show populated slabs.
// Run with the core services up: node scripts/seed-crownx.mjs
const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const ASSET = process.env.ASSET_SERVICE_URL || "http://localhost:4002";

const post = async (url, body, token) => {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json().catch(() => null) };
};

const subOf = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64").toString()).sub;

const PIECES = [
  { title: "Game-Worn Jersey 1/1", price: 42000 },
  { title: "Signed Championship Ball", price: 38000 },
  { title: "Title-Fight Glove 1/1", price: 90000 },
  { title: "Rookie Debut Card PSA 10", price: 15500 },
  { title: "Stadium Finale Pennant", price: 8200 }
];

const reg = await post(`${GW}/api/register`, {
  email: `creator+${Date.now()}@crownx.ai`,
  displayName: "Demo Creator",
  password: "passw0rd123",
  role: "creator"
});
const token = reg.json?.accessToken;
if (!token) {
  console.error("register failed", reg.status, reg.json);
  process.exit(1);
}
const owner = subOf(token);
console.log("creator userId:", owner);

let owned = 0, listed = 0;
for (const p of PIECES) {
  const a = await post(`${GW}/api/assets`, {
    originatorId: owner,
    currentOwnerId: owner,
    assetType: "memorabilia",
    title: p.title,
    editionType: "one_of_one"
  }, token);
  const id = a.json?.id;
  if (!id) { console.log("  skip", p.title, a.status, a.json); continue; }
  const approve = await fetch(`${ASSET}/internal/assets/${id}/approve`, { method: "POST" });
  if (approve.ok) owned++;
  const l = await post(`${GW}/api/listings`, { assetId: id, sellerId: owner, price: p.price }, token);
  if (l.status === 201) listed++;
  console.log(`  ✓ ${p.title}  approve=${approve.status} listing=${l.status}`);
}

const vault = await fetch(`${GW}/api/vault/me`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
const listings = await fetch(`${GW}/api/listings`).then((r) => r.json());
console.log(`\nRESULT: vault owned=${vault.length}, active listings=${listings.filter((x) => x.status === "active").length}`);
console.log("DEMO_TOKEN=" + token);
