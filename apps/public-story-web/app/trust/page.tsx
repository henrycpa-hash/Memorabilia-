import { MarketingPage, type MarketingContent } from "../_marketing/Marketing";

export const metadata = { title: "CrownX — Trust & Security" };

const content: MarketingContent = {
  kicker: "Trust & Security",
  title: "Defensible by design.",
  lead: "Authenticity you can prove, identity that never leaves your device, and a provenance ledger built to survive diligence.",
  sections: [
    {
      tag: "The guarantees",
      heading: "What keeps a CrownX slab defensible",
      cards: [
        { t: "Biometric login", d: "WebAuthn / FIDO2 passkeys. The server stores a public key — never your face or fingerprint — bound to the CrownX origin and phishing-resistant." },
        { t: "Genesis COA", d: "Tamper-evident, chain-anchored authenticity minted at capture, with a smart QR that refreshes every 5 minutes and anti-copy protection." },
        { t: "Quantum-resistant signing", d: "Post-quantum signatures keep the provenance ledger defensible for the long haul." },
        { t: "On-chain fraud detection", d: "A fraud-detection layer plus two-factor KYC for high-volume traders protects the market." }
      ]
    },
    {
      tag: "Patent",
      heading: "Patent-pending provenance",
      body: "CrownX's capture-to-anchor pipeline and royalty mechanics are patent pending (#63/704,653). Verify · Protect · Monetize — engineered to survive diligence, not just demos."
    }
  ],
  cta: { label: "Reserve a founder slab →", href: "/welcome" }
};

export default function Page() {
  return <MarketingPage content={content} />;
}
