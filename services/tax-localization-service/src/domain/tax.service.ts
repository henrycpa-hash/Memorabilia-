import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  applyWithholding,
  determineTax,
  type TaxDeterminationInput,
  type TaxDeterminationResult,
  type TaxJurisdictionRules,
  type TaxJurisdictionStatus
} from "@crownx-jewel/shared-tax";

export type TaxJurisdiction = {
  id: string;
  countryCode: string;
  regionCode: string | null;
  displayName: string;
  rules: TaxJurisdictionRules;
  status: TaxJurisdictionStatus;
  createdAt: string;
};

export type TaxDetermination = {
  id: string;
  jurisdictionId: string;
  jurisdictionDisplay: string;
  referenceType: string;
  referenceId: string;
  netAmountCents: number;
  result: TaxDeterminationResult;
  createdAt: string;
};

export type TaxProfile = {
  id: string;
  scopeType: "tenant" | "partner" | "creator";
  scopeId: string;
  defaultJurisdictionId: string | null;
  /** Withholding rate in bps applied when scope is a payee. */
  withholdingRateBps: number;
  vatNumber: string | null;
  exemptionCertificate: string | null;
  createdAt: string;
};

const jurisdictions: TaxJurisdiction[] = [];
const determinations: TaxDetermination[] = [];
const profiles: TaxProfile[] = [];

/** Seed common jurisdictions on boot. */
function seed() {
  if (jurisdictions.length > 0) return;
  const seeds: Array<{ country: string; region: string | null; name: string; rules: TaxJurisdictionRules }> = [
    {
      country: "US", region: "CA", name: "United States — California",
      rules: { entries: [{ ruleKey: "ca_sales", ruleType: "sales_tax", rateBps: 725 }] }
    },
    {
      country: "US", region: "NY", name: "United States — New York",
      rules: { entries: [{ ruleKey: "ny_sales", ruleType: "sales_tax", rateBps: 800 }] }
    },
    {
      country: "GB", region: null, name: "United Kingdom",
      rules: { entries: [
        { ruleKey: "uk_vat_b2b", ruleType: "vat", rateBps: 2000, reverseCharge: true },
        { ruleKey: "uk_vat", ruleType: "vat", rateBps: 2000 }
      ] }
    },
    {
      country: "DE", region: null, name: "Germany",
      rules: { entries: [
        { ruleKey: "de_vat_b2b", ruleType: "vat", rateBps: 1900, reverseCharge: true },
        { ruleKey: "de_vat", ruleType: "vat", rateBps: 1900 }
      ] }
    },
    {
      country: "FR", region: null, name: "France",
      rules: { entries: [
        { ruleKey: "fr_vat_b2b", ruleType: "vat", rateBps: 2000, reverseCharge: true },
        { ruleKey: "fr_vat", ruleType: "vat", rateBps: 2000 }
      ] }
    },
    {
      country: "CA", region: null, name: "Canada (federal GST)",
      rules: { entries: [{ ruleKey: "ca_gst", ruleType: "gst", rateBps: 500 }] }
    },
    {
      country: "AU", region: null, name: "Australia",
      rules: { entries: [{ ruleKey: "au_gst", ruleType: "gst", rateBps: 1000 }] }
    },
    {
      country: "JP", region: null, name: "Japan",
      rules: { entries: [{ ruleKey: "jp_consumption_tax", ruleType: "vat", rateBps: 1000 }] }
    }
  ];
  for (const s of seeds) {
    jurisdictions.push({
      id: newId(),
      countryCode: s.country,
      regionCode: s.region,
      displayName: s.name,
      rules: s.rules,
      status: "active",
      createdAt: nowIso()
    });
  }
}
seed();

export const taxService = {
  async createJurisdiction(input: {
    countryCode: string;
    regionCode?: string;
    displayName: string;
    rules: TaxJurisdictionRules;
  }): Promise<TaxJurisdiction> {
    const j: TaxJurisdiction = {
      id: newId(),
      countryCode: input.countryCode,
      regionCode: input.regionCode || null,
      displayName: input.displayName,
      rules: input.rules,
      status: "active",
      createdAt: nowIso()
    };
    jurisdictions.push(j);
    return j;
  },

  archiveJurisdiction(id: string) {
    const j = jurisdictions.find((x) => x.id === id);
    if (!j) return null;
    j.status = "archived";
    return j;
  },

  async determine(input: {
    jurisdictionId: string;
    referenceType: TaxDeterminationInput["subjectType"];
    referenceId: string;
    netAmountCents: number;
    isB2B: boolean;
    buyerRegion: string;
    sellerRegion: string;
  }): Promise<TaxDetermination | null> {
    const j = jurisdictions.find((x) => x.id === input.jurisdictionId && x.status === "active");
    if (!j) return null;
    const result = determineTax(
      {
        subjectType: input.referenceType,
        subjectId: input.referenceId,
        netAmountCents: input.netAmountCents,
        isB2B: input.isB2B,
        buyerRegion: input.buyerRegion,
        sellerRegion: input.sellerRegion
      },
      j.rules
    );
    const det: TaxDetermination = {
      id: newId(),
      jurisdictionId: j.id,
      jurisdictionDisplay: j.displayName,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      netAmountCents: input.netAmountCents,
      result,
      createdAt: nowIso()
    };
    determinations.push(det);
    await publishOutbox({
      id: newId(),
      eventType: "tax.determination.completed",
      aggregateId: det.id,
      aggregateType: "tax_determination",
      payload: { id: det.id, jurisdictionDisplay: j.displayName, ruleKey: result.ruleKey, taxCents: result.taxAmountCents },
      occurredAt: nowIso()
    });
    return det;
  },

  /** Compute withholding for a payout. */
  computeWithholding(grossAmountCents: number, rateBps: number) {
    return applyWithholding(grossAmountCents, rateBps);
  },

  async createProfile(input: {
    scopeType: "tenant" | "partner" | "creator";
    scopeId: string;
    defaultJurisdictionId?: string;
    withholdingRateBps?: number;
    vatNumber?: string;
    exemptionCertificate?: string;
  }): Promise<TaxProfile> {
    const p: TaxProfile = {
      id: newId(),
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      defaultJurisdictionId: input.defaultJurisdictionId || null,
      withholdingRateBps: input.withholdingRateBps || 0,
      vatNumber: input.vatNumber || null,
      exemptionCertificate: input.exemptionCertificate || null,
      createdAt: nowIso()
    };
    profiles.push(p);
    return p;
  },

  // Read APIs
  listJurisdictions: () => jurisdictions.filter((j) => j.status === "active"),
  findJurisdiction: (id: string) => jurisdictions.find((j) => j.id === id) || null,
  jurisdictionByCountry: (country: string, region?: string) =>
    jurisdictions.find((j) => j.countryCode === country && j.regionCode === (region || null)) || null,
  listDeterminations: (limit?: number) => {
    const sorted = [...determinations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  determinationsByReference: (referenceType: string, referenceId: string) =>
    determinations.filter((d) => d.referenceType === referenceType && d.referenceId === referenceId),
  listProfiles: () => [...profiles],
  profileByScope: (scopeType: string, scopeId: string) =>
    profiles.find((p) => p.scopeType === scopeType && p.scopeId === scopeId) || null
};
