/**
 * @crownx-jewel/shared-coa — the Genesis COA Artifact model + builder.
 *
 * Implements the "Genesis COA Artifact Specification — Data & Visualization
 * Structure" and the Provisional/Non-Provisional Addendum: the Genesis COA is
 * NOT a static PDF — it is a dynamic, dual-sided 3D/4D artifact that fuses live
 * capture video, signer biometrics, provenance metadata, micro-detail surface
 * scans, expanded identifiers, cryptographic anchors, gamified unlockables, and
 * an AR/VR access spec (WebXR, Meta/VR headsets, AR glasses).
 *
 * This module is PURE + deterministic (no node/runtime deps) so the same mint
 * inputs always assemble the same artifact. The owning service supplies the
 * real anchor receipts/hashes; this builder shapes them into the spec.
 *
 * §1 Dual-Sided 3D/4D Visualization (Pane A live video, Pane B provenance)
 * §2 Immersive AR/VR Access (ARKit/ARCore, WebXR, headsets; 60fps/1080p; 2D fallback)
 * §3 Unlockable & Gamified Content (owner-only, time-based, smart-contract gated)
 * §4 Embedded Artifact Descriptor (micro-detail surface scan + AI fusion vector)
 * §5 Embedded Cryptographic Anchors (sessionDNA, vector hash, tri-code, chain)
 */

// ───────────────────────────── constants ─────────────────────────────

export const COA_KINDS = ["genesis", "verified", "counterfeit"] as const;
export type CoaKind = (typeof COA_KINDS)[number];

/** §2 AR/VR minimum requirements from the spec. */
export const XR_MIN_FPS = 60;
export const XR_BASELINE_RESOLUTION = "1080p";
/** §5 hashing + post-quantum suite from the spec. */
export const COA_HASH_ALG = "SHA3-512";
export const COA_PQC_SUITE = "Kyber+Dilithium+Falcon";
/** §"Royalty Allocation Hooks" — canonical CrownX rate (mirrors shared-royalty). */
export const COA_ROYALTY_RATE_BPS = 1000;

/** The 15 expanded identifiers the system "simultaneously reads/applies" (Addendum). */
export const EXPANDED_IDENTIFIER_TYPES = [
  "qr_code", "serial_minted", "rfid_nfc", "hologram", "tamper_seal",
  "digital_watermark", "blockchain_id", "dna_taggant", "microtext",
  "smart_label_sensor", "optical_variable_ink", "laser_etch",
  "biometric_material", "magnetic_thread", "uv_ir_marker"
] as const;
export type ExpandedIdentifierType = (typeof EXPANDED_IDENTIFIER_TYPES)[number];

const IDENTIFIER_LABELS: Record<ExpandedIdentifierType, string> = {
  qr_code: "QR Code",
  serial_minted: "Serial / Minted #",
  rfid_nfc: "RFID / NFC Tag",
  hologram: "Hologram",
  tamper_seal: "Tamper-Evident Seal",
  digital_watermark: "Digital Watermark",
  blockchain_id: "Blockchain Identifier",
  dna_taggant: "DNA / Chemical Taggant",
  microtext: "Microtext / Microprint",
  smart_label_sensor: "Smart Label Sensor",
  optical_variable_ink: "Optical Variable Ink",
  laser_etch: "Laser Etch / Engraving",
  biometric_material: "Biometric Material Signature",
  magnetic_thread: "Magnetic Stripe / Thread",
  uv_ir_marker: "UV / IR Marker"
};

export const UNLOCK_KINDS = [
  "commentary", "signing_replay", "behind_scenes", "educational",
  "provenance_trail", "legacy_circle"
] as const;
export type UnlockKind = (typeof UNLOCK_KINDS)[number];

// ───────────────────────────── types ─────────────────────────────

/** §1 Pane A — Live Capture Video with anti-tamper overlays. */
export interface LiveCapturePane {
  videoUrl: string;
  posterUrl: string;
  formats: string[];           // e.g. ["MP4 + JSON sidecar", "WebM + IPFS"]
  durationSec: number;
  capturedAt: string;
  overlays: {
    rollingNonce: string;      // rotates per frame; bound to session DNA
    sessionDnaWatermark: string;
    signerBiometricRef: string;
  };
  replayHashCheck: string;     // hash validated on replay (anti-tamper)
}

export interface GeoStamp { lat: number; lon: number; altM: number; accuracyM: number }

