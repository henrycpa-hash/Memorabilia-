// Security test: verify the hardening across interface layers — security headers,
// rate-limit headers, clean 404, input rejection, no internal-error leakage, and
// server-fingerprint stripping. Runs against the gateway (:4000) + a service.
//
// Node 24 global fetch. Run:  node scripts/smoke-security.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const line = (s) => console.log(s);
let fails = 0;
const check = (label, ok, detail = "") => { if (!ok) fails++; line(`  ${ok ? "✓" : "✗"} ${label}${detail ? " · " + detail : ""}`); };

const raw = async (url, opts) => { const r = await fetch(url, opts); const h = {}; r.headers.forEach((v, k) => (h[k] = v)); const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { status: r.status, headers: h, data: d }; };

(async () => {
  line("\n=== CrownX Security Test — headers · rate-limit · error hygiene · input validation ===\n");

  line("1. security response headers on the gateway");
  const g = await raw(`${GW}/api/health`);
  check("X-Content-Type-Options: nosniff", g.headers["x-content-type-options"] === "nosniff");
  check("X-Frame-Options: DENY", g.headers["x-frame-options"] === "DENY");
  check("Content-Security-Policy present", /default-src 'none'/.test(g.headers["content-security-policy"] || ""));
  check("Referrer-Policy: no-referrer", g.headers["referrer-policy"] === "no-referrer");
  check("Permissions-Policy present", !!g.headers["permissions-policy"]);
  check("Strict-Transport-Security present", !!g.headers["strict-transport-security"]);
  check("Cross-Origin-Resource-Policy present", !!g.headers["cross-origin-resource-policy"]);
  check("server fingerprint stripped (X-Powered-By empty)", !g.headers["x-powered-by"], `x-powered-by="${g.headers["x-powered-by"] || ""}"`);
  check("hardened marker present", g.headers["x-crownx-hardened"] === "1");

  line("2. rate-limit headers present and decrementing");
  const a = await raw(`${GW}/api/terms`);
  const b = await raw(`${GW}/api/terms`);
  const limit = Number(a.headers["x-ratelimit-limit"] || 0);
  const remA = Number(a.headers["x-ratelimit-remaining"] || -1);
  const remB = Number(b.headers["x-ratelimit-remaining"] || -1);
  check("X-RateLimit-Limit present", limit > 0, `limit=${limit}`);
  check("X-RateLimit-Remaining decrements", remB < remA, `${remA} → ${remB}`);

  line("3. error hygiene — clean 404 + bad input 400 + no internal leakage");
  const nf = await raw(`${GW}/api/__nope__`);
  check("unknown route → 404 JSON", nf.status === 404 && nf.data && nf.data.error === "route_not_found");
  const bad = await raw(`${GW}/api/royalty-vault/settle`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId: "x", salePriceCents: "abc" }) });
  check("malformed financial input → 400 (not 500)", bad.status === 400);
  // a 500-class response must not echo an internal exception message
  const oversized = await raw(`${GW}/api/terms/accept`, { method: "POST", headers: { "content-type": "application/json" }, body: "{ this is : not valid json " });
  const leaks = typeof oversized.data === "object" && oversized.data && /stack|at Object|node_modules|TypeError|SyntaxError/i.test(JSON.stringify(oversized.data));
  check("error responses do not leak internals", !leaks, `status ${oversized.status}`);

  line("4. service layer also carries security headers (defence-in-depth)");
  const svc = await raw("http://localhost:4083/health").catch(() => ({ headers: {} }));
  check("terms-service sets nosniff", svc.headers["x-content-type-options"] === "nosniff");

  line(`\n${fails === 0 ? "✅ PASS" : `❌ ${fails} CHECK(S) FAILED`} — security posture ${fails === 0 ? "verified across interface layers" : "needs attention"}\n`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("security smoke failed:", e); process.exit(1); });
