import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pruneModules, heldAddons } from "../tools/addons-prune.mjs";
test("애드온마다 최근 3개와 지금 파일만 남긴다", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prune-")), dist = path.join(d, "addons/dist"); fs.mkdirSync(dist, { recursive: true });
  const n = (i) => `m.${String(i).repeat(12)}.mjs`;
  for (let i = 1; i <= 5; i++) fs.writeFileSync(path.join(dist, n(i)), "x");
  fs.writeFileSync(path.join(d, "addons/history.json"), JSON.stringify({ m: [n(4), n(3), n(2), n(1)] }));
  pruneModules(d, { addons: [{ id: "m", sha256: "5".repeat(64) }] });
  assert.deepEqual(fs.readdirSync(dist).sort(), [n(3), n(4), n(5)]);
  assert.throws(() => pruneModules(d, { addons: [{ id: "m", sha256: "9".repeat(64) }] }));
  fs.rmSync(d, { recursive: true });
});
test("버전이 그대로인 애드온은 공개본을 유지한다", () => {
  const list = [{ id: "a", version: "1", sha256: "n" }, { id: "b", version: "2", sha256: "n" }, { id: "c", version: "1", sha256: "n" }];
  const held = heldAddons(list, [{ id: "a", version: "1", sha256: "o", size: 5 }, { id: "b", version: "1", sha256: "o" }], { a: "x", b: "x" });
  assert.deepEqual(held.map((x) => x.id), ["a"]); assert.deepEqual(list.map((x) => x.sha256), ["o", "n", "n"]);
});
