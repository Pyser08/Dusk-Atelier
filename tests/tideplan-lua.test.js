// 버그 제보(11-12): 봇 업데이트 뒤 옛 버전 Lua 트리거가 새 버전 Lua 트리거와 함께 남아 옛 코드가 먼저 돌았다.
// comment(버전 포함)와 코드가 함께 바뀌면 짝을 못 지었고, '기존 유지' 기본값이 트리거에도 걸렸다.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

let T;
before(async () => {
  const out = join(await mkdtemp(join(tmpdir(), "dusk-tideplan-lua-")), "tideplan.mjs");
  await build({ entryPoints: [new URL("../src/engine/tideplan.js", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  T = await import(out);
});

const lua = (comment, code) => ({ comment, type: "manual", conditions: [], effect: [{ type: "triggerlua", code }], lowLevelAccess: false });
const card = (triggers) => ({ name: "봇", customscript: [], globalLore: [], triggerscript: triggers, additionalAssets: [], emotionImages: [] });
const comments = (c) => c.triggerscript.map((x) => x.comment);
const run = (cur, inc, base) => { const plan = T.makePlan("c", cur, inc, base); return { plan, out: T.applyPlan(cur, inc, plan, T.keepSet(plan, new Map(), true)) }; };

const OLD = lua("나히아 얼티밋 2 v1.4.3 runtime", "print('old')"), NEW = lua("나히아 얼티밋 2 v1.5.0 runtime", "print('new')");

test("기록 없음 + 기존 유지(기본): 이름·코드가 함께 바뀐 Lua 트리거는 교체되고 옛 것이 남지 않는다", () => {
  const { out } = run(card([OLD]), card([NEW]), null);
  assert.deepEqual(comments(out), [NEW.comment]);
});

test("기록 있음: 이름·코드가 함께 바뀐 Lua 트리거는 교체된다", () => {
  const base = T.fingerprintCard(card([OLD]));
  const { out } = run(card([OLD]), card([NEW]), base);
  assert.deepEqual(comments(out), [NEW.comment]);
});

test("이미 남아 버린 옛 Lua(기록에 없음)도 같은 이름 줄기면 다음 업데이트에서 기본으로 지운다", () => {
  const V6 = lua("나히아 얼티밋 2 v1.6.0 runtime", "print('v6')");
  const base = T.fingerprintCard(card([NEW]));
  const { out } = run(card([OLD, NEW]), card([V6]), base);
  assert.deepEqual(comments(out), [V6.comment]);
});

test("기록 있음: 사용자가 직접 넣은 Lua 트리거(다른 이름)는 지키고, 제작자 Lua만 교체한다", () => {
  const MINE = lua("내 디버그", "print('me')");
  const base = T.fingerprintCard(card([OLD]));
  const { out } = run(card([OLD, MINE]), card([NEW]), base);
  assert.deepEqual(comments(out).sort(), [NEW.comment, MINE.comment].sort());
});

test("업데이트 결과에 Lua 트리거가 둘 이상이면 요약에 그 수가 나온다(경고용)", () => {
  const sum = T.summarizeCharacterUpdate(card([OLD]), card([OLD, NEW]), []);
  assert.equal(sum.luaTriggers, 2);
});