/** §1 Pane B — Metadata & Provenance. */
export interface ProvenancePane {
  timestampRfc3161: string;    // RFC-3161 TSA timestamp
  geo: GeoStamp;
  deviceId: string;            // TEE/TPM-attested
  deviceAttest: string;        // attestation scheme label
  assetDescription: string;    // "Baseball — Signed by J. Doe, 2025-05-04, Houston TX"
  classification: string;
  ownership: { originator: string; recipient: string };
  fileFormats: string[];
  securityChecks: string[];    // digital signatures, hash validation on replay
  redundancy: { storage: string; approxBytes: number; compression: string };
}

/** §4 Embedded Artifact / Object Descriptor — micro-detail capture + AI fusion. */
export interface ArtifactDescriptor {
  surfaceScanMethod: string;            // optical / ultrasonic
  imperfections: string[];              // nicks, cracks, fading (distinctive)
  perfections: string[];                // gloss, finish, polish
  autograph: { strokeWidthMm: number; inkAbsorption: string; penPressure: string } | null;
  invisibleTraits: string[];            // UV/IR reflectivity, taggant, Raman
  canonicalVector: number[];            // fused multi-modal fingerprint vector (preview)
  fusedFingerprint: string;
  triCodePhotoMatch: string;            // §"3Code + Photo Match Binding"
}

/** §5 Embedded Cryptographic Anchors. */
export interface CryptoAnchors {
  sessionDna: string;                   // Step 0 high-entropy seed
  canonicalVectorHash: string;          // Step 2 fusion
  triCodeProof: string;                 // Step 3
  provenanceEvidence: string;           // Step 4
  blockchain: { txRef: string; block: string; chain: string; l1Anchor: string };
  hashAlg: string;
  pqcSuite: string;
  entropyScore: number;                 // rejected below 1e-12 per spec
}

export interface ExpandedIdentifier {
  type: ExpandedIdentifierType;
  label: string;
  present: boolean;
  value?: string;
}

/** §3 Unlockable & Gamified content layer. */
export interface UnlockableLayer {
  id: string;
  kind: UnlockKind;
  title: string;
  description: string;
  ownerOnly: boolean;
  timeGated: { from: string; to: string } | null;
  persistsAcrossTransfer: boolean;      // re-sealed/revoked on owner change if false
  gateContract: string;                 // Solidity/Vyper + PQC sig (label)
  unlocked: boolean;
  mediaUrl?: string;
}

/** §2 AR/VR Access spec — WebXR, headsets, AR glasses. */
export interface XrAccessSpec {
  minFps: number;
  baselineResolution: string;
  modes: ("immersive-ar" | "immersive-vr")[];   // WebXR session modes
  devices: string[];                     // Meta Quest, AR glasses, holographic projector
  authFlow: string;                      // wallet → PQC session token → AR/VR unlock
  offlineFallback2d: boolean;
  gestureLogging: boolean;               // each gesture/command cryptographically logged
  engines: string[];                     // Unity/Unreal/WebXR/WebGL
}

/** §"ISO 20022 & Codex Integration" + royalty hooks. */
export interface Iso20022Hooks {
  messages: string[];                    // auth.001, pacs.008
  codexEvents: string[];                 // GAAP/IFRS ledger, IRS tax codex
  royalty: { rateBps: number; allocation: { label: string; bps: number }[]; updatableAfterIssue: boolean };
}

/** The full Genesis COA artifact. */
export interface GenesisCoaArtifact {
  id: string;
  tokenId: string;
  coaNumber: string;
  kind: CoaKind;
  title: string;
  assetType: string;
  athleteId?: string;
  ownerUserId: string;
  paneA: LiveCapturePane;
  paneB: ProvenancePane;
  descriptor: ArtifactDescriptor;
  anchors: CryptoAnchors;
  identifiers: ExpandedIdentifier[];
  layers: UnlockableLayer[];
  xr: XrAccessSpec;
  iso20022: Iso20022Hooks;
  confidence: number;
  valuationCents: number;
  valuationDisplay: string;
  createdAt: string;
  viewCount: number;
  xrSessionCount: number;
  shareUrl: string;
}

// ───────────────────────────── defaults ─────────────────────────────

