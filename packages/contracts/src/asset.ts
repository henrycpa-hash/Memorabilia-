export type AssetType = "memorabilia" | "art" | "nil_experience" | "hybrid";
export type EditionType = "one_of_one" | "limited" | "open";
export type AuthenticityStatus = "draft" | "pending" | "approved" | "rejected" | "revoked";

export interface Asset {
  id: string;
  assetType: AssetType;
  title: string;
  description?: string;
  originatorId: string;
  authenticityStatus: AuthenticityStatus;
  currentOwnerId?: string;
  editionType?: EditionType;
  editionNumber?: number;
  totalEditionSize?: number;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceObjectType = "image" | "video" | "document" | "signature_capture";

export interface EvidenceObject {
  id: string;
  assetId: string;
  objectType: EvidenceObjectType;
  storageUri: string;
  fileHash: string;
  capturedAt: string;
  createdAt: string;
}
