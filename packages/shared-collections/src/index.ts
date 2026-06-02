/**
 * Wave 8 collections & dunning primitives. Receivables, aging buckets,
 * dunning cadence steps, promise-to-pay records, write-off proposals.
 */
export type ReceivableStatus =
  | "open"
  | "in_dunning"
  | "promise_to_pay"
  | "paid"
  | "written_off"
  | "disputed";

export type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "over_90";

export type DunningCadenceStep = {
  step: number;
  daysAfterDue: number;
  templateKey: string;
  channel: "email" | "sms" | "call_task" | "ops_escalation";
  description: string;
};

/** Default 5-step cadence used when no profile-specific cadence is supplied. */
export const DEFAULT_DUNNING_CADENCE: DunningCadenceStep[] = [
  { step: 1, daysAfterDue: 1, templateKey: "friendly_reminder", channel: "email", description: "Day +1 friendly reminder" },
  { step: 2, daysAfterDue: 7, templateKey: "first_notice", channel: "email", description: "Day +7 first formal notice" },
  { step: 3, daysAfterDue: 21, templateKey: "second_notice", channel: "email", description: "Day +21 second formal notice" },
  { step: 4, daysAfterDue: 45, templateKey: "final_notice", channel: "call_task", description: "Day +45 phone call task" },
  { step: 5, daysAfterDue: 60, templateKey: "ops_escalation", channel: "ops_escalation", description: "Day +60 escalate to collections ops" }
];

/** Map a number of days past due to its aging bucket. Negative = current. */
export function daysToAgingBucket(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1_30";
  if (daysPastDue <= 60) return "31_60";
  if (daysPastDue <= 90) return "61_90";
  return "over_90";
}

/**
 * Determine the next dunning step number due for a receivable given its
 * days-past-due and the highest-numbered step already executed.
 */
export function nextDunningStep(
  daysPastDue: number,
  lastExecutedStep: number,
  cadence: DunningCadenceStep[] = DEFAULT_DUNNING_CADENCE
): DunningCadenceStep | null {
  const sorted = [...cadence].sort((a, b) => a.step - b.step);
  for (const s of sorted) {
    if (s.step <= lastExecutedStep) continue;
    if (daysPastDue >= s.daysAfterDue) return s;
  }
  return null;
}

export type PromiseToPayStatus = "open" | "kept" | "broken";
export type WriteOffStatus = "draft" | "submitted" | "approved" | "rejected";
