/**
 * Server-side share-card render — a deterministic SVG composite of the slab.
 *
 * SVG (not headless canvas) keeps this dependency-free and identical across
 * every request, which is exactly what makes OG/Twitter-card unfurls reliable:
 * same render_id → same bytes, cacheable by asset hash. A raster step
 * (resvg/sharp) can wrap this later for platforms that demand PNG.
 */

export interface ShareCardData {
  name: string;
  title?: string;
  grade: string;
  edition?: string;
  floor?: string;
  lv?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildShareCardSvg(d: ShareCardData): string {
  const name = esc(d.name || "CROWNX SLAB");
  const title = esc(d.title || "GENESIS DROP");
  const grade = esc(d.grade || "10");
  const edition = esc(d.edition || "1/1");
  const floor = esc(d.floor || "—");
  const lv = esc(d.lv || "72");
  // deterministic barcode from the name
  let seed = 0;
  for (const c of name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  let bx = 70;
  const bars: string[] = [];
  for (let i = 0; i < 70 && bx < 530; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const w = 1 + (seed % 5);
    if ((seed >> 3) % 10 > 4) bars.push(`<rect x="${bx}" y="660" width="${w}" height="40" fill="#e9ebf2"/>`);
    bx += w + 2;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10131d"/><stop offset="0.6" stop-color="#06080f"/><stop offset="1" stop-color="#04060d"/>
    </linearGradient>
    <linearGradient id="cy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8ff5f1"/><stop offset="1" stop-color="#1c6f6b"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#3fd9d4" stop-opacity="0.16"/><stop offset="1" stop-color="#04060d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="600" height="800" rx="28" fill="url(#bg)"/>
  <rect x="6" y="6" width="588" height="788" rx="24" fill="none" stroke="#3fd9d4" stroke-opacity="0.35" stroke-width="3"/>
  <!-- label header -->
  <rect x="28" y="28" width="544" height="90" rx="14" fill="#fafbff"/>
  <rect x="42" y="42" width="62" height="62" rx="12" fill="#9bb8ff"/>
  <text x="73" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" fill="#10131f" text-anchor="middle">CX</text>
  <text x="120" y="70" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" fill="#10131f">${name}</text>
  <rect x="120" y="80" width="200" height="22" fill="#10131f"/>
  <text x="128" y="96" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="600" fill="#fff">${title}</text>
  <text x="524" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="800" fill="#9bffd2" text-anchor="middle">${grade}</text>
  <text x="524" y="104" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#10131f" text-anchor="middle">MINT · ${edition}</text>
  <!-- cyan band -->
  <rect x="28" y="130" width="544" height="70" fill="#0a2c34"/>
  <rect x="28" y="128" width="544" height="3" fill="#3fd9d4"/>
  <rect x="28" y="200" width="544" height="3" fill="#3fd9d4"/>
  <text x="300" y="178" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" fill="url(#cy)" text-anchor="middle">GENESIS DROP</text>
  <text x="300" y="194" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#a9d9d6" text-anchor="middle">CROWNX ARENA · GENESIS COA</text>
  <!-- action zone -->
  <rect x="28" y="200" width="544" height="360" fill="url(#halo)"/>
  <text x="300" y="470" font-family="Segoe UI, Arial, sans-serif" font-size="150" font-weight="800" fill="#ffffff" fill-opacity="0.10" text-anchor="middle">27</text>
  <rect x="230" y="300" width="140" height="210" rx="18" fill="#ffffff" fill-opacity="0.10"/>
  <circle cx="300" cy="335" r="26" fill="#04060d"/>
  <rect x="450" y="216" width="120" height="26" rx="6" fill="none" stroke="#3fd9d4" stroke-opacity="0.5"/>
  <text x="510" y="233" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#3fd9d4" text-anchor="middle">HOLO ◆ FOIL</text>
  <!-- footer -->
  <rect x="28" y="560" width="544" height="212" fill="#080b11"/>
  <rect x="28" y="560" width="544" height="2" fill="#3fd9d4" fill-opacity="0.3"/>
  <text x="150" y="615" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800" fill="#8ff5f1" text-anchor="middle">176</text>
  <text x="300" y="615" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800" fill="#8ff5f1" text-anchor="middle">18</text>
  <text x="450" y="615" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800" fill="#8ff5f1" text-anchor="middle">7</text>
  <text x="150" y="635" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#7d869c" text-anchor="middle">TK</text>
  <text x="300" y="635" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#7d869c" text-anchor="middle">PASS DF</text>
  <text x="450" y="635" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#7d869c" text-anchor="middle">INT</text>
  ${bars.join("")}
  <text x="60" y="730" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" fill="#7d869c">FLOOR</text>
  <text x="60" y="755" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800" fill="#f7e08a">${floor}</text>
  <text x="540" y="730" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" fill="#7d869c" text-anchor="end">MINTED BY</text>
  <text x="540" y="755" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800" fill="#3fd9d4" text-anchor="end">LV${lv}</text>
  <text x="300" y="792" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="800" fill="#8ff5f1" fill-opacity="0.5" text-anchor="middle">◆ CROWNX VAULT</text>
</svg>`;
}
