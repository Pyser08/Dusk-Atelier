// 에셋 제작 저장: 기기(IndexedDB 흉내) 바로 · 플러그인 저장소 보관본 · Cellar
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/engine/sdstudio/project.js";
import { createProjectStore, CELLAR_PREFIX } from "../src/data/sdsstore.js";

const memLocal = () => { const m = new Map(); let fail = false; return { m, set fail(v) { fail = v; }, async load(pk) { const o = new Map(); for (const [k, v] of m) if (k.startsWith(pk + "|")) o.set(k.slice(pk.length + 1), v); return o.size ? o : null; }, async write(pk, puts, dels) { if (fail) throw new Error("디스크 가득"); const nm = new Map(m); for (const [k, v] of puts) nm.set(`${pk}|${k}`, v); for (const k of dels) nm.delete(`${pk}|${k}`); m.clear(); for (const [k, v] of nm) m.set(k, v); }, writes: 0 }; };
const memHost = () => { const h = { data: null, t: 0, saves: 0 }; return { h, async save(_t, p, t) { h.saves++; h.data = JSON.parse(JSON.stringify(p)); h.t = t; }, async load() { return h.data ? { project: h.data, t: h.t } : null; } }; };
const memCellar = (on = true) => { const kv = new Map(); return { kv, on, async ready() { return this.on; }, async batch(ops) { if (!this.on) throw new Error("끊김"); return ops.map((o) => { if (o.op === "put") kv.set(o.key, o.value); else kv.delete(o.key); return { ok: true }; }); }, async list(pre) { return [...kv.keys()].filter((k) => k.startsWith(pre)).map((key) => ({ key })); }, async get(k) { return kv.get(k) ?? null; } }; };
const fakeTimers = () => { const q = []; return { q, setTimeout: (fn) => { q.push(fn); return q.length; }, clearTimeout: () => {}, run() { const f = q.splice(0); f.forEach((x) => x()); } }; };
const tick = () => new Promise((r) => setTimeout(r, 0));
let clock = 1000;
const now = () => (clock += 10);
const proj = () => { let p = P.addChar(P.emptyProject(), { name: "A" }); p = P.addChar(p, { name: "B" }); return p; };
const T = { kind: "character", id: "c1" };

test("빈 상태 → 저장하면 기기에만 바로, 보관본·Cellar는 나중(모아서)", async () => {
  const local = memLocal(), host = memHost(), cellar = memCellar(), timers = fakeTimers();
  const s = createProjectStore({ local, host, cellar, now, timers });
  assert.equal((await s.open(T, "pk")).source, "none");
  const p = proj();
  const r = await s.save(T, "pk", p);
  assert.equal(r.written, 3);
  assert.equal(host.h.saves, 0); assert.equal(cellar.kv.size, 0);
  const p2 = P.updateChar(p, p.chars[0].id, { prompt: "x" });
  assert.equal((await s.save(T, "pk", p2)).written, 2);   // head + 바뀐 캐릭터만
  timers.run(); await tick(); await tick();
  assert.equal(host.h.saves, 1); assert.equal(host.h.data.chars[0].prompt, "x");
  assert.equal([...cellar.kv.keys()].filter((k) => k.startsWith(CELLAR_PREFIX)).length, 3);
});

test("다시 열면 기기 것, 기기가 비면 Cellar·보관본 중 최신 — 그리고 기기를 다시 채움", async () => {
  const local = memLocal(), host = memHost(), cellar = memCellar(), timers = fakeTimers();
  const s = createProjectStore({ local, host, cellar, now, timers });
  await s.open(T, "pk");
  const p = P.updateChar(proj(), "x", {});
  await s.save(T, "pk", p); timers.run(); await tick(); await tick();
  const s2 = createProjectStore({ local, host, cellar, now, timers });
  const a = await s2.open(T, "pk");
  assert.equal(a.source, "local"); assert.deepEqual(a.project.chars.map((c) => c.name), ["A", "B"]);
  local.m.clear();   // 브라우저 데이터 지움
  const b = await createProjectStore({ local, host, cellar, now, timers }).open(T, "pk");
  assert.ok(b.source === "cellar" || b.source === "host"); assert.deepEqual(b.project.chars.map((c) => c.name), ["A", "B"]);
  assert.ok(local.m.size >= 3);
  cellar.kv.clear(); local.m.clear();
  const c = await createProjectStore({ local, host, cellar, now, timers }).open(T, "pk");
  assert.equal(c.source, "host");
});

