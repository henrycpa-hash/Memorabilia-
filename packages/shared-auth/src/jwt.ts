import jwt from "jsonwebtoken";
import type { AppRole } from "./roles";

export type AccessClaims = {
  sub: string;
  email: string;
  role: AppRole;
};

const secret = (): string => process.env.JWT_SECRET || "dev-secret";

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, secret(), { expiresIn: "1h" });
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, secret()) as AccessClaims;
}
