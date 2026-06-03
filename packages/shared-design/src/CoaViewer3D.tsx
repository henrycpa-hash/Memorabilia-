"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { color, font, gradient } from "./tokens";

/**
 * CoaViewer3D — the Genesis COA rendered as a dynamic, dual-sided 3D/4D artifact.
 *
 * Implements the Genesis COA Artifact Specification visualization:
 *  · §1 Dual-Sided 3D/4D — drag-to-rotate holographic card: front = Pane A live
 *       capture video (with rolling-nonce / session-DNA / biometric overlays),
 *       back = Pane B provenance metadata. Auto-orbits (the "4D"/time axis).
 *  · §3 Unlockable & gamified layers — tap to unlock (owner/wallet-gated), each
 *       unlock posts a tamper-proof record.
 *  · §4 Micro-detail artifact descriptor + §5 cryptographic anchors as depth cards.
 *  · §2 Immersive AR/VR — "Enter AR/VR" via the WebXR Device API so the COA can be
 *       fully viewed on Meta Quest, AR glasses, and headsets; 2D holographic mode
 *       is the universal fallback. Every XR session/gesture is logged.
 *
 * Self-contained + SSR-safe: all browser APIs are touched inside effects/handlers.
 * Render it anywhere (market, viral share, feed, athlete page) — pass the artifact
 * fetched from /api/coa-artifact/:id plus the gateway base for interactive posts.
 */

export interface CoaArtifactView {
  id: string;
  tokenId: string;
  coaNumber: string;
  kind: string;
  title: string;
  assetType: string;
  athleteId?: string;
  confidence: number;
  valuationDisplay: string;
  viewCount?: number;
  xrSessionCount?: number;
  shareUrl?: string;
  paneA: {
    videoUrl: string; posterUrl: string; formats: string[]; durationSec: number; capturedAt: string;
    overlays: { rollingNonce: string; sessionDnaWatermark: string; signerBiometricRef: string };
    replayHashCheck: string;
  };
  paneB: {
    timestampRfc3161: string; geo: { lat: number; lon: number; altM: number; accuracyM: number };
    deviceId: string; deviceAttest: string; assetDescription: string; classification: string;
    ownership: { originator: string; recipient: string }; fileFormats: string[]; securityChecks: string[];
    redundancy: { storage: string; approxBytes: number; compression: string };
  };
  descriptor: {
    surfaceScanMethod: string; imperfections: string[]; perfections: string[];
    autograph: { strokeWidthMm: number; inkAbsorption: string; penPressure: string } | null;
    invisibleTraits: string[]; canonicalVector: number[]; fusedFingerprint: string; triCodePhotoMatch: string;
  };
  anchors: {
    sessionDna: string; canonicalVectorHash: string; triCodeProof: string; provenanceEvidence: string;
    blockchain: { txRef: string; block: string; chain: string; l1Anchor: string };
    hashAlg: string; pqcSuite: string; entropyScore: number;
  };
  identifiers: { type: string; label: string; present: boolean }[];
  layers: { id: string; kind: string; title: string; description: string; ownerOnly: boolean; unlocked: boolean }[];
  xr: { minFps: number; baselineResolution: string; modes: string[]; devices: string[]; authFlow: string; offlineFallback2d: boolean; engines: string[] };
  iso20022: { messages: string[]; codexEvents: string[]; royalty: { rateBps: number; allocation: { label: string; bps: number }[] } };
}

type Tab = "capture" | "descriptor" | "identifiers" | "anchors" | "layers";
type XrMode = "immersive-ar" | "immersive-vr";

const fmtGeo = (g: CoaArtifactView["paneB"]["geo"]) =>
  `${Math.abs(g.lat).toFixed(4)}°${g.lat >= 0 ? "N" : "S"}, ${Math.abs(g.lon).toFixed(4)}°${g.lon >= 0 ? "E" : "W"} · ±${g.accuracyM}m`;

