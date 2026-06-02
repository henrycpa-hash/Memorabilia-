export type COAStatus = "issued" | "revoked";

export interface COARecord {
  id: string;
  assetId: string;
  coaNumber: string;
  manifestHash: string;
  status: COAStatus;
  createdAt: string;
}
