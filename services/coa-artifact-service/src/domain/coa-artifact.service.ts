import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { anchor } from "@crownx-jewel/shared-chain";
import {
  buildGenesisCoa,
  unlockLayer,
  resealOnTransfer,
  coaLayers,
  verifyOverlays,
  isViewableInXr,
  type GenesisCoaArtifact,
  type BuildCoaInput
} from "@crownx-jewel/shared-coa";

/**
 * The Genesis COA Artifact store — the dynamic, dual-sided 3D/4D certificate
 * issued at mint. Connects the minting process (authentication-engine) to the
 * market + viral-share viewers + immersive AR/VR (WebXR / Meta Quest / AR
 * glasses). In-memory by repo convention; every issuance/unlock/XR-session is
 * chain-anchored for tamper-evident provenance.
 */

const artifacts = new Map<string, GenesisCoaArtifact>();
const byToken = new Map<string, string>(); // tokenId -> artifact id
interface XrSession { id: string; coaId: string; mode: string; device: string; userId: string; startedAt: string; gestures: number; anchorTx: string }
const xrSessions: XrSession[] = [];
interface UnlockLog { coaId: string; layerId: string; wallet: string; at: string; proof: string }
const unlockLog: UnlockLog[] = [];

function publicShape(a: GenesisCoaArtifact) {
  return {
    ...a,
    layers3d: coaLayers(a),
    overlayCheck: verifyOverlays(a.paneA),
    xrViewable: isViewableInXr(a.xr)
  };
}

/** Seed a handful of viewable Genesis COAs so the market + feed render immediately. */
function seed() {
  if (artifacts.size) return;
  const demo: { title: string; assetType: string; athleteId?: string; owner: string; valuationCents: number; valuationDisplay: string }[] = [
    { title: "Game-Worn Jersey · Dylan Crews · 1/1", assetType: "memorabilia", athleteId: "dylan-crews", owner: "henry", valuationCents: 4_200_000, valuationDisplay: "$42.0K" },
    { title: "Signed Championship Ball · A. Vanguard", assetType: "memorabilia", athleteId: "a-vanguard", owner: "raul", valuationCents: 3_800_000, valuationDisplay: "$38.0K" },
    { title: "Rookie Debut Bat · K. Solace", assetType: "memorabilia", athleteId: "k-solace", owner: "eric", valuationCents: 5_100_000, valuationDisplay: "$51.0K" },
    { title: "Walk-Off Home-Run Ball · M. Aurelia", assetType: "memorabilia", athleteId: "m-aurelia", owner: "henry", valuationCents: 2_900_000, valuationDisplay: "$29.0K" }
  ];
  for (let i = 0; i < demo.length; i++) {
    const d = demo[i];
    const id = `coa_seed_${i}`;
    const ts = nowIso();
    const fp = anchor("coa.seed.fp", { id, title: d.title }, ts);
    const prov = anchor("coa.seed.prov", { id, tokenId: `tok_${fp.hash.slice(0, 18)}` }, ts);
    const art = buildGenesisCoa({
      id,
      tokenId: `tok_${fp.hash.slice(0, 18)}`,
      coaNumber: `CXG-${fp.hash.slice(0, 8).toUpperCase()}`,
      title: d.title,
      assetType: d.assetType,
      athleteId: d.athleteId,
      ownerUserId: d.owner,
      fingerprintHash: `keccak512:${fp.hash}`,
      sessionDna: fp.hash.slice(0, 24),
      anchorTxRef: prov.txRef,
      anchorBlock: prov.block,
      anchorChain: prov.chain,
      confidence: 92 + i,
      valuationCents: d.valuationCents,
      valuationDisplay: d.valuationDisplay,
      createdAt: ts
    });
    artifacts.set(id, art);
    byToken.set(art.tokenId, id);
  }
}
seed();

