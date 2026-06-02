import { Pool } from "pg";

const poolCache = new Map<string, Pool>();

export function getPool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 10 });
  poolCache.set(connectionString, pool);
  return pool;
}
