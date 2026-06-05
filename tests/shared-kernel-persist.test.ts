import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mapToEntries,
  entriesToMap,
  fillArray,
  persistSnapshot
} from "../packages/shared-kernel/src/persist.ts";

test("mapToEntries / entriesToMap round-trips a Map", () => {
  const src = new Map<string, number>([["a", 1], ["b", 2]]);
  const entries = mapToEntries(src);
  const json = JSON.parse(JSON.stringify(entries));
  const dst = new Map<string, number>([["stale", 99]]);
  entriesToMap(json, dst);
  assert.equal(dst.size, 2);
  assert.equal(dst.get("a"), 1);
  assert.equal(dst.get("b"), 2);
  assert.equal(dst.has("stale"), false); // cleared first
});

test("entriesToMap ignores non-array input", () => {
  const dst = new Map<string, number>([["keep", 1]]);
  entriesToMap(undefined, dst);
  entriesToMap({ not: "an array" }, dst);
  assert.equal(dst.get("keep"), 1);
});

test("fillArray replaces contents in place", () => {
  const target: number[] = [1, 2, 3];
  fillArray([9, 8], target);
  assert.deepEqual(target, [9, 8]);
  fillArray("nope", target); // ignored
  assert.deepEqual(target, [9, 8]);
});

test("persistSnapshot loads an existing snapshot over the seed", () => {
  const dir = mkdtempSync(join(tmpdir(), "cx-persist-"));
  process.env.CROWNX_DATA_DIR = dir;
  delete process.env.CROWNX_PERSIST;
  mkdirSync(dir, { recursive: true });
  // a snapshot written by a prior run
  writeFileSync(
    join(dir, "demo-svc.json"),
    JSON.stringify({ users: [{ id: "u1", email: "henry@crownx.ai" }] }),
    "utf8"
  );
  const store: { id: string; email: string }[] = [{ id: "seed", email: "seed@x" }];
  persistSnapshot({
    name: "demo-svc",
    dump: () => ({ users: store }),
    load: (d) => fillArray(d.users, store)
  });
  // snapshot wins over the seed
  assert.equal(store.length, 1);
  assert.equal(store[0].email, "henry@crownx.ai");
});

test("persistSnapshot is a no-op when CROWNX_PERSIST=off", () => {
  process.env.CROWNX_PERSIST = "off";
  const store: number[] = [1];
  persistSnapshot({ name: "ignored", dump: () => ({ store }), load: () => { store.push(999); } });
  assert.deepEqual(store, [1]); // load never ran
  delete process.env.CROWNX_PERSIST;
});