export const coaArtifactStore = {
  /** Issue (or replace) a Genesis COA artifact — called by the minting engine. */
  issue(input: Omit<BuildCoaInput, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
    const id = input.id || `coa_${newId()}`;
    const createdAt = input.createdAt || nowIso();
    const art = buildGenesisCoa({ ...input, id, createdAt });
    artifacts.set(id, art);
    byToken.set(art.tokenId, id);
    const receipt = anchor("coa.artifact.issued", { id, tokenId: art.tokenId, coaNumber: art.coaNumber, kind: art.kind }, createdAt);
    return { ok: true as const, artifact: publicShape(art), anchor: receipt };
  },

  get(idOrToken: string) {
    const id = artifacts.has(idOrToken) ? idOrToken : byToken.get(idOrToken);
    const a = id ? artifacts.get(id) : undefined;
    if (!a) return null;
    a.viewCount += 1; // viewing is itself a logged interaction
    return publicShape(a);
  },

  /** Raw fetch without incrementing the view counter (for internal lookups). */
  peek(idOrToken: string) {
    const id = artifacts.has(idOrToken) ? idOrToken : byToken.get(idOrToken);
    return id ? artifacts.get(id) || null : null;
  },

  layers(idOrToken: string) {
    const a = this.peek(idOrToken);
    return a ? coaLayers(a) : null;
  },

  /** List artifacts for the market / network feed gallery. */
  list(limit = 24) {
    return [...artifacts.values()].slice(-limit).reverse().map((a) => ({
      id: a.id,
      tokenId: a.tokenId,
      coaNumber: a.coaNumber,
      kind: a.kind,
      title: a.title,
      assetType: a.assetType,
      athleteId: a.athleteId,
      ownerUserId: a.ownerUserId,
      valuationDisplay: a.valuationDisplay,
      posterUrl: a.paneA.posterUrl,
      confidence: a.confidence,
      viewCount: a.viewCount,
      xrSessionCount: a.xrSessionCount,
      shareUrl: a.shareUrl,
      xrViewable: isViewableInXr(a.xr)
    }));
  },

  /** §3 Unlock a gamified layer (wallet/owner gated), with a tamper-proof record. */
  unlock(idOrToken: string, layerId: string, holder: { wallet: string; userId: string }) {
    const a = this.peek(idOrToken);
    if (!a) return { error: "coa_not_found" as const };
    const now = nowIso();
    const res = unlockLayer(a, layerId, holder, now);
    if (!res.ok) return { error: res.reason as string };
    const receipt = anchor("coa.layer.unlock", { coaId: a.id, layerId, wallet: holder.wallet, at: now }, now);
    unlockLog.push({ coaId: a.id, layerId, wallet: holder.wallet, at: now, proof: res.record!.proof });
    return { ok: true as const, layer: res.layer, record: res.record, anchor: receipt };
  },

  /**
   * §2 Open an immersive AR/VR (WebXR) session — Meta Quest, AR glasses, etc.
   * Each session is logged + anchored; gestures accrue to the session.
   */
  openXrSession(idOrToken: string, input: { mode?: string; device?: string; userId?: string }) {
    const a = this.peek(idOrToken);
    if (!a) return { error: "coa_not_found" as const };
    if (!isViewableInXr(a.xr)) return { error: "xr_not_supported_for_artifact" as const };
    const now = nowIso();
    const mode = input.mode === "immersive-ar" || input.mode === "immersive-vr" ? input.mode : "immersive-vr";
    const session: XrSession = {
      id: `xr_${newId()}`,
      coaId: a.id,
      mode,
      device: input.device || "Meta Quest",
      userId: input.userId || "anon",
      startedAt: now,
      gestures: 0,
      anchorTx: anchor("coa.xr.session", { coaId: a.id, mode, device: input.device, at: now }, now).txRef
    };
    xrSessions.push(session);
    a.xrSessionCount += 1;
    return { ok: true as const, session, xr: a.xr, sessionToken: `pqc:${session.id}` };
  },

  /** §2 Log a gesture/command inside an XR session (cryptographically logged). */
  logGesture(sessionId: string, gesture: string) {
    const s = xrSessions.find((x) => x.id === sessionId);
    if (!s) return { error: "session_not_found" as const };
    s.gestures += 1;
    const now = nowIso();
    return { ok: true as const, sessionId, gestures: s.gestures, anchor: anchor("coa.xr.gesture", { sessionId, gesture, n: s.gestures }, now).txRef };
  },

  /** Re-seal owner-gated layers on a resale/transfer (§3). */
  transfer(idOrToken: string, newOwnerUserId: string) {
    const a = this.peek(idOrToken);
    if (!a) return { error: "coa_not_found" as const };
    resealOnTransfer(a, newOwnerUserId);
    const now = nowIso();
    return { ok: true as const, ownerUserId: a.ownerUserId, anchor: anchor("coa.transfer", { coaId: a.id, newOwnerUserId, at: now }, now) };
  },

  stats() {
    return {
      artifacts: artifacts.size,
      xrSessions: xrSessions.length,
      unlocks: unlockLog.length,
      totalViews: [...artifacts.values()].reduce((s, a) => s + a.viewCount, 0)
    };
  }
};
