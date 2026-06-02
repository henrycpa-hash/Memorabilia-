import { MarketingPage, type MarketingContent } from "../_marketing/Marketing";

export const metadata = { title: "CrownX — For Collectors" };

const content: MarketingContent = {
  kicker: "For Collectors",
  title: "Own the moment. Climb the ranks.",
  lead: "A vault of graded, chain-anchored slabs — each with a live floor, a royalty for life, and a /LV99 status that only goes up.",
  sections: [
    {
      tag: "Why collectors stay",
      heading: "The reasons to come back",
      cards: [
        { t: "Living slabs", d: "Every slab is graded and chain-anchored, and carries a floor that moves while you sleep." },
        { t: "/LV99 status", d: "A visible rank that climbs as you mint, streak, and invite — and gates the rarest founder drops." },
        { t: "Streaks & drops", d: "Daily multipliers, limited Genesis drops, and pack-rips keep the loop alive." },
        { t: "Royalties for life", d: "Earn 10% on every resale of slabs you originate — keep up to 85% with your plan." }
      ]
    },
    {
      tag: "The loop",
      heading: "Mint, share, ascend",
      steps: [
        { n: "01", t: "Mint", d: "Claim a slab — the reveal hooks you, the COA secures it." },
        { n: "02", t: "Share", d: "Every mint auto-renders a share card that lands native on iMessage, X, and TikTok." },
        { n: "03", t: "Ascend", d: "First mint earns XP, opens /LV99, and unlocks the invite that grows the loop." }
      ]
    }
  ],
  cta: { label: "Enter the Vault →", href: "/welcome" }
};

export default function Page() {
  return <MarketingPage content={content} />;
}
