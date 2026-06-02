import type { AutomationRule, NotificationChannel } from "@crownx-jewel/shared-automation";

export type AutomationExecution = {
  id: string;
  ruleId: string;
  eventType: string;
  channels: NotificationChannel[];
  recipientCount: number;
  status: "delivered" | "failed";
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const rules: AutomationRule[] = [];
const executions: AutomationExecution[] = [];

export const automationRepo = {
  upsertRule(r: AutomationRule) {
    const i = rules.findIndex((x) => x.id === r.id);
    if (i >= 0) rules[i] = r;
    else rules.push(r);
    return r;
  },
  removeRule(id: string) {
    const i = rules.findIndex((r) => r.id === id);
    if (i >= 0) rules.splice(i, 1);
    return true;
  },
  rulesForEvent(eventType: string) {
    return rules.filter((r) => r.enabled && r.eventType === eventType);
  },
  listRules() {
    return [...rules];
  },

  insertExecution(e: AutomationExecution) {
    executions.push(e);
    return e;
  },
  listExecutions() {
    return [...executions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
