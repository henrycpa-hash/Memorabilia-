"use client";

import { useEffect, useState } from "react";
import { quoteStreamSale, formatUsdCents } from "@crownx-jewel/shared-pricing";
import { Crown, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

/**
 * Athlete onboarding — the claim funnel from `crownx-athlete-onboarding.html`.
 * Hook (held royalties) → biometric verify → fork (claim / subscribe / donate /
 * sell stream) → done. Wires to the athlete_claims / treasury_holds concepts;
 * the "sell stream" FMV is computed from @crownx-jewel/shared-pricing.
 *
 * Integrity: donation tracking documents a contribution, it does not determine
 * deductibility. The biometric never leaves the device (WebAuthn in prod).
 */

const HELD_PIECES = [
  { icon: "🎴", name: "Game-Worn Jersey · 1/1", meta: "2 RESALES · LAST $42K", valueCents: 1260000, floorCents: 4200000, vel: 0.9 },
  { icon: "🖊", name: "Signed Championship Ball", meta: "3 RESALES · LAST $38K", valueCents: 840000, floorCents: 3800000, vel: 1.2 },
  { icon: "📸", name: "+ 5 more pieces", meta: "HELD · TAP TO VIEW ALL", valueCents: 380000, floorCents: 1500000, vel: 0.6 }
];
const HELD_TOTAL_CENTS = HELD_PIECES.reduce((a, p) => a + p.valueCents, 0); // $24,800

const TIER_SHARE: Record<string, string> = { free: "70%", pro: "80%", elite: "90%" };
type Choice = "claim" | "subscribe" | "donate" | "sell";

export default function AthletePage() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice>("claim");
  const [tier, setTier] = useState<"free" | "pro" | "elite">("pro");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secs, setSecs] = useState(71 * 3600 + 58 * 60 + 4);

  useEffect(() => {
    if (step !== 1) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step]);

  // sell-stream FMV across held pieces (sole-originator buyout)
  const sellQuote = quoteStreamSale({
    floorCents: HELD_PIECES.reduce((a, p) => a + p.floorCents, 0),
    shareBps: 7000,
    resaleVelocityPerYear: 0.8,
    annualAppreciation: 0.15,
    mode: "lump"
  });

  function verify() {
    if (scanning || verified) return;
    setScanning(true);
    if (navigator.vibrate) navigator.vibrate(12);
    setTimeout(() => {
      setScanning(false);
      setVerified(true);
      if (navigator.vibrate) navigator.vibrate([12, 40, 28]);
      setTimeout(() => setStep(2), 700);
    }, 1500);
  }

  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div style={{ minHeight: "70vh", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 8 }}>
      <div style={{ width: "100%", maxWidth: 400, background: `linear-gradient(170deg, ${color.ink}, ${color.void})`, border: `1px solid ${color.line2}`, borderRadius: 26, padding: "26px 22px 30px", boxShadow: "0 40px 100px -30px rgba(0,0,0,0.8)" }}>
        {/* progress dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 22 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: i === step ? 4 : "50%", background: i === step ? color.cyan : color.line2, transition: ".3s" }} />
          ))}
        </div>

        {/* STEP 0 — the hook */}
        {step === 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "center" }}><Crown size={34} /></div>
            <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 26, textAlign: "center", margin: "6px 0 0", lineHeight: 1.1 }}>
              Marcus, you have<br /><span style={{ color: color.cyanHi }}>royalties waiting.</span>
            </h1>
            <p style={{ color: color.mut, fontSize: 13, textAlign: "center", marginTop: 8 }}>
              Fans have minted authenticated memorabilia you signed. Your share is held in the CrownX Royalty Vault — verify to claim it.
            </p>
            <div style={{ textAlign: "center", margin: "26px 0" }}>
              <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: color.gold }}>Held for you</div>
              <div style={{ fontFamily: font.display, fontSize: 52, color: color.goldHi, lineHeight: 1, marginTop: 6, textShadow: "0 0 30px rgba(247,224,138,0.3)" }}>{formatUsdCents(HELD_TOTAL_CENTS)}</div>
              <div style={{ fontSize: 12, color: color.mut, marginTop: 8 }}>across 7 authenticated pieces · earning on every resale</div>
            </div>
            <div style={{ margin: "18px 0" }}>
              {HELD_PIECES.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: `1px solid ${color.line}`, borderRadius: 12, marginBottom: 8, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, flex: "none", background: `linear-gradient(135deg, ${color.cyanDk}, #0a2c34)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{p.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, marginTop: 2 }}>{p.meta}</div>
                  </div>
                  <div style={{ fontFamily: font.display, fontSize: 17, color: color.goldHi }}>{formatUsdCents(p.valueCents)}</div>
                </div>
              ))}
            </div>
            <button style={{ ...buttonStyle("primary"), width: "100%" }} onClick={() => setStep(1)}>Verify &amp; claim →</button>
            <p style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, lineHeight: 1.6, marginTop: 16, textAlign: "center" }}>
              Your slice accrues whether or not you join. Verifying unlocks it — and every future resale pays you directly.
            </p>
          </div>
        )}

        {/* STEP 1 — biometric verify */}
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>🔐</div>
            <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 24, margin: "6px 0 0" }}>Verify it&apos;s <span style={{ color: color.cyanHi }}>you</span></h1>
            <p style={{ color: color.mut, fontSize: 13, marginTop: 8 }}>One-tap biometric confirmation. This proves you&apos;re the signer — your face never leaves your device.</p>
            <div onClick={verify} style={{ margin: "26px auto 18px", width: 110, height: 110, position: "relative", cursor: "pointer" }}>
              <div style={{ width: 110, height: 110, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 40%, rgba(63,217,212,0.2), rgba(63,217,212,0.04))", border: `2px solid ${verified ? color.win : scanning ? color.cyan : color.cyanDk}`, boxShadow: scanning ? "0 0 38px rgba(63,217,212,0.5)" : verified ? "0 0 38px rgba(55,211,154,0.5)" : "none", transition: ".3s", overflow: "hidden" }}>
                {scanning && <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: `linear-gradient(90deg, transparent, ${color.cyanHi}, transparent)`, animation: "cx-scan 1.1s ease-in-out infinite" }} />}
                <span style={{ fontSize: 46 }}>{verified ? "✓" : "😊"}</span>
              </div>
            </div>
            <div style={{ fontFamily: font.mono, fontSize: 11, minHeight: 16, margin: "10px 0", color: verified ? color.win : color.mut }}>
              {verified ? "✓ Identity confirmed" : scanning ? "Matching signer identity…" : "Tap to verify with Face ID"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", border: `1px solid rgba(217,168,46,0.3)`, borderRadius: 11, background: "rgba(217,168,46,0.05)", marginTop: 14 }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <div style={{ fontFamily: font.mono, fontSize: 11, color: color.goldHi }}>Verify invite open · <b>{hh}:{mm}:{ss}</b> left</div>
            </div>
            <p style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, lineHeight: 1.6, marginTop: 14 }}>
              Verify in person at a live signing, or accept within 24–72hrs. Live authentication can upgrade your share to <b style={{ color: color.gold }}>50%</b> on co-signed pieces.
            </p>
          </div>
        )}

        {/* STEP 2 — the fork */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: "center", color: color.win, fontSize: 30 }}>✓</div>
            <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 24, textAlign: "center", margin: "6px 0 0" }}>Verified. <span style={{ color: color.cyanHi }}>What now?</span></h1>
            <p style={{ color: color.mut, fontSize: 13, textAlign: "center", marginTop: 8 }}>Your {formatUsdCents(HELD_TOTAL_CENTS)} is unlocked. Choose how to handle it — and how future royalties pay out.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              <ForkChoice sel={choice === "claim"} on={() => setChoice("claim")} name="Claim it" badge="DEFAULT" tone="win" desc="Release your balance to your wallet now. Keep your standard 70% share on pieces you originate." />
              <div>
                <ForkChoice sel={choice === "subscribe"} on={() => setChoice("subscribe")} name="Claim + Subscribe" badge="KEEP MORE" tone="gold" desc="Claim now AND raise your share up to 90% — plus faster payouts and verify priority." />
                {choice === "subscribe" && (
                  <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                    {(["free", "pro", "elite"] as const).map((t) => (
                      <button key={t} onClick={() => setTier(t)} style={{ flex: 1, padding: "11px 8px", borderRadius: 11, border: `1px solid ${tier === t ? color.gold : color.line}`, background: tier === t ? "rgba(217,168,46,0.08)" : "transparent", cursor: "pointer", textAlign: "center" }}>
                        <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, textTransform: "uppercase" }}>{t}</div>
                        <div style={{ fontFamily: font.display, fontSize: 22, color: color.goldHi, marginTop: 3 }}>{TIER_SHARE[t]}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ForkChoice sel={choice === "donate"} on={() => setChoice("donate")} name="Donate my slice" badge="TAX-TRACKED" tone="gold" desc="Route your royalty to charity. CrownX emits a timestamped, valued contribution record. Locks at first resale." />
              <ForkChoice sel={choice === "sell"} on={() => setChoice("sell")} name="Sell the stream" badge="CASH NOW" tone="cyan" desc={`Take the FMV of your lifetime royalty (${sellQuote.display.fmv}) as a lump sum — a buyer inherits the future stream.`} />
            </div>
            <button style={{ ...buttonStyle("primary"), width: "100%", marginTop: 18 }} onClick={() => setStep(3)}>
              Confirm: {choice === "claim" ? "Claim it" : choice === "subscribe" ? "Claim + Subscribe" : choice === "donate" ? "Donate my slice" : "Sell the stream"} →
            </button>
            <p style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, lineHeight: 1.6, marginTop: 12, textAlign: "center" }}>
              <b style={{ color: color.gold }}>Note:</b> donation tracking documents a contribution — it does not determine deductibility. Confirm treatment with your tax advisor.
            </p>
          </div>
        )}

        {/* STEP 3 — done */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 90, height: 90, borderRadius: "50%", margin: "20px auto", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle, rgba(55,211,154,0.2), transparent)", border: `2px solid ${color.win}`, fontSize: 42 }}>👑</div>
            <DoneSummary choice={choice} tier={tier} held={formatUsdCents(HELD_TOTAL_CENTS)} fmv={sellQuote.display.fmv} tierShare={TIER_SHARE[tier]} crownxFloor={sellQuote.crownxFloorBps / 100} />
            <button style={{ ...buttonStyle("gold"), width: "100%", marginTop: 14 }} onClick={() => { setStep(0); setChoice("claim"); setVerified(false); }}>Enter your CrownX dashboard →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ForkChoice({ sel, on, name, badge, tone, desc }: { sel: boolean; on: () => void; name: string; badge: string; tone: "cyan" | "gold" | "win"; desc: string }) {
  return (
    <div onClick={on} style={{ padding: 15, border: `1px solid ${sel ? color.cyan : color.line2}`, borderRadius: 14, background: sel ? "rgba(63,217,212,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: ".2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: font.display, fontSize: 17 }}>{name}</div>
        <Badge tone={tone}>{badge}</Badge>
      </div>
      <div style={{ fontSize: 12, color: color.mut, marginTop: 6 }}>{desc}</div>
    </div>
  );
}

function DoneSummary({ choice, tier, held, fmv, tierShare, crownxFloor }: { choice: Choice; tier: string; held: string; fmv: string; tierShare: string; crownxFloor: number }) {
  let title: React.ReactNode, sub: string, rows: [string, string][];
  if (choice === "claim") {
    title = <>You&apos;re in, <span style={{ color: color.cyanHi }}>Marcus.</span></>;
    sub = `${held} released to your wallet. You're verified and earning.`;
    rows = [["Claimed now", held], ["Future share", "70% (originated)"], ["Status", "Verified ✓"]];
  } else if (choice === "subscribe") {
    title = <>Locked in at <span style={{ color: color.goldHi }}>{tierShare}.</span></>;
    sub = `${held} claimed. Your royalty share is now ${tierShare} on pieces you originate.`;
    rows = [["Claimed now", held], ["New share", `${tierShare} (${tier.toUpperCase()})`], ["Perks", "Faster payouts · verify priority"], ["Status", "Verified ✓ · Subscribed"]];
  } else if (choice === "donate") {
    title = <>Donation <span style={{ color: color.goldHi }}>set.</span></>;
    sub = "Your slice routes to charity with a tracked contribution record. Toggle until each piece's first resale.";
    rows = [["Claimed now", held], ["Future slice", "Donated (tracked)"], ["Record", "Per-resale, timestamped"], ["Status", "Verified ✓ · Donation elected"]];
  } else {
    title = <>Stream <span style={{ color: color.cyanHi }}>sold.</span></>;
    sub = `You took the FMV of your lifetime royalty as a lump sum. A buyer holds the future stream; CrownX keeps its ${crownxFloor}% floor.`;
    rows = [["Claimed now", held], ["Stream buyout (FMV)", `+${fmv}`], ["Future royalty", "Transferred to buyer"], ["Status", "Verified ✓ · Rights sold"]];
  }
  return (
    <div>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 24, margin: 0 }}>{title}</h1>
      <p style={{ color: color.mut, fontSize: 13, marginTop: 8 }}>{sub}</p>
      <div style={{ padding: 14, border: `1px solid ${color.line}`, borderRadius: 12, background: "rgba(255,255,255,0.02)", marginTop: 14, textAlign: "left" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 13, borderBottom: i < rows.length - 1 ? `1px solid ${color.line}` : "none" }}>
            <span style={{ color: color.mut }}>{r[0]}</span>
            <span style={{ fontWeight: 600, color: r[1].includes("$") || r[1].includes("%") ? color.goldHi : color.cyanHi }}>{r[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
