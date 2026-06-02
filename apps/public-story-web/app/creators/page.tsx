import { MarketingPage, type MarketingContent } from "../_marketing/Marketing";

export const metadata = { title: "CrownX — For Creators" };

const content: MarketingContent = {
  kicker: "For Creators & Athletes",
  title: "Your signature. Your stream.",
  lead: "Athletes, artists, and originators earn on every resale of what they made — and a share is held and waiting the moment a fan mints it.",
  sections: [
    {
      tag: "Why creators win",
      heading: "Built for the people who make the moment",
      cards: [
        { t: "Royalties held for you", d: "Your slice accrues whether or not you've joined. Verify once to unlock it — every future resale pays you directly." },
        { t: "Keep up to 90%", d: "Originators set custom splits with co-creators, agents, and schools, and subscribe to raise their share." },
        { t: "Whitelabel storefront", d: "Athletes, artists, and universities get a branded storefront, Legacy Collections, and fractional ownership tools." },
        { t: "Donate or sell", d: "Route your slice to charity with a tracked record, or sell the stream for cash now — your choice, per piece." }
      ]
    },
    {
      tag: "The claim funnel",
      heading: "From held royalties to wallet in four taps",
      steps: [
        { n: "01", t: "The hook", d: "See exactly what fans have already earned you, held and waiting." },
        { n: "02", t: "Verify", d: "One-tap biometric confirms you're the signer — your face never leaves your device." },
        { n: "03", t: "Choose", d: "Claim, claim + subscribe for a bigger share, donate, or sell the stream." },
        { n: "04", t: "Earn", d: "You're verified and earning on every future resale." }
      ]
    }
  ],
  cta: { label: "Start the athlete claim →", href: "/welcome" }
};

export default function Page() {
  return <MarketingPage content={content} />;
}
