import type { User, UserRole } from "@crownx-jewel/contracts";

export type StoredUser = User & { passwordHash?: string };

const store: StoredUser[] = [];

export const userRepo = {
  insert(user: StoredUser) {
    store.push(user);
    return user;
  },
  findById(id: string): StoredUser | null {
    return store.find((u) => u.id === id) || null;
  },
  findByEmail(email: string): StoredUser | null {
    return store.find((u) => u.email === email) || null;
  },
  list(): StoredUser[] {
    return [...store];
  },
  setPasswordHash(id: string, passwordHash: string) {
    const u = store.find((x) => x.id === id);
    if (u) u.passwordHash = passwordHash;
    return u;
  },
  countByRole(role: UserRole) {
    return store.filter((u) => u.role === role).length;
  }
};
