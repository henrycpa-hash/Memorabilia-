import type { EvidenceObject, EvidenceObjectType } from "@crownx-jewel/contracts";

export type UploadIntent = {
  id: string;
  assetId: string;
  objectType: EvidenceObjectType;
  fileName: string;
  uploadKey: string;
  presignedUrl: string;
  status: "pending_upload" | "completed" | "expired";
  createdAt: string;
};

const intents: UploadIntent[] = [];
const objects: EvidenceObject[] = [];

export const evidenceRepo = {
  insertIntent(i: UploadIntent) {
    intents.push(i);
    return i;
  },
  findIntent(id: string) {
    return intents.find((i) => i.id === id) || null;
  },
  markIntentCompleted(id: string) {
    const i = intents.find((x) => x.id === id);
    if (i) i.status = "completed";
    return i;
  },
  insertObject(e: EvidenceObject) {
    objects.push(e);
    return e;
  },
  listByAsset(assetId: string) {
    return objects.filter((e) => e.assetId === assetId);
  },
  listIntents() {
    return [...intents];
  }
};
