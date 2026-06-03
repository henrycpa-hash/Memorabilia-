"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

type Appraiser = { id: string; name: string; firm: string; specialties: string[]; credential: string; credentialVerified: boolean; rating: number; reviews: number; completed: number; feeDisplay: string; turnaroundDisplay: string };
type Appraisal = {
  id: string; athleteId: string; athleteName?: string; assetId: string; requestedBy: string;
  modelImpliedDisplay: string; appraisedDisplay: string | null; feeDisplay?: string | null;
  status: "queued" | "assigned" | "in_review" | "completed"; appraiserId?: string; appraiserName?: string;
  authenticated?: boolean; signature?: string; credential?: string;
};

/** Appraiser console — pick your network identity, claim work, and SIGN your report. */
export default function AppraiserPage() {
  const [roster, setRoster] = useState<Appraiser[]>([]);
  const [me, setMe] = useState<string>("");
  const [items, setItems] = useState<Appraisal[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [signed, setSigned] = useState<Record<string, { signature: string; scheme: string; by: string }>>({});

  const meAppr = roster.find((r) => r.id === me);

  const refresh = useCallback(async () => {
    try {
      const url = me ? `${GATEWAY}/api/appraisals?appraiserId=${me}` : `${GATEWAY}/api/appraisals`;
      const r = await fetch(url).then((x) => x.json());
      setItems(Array.isArray(r) ? r : []);
    } catch { /* offline */ }
  }, [me]);

  useEffect(() => {
    fetch(`${GATEWAY}/api/appraisers`).then((r) => r.json()).then((d) => {
      const list: Appraiser[] = d.appraisers || [];
      setRoster(list);
      if (!me && list[0]) setMe(list[0].id);
    }).catch(() => undefined);
  }, [me]);
  useEffect(() => { refresh(); }, [refresh]);

  async function claim(id: string) {
    await fetch(`${GATEWAY}/api/appraisals/${id}/claim`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appraiserId: me }) });
    refresh();
  }
  async function submit(id: string) {
    const v = parseFloat(vals[id] || "0");
    if (!v) return;
    const r = await fetch(`${GATEWAY}/api/appraisals/${id}/submit`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appraiserId: me, appraisedValueCents: Math.round(v * 100),
        notes: notes[id] || "Human-verified, backed by COA + index.",
        report: { statement: notes[id] || `Fair value assessed at $${v.toLocaleString()} after comparable-sales and condition review.` }
      })
    }).then((x) => x.json());
    if (r.ok && r.signature) setSigned((s) => ({ ...s, [id]: { signature: r.signature.value, scheme: r.signature.scheme, by: r.signature.authenticatedBy } }));
    refresh();
  }

  const queued = items.filter((i) => i.status !== "completed");
  const done = items.filter((i) => i.status === "completed");

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <SectionTag>Appraiser Console</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>The appraiser network.</h1>
      <p style={{ color: color.mut, maxWidth: 640, marginTop: 0 }}>
        Requests are routed to a chosen appraiser. You confirm the figure and <b style={{ color: color.cyanHi }}>cryptographically sign</b> your
        report — the result is anchored on-chain and anyone can verify that you authenticated it.
      </p>

      {/* identity selector — who are you in the network */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Signing as</SectionTag>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8, marginTop: 8 }}>
          {roster.map((a) => {
            const sel = me === a.id;
            return (
              <button key={a.id} onClick={() => setMe(a.id)} style={{ textAlign: "left", cursor: "pointer", padding: "10px 12px", borderRadius: 11, border: `1px solid ${sel ? color.cyan : color.line2}`, background: sel ? "rgba(63,217,212,0.08)" : "transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: font.display, fontSize: 16, color: color.txt }}>{a.name}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 10, color: color.goldHi }}>★ {a.rating.toFixed(1)}</span>
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginTop: 2 }}>{a.firm} · {a.credential} {a.credentialVerified ? "✓" : ""}</div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, marginTop: 4 }}>{a.completed} done · {a.feeDisplay} · {a.turnaroundDisplay}</div>
              </button>
            );
          })}
        </div>
        {meAppr && <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 8 }}>Specialties: {meAppr.specialties.join(" · ")}</div>}
      </Panel>

      <Panel glow style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTag>My queue · {queued.length} pending</SectionTag>
          <button onClick={refresh} style={{ ...buttonStyle("secondary"), padding: "6px 12px", fontSize: 12 }}>↻ Refresh</button>
        </div>
        {queued.length === 0 ? (
          <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>No requests assigned to you or open in the pool. Choose an appraiser from an athlete page to route one here.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {queued.map((a) => (
              <div key={a.id} style={{ padding: "12px 14px", border: `1px solid ${color.line}`, borderRadius: 11, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: color.txt }}>{a.athleteName || a.athleteId.slice(0, 8)} · asset {a.assetId.slice(0, 12)}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>requested by {a.requestedBy} · model-implied {a.modelImpliedDisplay}{a.feeDisplay ? ` · fee ${a.feeDisplay}` : ""}{a.appraiserName ? ` · → ${a.appraiserName}` : " · open pool"}</div>
                  </div>
                  <Badge tone={a.status === "in_review" ? "gold" : a.status === "assigned" ? "cyan" : "mut"}>{a.status.replace(/_/g, " ")}</Badge>
                </div>
                {a.status === "in_review" ? (
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    <textarea placeholder="Your written opinion / condition statement…" value={notes[a.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} rows={2} style={{ resize: "vertical", background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "9px 11px", borderRadius: 9, fontFamily: font.body, fontSize: 12.5 }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="number" step="0.01" placeholder="appraised $" value={vals[a.id] || ""} onChange={(e) => setVals((v) => ({ ...v, [a.id]: e.target.value }))} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "9px 11px", borderRadius: 9, fontFamily: font.mono, fontSize: 13 }} />
                      <button onClick={() => submit(a.id)} style={{ ...buttonStyle("primary"), padding: "9px 16px", fontSize: 13 }}>✍ Sign &amp; submit report</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => claim(a.id)} style={{ ...buttonStyle("secondary"), padding: "8px 14px", fontSize: 12 }}>{a.status === "assigned" ? "Accept assignment" : "Claim from pool"}</button>
                  </div>
                )}
                {signed[a.id] && (
                  <div style={{ marginTop: 10, fontFamily: font.mono, fontSize: 10, color: color.win, background: "rgba(55,211,154,0.06)", border: `1px solid rgba(55,211,154,0.3)`, borderRadius: 9, padding: "8px 10px" }}>
                    ✓ Signed by {signed[a.id].by} · {signed[a.id].scheme} · sig {signed[a.id].signature.slice(0, 22)}…
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {done.length > 0 && (
        <Panel style={{ marginTop: 16 }}>
          <SectionTag>Completed · signed &amp; anchored</SectionTag>
          <div style={{ display: "grid", gap: 8 }}>
            {done.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: color.txt }}>{a.athleteName || a.athleteId.slice(0, 8)} · {a.assetId.slice(0, 10)} <span style={{ color: color.mut2, fontFamily: font.mono, fontSize: 10 }}>· {a.appraiserName}</span></span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: font.display, fontSize: 18, color: color.goldHi }}>{a.appraisedDisplay}</span>
                  <Badge tone="win">{a.authenticated ? "signed ✓" : "verified ✓"}</Badge>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
