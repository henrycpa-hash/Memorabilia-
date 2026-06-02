export type UserRole = "fan" | "creator" | "authenticator" | "admin";

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  publicHandle: string;
  creatorType: "athlete" | "artist" | "musician" | "celebrity";
  verified: boolean;
  createdAt: string;
}
