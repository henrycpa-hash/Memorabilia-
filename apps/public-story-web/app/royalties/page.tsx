import { MarketingPage, type MarketingContent } from "../_marketing/Marketing";

export const metadata = { title: "CrownX — Royalties for Life" };

const content: MarketingContent = {
  kicker: "Royalties for Life",
  title: "Get paid on every resale. Forever.",
  lead: "A fixed 10% lifetime royalty rides with every CrownX slab. Each time it changes hands, you earn — and higher tiers keep more of that 10%, up to 85%.",
  sections: [
    {
      tag: "The resale hop",
      heading: "Your slice compounds with every hop",
      body: "The 10% royalty never changes. What changes is your share of it — set by your plan and any royalty-keep add-on. Here's how a single slab pays across four resales at a 70% keep.",
      table: {
        head: ["Resale", "Sale price", "10% royalty", "Your keep (70%)"],
        rows: [
          ["Hop 1", "$5,000", "$500", "$350"],
          ["Hop 2", "$12,000", "$1,200", "$840"],
          ["Hop 3", "$28,000", "$2,800", "$1,960"],
          ["Hop 4", "$60,000", "$6,000", "$4,200"]
        ]
      }
    },
    {
      tag: "Two ways to earn more",
      heading: "Keep more — or cash out now",
      cards: [
        { t: "Royalty-keep add-on", d: "A separate monthly upgrade raises your share of the 10% up to 85%. Priced apart from your subscription — it stacks." },
        { t: "Royalty buyout", d: "Sell the discounted present value of your future stream as a lump sum today, or buy someone else's on the rights market." }
      ]
    }
  ],
  cta: { label: "Open the rights market →", href: "/welcome" }
};

export default function Page() {
  return <MarketingPage content={content} />;
}