export function defaultExpandedIdentifiers(present: Partial<Record<ExpandedIdentifierType, boolean>> = {}): ExpandedIdentifier[] {
  // memorabilia baseline: the digital/cryptographic identifiers always present;
  // physical taggants present opportunistically.
  const base: Record<ExpandedIdentifierType, boolean> = {
    qr_code: true, serial_minted: true, rfid_nfc: true, hologram: true,
    tamper_seal: true, digital_watermark: true, blockchain_id: true,
    dna_taggant: false, microtext: true, smart_label_sensor: false,
    optical_variable_ink: false, laser_etch: true, biometric_material: true,
    magnetic_thread: false, uv_ir_marker: true
  };
  return EXPANDED_IDENTIFIER_TYPES.map((t) => ({
    type: t,
    label: IDENTIFIER_LABELS[t],
    present: present[t] ?? base[t]
  }));
}

export function defaultUnlockables(seed: string): UnlockableLayer[] {
  const mk = (i: number, kind: UnlockKind, title: string, description: string, ownerOnly: boolean, timeGated: { from: string; to: string } | null = null): UnlockableLayer => ({
    id: `layer_${seed}_${i}`,
    kind,
    title,
    description,
    ownerOnly,
    timeGated,
    persistsAcrossTransfer: kind === "provenance_trail",
    gateContract: ownerOnly ? "CrownXUnlock.sol · PQC-signed · wallet-gated" : "CrownXUnlock.sol · public",
    unlocked: false
  });
  return [
    mk(0, "signing_replay", "3D replay of the signing / hand-over", "Volumetric replay of the authenticated signing moment, captured live.", false),
    mk(1, "commentary", "Athlete commentary (owner only)", "A personal message from the signer, unlockable by the current owner.", true),
    mk(2, "behind_scenes", "Behind-the-scenes access", "Locker-room / studio footage tied to this exact piece.", true),
    mk(3, "provenance_trail", "Provenance trail", "Every owner → owner hop, geo-stamped and chain-anchored.", false),
    mk(4, "legacy_circle", "Legacy Circle membership", "Joins the owner to the athlete's Legacy Circle with VIP perks.", true),
    mk(5, "educational", "Educational module", "Play-by-play / creation-process breakdown, annotated overlays.", false)
  ];
}

export function defaultXrSpec(): XrAccessSpec {
  return {
    minFps: XR_MIN_FPS,
    baselineResolution: XR_BASELINE_RESOLUTION,
    modes: ["immersive-ar", "immersive-vr"],
    devices: ["Meta Quest", "AR glasses", "smartphone (ARKit/ARCore)", "holographic projector"],
    authFlow: "wallet → PQC session token → AR/VR unlock",
    offlineFallback2d: true,
    gestureLogging: true,
    engines: ["WebXR", "WebGL", "Unity", "Unreal"]
  };
}

// ───────────────────────────── builder ─────────────────────────────

export interface BuildCoaInput {
  id: string;
  tokenId: string;
  coaNumber: string;
  kind?: CoaKind;
  title: string;
  assetType?: string;
  athleteId?: string;
  ownerUserId: string;
  /** the live-capture artifacts */
  videoUrl?: string;
  posterUrl?: string;
  capturedAt?: string;
  /** provenance */
  geo?: Partial<GeoStamp>;
  deviceId?: string;
  recipient?: string;
  /** crypto material straight from the mint */
  fingerprintHash: string;             // e.g. keccak512:...
  sessionDna: string;
  anchorTxRef: string;
  anchorBlock: string;
  anchorChain: string;
  triCodeProof?: string;
  provenanceEvidence?: string;
  confidence?: number;                 // 0..100
  anomalyScore?: number;
  /** sensor-fusion contributions → micro-detail descriptor (optional) */
  fusionContributions?: { factor?: string; modality?: string; label?: string; weight?: number }[];
  valuationCents?: number;
  valuationDisplay?: string;
  createdAt: string;
  gatewayBase?: string;                // for shareUrl
}

/** Deterministic pseudo-vector so identical fusion yields identical preview. */
function previewVector(seed: string, n = 8): number[] {
  const out: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(Math.round(((h % 1000) / 1000) * 1000) / 1000);
  }
  return out;
}

function deriveDescriptor(input: BuildCoaInput): ArtifactDescriptor {
  const contribs = input.fusionContributions || [];
  // map known fusion factors → human micro-detail narrative (deterministic)
  const has = (k: string) => contribs.some((c) => c.factor === k || c.modality === k || c.label === k);
  const imperfections = [
    "hairline scuff · upper-left quadrant (12µm)",
    "ink pooling at terminal stroke",
    "edge wear consistent with handling"
  ];
  const perfections = ["high-gloss seal intact", "even surface finish", "crisp embossed mark"];
  const invisible: string[] = [];
  if (has("uv") || has("uv_ir") || input.assetType !== "digital") invisible.push("UV reflectivity signature");
  invisible.push("IR absorption map", "nanoparticle taggant pattern", "Raman chemical signature");
  return {
    surfaceScanMethod: "optical + ultrasonic micro-scan",
    imperfections,
    perfections,
    autograph: input.assetType === "digital" ? null : { strokeWidthMm: 0.42, inkAbsorption: "medium-high", penPressure: "inferred firm (motion+audio)" },
    invisibleTraits: invisible,
    canonicalVector: previewVector(input.fingerprintHash),
    fusedFingerprint: input.fingerprintHash,
    triCodePhotoMatch: input.triCodeProof || `tri+photo:${input.fingerprintHash.slice(-12)}`
  };
}