test("옛 사용자: 보관본만 있으면 그걸로 열고 기기를 채움", async () => {
  const local = memLocal(), host = memHost(), timers = fakeTimers();
  host.h.data = proj(); host.h.t = 5;
  const s = createProjectStore({ local, host, now, timers });
  const r = await s.open(T, "pk");
  assert.equal(r.source, "host"); assert.equal(r.project.chars.length, 2); assert.ok(local.m.size === 3);
});

test("기기 쓰기가 실패하면 던지고, 다음 저장에서 빠짐없이 다시 씀", async () => {
  const local = memLocal(), host = memHost(), timers = fakeTimers();
  const s = createProjectStore({ local, host, now, timers });
  await s.open(T, "pk");
  const p = proj();
  local.fail = true;
  await assert.rejects(() => s.save(T, "pk", p));
  local.fail = false;
  assert.equal((await s.save(T, "pk", p)).written, 3);
});

test("Cellar가 끊겨 있으면 쌓아 두었다 다음에 올림, 시각이 같으면 기기 것", async () => {
  const local = memLocal(), host = memHost(), cellar = memCellar(false), timers = fakeTimers();
  const s = createProjectStore({ local, host, cellar, now, timers });
  await s.open(T, "pk"); await s.save(T, "pk", proj());
  timers.run(); await tick(); await tick();
  assert.equal(cellar.kv.size, 0); assert.equal(s.pending("pk").cellar, 3);
  cellar.on = true; await s.flush("pk");
  assert.equal(cellar.kv.size, 3); assert.equal(s.pending("pk").cellar, 0);
  assert.equal((await createProjectStore({ local, host, cellar, now, timers }).open(T, "pk")).source, "local");
});

test("캐릭터를 지우면 기기·Cellar에서도 지움, 빠진 기록은 missing", async () => {
  const local = memLocal(), host = memHost(), cellar = memCellar(), timers = fakeTimers();
  const s = createProjectStore({ local, host, cellar, now, timers });
  await s.open(T, "pk"); const p = proj(); await s.save(T, "pk", p); await s.flush("pk");
  await s.save(T, "pk", P.removeChar(p, p.chars[1].id)); await s.flush("pk");
  assert.equal(local.m.size, 2); assert.equal(cellar.kv.size, 2);
  const k = [...local.m.keys()].find((x) => x.includes("|c:"));
  local.m.delete(k);
  const r = await createProjectStore({ local, host: memHost(), now, timers }).open(T, "pk");
  assert.equal(r.missing.length, 1);
});
test("기기 기록이 일부 빠졌으면 온전한 다른 저장본으로 엶", async () => {
  const local = memLocal(), host = memHost(), timers = fakeTimers();
  const s = createProjectStore({ local, host, now, timers });
  await s.open(T, "pk"); await s.save(T, "pk", proj()); await s.flush("pk");
  local.m.delete([...local.m.keys()].find((x) => x.includes("|c:")));
  const r = await createProjectStore({ local, host, now, timers }).open(T, "pk");
  assert.equal(r.source, "host"); assert.equal(r.project.chars.length, 2); assert.deepEqual(r.missing, []);
  assert.equal(local.m.size, 3);   // 기기도 다시 채움
});
test("잇단 저장은 한 줄로 — 마지막 내용이 남고 기록 수가 맞음", async () => {
  const local = memLocal(), host = memHost(), timers = fakeTimers();
  const s = createProjectStore({ local, host, now, timers });
  await s.open(T, "pk");
  let p = proj();
  const all = [];
  for (let i = 0; i < 20; i++) { p = P.updateChar(p, p.chars[i % 2].id, { prompt: `p${i}` }); all.push(s.save(T, "pk", p)); }
  await Promise.all(all);
  const r = await createProjectStore({ local, host, now, timers }).open(T, "pk");
  assert.deepEqual(r.project.chars.map((c) => c.prompt), ["p18", "p19"]);
  assert.equal(local.m.size, 3);
});
