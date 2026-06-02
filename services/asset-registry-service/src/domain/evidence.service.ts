import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { EvidenceObject, EvidenceObjectType } from "@crownx-jewel/contracts";
import { evidenceRepo, type UploadIntent } from "../repo/evidence.repo";
import { assetService } from "./asset.service";

/**
 * Wave 2 evidence pipeline:
 *
 *   1. POST /evidence/upload-intents → returns presigned URL
 *      (Wave 2 stub: returns a fake URL; Wave 3 wires real S3/MinIO signer.)
 *   2. Client uploads bytes to the presigned URL.
 *   3. POST /evidence/complete → records the manifest, hashes, links to intent.
 *      Asset moves draft → pending so reviewers can pick it up.
 */
export const evidenceService = {
  async createIntent(input: {
    assetId: string;
    objectType: EvidenceObjectType;
    fileName: string;
  }): Promise<UploadIntent> {
    const id = newId();
    const uploadKey = `evidence/${input.assetId}/${Date.now()}-${input.fileName}`;
    const intent: UploadIntent = {
      id,
      assetId: input.assetId,
      objectType: input.objectType,
      fileName: input.fileName,
      uploadKey,
      // Wave 2 stub. Wave 3 swaps for real MinIO/S3 presigned URL.
      presignedUrl: `https://example-upload.local/${uploadKey}`,
      status: "pending_upload",
      createdAt: nowIso()
    };
    evidenceRepo.insertIntent(intent);
    return intent;
  },

  async complete(input: {
    assetId: string;
    uploadIntentId: string;
    objectType: EvidenceObjectType;
    storageUri: string;
    fileHash: string;
    capturedAt: string;
  }): Promise<EvidenceObject> {
    const intent = evidenceRepo.findIntent(input.uploadIntentId);
    if (!intent) {
      throw new Error("upload_intent_not_found");
    }
    evidenceRepo.markIntentCompleted(intent.id);

    const evidence: EvidenceObject = {
      id: newId(),
      assetId: input.assetId,
      objectType: input.objectType,
      storageUri: input.storageUri,
      fileHash: input.fileHash,
      capturedAt: input.capturedAt,
      createdAt: nowIso()
    };
    evidenceRepo.insertObject(evidence);

    // Wave 1 + Wave 2 rule: first evidence flips asset draft → pending.
    await assetService.markPending(input.assetId);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.EvidenceAdded,
      aggregateId: evidence.id,
      aggregateType: "evidence_object",
      payload: evidence,
      occurredAt: nowIso()
    });

    return evidence;
  },

  /**
   * Wave 1 backwards-compat: direct evidence ingestion without intent.
   * Retained so the Wave 1 e2e script keeps working.
   */
  async createDirect(input: {
    assetId: string;
    objectType: EvidenceObjectType;
    storageUri: string;
    fileHash: string;
    capturedAt: string;
  }): Promise<EvidenceObject> {
    const evidence: EvidenceObject = {
      id: newId(),
      assetId: input.assetId,
      objectType: input.objectType,
      storageUri: input.storageUri,
      fileHash: input.fileHash,
      capturedAt: input.capturedAt,
      createdAt: nowIso()
    };
    evidenceRepo.insertObject(evidence);
    await assetService.markPending(input.assetId);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.EvidenceAdded,
      aggregateId: evidence.id,
      aggregateType: "evidence_object",
      payload: evidence,
      occurredAt: nowIso()
    });

    return evidence;
  },

  listByAsset(assetId: string) {
    return evidenceRepo.listByAsset(assetId);
  }
};
