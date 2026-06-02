import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "./pg";

/**
 * Wave 1 helper: returns a Drizzle client bound to the given connection string.
 * Each service owns its own database URL via env (e.g. IDENTITY_DB_URL, ASSET_DB_URL).
 * If no connection string is provided, callers should fall back to in-memory stores.
 */
export function createDb(connectionString: string) {
  const pool = getPool(connectionString);
  return drizzle(pool);
}