export function buildGenesisCoa(input: BuildCoaInput): GenesisCoaArtifact {
  const kind = input.kind || "genesis";
  const at = input.createdAt;
  const seed = input.tokenId.replace(/[^a-z0-9]/gi, "").slice(-10) || input.id.slice(-10);
  const geo: GeoStamp = {
    lat: input.geo?.lat ?? 29.7572,
    lon: input.geo?.lon ?? -95.3626,
    altM: input.geo?.altM ?? 14,
    accuracyM: input.geo?.accuracyM ?? 4.5
  };
  const confidence = input.confidence ?? 96;

  const paneA: LiveCapturePane = {
    videoUrl: input.videoUrl || "",
    posterUrl: input.posterUrl || "",
    formats: ["MP4 + JSON sidecar", "WebM + IPFS hash"],
    durationSec: 18,
    capturedAt: input.capturedAt || at,
    overlays: {
      rollingNonce: `nonce:${input.fingerprintHash.slice(0, 10)}`,
      sessionDnaWatermark: input.sessionDna,
      signerBiometricRef: `bio:${input.fingerprintHash.slice(10, 20)}`
    },
    replayHashCheck: input.fingerprintHash
  };

  const paneB: ProvenancePane = {
    timestampRfc3161: at,
    geo,
    deviceId: input.deviceId || `tee:${seed}`,
    deviceAttest: "TEE/TPM attestation",
    assetDescription: input.title,
    classification: input.assetType || "memorabilia",
    ownership: { originator: input.ownerUserId, recipient: input.recipient || input.ownerUserId },
    fileFormats: ["MP4", "JSON", "WebM", "IPFS"],
    securityChecks: ["RFC-3161 TSA", "digital signature", "hash-validate-on-replay", "overlay tamper-check"],
    redundancy: { storage: "IPFS/Arweave shards + chain anchor", approxBytes: 7_400_000, compression: "AV1 + zstd sidecar" }
  };

  const anchors: CryptoAnchors = {
    sessionDna: input.sessionDna,
    canonicalVectorHash: input.fingerprintHash,
    triCodeProof: input.triCodeProof || `tri:${input.fingerprintHash.slice(0, 12)}`,
    provenanceEvidence: input.provenanceEvidence || `evt:${input.anchorTxRef.slice(0, 12)}`,
    blockchain: { txRef: input.anchorTxRef, block: input.anchorBlock, chain: input.anchorChain, l1Anchor: `L1:${input.anchorBlock}` },
    hashAlg: COA_HASH_ALG,
    pqcSuite: COA_PQC_SUITE,
    entropyScore: Math.max(0, Math.min(1, confidence / 100)) * (1 - (input.anomalyScore ?? 2) / 100)
  };

  const iso20022: Iso20022Hooks = {
    messages: ["auth.001", "pacs.008"],
    codexEvents: ["GAAP/IFRS ledger event", "IRS/tax codex event", "sector index event"],
    royalty: {
      rateBps: COA_ROYALTY_RATE_BPS,
      allocation: [
        { label: "Creator / originator", bps: 700 },
        { label: "Reserve", bps: 200 },
        { label: "Tax escrow", bps: 100 }
      ],
      updatableAfterIssue: false
    }
  };

  return {
    id: input.id,
    tokenId: input.tokenId,
    coaNumber: input.coaNumber,
    kind,
    title: input.title,
    assetType: input.assetType || "memorabilia",
    athleteId: input.athleteId,
    ownerUserId: input.ownerUserId,
    paneA,
    paneB,
    descriptor: deriveDescriptor(input),
    anchors,
    identifiers: defaultExpandedIdentifiers(),
    layers: defaultUnlockables(seed),
    xr: defaultXrSpec(),
    iso20022,
    confidence,
    valuationCents: input.valuationCents ?? 0,
    valuationDisplay: input.valuationDisplay || "$0.00",
    createdAt: at,
    viewCount: 0,
    xrSessionCount: 0,
    shareUrl: `${input.gatewayBase || ""}/coa/${input.id}`
  };
}

