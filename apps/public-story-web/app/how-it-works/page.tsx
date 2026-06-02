import { MarketingPage, type MarketingContent } from "../_marketing/Marketing";

export const metadata = { title: "CrownX — How It Works" };

const content: MarketingContent = {
  kicker: "The Genesis COA Pipeline",
  title: "Authenticity, captured at the moment.",
  lead: "Every CrownX slab is born from a live capture and anchored on-chain. Here's the pipeline that turns a real object into a graded, tradeable, royalty-bearing collectible.",
  sections: [
    {
      tag: "The pipeline",
      heading: "Five steps from object to slab",
      steps: [
        { n: "01", t: "Capture", d: "AI live-capture: video scan + angle triangulation + signature/marking recognition at the moment of the moment." },
        { n: "02", t: "Authenticate", d: "Automated checks plus human review on flagged items produce a confidence-graded result." },
        { n: "03", t: "Mint", d: "A Genesis COA is issued — tamper-evident, with embedded metadata and a smart QR that refreshes every 5 min." },
        { n: "04", t: "Anchor", d: "The provenance record is anchored on-chain with quantum-resistant signing — defensible for the long haul." },
        { n: "05", t: "Live", d: "The slab enters the market with a live floor, a /LV99 boost, and a 10% royalty that pays on every resale." }
      ]
    },
    {
      tag: "Instant verification",
      heading: "Scan to verify in three taps",
      steps: [
        { n: "1", t: "Scan QR", d: "Point your phone at the slab's rotating QR code." },
        { n: "2", t: "Scan item", d: "Confirm the physical markings against the COA." },
        { n: "3", t: "Result", d: "GREEN CHECK verified or RED X not verified — instantly." }
      ]
    }
  ],
  cta: { label: "See the funnel →", href: "/welcome" }
};

export default function Page() {
  return <MarketingPage content={content} />;
}
