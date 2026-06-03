"use client";

import { useState } from "react";
import { Panel, SectionTag, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

/** Contract upload→verify (DCF), real-time audit package, and insurance verify. */
export function AthleteTools({ athleteId }: { athleteId: string }) {
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function uploadContract() {
    setBusy(true);
    setOut("Uploading contract for CrownX verification…");
    try {
      const up = await fetch(`${GATEWAY}/api/athletes/${athleteId}/contracts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ counterparty: "Apex Sportswear", kind: "nil", annualValueCents: 1_200_000_00, termYears: 4, discountRate: 0.12 })
      }).then((r) => r.json());
      if (!up.ok) return setOut(`✗ ${up.error}`);
      setOut(`Uploaded · projected DCF ${up.projectedDcfDisplay} (pending verification). CrownX live-verifying…`);
      const v = await fetch(`${GATEWAY}/api/athletes/${athleteId}/contracts/${up.contract.id}/verify`, { method: "POST" }).then((r) => r.json());
      if (v.ok) setOut(`✓ Contract verified on-chain (${v.anchor.txRef.slice(0, 16)}…). Verified-contract DCF now ${v.contractsDcfDisplay} — folded into the index. Refresh to see the price move.`);
    } catch {
      setOut("✗ Athlete-index service unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function auditPackage() {
    setBusy(true);
    setOut("Generating real-time audit package…");
    try {
      const p = await fetch(`${GATEWAY}/api/athletes/${athleteId}/audit-package`).then((r) => r.json());
      setOut(`✓ Audit package (${p.attestation.txRef.slice(0, 16)}…): valuation ${p.valuation.marketCapDisplay}, ${p.contracts.verified}/${p.contracts.total} contracts verified (${p.contracts.verifiedDcfDisplay} DCF), ${p.royalties.count} anchored royalties, ${p.ownershipChains.length} ownership chains. ${p.provenance.sigScheme}.`);
    } catch {
      setOut("✗ unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function insuranceVerify() {
    setBusy(true);
    setOut("Requesting insurance verification…");
    try {
      const v = await fetch(`${GATEWAY}/api/athletes/${athleteId}/insurance-verify/idx_${athleteId}`).then((r) => r.json());
      if (v.ok) setOut(`✓ Insurance-ready: authenticity ${v.authenticity}, valuation ${v.valuationDisplay}, attestation ${v.attestation.txRef.slice(0, 16)}… — coverage for theft can bind against this.`);
    } catch {
      setOut("✗ unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel style={{ marginTop: 16 }}>
      <SectionTag>Contracts · Audit · Insurance</SectionTag>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={uploadContract} disabled={busy} style={buttonStyle("primary")}>📄 Upload &amp; verify NIL contract</button>
        <button onClick={auditPackage} disabled={busy} style={buttonStyle("secondary")}>🧾 Real-time audit package</button>
        <button onClick={insuranceVerify} disabled={busy} style={buttonStyle("secondary")}>🛡 Insurance verify</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Badge tone="cyan">CrownX-verified before valuation</Badge>
        <Badge tone="gold">DCF over contract life</Badge>
        <Badge tone="win">Auditor / regulator ready</Badge>
      </div>
      {out && <div style={{ fontFamily: font.mono, fontSize: 11.5, color: color.txt, marginTop: 14, lineHeight: 1.6, background: "rgba(63,217,212,0.05)", border: `1px solid ${color.line}`, borderRadius: 10, padding: "10px 12px" }}>{out}</div>}
    </Panel>
  );
}
