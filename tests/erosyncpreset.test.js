import test from "node:test";
import assert from "node:assert/strict";
import { normPreset, normPresets, upsertPreset, loadPresets, savePresets, MAX_PRESETS } from "../src/data/erosyncpreset.js";
import { createErosync } from "../src/data/erosync.js";

test("프리셋 정리: 이름 없으면 버리고 허용된 값만 남긴다", () => {
  assert.equal(normPreset({ name: "  " }), null);
  const p = normPreset({ name: "순한맛", level: { contentMode: "x", extremityLimit: "mild", nsfwPlus: true }, config: { mode: "a", bad: { x: 1 } }, guard: { on: true } });
  assert.deepEqual(p.level, { extremityLimit: "mild", nsfwPlus: true });
  assert.deepEqual(p.config, { mode: "a" });
  assert.ok(p.id);
});
test("upsert: 같은 이름은 덮어쓰고 id 유지, 20개 넘으면 거절", () => {
  let list = [];
  let r = upsertPreset(list, { name: "a", level: { contentMode: "sfw" } }); assert.ok(r.ok && !r.replaced); list = r.list;
  const id = list[0].id;
  r = upsertPreset(list, { name: "a", level: { contentMode: "nsfw" } }); assert.ok(r.replaced); assert.equal(r.list[0].id, id); assert.equal(r.list[0].level.contentMode, "nsfw");
  list = Array.from({ length: MAX_PRESETS }, (_, i) => normPreset({ name: `n${i}` }));
  assert.equal(upsertPreset(list, { name: "새것" }).ok, false);
  assert.equal(upsertPreset(list, { name: "n3" }).ok, true);
});
const mem = () => { const m = new Map(); return { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, addRisuReplacer: async () => {} }; };
test("저장·불러오기", async () => {
  const api = mem(); await savePresets(api, [{ name: "a" }, { name: "" }]);
  assert.deepEqual((await loadPresets(api)).map((x) => x.name), ["a"]);
});
test("컨트롤러: 꺼져 있으면 저장·적용은 off, 켜져 있으면 지금 값을 묶어 저장하고 적용한다", async () => {
  const api = mem(); const calls = [];
  let level = { ok: true, contentMode: "nsfw", extremityLimit: "mild", nsfwPlus: false };
  const inst = { loaded: () => true, dispose: async () => {}, guard: { set: (g) => calls.push(["guard", g]) }, flags: { set() {} },
    content: { get: async () => level, set: async (p) => { calls.push(["content", p]); level = { ...level, ...p }; return level; } },
    config: { get: async () => ({ ok: true, values: { frequency: 3 } }), set: async (p) => { calls.push(["config", p]); return {}; } } };
  const er = createErosync(api, { boot: async () => inst, load: async () => true });
  assert.equal((await er.savePreset("x")).reason, "off");
  await er.boot();
  const s = await er.savePreset("강하게"); assert.ok(s.ok);
  const [p] = await er.presets();
  assert.deepEqual(p.level, { contentMode: "nsfw", extremityLimit: "mild", nsfwPlus: false }); assert.deepEqual(p.config, { frequency: 3 });
  await er.setGuard({ on: true, restTurns: 9 });
  level = { ...level, contentMode: "sfw" };
  const a = await er.applyPreset(p.id); assert.ok(a.ok);
  assert.ok(calls.some((c) => c[0] === "content" && c[1].contentMode === "nsfw"));
  assert.ok(calls.some((c) => c[0] === "config" && c[1].frequency === 3));
  assert.equal((await er.applyPreset("none")).ok, false);
  assert.equal((await er.deletePreset(p.id)).length, 0);
  await er.stop();
});