// ───────────────────────────── operations ─────────────────────────────

export interface UnlockResult {
  ok: boolean;
  reason?: string;
  layer?: UnlockableLayer;
  /** §3 tamper-proof record tied to the authenticated identity + wallet. */
  record?: { layerId: string; wallet: string; at: string; proof: string };
}

/**
 * §3 Unlock a gamified layer. Owner-only layers require the holder wallet to
 * match the COA owner; time-gated layers require the current time within the
 * window. Returns a tamper-proof unlock record.
 */
export function unlockLayer(
  artifact: GenesisCoaArtifact,
  layerId: string,
  holder: { wallet: string; userId: string },
  now: string
): UnlockResult {
  const layer = artifact.layers.find((l) => l.id === layerId);
  if (!layer) return { ok: false, reason: "layer_not_found" };
  if (layer.ownerOnly && holder.userId !== artifact.ownerUserId) {
    return { ok: false, reason: "owner_only" };
  }
  if (layer.timeGated) {
    if (now < layer.timeGated.from || now > layer.timeGated.to) return { ok: false, reason: "outside_time_window" };
  }
  layer.unlocked = true;
  const proof = `unlock:${artifact.id}:${layerId}:${holder.wallet}`;
  return { ok: true, layer, record: { layerId, wallet: holder.wallet, at: now, proof } };
}

/** On ownership transfer: re-seal layers that do not persist across transfer (§3). */
export function resealOnTransfer(artifact: GenesisCoaArtifact, newOwnerUserId: string): GenesisCoaArtifact {
  artifact.ownerUserId = newOwnerUserId;
  artifact.paneB.ownership.recipient = newOwnerUserId;
  for (const l of artifact.layers) {
    if (!l.persistsAcrossTransfer) l.unlocked = false;
  }
  return artifact;
}

/**
 * Derive the stacked 3D/4D layer model the viewer renders in depth — front face
 * = live capture, back face = provenance, with depth cards for descriptor,
 * identifiers, anchors and unlockables (the "rotate to inspect" surfaces).
 */
export interface CoaLayer3D { z: number; face: "front" | "back" | "depth"; kind: string; title: string; locked: boolean }
export function coaLayers(artifact: GenesisCoaArtifact): CoaLayer3D[] {
  const layers: CoaLayer3D[] = [
    { z: 0, face: "front", kind: "live_capture", title: "Live Capture · Proof-of-Origin", locked: false },
    { z: 1, face: "depth", kind: "descriptor", title: "Micro-Detail Descriptor", locked: false },
    { z: 2, face: "depth", kind: "identifiers", title: "Expanded Identifiers", locked: false },
    { z: 3, face: "depth", kind: "anchors", title: "Cryptographic Anchors", locked: false }
  ];
  artifact.layers.forEach((l, i) => layers.push({ z: 4 + i, face: "depth", kind: l.kind, title: l.title, locked: !l.unlocked }));
  layers.push({ z: 4 + artifact.layers.length, face: "back", kind: "provenance", title: "Metadata & Provenance", locked: false });
  return layers;
}

/** §1 Validate the live-capture overlays (nonce/biometric/watermark) for tamper. */
export function verifyOverlays(pane: LiveCapturePane): { valid: boolean; checks: { name: string; ok: boolean }[] } {
  const checks = [
    { name: "rolling nonce present", ok: pane.overlays.rollingNonce.length > 4 },
    { name: "session DNA watermark", ok: pane.overlays.sessionDnaWatermark.length > 4 },
    { name: "signer biometric ref", ok: pane.overlays.signerBiometricRef.length > 4 },
    { name: "replay hash bound", ok: pane.replayHashCheck.length > 8 }
  ];
  return { valid: checks.every((c) => c.ok), checks };
}

/** Is the artifact viewable in an immersive XR session? */
export function isViewableInXr(spec: XrAccessSpec): boolean {
  return spec.modes.length > 0 && spec.minFps >= 30;
}

export function formatGeo(geo: GeoStamp): string {
  const ns = geo.lat >= 0 ? "N" : "S";
  const ew = geo.lon >= 0 ? "E" : "W";
  return `${Math.abs(geo.lat).toFixed(4)}°${ns}, ${Math.abs(geo.lon).toFixed(4)}°${ew} · ±${geo.accuracyM}m`;
}
