// 업데이트(tideplan)의 정규식 규칙: 사용자가 고친 흔적이 없으면 새 버전의 정규식을 순서까지 통째로 가져온다.
// tideplan은 .ts(RisuTide 코어)를 끌어오므로 esbuild로 한 번 묶어서 불러온다.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

let T;
before(async () => {
  const out = join(await mkdtemp(join(tmpdir(), "dusk-tideplan-")), "tideplan.mjs");
  await build({ entryPoints: [new URL("../src/engine/tideplan.js", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  T = await import(out);
});

const rx = (comment, inn, out) => ({ comment, in: inn, out, type: "editdisplay", flag: "g" });
const card = (list) => ({ name: "봇", customscript: list, globalLore: [], triggerscript: [], additionalAssets: [], emotionImages: [] });
const names = (c) => c.customscript.map((x) => `${x.comment}:${x.out}`);
const run = (cur, inc, base) => { const plan = T.makePlan("c", cur, inc, base); return { plan, out: T.applyPlan(cur, inc, plan, T.keepSet(plan, new Map(), true)) }; };

const A = rx("치환A", "aaa", "1"), B = rx("치환B", "bbb", "2"), C = rx("치환C", "ccc", "3");

test("처음 받은 기록이 없으면(고친 흔적을 알 수 없음) 새 버전 정규식을 통째로 가져온다 — 옛 정규식이 남지 않는다", () => {
  const cur = card([A, B, C]), inc = card([{ ...B, comment: "B-new" }, { ...A, out: "11" }]);   // C 삭제 · B 이름 변경 · 순서 바뀜
  const { plan, out } = run(cur, inc, null);
  assert.deepEqual(names(out), ["B-new:2", "치환A:11"]);
  assert.equal(plan.items.filter((i) => i.unit === "regex").length, 0);
  assert.ok(plan.regexAuto && T.regexAutoNote(plan).includes("통째로"));
});
test("기록이 있고 정규식을 안 고쳤으면 새 버전을 순서까지 그대로", () => {
  const cur = card([A, B]), base = T.fingerprintCard(cur);
  const inc = card([C, { ...A, out: "11" }, B]);
  const { plan, out } = run(cur, inc, base);
  assert.deepEqual(names(out), ["치환C:3", "치환A:11", "치환B:2"]);
  assert.deepEqual(plan.regexAuto, { added: 1, removed: 0, changed: 1 });
});
test("기록이 있고 내가 정규식을 고쳤으면 예전처럼 항목별로 판단(내 수정 유지)", () => {
  const base = T.fingerprintCard(card([A, B]));
  const cur = card([A, { ...B, out: "내가고침" }]);
  const inc = card([{ ...A, out: "11" }, B]);
  const { plan, out } = run(cur, inc, base);
  assert.equal(plan.regexAuto, undefined);
  assert.ok(plan.items.some((i) => i.unit === "regex"));
  assert.deepEqual(names(out), ["치환A:11", "치환B:내가고침"]);
});
test("내가 정규식을 지웠어도 고친 흔적이라 항목별 판단", () => {
  const base = T.fingerprintCard(card([A, B]));
  const { plan } = run(card([A]), card([A, { ...B, out: "새B" }]), base);
  assert.equal(plan.regexAuto, undefined);
});
test("모듈도 같은 규칙", () => {
  const cur = T.modFields({ name: "모듈", regex: [A, B, C] }), inc = T.modFields({ name: "모듈", regex: [B, { ...A, out: "9" }] });
  const plan = T.makePlan("m", cur, inc, null);
  const out = T.applyPlan(T.modFields({ name: "모듈", regex: [A, B, C] }), inc, plan, T.keepSet(plan, new Map(), true));
  assert.deepEqual(names(out), ["치환B:2", "치환A:9"]);
});
test("새 버전에 정규식 칸 자체가 없으면 건드리지 않는다", () => {
  const cur = card([A]), inc = { name: "봇" };
  const plan = T.makePlan("c", cur, inc, null);
  assert.equal(plan.regexAuto, undefined);
});
