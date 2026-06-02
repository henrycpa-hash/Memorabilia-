import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  nextAgreementStatus,
  type AgreementStatus,
  type AgreementTerms,
  type AgreementType,
  type CounterpartyType,
  type ObligationStatus,
  type ObligationType
} from "@crownx-jewel/shared-contracts";

export type Agreement = {
  id: string;
  tenantId: string | null;
  agreementType: AgreementType;
  counterpartyType: CounterpartyType;
  counterpartyName: string;
  counterpartyId: string | null;
  status: AgreementStatus;
  effectiveDate: string;
  expirationDate: string | null;
  termsJson: AgreementTerms;
  signatureState: "unsigned" | "pending_counterparty" | "pending_us" | "fully_signed";
  createdAt: string;
  updatedAt: string;
};

export type AgreementAmendment = {
  id: string;
  agreementId: string;
  amendmentNumber: number;
  status: "draft" | "active";
  effectiveDate: string;
  changesJson: Record<string, unknown>;
  createdAt: string;
};

export type ContractObligation = {
  id: string;
  agreementId: string;
  obligationType: ObligationType;
  dueDate: string;
  status: ObligationStatus;
  ownerRole: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
  satisfiedAt: string | null;
};

const agreements: Agreement[] = [];
const amendments: AgreementAmendment[] = [];
const obligations: ContractObligation[] = [];

export const contractService = {
  async createAgreement(input: {
    tenantId?: string;
    agreementType: AgreementType;
    counterpartyType: CounterpartyType;
    counterpartyName: string;
    counterpartyId?: string;
    effectiveDate: string;
    expirationDate?: string;
    termsJson?: AgreementTerms;
  }): Promise<Agreement> {
    const a: Agreement = {
      id: newId(),
      tenantId: input.tenantId || null,
      agreementType: input.agreementType,
      counterpartyType: input.counterpartyType,
      counterpartyName: input.counterpartyName,
      counterpartyId: input.counterpartyId || null,
      status: "draft",
      effectiveDate: input.effectiveDate,
      expirationDate: input.expirationDate || null,
      termsJson: input.termsJson || {},
      signatureState: "unsigned",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    agreements.push(a);
    await publishOutbox({
      id: newId(),
      eventType: "contract.agreement.created",
      aggregateId: a.id,
      aggregateType: "agreement",
      payload: a,
      occurredAt: nowIso()
    });
    return a;
  },

  approveAgreement(id: string) {
    const a = agreements.find((x) => x.id === id);
    if (!a) return null;
    a.status = "approved";
    a.updatedAt = nowIso();
    return a;
  },

  signAgreement(id: string) {
    const a = agreements.find((x) => x.id === id);
    if (!a) return null;
    a.signatureState = "fully_signed";
    a.status = "active";
    a.updatedAt = nowIso();
    return a;
  },

  /** Run a transition pass for time-based status moves (active → expiring → expired). */
  rollupStatuses() {
    const out: Agreement[] = [];
    for (const a of agreements) {
      const next = nextAgreementStatus(a.status, a.effectiveDate, a.expirationDate, nowIso());
      if (next !== a.status) {
        a.status = next;
        a.updatedAt = nowIso();
        out.push(a);
      }
    }
    return out;
  },

  async addAmendment(input: {
    agreementId: string;
    changesJson: Record<string, unknown>;
    effectiveDate: string;
  }): Promise<AgreementAmendment | null> {
    const a = agreements.find((x) => x.id === input.agreementId);
    if (!a) return null;
    const number = amendments.filter((x) => x.agreementId === a.id).length + 1;
    const am: AgreementAmendment = {
      id: newId(),
      agreementId: a.id,
      amendmentNumber: number,
      status: "active",
      effectiveDate: input.effectiveDate,
      changesJson: input.changesJson,
      createdAt: nowIso()
    };
    amendments.push(am);
    return am;
  },

  async addObligation(input: {
    agreementId: string;
    obligationType: ObligationType;
    dueDate: string;
    ownerRole: string;
    payloadJson?: Record<string, unknown>;
  }): Promise<ContractObligation | null> {
    if (!agreements.find((x) => x.id === input.agreementId)) return null;
    const o: ContractObligation = {
      id: newId(),
      agreementId: input.agreementId,
      obligationType: input.obligationType,
      dueDate: input.dueDate,
      status: "pending",
      ownerRole: input.ownerRole,
      payloadJson: input.payloadJson || {},
      createdAt: nowIso(),
      satisfiedAt: null
    };
    obligations.push(o);
    return o;
  },

  satisfyObligation(id: string) {
    const o = obligations.find((x) => x.id === id);
    if (!o) return null;
    o.status = "satisfied";
    o.satisfiedAt = nowIso();
    return o;
  },

  /**
   * Resolve the governing agreement for a campaign / settlement / partner
   * subject. Wave 7 looks at counterparty + tenant; Wave 8 will plug in a
   * real selection rule engine.
   */
  resolveGoverning(input: {
    tenantId?: string;
    counterpartyType?: CounterpartyType;
    counterpartyId?: string;
    agreementType?: AgreementType;
  }) {
    const candidates = agreements.filter((a) =>
      (a.status === "active" || a.status === "expiring")
      && (!input.tenantId || a.tenantId === input.tenantId)
      && (!input.counterpartyType || a.counterpartyType === input.counterpartyType)
      && (!input.counterpartyId || a.counterpartyId === input.counterpartyId)
      && (!input.agreementType || a.agreementType === input.agreementType)
    );
    return candidates;
  },

  list: () => [...agreements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byTenant: (t: string) => agreements.filter((a) => a.tenantId === t),
  findById: (id: string) => agreements.find((a) => a.id === id) || null,
  amendmentsFor: (id: string) => amendments.filter((a) => a.agreementId === id),
  obligationsFor: (id: string) => obligations.filter((o) => o.agreementId === id),
  obligationsDueWithin: (days: number) => {
    const now = Date.now();
    const cutoff = now + days * 24 * 60 * 60 * 1000;
    return obligations.filter((o) => o.status === "pending" && new Date(o.dueDate).getTime() <= cutoff);
  }
};
