export type AuthCaseStatus = "pending" | "approved" | "rejected";

export interface AuthenticationCase {
  id: string;
  assetId: string;
  status: AuthCaseStatus;
  aiScore: number;
  decisionReason?: string;
  reviewerId?: string;
  createdAt: string;
  updatedAt: string;
}
