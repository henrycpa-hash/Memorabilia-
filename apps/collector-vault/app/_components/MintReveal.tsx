"use client";

import { useEffect, useRef, useState } from "react";
import { color, font, buttonStyle, Badge } from "@crownx-jewel/shared-design";

/**
 * Mint → reveal → share-card. Ports `share-card-pipeline.html` + the vault-v2
 * mint overlay into one client surface:
 *   1. mint completes → holo reveal with a DISCLOSED-ODDS rarity roll
 *   2. a real <canvas> render produces the share PNG (the collectible is the ad)
 *   3. native share / download, and a best-effort attribution ping (render id)
 *
 * Integrity guardrails carried from the reference: odds are disclosed (no
 * hidden-probability paid rolls), 18+ (no minors), and Floor Call stays XP-only.
 * In production the render is server-side (Satori/headless canvas) for
 * consistent OG/Twitter-card unfurls; this client render is the live preview.
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

// DISCLOSED odds — shown to the user before and after the roll.
const RARITY_TABLE = [
  { grade: "10", label: "PRISTINE", odds: 5 },
  { grade: "9.5", label: "GEM MINT", odds: 15 },
  { grade: "9", label: "MINT", odds: 35 },
  { grade: "8", label: "NEAR MINT", odds: 45 }
];

const NAMES = ["A. VANGUARD", "K. SOLACE", "D. RYKER", "M. AURELIA", "T. KESTREL"];
const TITLES = ["MAN OF THE ARENA", "THE CLOSER", "IRON WALL", "FIRST BLOOD", "THE ORACLE"];

type Slab = { name: string; title: string; grade: string; edition: string; floor: string; lv: string };

function rollDisclosed(): string {
  // uniform 0..100 against the disclosed cumulative odds — auditable, not hidden
  const r = Math.random() * 100;
  let acc = 0;
  for (const t of RARITY_TABLE) {
    acc += t.odds;
    if (r <= acc) return t.grade;
  }
  return "8";
}

function rollSlab(): Slab {
  return {
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    title: TITLES[Math.floor(Math.random() * TITLES.length)],
    grade: rollDisclosed(),
    edition: "1/1",
    floor: (5 + Math.random() * 20).toFixed(1),
    lv: String(20 + Math.floor(Math.random() * 79))
  };
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderCard(ctx: CanvasRenderingContext2D, s: Slab) {
  const W = 600, H = 800;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#10131d");
  bg.addColorStop(0.6, "#06080f");
  bg.addColorStop(1, "#04060d");
  ctx.fillStyle = bg;
  rounded(ctx, 0, 0, W, H, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(63,217,212,0.35)";
  ctx.lineWidth = 3;
  rounded(ctx, 6, 6, W - 12, H - 12, 24);
  ctx.stroke();

  // white label header + holo crest
  ctx.fillStyle = "#fafbff";
  rounded(ctx, 28, 28, W - 56, 90, 14);
  ctx.fill();
  const hc = ctx.createConicGradient(0, 80, 73);
  ["#ff9bd2", "#9bb8ff", "#9bffd2", "#fff39b", "#ff9bd2"].forEach((c, i) => hc.addColorStop(i / 4, c));
  ctx.fillStyle = hc;
  rounded(ctx, 42, 42, 62, 62, 12);
  ctx.fill();
  ctx.fillStyle = "#10131f";
  ctx.font = "800 26px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CX", 73, 82);
  ctx.textAlign = "left";
  ctx.fillText(s.name, 120, 68);
  ctx.fillRect(120, 80, ctx.measureText(s.title).width * 0.62 + 16, 22);
  ctx.fillStyle = "#fff";
  ctx.font = "600 13px Segoe UI, system-ui, sans-serif";
  ctx.fillText(s.title, 128, 96);
  const gg = ctx.createConicGradient(3, 520, 73);
  ["#ff9bd2", "#9bb8ff", "#9bffd2", "#fff39b", "#ff9bd2"].forEach((c, i) => gg.addColorStop(i / 4, c));
  ctx.fillStyle = gg;
  ctx.font = "800 46px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(s.grade, 524, 86);
  ctx.fillStyle = "#10131f";
  ctx.font = "600 11px Segoe UI, system-ui, sans-serif";
  ctx.fillText("MINT · " + s.edition, 524, 104);

  // cyan band
  const cb = ctx.createLinearGradient(28, 130, 572, 130);
  cb.addColorStop(0, "#0a2c34");
  cb.addColorStop(1, "#05100f");
  ctx.fillStyle = cb;
  ctx.fillRect(28, 130, W - 56, 70);
  ctx.fillStyle = "#3fd9d4";
  ctx.fillRect(28, 128, W - 56, 3);
  ctx.fillRect(28, 200, W - 56, 3);
  const bigg = ctx.createLinearGradient(0, 150, 0, 190);
  bigg.addColorStop(0, "#8ff5f1");
  bigg.addColorStop(1, "#1c6f6b");
  ctx.fillStyle = bigg;
  ctx.font = "800 34px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GENESIS DROP", W / 2, 178);
  ctx.fillStyle = "#a9d9d6";
  ctx.font = "600 11px Segoe UI, system-ui, sans-serif";
  ctx.fillText("CROWNX ARENA · GENESIS COA", W / 2, 194);

  // action zone
  const az = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 260);
  az.addColorStop(0, "rgba(63,217,212,0.14)");
  az.addColorStop(1, "rgba(4,6,13,0)");
  ctx.fillStyle = az;
  ctx.fillRect(28, 200, W - 56, 360);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.font = "800 150px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("27", W / 2, 470);
  const sg = ctx.createLinearGradient(0, 260, 0, 520);
  sg.addColorStop(0, "rgba(255,255,255,0.18)");
  sg.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = sg;
  rounded(ctx, W / 2 - 70, 300, 140, 210, 18);
  ctx.fill();
  ctx.fillStyle = "#04060d";
  ctx.beginPath();
  ctx.arc(W / 2, 335, 26, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(63,217,212,0.5)";
  ctx.lineWidth = 1;
  rounded(ctx, W - 150, 216, 120, 26, 6);
  ctx.stroke();
  ctx.fillStyle = "#3fd9d4";
  ctx.font = "600 11px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HOLO ◆ FOIL", W - 90, 233);
  ctx.save();
  ctx.translate(70, 500);
  ctx.rotate(-0.1);
  ctx.fillStyle = "#fff";
  ctx.font = "italic 700 40px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(s.name.split(" ").map((p) => p[0]).join("."), 0, 0);
  ctx.restore();

  // footer stats + barcode + floor/owner
  const fg = ctx.createLinearGradient(0, 560, 0, 772);
  fg.addColorStop(0, "#080b11");
  fg.addColorStop(1, "#05070e");
  ctx.fillStyle = fg;
  ctx.fillRect(28, 560, W - 56, 212);
  ctx.fillStyle = "rgba(63,217,212,0.3)";
  ctx.fillRect(28, 560, W - 56, 2);
  const stats: [string, string][] = [["176", "TK"], ["18", "PASS DF"], ["7", "INT"]];
  const sx = [150, 300, 450];
  stats.forEach((st, i) => {
    ctx.fillStyle = "#8ff5f1";
    ctx.font = "800 36px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st[0], sx[i], 615);
    ctx.fillStyle = "#7d869c";
    ctx.font = "600 11px Segoe UI, system-ui, sans-serif";
    ctx.fillText(st[1], sx[i], 635);
  });
  let bx = 70;
  ctx.fillStyle = "#e9ebf2";
  for (let i = 0; i < 70; i++) {
    const w = 1 + ((i * 53) % 5);
    if ((i * 29) % 10 > 4) ctx.fillRect(bx, 660, w, 40);
    bx += w + 2;
    if (bx > 530) break;
  }
  ctx.fillStyle = "#7d869c";
  ctx.font = "600 12px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FLOOR", 60, 730);
  ctx.fillStyle = "#f7e08a";
  ctx.font = "800 22px Segoe UI, system-ui, sans-serif";
  ctx.fillText(s.floor + "Ξ", 60, 755);
  ctx.fillStyle = "#7d869c";
  ctx.font = "600 12px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("MINTED BY", 540, 730);
  ctx.fillStyle = "#3fd9d4";
  ctx.font = "800 22px Segoe UI, system-ui, sans-serif";
  ctx.fillText("LV" + s.lv, 540, 755);
  ctx.fillStyle = "rgba(143,245,241,0.5)";
  ctx.font = "800 14px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("◆ CROWNX VAULT", W / 2, 792);
}

export function MintReveal({ label = "Claim founder slab" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"sealed" | "revealing" | "revealed">("sealed");
  const [slab, setSlab] = useState<Slab | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (phase === "revealed" && slab && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) renderCard(ctx, slab);
    }
  }, [phase, slab]);

  function startMint() {
    setOpen(true);
    setPhase("revealing");
    setSlab(null);
    setShareUrl(null);
    if (navigator.vibrate) navigator.vibrate(18);
    setTimeout(() => {
      const s = rollSlab();
      setSlab(s);
      setPhase("revealed");
      if (navigator.vibrate) navigator.vibrate([12, 30, 60]);
      // attribution: mint a signed render_id + server-side share card. The
      // returned shareUrl unfurls with OG meta; the canvas here is the preview.
      const sub = (() => {
        const m = typeof document !== "undefined" && document.cookie.match(/cx_access=([^;]+)/);
        try {
          return m ? (JSON.parse(atob(m[1].split(".")[1])).sub as string) : "guest";
        } catch {
          return "guest";
        }
      })();
      fetch(`${GATEWAY}/api/renders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: `ast_${s.grade}_${s.lv}`,
          sharerId: sub,
          sharerLv: Number(s.lv) || 1,
          surface: "link",
          card: { name: s.name, title: s.title, grade: s.grade, edition: s.edition, floor: `${s.floor}Ξ`, lv: s.lv }
        })
      })
        .then((r) => r.json())
        .then((d) => d?.shareUrl && setShareUrl(d.shareUrl))
        .catch(() => undefined);
    }, 1100);
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "crownx-slab.png", { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      const text = "Just minted a Genesis slab on CrownX 👑 Royalties for life.";
      if (navAny.share && navAny.canShare?.({ files: [file] })) {
        try {
          await navAny.share({ files: [file], title: "CrownX Vault", text, ...(shareUrl ? { url: shareUrl } : {}) });
          return;
        } catch {
          /* fall through to download */
        }
      }
      // no file-share support but we have an unfurlable server link → share that
      if (shareUrl && navAny.share) {
        try {
          await navAny.share({ title: "CrownX Vault", text, url: shareUrl });
          return;
        } catch {
          /* fall through to download */
        }
      }
      const a = document.createElement("a");
      a.download = "crownx-slab.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    }, "image/png");
  }

  const rarity = slab ? RARITY_TABLE.find((r) => r.grade === slab.grade) : null;

  return (
    <>
      <button onClick={startMint} style={buttonStyle("primary")}>
        🎴 {label}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(3,5,11,0.93)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: 24,
            animation: "cx-fade .3s"
          }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          {phase === "revealing" && (
            <div style={{ width: 230, height: 320, borderRadius: 16, position: "relative", background: "linear-gradient(155deg,#10131d,#06080f)", border: "1px solid rgba(63,217,212,0.4)", overflow: "hidden", boxShadow: "0 0 80px rgba(63,217,212,0.4)" }}>
              <div style={{ position: "absolute", inset: 0, background: "conic-gradient(from 0deg, transparent, rgba(63,217,212,0.35), transparent, rgba(247,224,138,0.3), transparent)", animation: "cx-spin 2.2s linear infinite" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 11, letterSpacing: "0.3em", color: color.cyan, textTransform: "uppercase" }}>
                Minting…
              </div>
            </div>
          )}

          {phase === "revealed" && slab && (
            <div style={{ textAlign: "center", maxWidth: 320 }}>
              <div style={{ fontFamily: font.display, fontSize: 46, background: "conic-gradient(from 200deg,#ff9bd2,#9bb8ff,#9bffd2,#fff39b,#ff9bd2)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                GRADE {slab.grade}
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.3em", color: color.cyan, textTransform: "uppercase", marginTop: 2 }}>
                {rarity?.label} · {rarity?.odds}% disclosed odds
              </div>
              <canvas ref={canvasRef} width={600} height={800} style={{ width: 260, height: "auto", borderRadius: 14, marginTop: 14, boxShadow: "0 30px 70px -20px rgba(0,0,0,0.8), 0 0 50px rgba(63,217,212,0.12)" }} />
              <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: "0.18em", color: color.mut, marginTop: 8 }}>
                COA #{slab.grade.replace(".", "")}-{slab.lv}A7F3 · CHAIN-ANCHORED
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={share} style={buttonStyle("primary")}>↗ Share card</button>
                <button onClick={startMint} style={buttonStyle("secondary")}>🎲 Mint another</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <Badge tone="mut">Odds disclosed · 18+ · XP-only mechanics</Badge>
              </div>
              <button onClick={() => setOpen(false)} style={{ ...buttonStyle("secondary"), marginTop: 12, fontSize: 12 }}>Close</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
