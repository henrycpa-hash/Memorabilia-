import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { hashPassword, verifyPassword } from "@crownx-jewel/shared-auth/passwords";
import { signAccessToken } from "@crownx-jewel/shared-auth/jwt";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { User, UserRole } from "@crownx-jewel/contracts";
import { userRepo, type StoredUser } from "../repo/user.repo";

function strip(user: StoredUser): User {
  // Never return password hash to callers.
  const { passwordHash: _ph, ...rest } = user;
  return rest;
}

export const userService = {
  /**
   * Wave 1 admin-style create (no password). Kept for back-compat with the
   * Wave 1 e2e script — Wave 2 prefers register/login below.
   */
  async create(input: { email: string; displayName: string; role: UserRole }): Promise<User> {
    const existing = userRepo.findByEmail(input.email);
    if (existing) return strip(existing);

    const user: StoredUser = {
      id: newId(),
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      createdAt: nowIso()
    };
    userRepo.insert(user);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.UserRegistered,
      aggregateId: user.id,
      aggregateType: "user",
      payload: { userId: user.id, email: user.email, role: user.role },
      occurredAt: nowIso()
    });

    return strip(user);
  },

  async register(input: {
    email: string;
    displayName: string;
    password: string;
    role: UserRole;
  }): Promise<{ accessToken: string; user: User }> {
    const existing = userRepo.findByEmail(input.email);
    if (existing) {
      throw new Error("email_already_registered");
    }
    const passwordHash = await hashPassword(input.password);
    const user: StoredUser = {
      id: newId(),
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      createdAt: nowIso(),
      passwordHash
    };
    userRepo.insert(user);

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.UserRegistered,
      aggregateId: user.id,
      aggregateType: "user",
      payload: { userId: user.id, email: user.email, role: user.role },
      occurredAt: nowIso()
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return { accessToken, user: strip(user) };
  },

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; user: User }> {
    const user = userRepo.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new Error("invalid_credentials");
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new Error("invalid_credentials");
    }
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });
    return { accessToken, user: strip(user) };
  },

  list(): User[] {
    return userRepo.list().map(strip);
  },

  findById(id: string): User | null {
    const u = userRepo.findById(id);
    return u ? strip(u) : null;
  }
};
