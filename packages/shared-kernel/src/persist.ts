import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Durable in-memory state. The CrownX engines keep state in module-level
 * Maps/arrays (reset on restart). `persistSnapshot` loads a JSON snapshot on
 * boot, then writes it on an interval and on shutdown — so accounts, COAs,
 * royalties, tokens, and agreements survive a restart. Best-effort and crash-
 * safe (a corrupt snapshot just starts fresh). Disable with CROWNX_PERSIST=off
 * (CI / ephemeral runs).
 *
 * Maps don't JSON-serialize — convert to entry arrays in dump() and rehydrate in
 * load(): mapToEntries(myMap) / entriesToMap(data.myMap, myMap).
 */

const DATA_DIR = () => process.env.CROWNX_DATA_DIR || ".crownx-data";

export interface SnapshotOptions {
  /** service name → snapshot file */
  name: string;
  /** rehydrate the in-memory stores from the parsed snapshot */
  load: (data: Record<string, unknown>) => void;
  /** produce a JSON-serializable view of the stores */
  dump: () => Record<string, unknown>;
  /** autosave cadence (default 4s) */
  intervalMs?: number;
}

export function persistSnapshot(opts: SnapshotOptions): void {
  if (process.env.CROWNX_PERSIST === "off") return;
  const file = join(DATA_DIR(), `${opts.name}.json`);

  // load (snapshot wins over any boot-time seed)
  try {
    if (existsSync(file)) {
      const raw = readFileSync(file, "utf8");
      if (raw.trim()) opts.load(JSON.parse(raw) as Record<string, unknown>);
    }
  } catch {
    /* corrupt/partial snapshot → start from the seed */
  }

  let lastSerialized = "";
  const save = () => {
    try {
      const serialized = JSON.stringify(opts.dump());
      if (serialized === lastSerialized) return; // skip unchanged writes
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, serialized, "utf8");
      lastSerialized = serialized;
    } catch {
      /* best-effort */
    }
  };

  // capture the post-seed state shortly after boot, then on a cadence
  setTimeout(save, 1500).unref?.();
  const interval = setInterval(save, opts.intervalMs ?? 4000);
  interval.unref?.();

  const flush = () => save();
  process.on("beforeExit", flush);
  process.once("SIGINT", () => { flush(); process.exit(0); });
  process.once("SIGTERM", () => { flush(); process.exit(0); });
}

/** Map → JSON-safe entries. */
export function mapToEntries<K, V>(m: Map<K, V>): [K, V][] {
  return [...m.entries()];
}

/** Rehydrate entries (from a snapshot) into an existing Map (cleared first). */
export function entriesToMap<K, V>(data: unknown, target: Map<K, V>): void {
  if (!Array.isArray(data)) return;
  target.clear();
  for (const pair of data as [K, V][]) if (Array.isArray(pair) && pair.length === 2) target.set(pair[0], pair[1]);
}

/** Replace an array's contents in place from a snapshot value. */
export function fillArray<T>(data: unknown, target: T[]): void {
  if (!Array.isArray(data)) return;
  target.length = 0;
  for (const item of data as T[]) target.push(item);
}
