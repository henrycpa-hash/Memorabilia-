"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

type Appraisal = {
  id: string; athleteId: string; athleteName?: string; assetId: string; requestedBy: string;
  modelImpliedDisplay: string; appraisedDisplay: string | null; status: "queued" | "in_review" | "completed";
  appraiserId?: string;
};

/** Appraiser console — human-in-the-loop valuation queue. */
export default function AppraiserPage() {
  const [items, setItems] = useState<Appraisal[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const me = "appraiser_jordan";

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${GATEWAY}/api/appraisals`).then((x) => x.json());
      setItems(Array.isArray(r) ? r : []);
    } catch {
      /* offline */
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function claim(id: string) {
    await fetch(`${GATEWAY}/api/appraisals/${id}/claim`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appraiserId: me }) });
    refresh();
  }
  async function submit(id: string) {
    const v = parseFloat(vals[id] || "0");
    if (!v) return;
    await fetch(`${GATEWAY}/api/appraisals/${id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appraiserId: me, appraisedValueCents: Math.round(v * 100), notes: "Human-verified, backed by COA + index." }) });
    refresh();
  }

  const queued = items.filter((i) => i.status !== "completed");
  const done = items.filter((i) => i.status === "completed");

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <SectionTag>Appraiser Console</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>Human-in-the-loop valuations.</h1>
      <p style={{ color: color.mut, maxWidth: 620, marginTop: 0 }}>
        Requests pipe in from the platform with a model-implied value backed by the verified index. A certified appraiser
        confirms the figure; the result is anchored on-chain and assets are valued against verification.
      </p>

      <Panel glow style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTag>Queue · {queued.length} pending</SectionTag>
          <button onClick={refresh} style={{ ...buttonStyle("secondary"), padding: "6px 12px", fontSize: 12 }}>↻ Refresh</button>
        </div>
        {queued.length === 0 ? (
          <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>No requests in the queue. Request an appraisal from an athlete page to populate this.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {queued.map((a) => (
              <div key={a.id} style={{ padding: "12px 14px", border: `1px solid ${color.line}`, borderRadius: 11, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: color.txt }}>{a.athleteName || a.athleteId.slice(0, 8)} · asset {a.assetId.slice(0, 10)}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>requested by {a.requestedBy} · model-implied {a.modelImpliedDisplay}</div>
                  </div>
                  <Badge tone={a.status === "in_review" ? "gold" : "cyan"}>{a.status.replace(/_/g, " ")}</Badge>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {a.status === "queued" ? (
                    <button onClick={() => claim(a.id)} style={{ ...buttonStyle("secondary"), padding: "8px 14px", fontSize: 12 }}>Claim for review</button>
                  ) : (
                    <>
                      <input type="number" step="0.01" placeholder="appraised $" value={vals[a.id] || ""} onChange={(e) => setVals((v) => ({ ...v, [a.id]: e.target.value }))} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "9px 11px", borderRadius: 9, fontFamily: font.mono, fontSize: 13 }} />
                      <button onClick={() => submit(a.id)} style={{ ...buttonStyle("primary"), padding: "9px 16px", fontSize: 13 }}>Submit appraisal</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {done.length > 0 && (
        <Panel style={{ marginTop: 16 }}>
          <SectionTag>Completed · anchored on-chain</SectionTag>
          <div style={{ display: "grid", gap: 8 }}>
            {done.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: color.txt }}>{a.athleteName || a.athleteId.slice(0, 8)} · {a.assetId.slice(0, 10)}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: font.display, fontSize: 18, color: color.goldHi }}>{a.appraisedDisplay}</span>
                  <Badge tone="win">verified ✓</Badge>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
