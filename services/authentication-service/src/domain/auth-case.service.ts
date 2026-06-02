import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { AuthenticationCase } from "@crownx-jewel/contracts";
import { authCaseRepo } from "../repo/auth-case.repo";

export const authCaseService = {
  async create(input: { assetId: string; aiScore: number }): Promise<AuthenticationCase> {
    const authCase: AuthenticationCase = {
      id: newId(),
      assetId: input.assetId,
      status: "pending",
      aiScore: input.aiScore,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    authCaseRepo.insert(authCase);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.AuthCaseOpened,
      aggregateId: authCase.id,
      aggregateType: "authentication_case",
      payload: { caseId: authCase.id, assetId: authCase.assetId, aiScore: authCase.aiScore },
      occurredAt: nowIso()
    });

    return authCase;
  },

  async approve(id: string, reviewerId: string, decisionReason?: string) {
    const authCase = authCaseRepo.update(id, {
      status: "approved",
      reviewerId,
      decisionReason: decisionReason || "Approved by reviewer",
      updatedAt: nowIso()
    });

    if (!authCase) {
      throw new Error("Authentication case not found");
    }

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.AuthCaseApproved,
      aggregateId: authCase.id,
      aggregateType: "authentication_case",
      payload: {
        caseId: authCase.id,
        assetId: authCase.assetId,
        reviewerId
      },
      occurredAt: nowIso()
    });

    return authCase;
  },

  list() {
    return authCaseRepo.list();
  },

  getById(id: string) {
    return authCaseRepo.getById(id);
  }
};
