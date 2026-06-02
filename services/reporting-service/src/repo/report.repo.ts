import type { Report } from "@crownx-jewel/shared-reporting";

const generated: Report[] = [];

export const reportRepo = {
  insert(r: Report) { generated.push(r); return r; },
  list() { return [...generated].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)); },
  findById(id: string) { return generated.find((r) => r.id === id) || null; }
};
