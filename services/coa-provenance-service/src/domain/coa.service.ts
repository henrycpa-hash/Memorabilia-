import { createHash } from "crypto";
import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { COARecord } from "@crownx-jewel/contracts";
import { coaRepo } from "../repo/coa.repo";

function buildManifestHash(assetId: string, authCaseId: string): string {
  return createHash("sha256").update(`${assetId}:${authCaseId}`).digest("hex");
}

export const coaService = {
  async issue(input: { assetId: string; authCaseId: string }): Promise<COARecord> {
    const existing = coaRepo.findByAssetId(input.assetId);
    if (existing) return existing;

    const coa: COARecord = {
      id: newId(),
      assetId: input.assetId,
      coaNumber: `CXJ-${Date.now()}`,
      manifestHash: buildManifestHash(input.assetId, input.authCaseId),
      status: "issued",
      createdAt: nowIso()
    };
    coaRepo.insert(coa);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.CoaIssued,
      aggregateId: input.assetId,
      aggregateType: "asset",
      payload: { coaId: coa.id, assetId: coa.assetId, manifestHash: coa.manifestHash },
      occurredAt: nowIso()
    });

    return coa;
  },

  list() {
    return coaRepo.list();
  },

  findByAssetId(assetId: string) {
    return coaRepo.findByAssetId(assetId);
  }
};
