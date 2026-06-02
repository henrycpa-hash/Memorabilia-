import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  DEFAULT_AUTOMATION_RULES,
  stubDelivery,
  type AutomationRule,
  type NotificationChannel
} from "@crownx-jewel/shared-automation";
import { automationRepo } from "../repo/automation.repo";

const notifBase = () =>
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008";

/**
 * Wave 4 audience resolver. Resolves a logical audience type against the
 * surrounding services (notification + watchlist + identity) into a concrete
 * list of recipient userIds. Wave 4 only resolves the "obvious" audiences;
 * Wave 5 plugs in segment definitions from creator-crm-service.
 */
async function resolveAudience(
  audienceType: string,
  payload: Record<string, unknown>
): Promise<string[]> {
  if (audienceType === "buyer_and_seller") {
    const ids: string[] = [];
    if (typeof payload.buyerId === "string") ids.push(payload.buyerId);
    if (typeof payload.sellerId === "string") ids.push(payload.sellerId);
    return ids;
  }
  if (audienceType === "buyer_of_offer") {
    return typeof payload.buyerId === "string" ? [payload.buyerId] : [];
  }
  if (audienceType === "previous_winning_bidder") {
    return typeof payload.previousWinnerId === "string" ? [payload.previousWinnerId] : [];
  }
  if (audienceType === "all_parties") {
    const ids = new Set<string>();
    if (typeof payload.buyerId === "string") ids.add(payload.buyerId);
    if (typeof payload.sellerId === "string") ids.add(payload.sellerId);
    if (typeof payload.openerId === "string") ids.add(payload.openerId);
    return Array.from(ids);
  }
  // For audiences like asset_watchers we'd ordinarily call watchlist-service,
  // but Wave 4 keeps the orchestrator decoupled — caller passes recipientIds.
  if (Array.isArray(payload.recipientIds)) {
    return payload.recipientIds.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export const automationService = {
  seedDefaults() {
    for (const r of DEFAULT_AUTOMATION_RULES) {
      automationRepo.upsertRule(r);
    }
  },

  upsertRule(r: AutomationRule) {
    return automationRepo.upsertRule(r);
  },
  removeRule(id: string) {
    return automationRepo.removeRule(id);
  },
  listRules() {
    return automationRepo.listRules();
  },

  /**
   * Trigger automation for a given event. Looks up matching rules, resolves
   * their audience, and fans the notification out across each rule's channels.
   * For Wave 4: in_app channel calls notification-service; email + push go
   * through the stubDelivery adapter (logged to stdout).
   */
  async on(input: {
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<{ rulesMatched: number; notificationsSent: number }> {
    const rules = automationRepo.rulesForEvent(input.eventType);
    let totalSent = 0;

    for (const rule of rules) {
      const recipients = await resolveAudience(rule.audienceType, input.payload);

      for (const userId of recipients) {
        for (const channel of rule.channels) {
          if (channel === "in_app") {
            // Hand off to notification-service for durable in-app notification.
            try {
              await fetch(`${notifBase()}/notifications`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  userId,
                  type: rule.templateKey,
                  title: String(input.payload.title || rule.templateKey),
                  body: String(
                    input.payload.body ||
                      `Automation rule ${rule.id} fired for event ${input.eventType}`
                  )
                })
              });
            } catch {
              // logged at higher level
            }
          } else {
            // email + push go through the stub adapter for Wave 4.
            await stubDelivery.send({
              toUserId: userId,
              channel: channel as NotificationChannel,
              templateKey: rule.templateKey,
              payload: input.payload
            });
          }
          totalSent += 1;
        }
      }

      automationRepo.insertExecution({
        id: newId(),
        ruleId: rule.id,
        eventType: input.eventType,
        channels: rule.channels,
        recipientCount: recipients.length,
        status: "delivered",
        payloadJson: input.payload,
        createdAt: nowIso()
      });
    }

    await publishOutbox({
      id: newId(),
      eventType: "automation.triggered",
      aggregateId: newId(),
      aggregateType: "automation",
      payload: {
        eventType: input.eventType,
        rulesMatched: rules.length,
        notificationsSent: totalSent
      },
      occurredAt: nowIso()
    });

    return { rulesMatched: rules.length, notificationsSent: totalSent };
  },

  listExecutions() {
    return automationRepo.listExecutions();
  }
};
