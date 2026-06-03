"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, SectionTag, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

type Appraiser = {
  id: string; name: string; firm: string; specialties: string[]; credential: string; credentialVerified: boolean;
  rating: number; reviews: number; completed: number; feeDisplay: string; turnaroundDisplay: string; bio: string;
};
type Latest = {
  hasAppraisal: boolean; appraisalId?: string; appraisedDisplay?: string | null; appraiserName?: string; firm?: string;
  credential?: string; authenticated?: boolean; signedAt?: string; anchorTx?: string;
};
type Verify = {
  authenticated: boolean; valid: boolean; signatureValid?: boolean; reportTampered?: boolean;
  appraiser?: { name: string; firm: string; credential: string; publicKey: string };
  reportHash?: string; signature?: string; sigScheme?: string; appraisedDisplay?: string | null;
};

/**
 * Choose-your-appraiser network on the exchange. The fan picks a certified
 * appraiser, requests a valuation, and can verify the appraiser AUTHENTICATED
 * (cryptographically signed) their report.
 */
export function AppraiserPicker({ athleteId }: { athleteId: string }) {
  const [roster, setRoster] = useState<Appraiser[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [latest, setLatest] = useState<Latest | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const loadLatest = useCallback(async () => {
    try {
      const l = await fetch(`${GATEWAY}/api/athletes/${athleteId}/latest-appraisal`).then((r) => r.json());
      setLatest(l);
    } catch { /* offline */ }
  }, [athleteId]);

  useEffect(() => {
    fetch(`${GATEWAY}/api/appraisers`).then((r) => r.json()).then((d) => setRoster(d.appraisers || [])).catch(() => undefined);
    loadLatest();
  }, [loadLatest]);

  async function request() {
    if (!picked) { setOut("Pick an appraiser from the network first."); return; }
    setBusy(true); setOut("");
    try {
      const r = await fetch(`${GATEWAY}/api/athletes/${athleteId}/appraisal`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: `ast_${athleteId}_0`, requestedBy: "henry", appraiserId: picked })
      }).then((x) => x.json());
      if (r.ok && r.appraiser) setOut(`✓ Assigned to ${r.appraiser.name} (${r.appraiser.firm}) · fee ${r.appraiser.feeDisplay} · ~${r.appraiser.turnaroundHours}h. Model-implied ${r.modelImpliedDisplay}. They will sign the report on completion.`);
      else setOut(`✗ ${r.error || "could not assign"}`);
    } catch { setOut("✗ appraiser network unavailable"); }
    finally { setBusy(false); }
  }

  async function runVerify() {
    if (!latest?.appraisalId) return;
    setBusy(true);
    try {
      const v = await fetch(`${GATEWAY}/api/appraisals/${latest.appraisalId}/verify`).then((r) => r.json());
      setVerify(v);
    } catch { /* offline */ }
    finally { setBusy(false); }
  }

  return (
    <Panel style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTag>Appraiser Network · choose &amp; authenticate</SectionTag>
        <button onClick={() => setOpen((o) => !o)} style={{ ...buttonStyle("secondary"), padding: "6px 12px", fontSize: 12 }}>{open ? "Hide network" : `Choose appraiser (${roster.length})`}</button>
      </div>

      {/* the most recent SIGNED appraisal */}
      {latest?.hasAppraisal ? (
        <div style={{ marginTop: 10, padding: "12px 14px", border: `1px solid ${color.line2}`, borderRadius: 11, background: "rgba(63,217,212,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, color: color.txt }}>Last appraised <b style={{ color: color.goldHi }}>{latest.appraisedDisplay}</b> by {latest.appraiserName} <span style={{ color: color.mut }}>· {latest.firm}</span></div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>{latest.credential} · {latest.authenticated ? "authenticated ✓" : "unsigned"} {latest.anchorTx ? `· ${latest.anchorTx.slice(0, 14)}…` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {latest.authenticated && <Badge tone="win">signed report ✓</Badge>}
              <button onClick={runVerify} disabled={busy} style={{ ...buttonStyle("secondary"), padding: "7px 12px", fontSize: 12 }}>Verify signature</button>
            </div>
          </div>
          {verify && (
            <div style={{ marginTop: 10, fontFamily: font.mono, fontSize: 10.5, lineHeight: 1.6, color: verify.valid ? color.win : color.hot, background: "rgba(255,255,255,0.02)", border: `1px solid ${color.line}`, borderRadius: 9, padding: "9px 11px" }}>
              {verify.valid
                ? `✓ AUTHENTIC — ${verify.appraiser?.name} (${verify.appraiser?.credential}) signed this report. sig ${verify.signature?.slice(0, 18)}… · ${verify.sigScheme} · key ${verify.appraiser?.publicKey}. Report hash matches; not tampered.`
                : verify.authenticated ? `✗ SIGNATURE INVALID — report may be tampered (hashMatch=${!verify.reportTampered}, sigValid=${verify.signatureValid}).` : "Not signed yet."}
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: color.mut2, fontSize: 12, margin: "10px 0 0" }}>No appraisal yet — choose a certified appraiser from the network to value this asset.</p>
      )}

      {/* the roster — choose one */}
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
            {roster.map((a) => {
              const sel = picked === a.id;
              return (
                <button key={a.id} onClick={() => setPicked(a.id)} style={{ textAlign: "left", cursor: "pointer", padding: "12px 13px", borderRadius: 12, border: `1px solid ${sel ? color.cyan : color.line2}`, background: sel ? "rgba(63,217,212,0.08)" : "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: font.display, fontSize: 17, color: color.txt }}>{a.name}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 11, color: color.goldHi }}>★ {a.rating.toFixed(1)}</span>
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut, marginTop: 2 }}>{a.firm}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "8px 0" }}>
                    {a.specialties.slice(0, 3).map((s) => <span key={s} style={{ fontFamily: font.mono, fontSize: 8.5, color: color.cyanHi, border: `1px solid ${color.line2}`, borderRadius: 4, padding: "1px 5px" }}>{s}</span>)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {a.credentialVerified && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.win }} />}
                      <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>{a.credential}</span>
                    </span>
                    <span style={{ fontFamily: font.mono, fontSize: 9.5, color: color.txt }}>{a.feeDisplay} · {a.turnaroundDisplay}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={request} disabled={busy || !picked} style={{ ...buttonStyle("primary"), opacity: !picked ? 0.5 : 1 }}>Request signed appraisal{picked ? ` from ${roster.find((r) => r.id === picked)?.name}` : ""} →</button>
            <span style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>The appraiser cryptographically signs their report — anyone can verify it.</span>
          </div>
        </div>
      )}

      {out && <div style={{ fontFamily: font.mono, fontSize: 11.5, color: color.txt, marginTop: 12, lineHeight: 1.6, background: "rgba(63,217,212,0.05)", border: `1px solid ${color.line}`, borderRadius: 10, padding: "10px 12px" }}>{out}</div>}
    </Panel>
  );
}
