/**
 * CrownX — CONSUMER subscription model (source of truth).
 *
 * Canonical numbers transcribed verbatim from "✅ Subscription Model.docx".
 * This is the COLLECTOR/CREATOR plan ladder (Free / Premium / Legacy). It is a
 * SEPARATE pricing surface from the enterprise/tenant SaaS billing in
 * `@crownx-jewel/shared-billing` + `billing-metering-service`, which remains
 * untouched (PRICING-LOCK). Numbers in this file are authoritative for the
 * consumer surface; UI must render FROM here, never hardcode.
 *
 * Money is always in integer cents (USD). Three distinct, STACKING price
 * dimensions exist (the user's clarification — "all additions to the price"):
 *   1. subscription      — the monthly tier fee below
 *   2. royalty-keep       — a separate add-on that raises your share of the
 *                           10% lifetime royalty (see royalties.ts)
 *   3. royalty buyout     — a separate lump-sum transaction (see buyout.ts)
 */

export type ConsumerTierKey = "free" | "premium" | "legacy";

export type MarketplaceAccess = "view_only" | "full";
export type UploadLimit = number | "unlimited";

export interface ConsumerTier {
  key: ConsumerTierKey;
  name: string;
  tagline: string;
  bestFor: string;
  /** monthly subscription price in cents */
  monthlyPriceCents: number;
  /** free-trial length in days (0 = no trial) */
  trialDays: number;
  /** per-COA minting fee in cents (charged on each mint, regardless of tier fee) */
  mintFeeCents: number;
  /** COAs mintable per month */
  monthlyMintLimit: UploadLimit;
  marketplaceAccess: MarketplaceAccess;
  /** marketplace buy/sell interactions per month ("unlimited" once full access) */
  marketplaceInteractionsPerMonth: UploadLimit;
  wallet: string;
  aiProcessingTime: string;
  marketplaceBoostsPerMonth: number;
  supportSla: string;
  /** baseline collector share of the 10% royalty, in bps of that royalty (10000 = 100% of the 10%) */
  baseRoyaltyKeepBps: number;
  /** max keep reachable on this tier via royalty-keep add-ons (bps of the 10%) */
  maxRoyaltyKeepBps: number;
  features: string[];
  /** highlighted on the pricing grid */
  highlight?: boolean;
}

/**
 * The 10% lifetime resale royalty is fixed platform-wide; tiers (and the
 * royalty-keep add-ons) only change how much of THAT 10% the collector keeps.
 */
export const LIFETIME_ROYALTY_RATE_BPS = 1000; // 10.00%

export const CONSUMER_TIERS: Record<ConsumerTierKey, ConsumerTier> = {
  free: {
    key: "free",
    name: "Starter",
    tagline: "Free",
    bestFor: "New users, students, or casual collectors",
    monthlyPriceCents: 0,
    trialDays: 0,
    mintFeeCents: 299, // $2.99
    monthlyMintLimit: "unlimited",
    marketplaceAccess: "view_only",
    marketplaceInteractionsPerMonth: 1,
    wallet: "Auto-generated custodial wallet",
    aiProcessingTime: "Up to 12 hrs",
    marketplaceBoostsPerMonth: 0,
    supportSla: "Email (48–72 hr response)",
    baseRoyaltyKeepBps: 5000, // keeps 50% of the 10% by default (configurable)
    maxRoyaltyKeepBps: 5000, // Starter cannot buy royalty-keep boosts
    features: [
      "Unlimited minting COAs / month",
      "Unlimited drafts",
      "Unlimited P2P sales negotiation",
      "Gifting / receiving items",
      "AI authentication: video scan + angle triangulation, signature recognition, human review on flags",
      "Instant auto verification (QR → item → GREEN/RED)",
      "Legacy Circle (Basic): digital COA ownership, view sold COAs",
      "Monthly quests + marketplace gamification (view)",
      "Upgrade credits via referrals & engagement"
    ]
  },
  premium: {
    key: "premium",
    name: "Premium",
    tagline: "$9.99 / month",
    bestFor: "Rising creators, students, hobbyist collectors",
    monthlyPriceCents: 999, // $9.99
    trialDays: 7,
    mintFeeCents: 99, // $0.99
    monthlyMintLimit: 6,
    marketplaceAccess: "full",
    marketplaceInteractionsPerMonth: "unlimited",
    wallet: "Personal wallet integration (MetaMask, WalletConnect)",
    aiProcessingTime: "Up to 30 mins",
    marketplaceBoostsPerMonth: 1,
    supportSla: "Priority email (within 24 hrs)",
    baseRoyaltyKeepBps: 7000, // 70% of the 10%
    maxRoyaltyKeepBps: 8000, // can boost up to 80%
    highlight: true,
    features: [
      "6 minting COAs / month + unlimited drafts",
      "Heirloom: gift rights for consecutive owners",
      "Unlimited P2P sales / month",
      "Private listings (invite-only / stealth)",
      "Full marketplace (buy / sell)",
      "Smart COA with live QR refresh (every 5 min)",
      "Downloadable PDF COA + embedded AI metadata",
      "Legacy Circle (Upgraded): early autograph events, private livestreams, BTS content",
      "1 marketplace boost / month"
    ]
  },
  legacy: {
    key: "legacy",
    name: "Legacy",
    tagline: "$19.99 / month",
    bestFor: "Serious collectors, verified athletes, high-value originators",
    monthlyPriceCents: 1999, // $19.99
    trialDays: 15,
    mintFeeCents: 99, // $0.99
    monthlyMintLimit: "unlimited",
    marketplaceAccess: "full",
    marketplaceInteractionsPerMonth: "unlimited",
    wallet: "Hot & cold wallet + multisig (team / school compliance)",
    aiProcessingTime: "Up to 5 mins",
    marketplaceBoostsPerMonth: 3,
    supportSla: "Dedicated concierge, live chat, onboarding",
    baseRoyaltyKeepBps: 8000, // 80% of the 10%
    maxRoyaltyKeepBps: 8500, // can boost up to the platform max of 85%
    features: [
      "Unlimited minting COAs + unlimited drafts",
      "AI memorabilia matchmaking (similar-item suggestions)",
      "Smart QR COA (rotating every 5 min) + public/private provenance ledger",
      "Royalties dashboard: real-time resale alerts, custom splits, geo-mapped insights, exportable statements",
      "Creator tools: custom COA branding, Legacy Collections, whitelabel storefront, fractional ownership",
      "Legacy Circle (Elite): verified badge, VIP vault, NFT ticketing, fan leaderboard",
      "Monthly branded Legacy Report (uploads, sales, royalties, trends)",
      "Security: anti-copy QR, two-factor KYC, on-chain fraud detection",
      "3 marketplace boosts / month"
    ]
  }
};

export const CONSUMER_TIER_ORDER: ConsumerTierKey[] = ["free", "premium", "legacy"];

export function getTier(key: ConsumerTierKey): ConsumerTier {
  return CONSUMER_TIERS[key];
}

export function listConsumerTiers(): ConsumerTier[] {
  return CONSUMER_TIER_ORDER.map((k) => CONSUMER_TIERS[k]);
}

export function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
