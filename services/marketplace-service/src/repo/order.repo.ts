import type { Order } from "@crownx-jewel/contracts";

const store: Order[] = [];

export const orderRepo = {
  insert(o: Order) {
    store.push(o);
    return o;
  },
  list() {
    return [...store];
  },
  getById(id: string) {
    return store.find((o) => o.id === id) || null;
  }
};
