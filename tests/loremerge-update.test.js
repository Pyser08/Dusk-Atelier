// 모듈 업데이트 합치기: tideplan은 .ts를 끌어오므로 esbuild로 묶어 불러온다(tideplan-regex.test.js와 같은 방식)
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

let T;
before(async () => {
  const out = join(await mkdtemp(join(tmpdir(), "dusk-loremerge-")), "tideplan.mjs");
  await build({ entryPoints: [new URL("../src/engine/tideplan.js", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  T = await import(out);
});

const mod = (content) => ({ name: "M", description: "", lorebook: [{ key: "", comment: "[단일 로어북]", content, mode: "constant", insertorder: 100, alwaysActive: true }] });
test("모듈 업데이트: 고친 단일 로어북을 합치기로 → AZCDEF", () => {
  const base = T.modFingerprint(T.modFields(mod("A\nB\nC\nD\nE")));
  const cur = T.modFields(mod("A\nZ\nC\nD\nE")), inc = T.modFields(mod("A\nB\nC\nD\nE\nF"));
  const plan = T.makePlan("m", cur, inc, base);
  const it = plan.items.find(T.canMerge);
  assert.ok(it, "합칠 수 있는 로어북 항목");
  const choices = new Map([[it.id, "merge"]]);
  const out = T.applyPlan(cur, inc, plan, T.keepSet(plan, choices, true));
  assert.equal(T.applyMerges(out, plan, choices).merged, 1);
  assert.equal(out.globalLore[0].content, "A\nZ\nC\nD\nE\nF");
});
