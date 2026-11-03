import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/data/storagemgr.js";

const mkApi = (init = {}) => { const m = new Map(Object.entries(init)); return { m, pluginStorage: { getItem: async (k) => (m.has(k) ? m.get(k) : null), setItem: async (k, v) => { m.set(k, v); return true; } } }; };

test("값 형식: 문자열/JSON 변환과 안내", () => {
  assert.equal(S.valueKind("a"), "string"); assert.equal(S.valueKind({ a: 1 }), "json"); assert.equal(S.valueKind(3), "json");
  assert.equal(S.toEditText("x"), "x"); assert.equal(S.toEditText({ a: 1 }), '{\n  "a": 1\n}');
  assert.deepEqual(S.parseEdit('{"a":1}', "json"), { a: 1 }); assert.equal(S.parseEdit("{x", "string"), "{x");
  assert.throws(() => S.parseEdit("{x", "json"), /JSON이 올바르지/);
  assert.equal(S.kindChangeWarning("string", "string"), ""); assert.match(S.kindChangeWarning("string", "json"), /문자열에서 JSON/);
  assert.ok(S.keyProblem("")); assert.equal(S.keyProblem("a:b"), "");
});

test("저장: 그새 바뀜·삭제·이미 있음을 거절하고 force면 덮어쓴다", async () => {
  const api = mkApi({ k: "v1" });
  await S.saveStorageItem(api, "k", "v2", { origin: "v1" });
  assert.equal(api.m.get("k"), "v2");
  await assert.rejects(S.saveStorageItem(api, "k", "v3", { origin: "v1" }), (e) => e.conflict === "changed");
  await S.saveStorageItem(api, "k", "v3", { origin: "v1", force: true });
  assert.equal(api.m.get("k"), "v3");
  await assert.rejects(S.saveStorageItem(api, "gone", "x", { origin: "a" }), (e) => e.conflict === "gone");
  await assert.rejects(S.saveStorageItem(api, "k", "x", { isNew: true }), (e) => e.conflict === "exists");
  await S.saveStorageItem(api, "fresh", { a: 1 }, { isNew: true });
  assert.deepEqual(api.m.get("fresh"), { a: 1 });
  const rej = { pluginStorage: { getItem: async () => "a", setItem: async () => false } };
  await assert.rejects(S.saveStorageItem(rej, "k", "b", { origin: "a" }), /거절/);
});

test("내보내기·가져오기: 있는 키는 덮어쓰기 선택일 때만", async () => {
  const api = mkApi({ a: "1", b: { x: 1 } });
  const text = await S.exportStorage(api, ["a", "b", "none"]);
  assert.deepEqual(Object.keys(JSON.parse(text).items), ["a", "b"]);
  const items = S.parseStorageImport(text, ["a"]);
  assert.deepEqual(items.map((i) => [i.key, i.exists]), [["a", true], ["b", false]]);
  const dst = mkApi({ a: "old" });
  const r = await S.applyStorageImport(dst, items, ["a", "b"], { overwrite: false });
  assert.deepEqual(r, { written: 1, skipped: 1 }); assert.equal(dst.m.get("a"), "old"); assert.deepEqual(dst.m.get("b"), { x: 1 });
  assert.deepEqual(await S.applyStorageImport(dst, items, ["a"], { overwrite: true }), { written: 1, skipped: 0 });
  assert.throws(() => S.parseStorageImport("{}"), /스토리지 파일이 아니에요/); assert.throws(() => S.parseStorageImport("x"), /JSON 파싱 실패/);
});