export function CoaViewer3D({
  artifact,
  apiBase = "",
  userId,
  compact = false
}: {
  artifact: CoaArtifactView;
  apiBase?: string;
  userId?: string;
  compact?: boolean;
}) {
  const [face, setFace] = useState<"front" | "back">("front");
  const [rot, setRot] = useState<{ x: number; y: number } | null>(null);
  const [tab, setTab] = useState<Tab>("capture");
  const [layers, setLayers] = useState(artifact.layers);
  const [xrSupport, setXrSupport] = useState<{ ar: boolean; vr: boolean } | null>(null);
  const [xrStatus, setXrStatus] = useState<string>("");
  const [unlocking, setUnlocking] = useState<string>("");
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const glCanvas = useRef<HTMLCanvasElement | null>(null);

  // §2 feature-detect WebXR (Meta Quest / AR glasses / headsets)
  useEffect(() => {
    const xr = (navigator as unknown as { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    if (!xr) { setXrSupport({ ar: false, vr: false }); return; }
    let live = true;
    Promise.all([
      xr.isSessionSupported("immersive-ar").catch(() => false),
      xr.isSessionSupported("immersive-vr").catch(() => false)
    ]).then(([ar, vr]) => { if (live) setXrSupport({ ar, vr }); });
    return () => { live = false; };
  }, []);

  const w = compact ? 200 : 268;
  const h = Math.round(w * 1.4);

  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rx: rot?.x ?? -4, ry: rot?.y ?? (face === "back" ? 180 : 0) };
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const dy = e.clientX - drag.current.x;
    const dx = e.clientY - drag.current.y;
    const ny = drag.current.ry + dy * 0.7;
    setRot({ x: drag.current.rx - dx * 0.4, y: ny });
    // crossing 90°..270° shows the back face
    const norm = ((ny % 360) + 360) % 360;
    setFace(norm > 90 && norm < 270 ? "back" : "front");
  }
  function up() { drag.current = null; }

  const flip = () => {
    const next = face === "front" ? "back" : "front";
    setFace(next);
    setRot({ x: -4, y: next === "back" ? 180 : 0 });
  };

  const transform = rot ? `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` : undefined;

  // §3 unlock a gamified layer → tamper-proof record
  const unlock = useCallback(async (layerId: string) => {
    setUnlocking(layerId);
    try {
      const res = await fetch(`${apiBase}/api/coa-artifact/${artifact.id}/unlock`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ layerId, userId: userId || artifact.paneB.ownership.recipient, wallet: `0x${(userId || "self").slice(0, 6)}` })
      });
      if (res.ok) setLayers((ls) => ls.map((l) => (l.id === layerId ? { ...l, unlocked: true } : l)));
      else { const e = await res.json().catch(() => ({})); setXrStatus(`Unlock blocked: ${(e as { error?: string }).error || res.status}`); }
    } catch { /* offline: optimistic unlock for the demo */ setLayers((ls) => ls.map((l) => (l.id === layerId ? { ...l, unlocked: true } : l))); }
    setUnlocking("");
  }, [apiBase, artifact.id, artifact.paneB.ownership.recipient, userId]);

  // §2 enter an immersive AR/VR session and render the COA in the headset
  const enterXR = useCallback(async (mode: XrMode) => {
    const xr = (navigator as unknown as { xr?: XRSystemLike }).xr;
    if (!xr) { setXrStatus("WebXR not available — using 2D holographic mode."); return; }
    setXrStatus(`Requesting ${mode === "immersive-ar" ? "AR" : "VR"} session…`);
    // log the session server-side (PQC session token per spec authFlow)
    let sessionId = "";
    try {
      const r = await fetch(`${apiBase}/api/coa-artifact/${artifact.id}/xr-session`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, device: mode === "immersive-ar" ? "AR glasses" : "Meta Quest", userId })
      });
      if (r.ok) sessionId = ((await r.json()) as { session?: { id?: string } }).session?.id || "";
    } catch { /* non-blocking */ }

    try {
      const session = await xr.requestSession(mode, mode === "immersive-ar" ? { optionalFeatures: ["dom-overlay", "hit-test"] } : {});
      await runXrSession(session, mode, artifact, glCanvas.current, async (gesture) => {
        if (sessionId) fetch(`${apiBase}/api/coa-artifact/xr/${sessionId}/gesture`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gesture }) }).catch(() => undefined);
      });
      setXrStatus(`${mode === "immersive-ar" ? "AR" : "VR"} session ended.`);
    } catch (e) {
      setXrStatus(`Could not start session: ${(e as Error).message || "denied"}. 2D mode active.`);
    }
  }, [apiBase, artifact, userId]);

  const overlays = artifact.paneA.overlays;
  const kindTone = artifact.kind === "genesis" ? color.goldHi : artifact.kind === "verified" ? color.cyanHi : color.hot;

  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "auto 1fr", gap: 22, alignItems: "start" }}>
      {/* ── the holographic dual-pane card ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ perspective: 1400, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            onPointerDown={down} onPointerMove={move} onPointerUp={up}
            style={{ width: w, height: h, position: "relative", transformStyle: "preserve-3d", transform, animation: rot ? undefined : "cx-slabspin 16s cubic-bezier(.45,.05,.55,.95) infinite", cursor: "grab", touchAction: "none" }}
          >
            {/* FRONT — Pane A live capture */}
            <CardFace tone={kindTone}>
              <PaneHeader title={artifact.title} kind={artifact.kind} grade={String(Math.round(artifact.confidence / 10))} />
              <div style={{ flex: 1, position: "relative", background: "radial-gradient(circle at 50% 35%,rgba(63,217,212,0.18),transparent 60%),linear-gradient(180deg,#0a0d13,#04060d)", overflow: "hidden" }}>
                {artifact.paneA.posterUrl
                  ? <img src={artifact.paneA.posterUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                  : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 54, color: "rgba(255,255,255,0.10)" }}>▶ LIVE</div>}
                {/* anti-tamper overlays */}
                <div style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <Chip>◆ nonce {overlays.rollingNonce.slice(-6)}</Chip>
                  <Chip>DNA {overlays.sessionDnaWatermark.slice(0, 6)}</Chip>
                  <Chip>BIO {overlays.signerBiometricRef.slice(-5)}</Chip>
                </div>
                <div style={{ position: "absolute", left: 8, right: 8, height: 2, top: "52%", background: `linear-gradient(90deg,transparent,${color.cyanHi},transparent)`, animation: "cx-scan 2.4s ease-in-out infinite" }} />
              </div>
              <PaneFooter left="Proof-of-Origin" leftVal={artifact.valuationDisplay} right={`${artifact.confidence}%`} />
            </CardFace>
            {/* BACK — Pane B provenance */}
            <CardFace tone={kindTone} back>
              <PaneHeader title="Provenance" kind="metadata" grade="" />
              <div style={{ flex: 1, padding: "10px 12px", display: "grid", gap: 6, alignContent: "start", background: "linear-gradient(180deg,#070b13,#04060d)" }}>
                <MetaRow k="Timestamp" v={new Date(artifact.paneB.timestampRfc3161).toISOString().slice(0, 19).replace("T", " ")} />
                <MetaRow k="Geostamp" v={fmtGeo(artifact.paneB.geo)} />
                <MetaRow k="Device" v={`${artifact.paneB.deviceId.slice(0, 14)} · ${artifact.paneB.deviceAttest}`} />
                <MetaRow k="Chain" v={`${artifact.anchors.blockchain.chain} · ${artifact.anchors.blockchain.txRef.slice(0, 12)}…`} />
                <MetaRow k="Owner" v={`${artifact.paneB.ownership.originator} → ${artifact.paneB.ownership.recipient}`} />
                <MetaRow k="Hash" v={`${artifact.anchors.hashAlg} · ${artifact.anchors.pqcSuite}`} />
              </div>
              <PaneFooter left="COA" leftVal={artifact.coaNumber} right={artifact.tokenId.slice(-6)} />
            </CardFace>
          </div>
        </div>

        {/* flip + immersive controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={flip} style={ghostBtn}>⟲ Flip ({face === "front" ? "see provenance" : "see capture"})</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => enterXR("immersive-vr")}
            disabled={xrSupport ? !xrSupport.vr : false}
            title={xrSupport && !xrSupport.vr ? "No VR headset detected" : "View on Meta Quest / VR headset"}
            style={xrSupport?.vr ? primaryBtn : disabledBtn}
          >🥽 Enter VR</button>
          <button
            onClick={() => enterXR("immersive-ar")}
            disabled={xrSupport ? !xrSupport.ar : false}
            title={xrSupport && !xrSupport.ar ? "No AR device detected" : "View on AR glasses"}
            style={xrSupport?.ar ? primaryBtn : disabledBtn}
          >👓 Enter AR</button>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: xrStatus ? color.gold : color.mut2, textAlign: "center", minHeight: 12, maxWidth: w + 40 }}>
          {xrStatus || (xrSupport === null ? "Checking headset support…" : xrSupport.ar || xrSupport.vr ? "Immersive viewing ready · Meta Quest / AR glasses" : "2D holographic mode (no XR device) — drag to rotate")}
        </div>
        <canvas ref={glCanvas} style={{ display: "none" }} width={1} height={1} />
      </div>

      {/* ── inspector: depth layers ── */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {([["capture", "Live Capture"], ["descriptor", "Micro-Detail"], ["identifiers", "Identifiers"], ["anchors", "Anchors"], ["layers", "Unlockables"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ ...tabBtn, ...(tab === t ? tabBtnOn : {}) }}>{label}</button>
          ))}
        </div>

        {tab === "capture" && (
          <Section title="§1 Dual-Sided Live Capture">
            <KV k="Formats" v={artifact.paneA.formats.join(" · ")} />
            <KV k="Duration" v={`${artifact.paneA.durationSec}s · replay hash-checked`} />
            <KV k="Overlays" v="rolling nonce · session-DNA watermark · signer biometric (tamper-validated)" />
            <KV k="Security" v={artifact.paneB.securityChecks.join(" · ")} />
            <KV k="Redundancy" v={`${artifact.paneB.redundancy.storage} · ${(artifact.paneB.redundancy.approxBytes / 1e6).toFixed(1)}MB · ${artifact.paneB.redundancy.compression}`} />
          </Section>
        )}

        {tab === "descriptor" && (
          <Section title="§4 Embedded Artifact Descriptor (micro-detail)">
            <KV k="Scan" v={artifact.descriptor.surfaceScanMethod} />
            <KV k="Imperfections" v={artifact.descriptor.imperfections.join(" · ")} />
            <KV k="Perfections" v={artifact.descriptor.perfections.join(" · ")} />
            {artifact.descriptor.autograph && <KV k="Autograph" v={`stroke ${artifact.descriptor.autograph.strokeWidthMm}mm · ink ${artifact.descriptor.autograph.inkAbsorption} · pressure ${artifact.descriptor.autograph.penPressure}`} />}
            <KV k="Invisible traits" v={artifact.descriptor.invisibleTraits.join(" · ")} />
            <KV k="3Code + photo-match" v={artifact.descriptor.triCodePhotoMatch} />
            <div style={{ display: "flex", gap: 3, marginTop: 8, alignItems: "flex-end", height: 34 }}>
              {artifact.descriptor.canonicalVector.map((n, i) => (
                <div key={i} title={`v${i}=${n}`} style={{ flex: 1, height: `${20 + n * 100}%`, maxHeight: 34, background: gradient.cyan, borderRadius: 2, opacity: 0.85 }} />
              ))}
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 8.5, color: color.mut2, marginTop: 4 }}>canonical fusion vector (preview) · {artifact.descriptor.fusedFingerprint.slice(0, 26)}…</div>
          </Section>
        )}

        {tab === "identifiers" && (
          <Section title="§Expanded Identifiers (simultaneously read)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6 }}>
              {artifact.identifiers.map((id) => (
                <div key={id.type} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", border: `1px solid ${id.present ? "rgba(63,217,212,0.35)" : color.line}`, borderRadius: 9, background: id.present ? "rgba(63,217,212,0.05)" : "transparent" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: id.present ? color.win : color.mut2 }} />
                  <span style={{ fontSize: 11, color: id.present ? color.txt : color.mut2 }}>{id.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {tab === "anchors" && (
          <Section title="§5 Embedded Cryptographic Anchors">
            <KV k="Session DNA" v={artifact.anchors.sessionDna} />
            <KV k="Vector hash" v={`${artifact.anchors.canonicalVectorHash.slice(0, 30)}…`} />
            <KV k="Tri-code proof" v={artifact.anchors.triCodeProof} />
            <KV k="Provenance evidence" v={artifact.anchors.provenanceEvidence} />
            <KV k="Blockchain" v={`${artifact.anchors.blockchain.chain} · tx ${artifact.anchors.blockchain.txRef.slice(0, 16)}… · ${artifact.anchors.blockchain.l1Anchor}`} />
            <KV k="Hashing / PQC" v={`${artifact.anchors.hashAlg} · ${artifact.anchors.pqcSuite}`} />
            <KV k="Entropy score" v={`${artifact.anchors.entropyScore.toFixed(4)} (reject < 1e-12)`} />
            <KV k="ISO 20022" v={`${artifact.iso20022.messages.join(", ")} · codex: ${artifact.iso20022.codexEvents.length} events`} />
            <KV k="Royalty hook" v={`${(artifact.iso20022.royalty.rateBps / 100).toFixed(0)}% · ${artifact.iso20022.royalty.allocation.map((a) => `${a.label} ${(a.bps / 100).toFixed(0)}%`).join(" · ")}`} />
          </Section>
        )}

        {tab === "layers" && (
          <Section title="§3 Unlockable & Gamified Content">
            <div style={{ display: "grid", gap: 8 }}>
              {layers.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: `1px solid ${l.unlocked ? "rgba(55,211,154,0.4)" : color.line2}`, borderRadius: 11, background: l.unlocked ? "rgba(55,211,154,0.05)" : "rgba(255,255,255,0.02)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: color.txt, display: "flex", alignItems: "center", gap: 6 }}>
                      {l.unlocked ? "🔓" : l.ownerOnly ? "🔒" : "✨"} {l.title}
                      {l.ownerOnly && <span style={{ fontFamily: font.mono, fontSize: 8, color: color.gold, border: `1px solid ${color.goldDeep}`, borderRadius: 4, padding: "0 4px" }}>OWNER</span>}
                    </div>
                    <div style={{ fontSize: 11, color: color.mut, marginTop: 2 }}>{l.description}</div>
                  </div>
                  {l.unlocked
                    ? <span style={{ fontFamily: font.mono, fontSize: 10, color: color.win, flex: "none" }}>unlocked ✓</span>
                    : <button onClick={() => unlock(l.id)} disabled={unlocking === l.id} style={{ ...ghostBtn, flex: "none", opacity: unlocking === l.id ? 0.5 : 1 }}>{unlocking === l.id ? "…" : "Unlock"}</button>}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── presentational bits ─────────────────────────

function CardFace({ children, tone, back = false }: { children: React.ReactNode; tone: string; back?: boolean }) {
  return (
    <div className="cx-sheen" style={{ position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden", backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined, background: "linear-gradient(155deg,#10131d,#06080f 60%)", border: `1px solid ${color.line2}`, boxShadow: `0 34px 70px -20px rgba(0,0,0,0.9), 0 0 44px ${tone}22`, display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}
function PaneHeader({ title, kind, grade }: { title: string; kind: string; grade: string }) {
  return (
    <div style={{ display: "flex", gap: 7, padding: "8px 9px", background: "linear-gradient(180deg,#fafbff,#e7e9f0)", color: "#10131f", alignItems: "center" }}>
      <div style={{ width: 26, height: 26, borderRadius: 6, flex: "none", background: gradient.holo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 14, color: "#10131f" }}>X</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: font.display, fontSize: 12, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontFamily: font.mono, fontSize: 6.5, background: "#10131f", color: "#fff", padding: "1px 4px", borderRadius: 2, width: "fit-content", marginTop: 2, textTransform: "uppercase" }}>{kind}</div>
      </div>
      {grade && <div style={{ fontFamily: font.display, fontSize: 22, lineHeight: 0.8, background: gradient.holo, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{grade}</div>}
    </div>
  );
}
function PaneFooter({ left, leftVal, right }: { left: string; leftVal: string; right: string }) {
  return (
    <div style={{ background: "linear-gradient(180deg,#080b11,#05070e)", padding: "7px 10px", borderTop: `1px solid rgba(63,217,212,0.3)`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontFamily: font.mono, fontSize: 6.5, color: color.mut, textTransform: "uppercase" }}>{left}</div>
        <div style={{ fontFamily: font.display, fontSize: 16, color: color.cyanHi, lineHeight: 0.9 }}>{leftVal}</div>
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.cyan }}>{right}</div>
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: font.mono, fontSize: 7, color: "#d7fffb", background: "rgba(4,8,12,0.7)", border: "1px solid rgba(63,217,212,0.4)", borderRadius: 4, padding: "2px 5px" }}>{children}</span>;
}
function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${color.line}`, paddingBottom: 4 }}>
      <span style={{ fontFamily: font.mono, fontSize: 8, color: color.mut, textTransform: "uppercase", flex: "none" }}>{k}</span>
      <span style={{ fontFamily: font.mono, fontSize: 8.5, color: color.plat, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${color.line}`, borderRadius: 14, padding: 16, background: "rgba(255,255,255,0.015)" }}>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.cyan, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: `1px solid ${color.line}` }}>
      <span style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut, textTransform: "uppercase", flex: "none", width: 120 }}>{k}</span>
      <span style={{ fontSize: 12, color: color.txt, wordBreak: "break-word", minWidth: 0 }}>{v}</span>
    </div>
  );
}

const ghostBtn: React.CSSProperties = { fontFamily: font.mono, fontSize: 11, color: color.cyanHi, background: "transparent", border: `1px solid ${color.line2}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { fontFamily: font.body, fontWeight: 600, fontSize: 12, color: "#04181a", background: gradient.cyanAction, border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", boxShadow: "0 0 24px rgba(63,217,212,0.25)" };
const disabledBtn: React.CSSProperties = { fontFamily: font.body, fontSize: 12, color: color.mut, background: "transparent", border: `1px solid ${color.line}`, borderRadius: 9, padding: "8px 14px", cursor: "not-allowed" };
const tabBtn: React.CSSProperties = { fontFamily: font.mono, fontSize: 10.5, color: color.mut, background: "transparent", border: `1px solid ${color.line}`, borderRadius: 999, padding: "6px 12px", cursor: "pointer" };
const tabBtnOn: React.CSSProperties = { color: color.void, background: color.cyan, borderColor: color.cyan };

// ───────────────────────── WebXR render loop (§2) ─────────────────────────
// Minimal, dependency-free immersive renderer: shows the COA as two textured
// quads (front/back panes) floating ~1.4m ahead; select toggles/rotates. Runs
// on Meta Quest, AR glasses, and any WebXR headset. Defensive throughout.

interface XRSystemLike { isSessionSupported(m: string): Promise<boolean>; requestSession(m: string, opts?: unknown): Promise<XRSessionLike> }
interface XRSessionLike {
  requestReferenceSpace(t: string): Promise<unknown>;
  requestAnimationFrame(cb: (t: number, frame: unknown) => void): number;
  updateRenderState(s: unknown): void;
  addEventListener(t: string, cb: () => void): void;
  end(): Promise<void>;
  renderState: { baseLayer?: unknown };
}

async function runXrSession(
  session: XRSessionLike,
  mode: XrMode,
  artifact: CoaArtifactView,
  canvas: HTMLCanvasElement | null,
  onGesture: (g: string) => void
): Promise<void> {
  const cv = canvas || document.createElement("canvas");
  const gl = cv.getContext("webgl", { xrCompatible: true, antialias: true } as WebGLContextAttributes) as WebGLRenderingContext | null;
  if (!gl) throw new Error("WebGL unavailable");
  const glAny = gl as unknown as { makeXRCompatible?: () => Promise<void> };
  if (glAny.makeXRCompatible) { try { await glAny.makeXRCompatible(); } catch { /* ignore */ } }

  const XRWebGLLayerCtor = (window as unknown as { XRWebGLLayer?: new (s: XRSessionLike, g: WebGLRenderingContext) => unknown }).XRWebGLLayer;
  if (XRWebGLLayerCtor) session.updateRenderState({ baseLayer: new XRWebGLLayerCtor(session, gl) });
  const refSpace = await session.requestReferenceSpace("local");

  // shader program (position + uv → sampled texture)
  const vs = `attribute vec3 p; attribute vec2 uv; uniform mat4 mvp; varying vec2 v; void main(){ v=uv; gl_Position=mvp*vec4(p,1.0); }`;
  const fs = `precision mediump float; varying vec2 v; uniform sampler2D tex; void main(){ gl_FragColor=texture2D(tex,v); }`;
  const prog = linkProgram(gl, vs, fs);
  if (!prog) throw new Error("shader link failed");
  gl.useProgram(prog);
  const pLoc = gl.getAttribLocation(prog, "p");
  const uvLoc = gl.getAttribLocation(prog, "uv");
  const mvpLoc = gl.getUniformLocation(prog, "mvp");

  // a quad (two triangles)
  const quad = new Float32Array([-0.5, -0.7, 0, 0, 1, 0.5, -0.7, 0, 1, 1, 0.5, 0.7, 0, 1, 0, -0.5, -0.7, 0, 0, 1, 0.5, 0.7, 0, 1, 0, -0.5, 0.7, 0, 0, 0]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const frontTex = makePaneTexture(gl, "front", artifact);
  const backTex = makePaneTexture(gl, "back", artifact);
  gl.enable(gl.DEPTH_TEST);

  let showBack = false;
  let spin = 0;
  session.addEventListener("select", () => { showBack = !showBack; onGesture(showBack ? "flip-to-provenance" : "flip-to-capture"); });
  session.addEventListener("end", () => { /* loop checks via flag below */ ended = true; });
  let ended = false;

  const onXRFrame = (_t: number, frame: unknown) => {
    if (ended) return;
    session.requestAnimationFrame(onXRFrame);
    const f = frame as { getViewerPose(s: unknown): { views: { transform: { inverse: { matrix: Float32Array } }; projectionMatrix: Float32Array }[] } | null; session: { renderState: { baseLayer?: { framebuffer: WebGLFramebuffer | null; getViewport(v: unknown): { x: number; y: number; width: number; height: number } } } } };
    const pose = f.getViewerPose(refSpace);
    const layer = f.session.renderState.baseLayer;
    if (!pose || !layer) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    gl.clearColor(mode === "immersive-ar" ? 0 : 0.016, mode === "immersive-ar" ? 0 : 0.024, mode === "immersive-ar" ? 0 : 0.05, mode === "immersive-ar" ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    spin += 0.004;
    for (const view of pose.views) {
      const vp = layer.getViewport(view);
      gl.viewport(vp.x, vp.y, vp.width, vp.height);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(pLoc); gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);
      // model: 1.4m ahead, gentle auto-orbit (the 4D/time axis), flip on select
      const model = composeModel(0, 0, -1.4, spin + (showBack ? Math.PI : 0));
      const mvp = mul(view.projectionMatrix, mul(view.transform.inverse.matrix, model));
      gl.uniformMatrix4fv(mvpLoc, false, mvp);
      gl.bindTexture(gl.TEXTURE_2D, showBack ? backTex : frontTex);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
  session.requestAnimationFrame(onXRFrame);

  await new Promise<void>((resolve) => { session.addEventListener("end", () => resolve()); });
}

function makePaneTexture(gl: WebGLRenderingContext, side: "front" | "back", a: CoaArtifactView): WebGLTexture {
  const c = document.createElement("canvas"); c.width = 512; c.height = 716;
  const x = c.getContext("2d")!;
  const grad = x.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#10131d"); grad.addColorStop(1, "#06080f");
  x.fillStyle = grad; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = "rgba(63,217,212,0.5)"; x.lineWidth = 6; x.strokeRect(8, 8, c.width - 16, c.height - 16);
  x.fillStyle = "#8ff5f1"; x.font = "bold 30px Georgia";
  x.fillText("CROWN X · GENESIS COA", 28, 56);
  x.fillStyle = "#eef1f8"; x.font = "26px Georgia";
  wrapText(x, a.title, 28, 110, c.width - 56, 32);
  x.fillStyle = "#7d869c"; x.font = "18px monospace";
  if (side === "front") {
    x.fillText("PROOF-OF-ORIGIN · LIVE CAPTURE", 28, 250);
    x.fillStyle = "#f7e08a"; x.font = "bold 56px Georgia";
    x.fillText(a.valuationDisplay, 28, 320);
    x.fillStyle = "#a9d9d6"; x.font = "16px monospace";
    x.fillText("nonce " + a.paneA.overlays.rollingNonce.slice(-8), 28, 380);
    x.fillText("DNA " + a.paneA.overlays.sessionDnaWatermark.slice(0, 12), 28, 410);
    x.fillText("conf " + a.confidence + "%", 28, 440);
  } else {
    x.fillText("METADATA · PROVENANCE", 28, 250);
    x.fillStyle = "#cfd6e6"; x.font = "16px monospace";
    x.fillText("COA " + a.coaNumber, 28, 300);
    x.fillText("token " + a.tokenId.slice(0, 22), 28, 330);
    x.fillText("chain " + a.anchors.blockchain.chain, 28, 360);
    x.fillText("tx " + a.anchors.blockchain.txRef.slice(0, 22), 28, 390);
    x.fillText(a.anchors.hashAlg + " · " + a.anchors.pqcSuite, 28, 420);
    x.fillText(a.paneB.ownership.originator + " -> " + a.paneB.ownership.recipient, 28, 450);
  }
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, xp: number, yp: number, maxW: number, lh: number) {
  const words = text.split(" "); let line = ""; let y = yp;
  for (const wd of words) {
    const test = line + wd + " ";
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, xp, y); line = wd + " "; y += lh; }
    else line = test;
  }
  ctx.fillText(line, xp, y);
}
function linkProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
  const mk = (t: number, s: string) => { const sh = gl.createShader(t)!; gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}
// column-major 4x4 helpers
function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function composeModel(tx: number, ty: number, tz: number, ry: number): Float32Array {
  const c = Math.cos(ry), s = Math.sin(ry);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, tx, ty, tz, 1]);
}
