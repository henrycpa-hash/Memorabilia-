import type { MarketFact } from "@crownx-jewel/shared-analytics";

const facts: MarketFact[] = [];

export const warehouseRepo = {
  insertFact(f: MarketFact) {
    facts.push(f);
    return f;
  },
  list() {
    return [...facts].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  },
  listByType(type: string) {
    return facts.filter((f) => f.eventType === type);
  },
  count() {
    return facts.length;
  },
  countByType(type: string) {
    return facts.filter((f) => f.eventType === type).length;
  },
  sumAmountByType(type: string) {
    return facts
      .filter((f) => f.eventType === type && f.amount)
      .reduce((acc, f) => acc + Number(f.amount), 0);
  }
};
