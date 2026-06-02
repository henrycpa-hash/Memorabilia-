/**
 * Wave 9 tax-localization primitives. Jurisdiction tax rules, withholding
 * logic, deterministic invoice tax computation.
 *
 * Wave 9 ships a deterministic in-house engine. Wave 10 will swap in
 * real provider SDKs (Avalara, TaxJar, Stripe Tax) behind the same shape.
 */
export type TaxJurisdictionStatus = "active" | "archived";

export type TaxRuleType =
  | "vat"          // EU VAT, UK VAT, etc.
  | "gst"          // GST/HST style
  | "sales_tax"    // US state/local sales tax
  | "withholding"  // royalty / non-resident withholding
  | "exempt";

export type TaxJurisdictionRules = {
  /** Per-rule entries; first match wins. */
  entries: Array<{
    ruleKey: string;
    ruleType: TaxRuleType;
    /** Bps = basis points (10000 bps = 100%). 1500 bps = 15%. */
    rateBps: number;
    /** Treated as final = no further rules applied if matched. */
    final?: boolean;
    /** Treated as inclusive of price (compute backwards). */
    inclusive?: boolean;
    /** Optional reverse-charge flag (B2B EU). */
    reverseCharge?: boolean;
  }>;
};

export type TaxDeterminationInput = {
  /** Subject — invoice line, royalty payout, etc. */
  subjectType: "invoice_line" | "royalty_payout" | "campaign_fee" | "subscription_fee";
  subjectId: string;
  /** Pre-tax amount in cents. */
  netAmountCents: number;
  /** Whether the buyer is a registered business (B2B). */
  isB2B: boolean;
  /** Buyer/payee region — used for reverse-charge logic. */
  buyerRegion: string;
  /** Seller's primary jurisdiction. */
  sellerRegion: string;
};

export type TaxDeterminationResult = {
  ruleKey: string | null;
  ruleType: TaxRuleType | null;
  taxAmountCents: number;
  totalAmountCents: number;
  rateBps: number;
  reverseCharge: boolean;
  rationale: string;
  determinedAt: string;
};

/**
 * Apply jurisdiction rules to determine the tax amount for a subject.
 * Walks rules in order; uses first matching rule. Returns zero-tax
 * outcome when no rule matches (treated as exempt).
 */
export function determineTax(
  input: TaxDeterminationInput,
  rules: TaxJurisdictionRules
): TaxDeterminationResult {
  for (const r of rules.entries) {
    if (r.ruleType === "exempt") {
      return {
        ruleKey: r.ruleKey,
        ruleType: r.ruleType,
        taxAmountCents: 0,
        totalAmountCents: input.netAmountCents,
        rateBps: 0,
        reverseCharge: false,
        rationale: `exempt rule ${r.ruleKey}`,
        determinedAt: new Date().toISOString()
      };
    }
    // Reverse-charge: B2B cross-border, no seller-side tax collected
    if (r.reverseCharge && input.isB2B && input.buyerRegion !== input.sellerRegion) {
      return {
        ruleKey: r.ruleKey,
        ruleType: r.ruleType,
        taxAmountCents: 0,
        totalAmountCents: input.netAmountCents,
        rateBps: 0,
        reverseCharge: true,
        rationale: `B2B reverse-charge under ${r.ruleKey}; buyer self-accounts in ${input.buyerRegion}`,
        determinedAt: new Date().toISOString()
      };
    }
    let taxCents = 0;
    let totalCents = input.netAmountCents;
    if (r.inclusive) {
      // tax = net - (net * 10000 / (10000 + rateBps))
      const exTax = Math.floor((input.netAmountCents * 10000) / (10000 + r.rateBps));
      taxCents = input.netAmountCents - exTax;
      totalCents = input.netAmountCents;
    } else {
      taxCents = Math.floor((input.netAmountCents * r.rateBps) / 10000);
      totalCents = input.netAmountCents + taxCents;
    }
    return {
      ruleKey: r.ruleKey,
      ruleType: r.ruleType,
      taxAmountCents: taxCents,
      totalAmountCents: totalCents,
      rateBps: r.rateBps,
      reverseCharge: false,
      rationale: `${r.ruleType} ${r.rateBps / 100}% under rule ${r.ruleKey}`,
      determinedAt: new Date().toISOString()
    };
  }
  return {
    ruleKey: null,
    ruleType: null,
    taxAmountCents: 0,
    totalAmountCents: input.netAmountCents,
    rateBps: 0,
    reverseCharge: false,
    rationale: "no matching rule; treated as zero-tax",
    determinedAt: new Date().toISOString()
  };
}

/** Apply withholding from a gross payout amount. Returns net + withheld. */
export function applyWithholding(
  grossAmountCents: number,
  withholdingRateBps: number
): { netAmountCents: number; withheldCents: number } {
  const withheld = Math.floor((grossAmountCents * withholdingRateBps) / 10000);
  return { netAmountCents: grossAmountCents - withheld, withheldCents: withheld };
}
