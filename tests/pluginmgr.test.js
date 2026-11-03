import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/data/pluginmgr.js";

const L = (name, enabled = true, sha256 = name) => ({ name, enabled, sha256 });

test("parseRegister·buildRegister: 머리말·인자·링크를 읽고 문제를 알려 준다", () => {
  const src = "//@name demo\n//@display-name 데모\n//@api 3.0\n//@version 1.2\n//@arg key string {{name:키}}\n//@arg n int\n//@link https://x.io 도움말\ncode();";
  const r = M.buildRegister(src, { existing: [{ name: "demo" }] });
  assert.equal(r.ok, true); assert.equal(r.exists, true); assert.equal(r.existsIndex, 0);
  assert.deepEqual(r.plugin.arguments, { key: "string", n: "int" });
  assert.deepEqual(r.plugin.realArg, { key: "", n: 0 });
  assert.equal(r.plugin.displayName, "데모"); assert.equal(r.plugin.versionOfPlugin, "1.2"); assert.deepEqual(r.plugin.customLink, [{ link: "https://x.io", hoverText: "도움말" }]);
  assert.equal(M.buildRegister("code").ok, false);
  assert.match(M.buildRegister("//@name a\n//@api 2.0\n").warnings.join(" "), /2\.0/);
  assert.match(M.buildRegister("//@name a\n//@api 3.0\nconst x: string = 'a';").warnings.join(" "), /TypeScript/);
});

test("convertApi21: //@api 줄만 바꾼다", () => {
  assert.equal(M.convertApi21("//@name a\n//@api 2.0\nx"), "//@name a\n//@api 2.1\nx");
  assert.equal(M.convertApi21("//@api 3.0\n"), "//@api 3.0\n");
});

test("dupPlan·dupOps: 켜진 첫 사본을 남기고 나머지를 뒤에서부터 지운다", () => {
  const list = [L("a", false, "1"), L("b"), L("a", true, "2"), L("a", true, "2"), L("b", true, "x")];
  const plans = M.dupPlan(list);
  assert.deepEqual(plans.map((g) => [g.name, g.keep, g.remove, g.same]), [["a", 2, [0, 3], false], ["b", 1, [4], false]]);
  assert.deepEqual(M.dupOps(plans, list).map((o) => o.index), [4, 3, 0]);
  assert.deepEqual(M.dupPlan([L("a", false), L("a", false)])[0].keep, 0, "모두 꺼져 있으면 첫 번째");
});

test("planRestore: 전체 교체 / 병합, 범위 선택", () => {
  const cur = [{ name: "a", v: 1 }, { name: "x", v: 1 }];
  const bk = M.makeBackup({ plugins: [{ name: "a", v: 2 }, { name: "b", v: 2 }], categories: { a: "UI" } });
  const rep = M.planRestore(bk, cur, { mode: "replace" });
  assert.deepEqual(rep.plugins.map((p) => p.name), ["a", "b"]); assert.deepEqual(rep.summary, { added: 1, replaced: 1, removed: 1 });
  const mer = M.planRestore(bk, cur, { mode: "merge", curCategories: { x: "기타" } });
  assert.deepEqual(mer.plugins.map((p) => `${p.name}${p.v}`), ["a2", "x1", "b2"]); assert.deepEqual(mer.categories, { x: "기타", a: "UI" });
  const meta = M.planRestore(bk, cur, { scope: "meta", mode: "replace" });
  assert.equal(meta.plugins, cur); assert.equal(meta.pluginsChanged, false); assert.deepEqual(meta.categories, { a: "UI" });
  assert.throws(() => M.parseBackup("{"), /JSON/); assert.throws(() => M.parseBackup('{"a":1}'), /백업 파일이 아니에요/);
  assert.equal(M.parseBackup(JSON.stringify(bk)).plugins.length, 2);
});

test("프리셋: 스냅샷 → 적용 작업(켜짐 차이·순서·없는 플러그인 건너뜀)", () => {
  const list = [L("a"), L("b", false), L("c")];
  const snap = M.snapshotPreset([L("c"), L("a", false), L("b"), L("gone")], { c: "UI", zz: "x" });
  assert.deepEqual(snap.order, ["c", "a", "b", "gone"]); assert.deepEqual(snap.categories, { c: "UI" });
  const r = M.presetOps(snap, list);
  assert.deepEqual(r.ops.map((o) => [o.name, o.fields.enabled]), [["a", false], ["b", true]]);
  assert.deepEqual(r.order, [2, 0, 1]); assert.deepEqual(r.missing, ["gone"]);
  assert.equal(M.presetOps({ order: ["a", "b", "c"], enabled: { a: true, b: false, c: true } }, list).order, null, "순서가 같으면 null");
});

test("프리셋 내보내기·가져오기: 같은 이름은 번호를 붙이거나 덮어쓴다", () => {
  const st = { ...M.emptyPresets(), presets: { 기본: { order: [], enabled: {} } } };
  const file = JSON.stringify(M.exportPresets(st, ["기본"]));
  const n = M.importPresets(st, file, { onDup: "number" });
  assert.deepEqual(n.added, ["기본 (2)"]); assert.equal(Object.keys(n.state.presets).length, 2);
  assert.deepEqual(M.importPresets(st, file, { onDup: "overwrite" }).added, ["기본"]);
  assert.deepEqual(M.importPresets(st, file, { select: [] }).added, []);
  assert.throws(() => M.importPresets(st, "{}"), /프리셋 파일이 아니에요/);
});

test("카테고리 JSON·디바이스·메타 정리", () => {
  assert.deepEqual(M.parseCategories('{"a":"UI"}'), { a: "UI" });
  assert.throws(() => M.parseCategories('{"a":1}'), /모양/); assert.throws(() => M.parseCategories("x"), /JSON 파싱 실패/);
  assert.equal(M.deviceKind(500), "mobile"); assert.equal(M.deviceKind(1200), "desktop");
  const st = { ...M.emptyPresets(), presets: { m: {}, d: {} }, active: "d", pair: { mobile: "m", desktop: "d" } };
  assert.equal(M.pairTarget(st, "mobile"), "m"); assert.equal(M.pairTarget({ ...st, active: "other" }, "mobile"), null, "페어가 아닌 프리셋을 쓰는 중이면 자동 전환 안 함");
  const o = M.orphanMeta([L("a")], { categories: { a: "1", gone: "2" }, presets: { ...M.emptyPresets(), presets: { p: { enabled: { a: true, gone: false } } } } });
  assert.deepEqual(o.categories, ["gone"]); assert.deepEqual(o.presets, { p: ["gone"] });
});
