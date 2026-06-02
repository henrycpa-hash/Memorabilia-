import type { AuthenticationCase } from "@crownx-jewel/contracts";

const store: AuthenticationCase[] = [];

export const authCaseRepo = {
  insert(c: AuthenticationCase) {
    store.push(c);
    return c;
  },
  list() {
    return [...store];
  },
  getById(id: string) {
    return store.find((c) => c.id === id);
  },
  update(id: string, patch: Partial<AuthenticationCase>) {
    const c = store.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    return c;
  }
};
