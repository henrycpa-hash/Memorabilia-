"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

/**
 * Terms & Agreements — the transparent, versioned, chain-anchored registry of
 * every CrownX smart contract, data/AI-modeling consent policy, authenticity
 * risk disclosure, and the athlete/celebrity Royalty Vault. Anyone can read the
 * full terms of every contract and inspect the on-chain audit trail. Acceptance
 * is signed at sign-up; amendments require governance + legal + COA sign-offs.
 */

type RegItem = { key: string; name: string; kind: string; version: number; title: string; summary: string; hash: string; anchorTx: string; effectiveAt: string; versionCount: number };
type Section = { heading: string; body: string };
type Agreement = RegItem & { sections: Section[]; history: { version: number; status: string; anchorTx: string; effectiveAt: string }[] };
type Audit = { agreements: { key: string; name: string; versions: { version: number; status: string; title: string; hash: string; anchorTx: string; effectiveAt: string; acceptances: number }[] }[]; amendments: { id: string; key: string; proposedVersion: number; status: string; approvals: { role: string; approver: string }[] }[]; totalAcceptances: number };

const kindTone = (k: string): "cyan" | "gold" | "win" | "hot" | "mut" =>
  k === "risk" ? "hot" : k === "royalty" ? "gold" : k === "contracts" ? "cyan" : k === "data" ? "win" : "mut";

export default function TermsPage() {
  const [reg, setReg] = useState<RegItem[]>([]);
  const [open, setOpen] = useState<Record<string, Agreement | null>>({});
  const [audit, setAudit] = useState<Audit | null>(null);
  const [bundleHash, setBundleHash] = useState("");

  useEffect(() => {
    fetch(`${GATEWAY}/api/terms`).then((r) => r.json()).then((d) => setReg(d.agreements || [])).catch(() => undefined);
    fetch(`${GATEWAY}/api/terms/bundle`).then((r) => r.json()).then((d) => setBundleHash(d.bundleHash || "")).catch(() => undefined);
  }, []);

  const toggle = useCallback(async (key: string) => {
    if (open[key]) { setOpen((o) => ({ ...o, [key]: null })); return; }
    const a = await fetch(`${GATEWAY}/api/terms/agreement/${key}`).then((r) => r.json()).catch(() => null);
    setOpen((o) => ({ ...o, [key]: a }));
  }, [open]);

  async function loadAudit() {
    const a = await fetch(`${GATEWAY}/api/terms/audit`).then((r) => r.json()).catch(() => null);
    setAudit(a);
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <SectionTag>Terms &amp; Agreements · transparent &amp; on-chain</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 46, margin: "0 0 4px" }}>Every contract. In the open.</h1>
      <p style={{ color: color.mut, fontSize: 13, maxWidth: 680, margin: 0 }}>
        The full, versioned terms of every CrownX smart contract — royalties, COAs, escrow, data &amp; AI-modeling consent,
        authenticity risk, and the athlete/celebrity Royalty Vault. Each version is chain-anchored; acceptance is signed at
        sign-up; and changes require <b style={{ color: color.txt }}>governance + legal + COA sign-off</b> before they bind anyone.
      </p>
      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 8 }}>Active bundle hash: <span style={{ color: color.cyanHi }}>{bundleHash ? bundleHash.slice(0, 28) + "…" : "—"}</span></div>

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        {reg.map((a) => {
          const ag = open[a.key];
          return (
            <Panel key={a.key} style={{ borderColor: ag ? color.line2 : color.line }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 22, margin: 0 }}>{a.title}</h2>
                    <Badge tone={kindTone(a.kind)}>{a.kind}</Badge>
                    <Badge tone="mut">v{a.version}</Badge>
                  </div>
                  <p style={{ color: color.mut, fontSize: 12.5, margin: "5px 0 0" }}>{a.summary}</p>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginTop: 6 }}>hash {a.hash.slice(0, 18)}… · anchor {a.anchorTx.slice(0, 14)}… · effective {new Date(a.effectiveAt).toISOString().slice(0, 10)}</div>
                </div>
                <button onClick={() => toggle(a.key)} style={{ ...buttonStyle("secondary"), padding: "8px 14px", fontSize: 12, flex: "none" }}>{ag ? "Hide" : "Read full terms"}</button>
              </div>
              {ag && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${color.line}`, paddingTop: 14, display: "grid", gap: 12 }}>
                  {ag.sections.map((s, i) => (
                    <div key={i}>
                      <div style={{ fontFamily: font.display, fontSize: 15, color: color.cyanHi }}>{s.heading}</div>
                      <p style={{ fontSize: 12.5, color: color.plat, margin: "4px 0 0", lineHeight: 1.6 }}>{s.body}</p>
                    </div>
                  ))}
                  {ag.history.length > 1 && (
                    <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>Version history: {ag.history.map((h) => `v${h.version} (${h.status})`).join(" · ")}</div>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* audit trail */}
      <Panel style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTag>On-chain audit trail</SectionTag>
          <button onClick={loadAudit} style={{ ...buttonStyle("secondary"), padding: "6px 12px", fontSize: 12 }}>{audit ? "Refresh" : "Load audit trail"}</button>
        </div>
        {audit ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, marginBottom: 8 }}>{audit.totalAcceptances} total signatures on record · {audit.amendments.length} amendments</div>
            <div style={{ display: "grid", gap: 6 }}>
              {audit.agreements.flatMap((ag) => ag.versions.map((v) => (
                <div key={ag.key + v.version} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", border: `1px solid ${color.line}`, borderRadius: 9 }}>
                  <span style={{ fontSize: 12, color: color.txt }}>{ag.name} <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>v{v.version} · {v.status}</span></span>
                  <span style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut }}>{v.acceptances} signed · {v.anchorTx.slice(0, 14)}…</span>
                </div>
              )))}
            </div>
            {audit.amendments.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, textTransform: "uppercase", marginBottom: 6 }}>Governance amendments</div>
                {audit.amendments.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 11px", border: `1px solid ${color.line}`, borderRadius: 9, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: color.txt }}>{m.key} → v{m.proposedVersion}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut }}>{m.status} · {m.approvals.map((p) => p.role).join("+") || "no approvals"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: "8px 0 0" }}>Load the full, anchored history of every version, governance approval, and signature.</p>
        )}
      </Panel>

      <p style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut2, lineHeight: 1.7, marginTop: 16 }}>
        Nothing here is financial, legal, or tax advice. Amendments are published on-chain only after governance + legal +
        COA sign-off, after which all users are prompted to re-accept the updated bundle.
      </p>
    </div>
  );
}
