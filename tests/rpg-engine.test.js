// Dusk Saga 엔진: 원본 Risu Tactics와 같은 시드·같은 입력이면 같은 결과 + 저장 가져오기
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as NEW from "../src/rpg/engine/index.js";
import { OLD_NAMES, OLD_SKILL_IDS } from "../src/rpg/engine/names.js";

const raw = readFileSync(new URL("../ref/risu-tactics/Risu_Tactics_plugin_v0.9.36.js", import.meta.url), "utf8");
const OLD = new Function(raw.slice(raw.indexOf("const RT ="), raw.indexOf("// ───────────────────────── Host")) + "\nreturn RT;")();

const nameRe = new RegExp(Object.keys(OLD_NAMES).sort((a, b) => b.length - a.length).join("|"), "g");
const idRe = new RegExp(`"(${Object.keys(OLD_SKILL_IDS).join("|")})"`, "g");
const rename = (s) => s.replace(nameRe, (k) => OLD_NAMES[k]).replace(idRe, (_, k) => `"${OLD_SKILL_IDS[k]}"`);
// start·hist는 JSON 문자열이라 따옴표가 겹친다 → 풀어서 비교
const unpack = (k, v) => (typeof v === "string" && /^[{[]/.test(v) ? JSON.parse(v) : k === "v" ? 0 : v);
const dump = (o) => JSON.stringify(o, unpack);
const rnd = (n) => () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), n | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function encounter(E, i) {
  if (i % 2 === 0) return E.demo();
  const maps = Object.keys(OLD.MAPS), pre = Object.keys(OLD.PRE), d = E.demo();
  const foes = [0, 1, 2, 3, 4].map((n) => ({ id: "f" + n, preset: pre[(i * 3 + n * 5) % pre.length], level: 1 + ((i * 7 + n) % 30) }));
  const obj = ["rout", "boss", "survive", "seize"][i % 4];
  for (const id of ["ren", "mira"]) d.units.find((u) => u.id === id).weapons = [{ name: i % 4 === 1 ? "소총" : "산탄총" }, { name: "상처약" }];
  return { name: "시험 " + i, mapPreset: maps[i % maps.length], objective: { type: obj, turns: 4 }, units: d.units.concat(foes),
    place: d.place.filter((p) => p.team === "ally").concat(foes.map((f, n) => ({ ref: f.id, team: n === 3 ? "third" : n === 4 ? "friend" : "enemy", x: 9 + (n % 3), y: 2 + n, ai: ["charge", "hold", "guard"][n % 3], boss: n === 0 })), [{ ref: "f1", team: "enemy", x: 12, y: 1, turn: 2 }]) };
}

function play(E, i) {
  const S = E.fresh(); S.seed = 1000 + i; S.xcom = i % 3 === 0;
  E.ensureBase(S); E.loadEncounter(S, encounter(E, i)); E.snapshot(S);
  const r = rnd(77 + i), ev = [], at = (n) => Math.floor(r() * n), kinds = new Set();
  for (let turn = 0; turn < 12 && S.battle.status === "active"; turn++) {
    for (const id of E.alive(S.battle).filter((u) => u.team === "ally").map((u) => u.id)) {
      const u = S.battle.units[id]; if (!u || u.hp <= 0 || u.done || u.rearOf || S.battle.status !== "active") continue;
      const R = E.reach(S, u), st = E.stops(S, u, R), from = { x: u.x, y: u.y }, k = st[at(st.length)];
      E.danger(S, "enemy");
      if (!E.travel(S, u, E.pathTo(R, k), ev) || S.battle.status !== "active") continue;
      const opts = E.options(S, u, from).filter((o) => o.targets.length), hit = opts.filter((o) => o.kind === "attack");
      const o = hit.length && r() < 0.7 ? hit[at(hit.length)] : opts[at(opts.length)];
      if (!o) { if (E.canSeize(S, u)) E.actSeize(S, u, ev); else E.actWait(S, u); continue; }
      kinds.add(o.kind); if (o.wi != null && ["attack", "heal"].includes(o.kind)) u.wi = o.wi;
      const t = o.targets[at(o.targets.length)], z = S.battle.units[t];
      if (o.kind === "attack") E.actAttack(S, u, z, o.art || null, ev);
      else if (o.kind === "heal") E.actHeal(S, u, z, ev);
      else if (o.kind === "item") E.actItem(S, u, o.wi, ev);
      else if (o.kind === "pair") E.actPair(S, u, z);
      else if (o.kind === "switch") E.actSwitch(S, u);
      else if (o.kind === "drop") E.actDrop(S, u, ...E.unK(t));
      else if (o.kind === "reload") E.actReload(S, u, o.wi);
      else if (o.kind === "watch") E.actWatch(S, u);
      else { E.actGive(S, u, z, 0); E.actWait(S, u); }
      E.mark(S, "행동");
    }
    E.endTurn(S, ev);
    if (turn === 3 && S.hist.length > 4) E.pulse(S, S.hist.length - 3);
  }
  return { S, ev, kinds, note: E.storyNote(S) };
}

test("같은 시드·같은 입력이면 원본 엔진과 이벤트·기록·최종 상태가 같다", () => {
  const seen = new Set(); let strikes = 0;
  for (let i = 0; i < 120; i++) {
    const a = play(OLD, i), b = play(NEW, i);
    // seq·sent 같은 저장 값도 포함해 통째로 비교
    assert.equal(dump(b.ev), rename(dump(a.ev)), "이벤트 " + i);
    assert.equal(dump(b.S), rename(dump(a.S)), "상태 " + i);
    assert.equal(b.note.replace("Dusk Saga", "Risu Tactics"), rename(a.note), "서술 " + i);
    for (const k of b.kinds) seen.add(k); strikes += b.ev.filter((e) => e.t === "strike").length;
  }
  assert.ok(strikes > 1000);
  for (const k of ["attack", "heal", "item", "pair", "switch", "drop", "reload", "watch", "trade"]) assert.ok(seen.has(k), "시험에 안 나온 행동: " + k);
});

test("원본이 내보내던 함수가 모두 있다", () => {
  for (const k of Object.keys(OLD)) assert.ok(k in NEW, k);
});

test("Tactics 저장을 가져와 이어 해도 원본과 같은 결과가 나온다", () => {
  for (const i of [0, 1, 2, 6]) {
    const S = OLD.fresh(); S.seed = 5 + i; S.xcom = i === 6; OLD.ensureBase(S); OLD.loadEncounter(S, encounter(OLD, i)); OLD.snapshot(S); OLD.endTurn(S, []);
    const before = JSON.stringify(S), N = NEW.migrateSave(S);
    assert.equal(JSON.stringify(S), before, "원본 저장은 그대로"); assert.equal(N.v, 3);
    const ea = [], eb = []; OLD.endTurn(S, ea); NEW.endTurn(N, eb);
    assert.equal(dump(eb), rename(dump(ea)));
    // 옛 기록(log) 글은 그대로 두므로 나머지만 비교
    const state = (s) => dump({ d: s.defs, b: s.battle, k: s.skills, seed: s.seed, st: JSON.parse(s.start).defs });
    assert.equal(state(N), rename(state(S)));
    assert.ok(NEW.restart(N)); assert.ok(NEW.migrateSave(N).v === 3);
  }
});

test("저장이 아닌 값은 가져오지 않는다", () => {
  for (const x of [null, 3, {}, { v: 1, defs: {}, skills: {} }, { v: 2 }]) assert.throws(() => NEW.migrateSave(x));
});

test("프롬프트에 다른 게임의 작품명이 들어가지 않는다", () => {
  const all = [NEW.GEN_PROMPT, NEW.GROWTH_PROMPT, NEW.REGEN_PROMPT, NEW.XCOM_PROMPT, NEW.LATER_PROMPT].join("\n");
  assert.doesNotMatch(all, /fire emblem|fates|xcom/i);
  for (const k of Object.keys(OLD_NAMES)) assert.ok(!Object.keys(NEW.CAT).includes(k), k);
});

test("모든 맵 프리셋은 12×9이고 걸어서 양쪽이 이어진다", () => {
  for (const [name, m] of Object.entries(NEW.MAPS)) for (const rows of [m.rows, ...(m.alts ?? [])]) {
    assert.ok(rows.length >= 7 && rows.every((r) => r.length === 12 && /^[.bfpmFTw#lsihHv]+$/.test(r)), name);
    const foot = []; rows.forEach((r, y) => [...r].forEach((c, x) => { if (NEW.TERRAIN[c].c[0] < 99) foot.push(x + "," + y); }));
    const ok = new Set(foot), seen = new Set([foot[0]]), q = [foot[0]]; while (q.length) { const [x, y] = q.pop().split(",").map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = x + dx + "," + (y + dy); const B = { map: rows }; if (ok.has(k) && !seen.has(k) && Math.abs(NEW.up(B, x + dx, y + dy) - NEW.up(B, x, y)) < 2) { seen.add(k); q.push(k); } } }
    assert.equal(seen.size, ok.size, name + " 끊긴 칸"); assert.ok(foot.length >= 40, name);
    if (m.indoor) assert.ok(!rows.join("").match(/[fm]/), name);
  }
});

test("종족: 능력은 한 번만 바뀌고 특성·꼬리표가 붙고 모든 종족으로 전투가 돈다", () => {
  for (const [race, r] of Object.entries(NEW.RACES)) {
    const sum = NEW.STATS.slice(1).reduce((n, k) => n + r.stats[k], 0) + r.stats.hp / 2; assert.ok(Math.abs(sum) <= 3.5, race + " 합 " + sum);
    const S = NEW.fresh(); S.seed = 3; const j = { name: "t", mapPreset: "평원", units: [{ id: "a", preset: "병사", level: 5, race }, { id: "b", preset: "병사", level: 5 }], place: [{ ref: "a", team: "ally", x: 2, y: 5 }, { ref: "b", team: "enemy", x: 9, y: 5 }] };
    NEW.loadEncounter(S, j); const d = S.defs.a, plain = S.defs.b; assert.equal(d.race, race); assert.ok(d.skills.includes(r.trait) && S.skills[r.trait]); for (const t of r.tags) assert.ok(d.tags.includes(t));
    for (const k of ["str", "mag", "spd", "def"]) assert.equal(d.stats[k], Math.max(0, plain.stats[k] + r.stats[k]), race + k);
    const before = JSON.stringify(d); NEW.applyRace(S, d, race, true); assert.equal(JSON.stringify(d), before);
    const ev = []; for (let t = 0; t < 12; t++) NEW.endTurn(S, ev); assert.ok(ev.some((e) => e.t === "strike"), race);
  }
});

test("무기 프리셋은 이름만으로 쓸 수 있고 특효가 실제로 먹힌다", () => {
  for (const [n, w] of Object.entries(NEW.CAT)) { const x = NEW.normWeapon({ name: n }); assert.equal(x.type, w.type, n); assert.equal(x.mt, w.mt, n); }
  assert.ok(Object.keys(NEW.CAT).length >= 90);
  const S = NEW.fresh(); NEW.loadEncounter(S, { name: "t", mapPreset: "평원", units: [{ id: "a", preset: "병사", weapons: [{ name: "성검" }] }, { id: "b", preset: "병사", race: "흡혈귀" }], place: [{ ref: "a", team: "ally", x: 5, y: 5 }, { ref: "b", team: "enemy", x: 6, y: 5 }] });
  assert.equal(NEW.forecast(S, S.battle.units.a, S.battle.units.b, null).a.eff, true);
});

test("성별은 준 값만 남고 다시 만들어도 유지된다", () => {
  assert.equal(NEW.normUnit({ sex: "f" }, 0).sex, "f"); assert.equal(NEW.normUnit({ sex: "x" }, 0).sex, undefined); assert.equal(NEW.presetUnit("병사", 3, { sex: "m" }).sex, "m");
  const S = NEW.fresh(); NEW.loadEncounter(S, { ...NEW.demo(), units: NEW.demo().units.map((u) => ({ ...u, sex: "f" })) }); assert.equal(NEW.regen(S, "ren", { unit: { stats: { hp: 20 }, sex: "m" } }).sex, "f");
});

test("종족 목록은 장기기억과 하나도 빠짐없이 같고, 옛 이름도 알아듣는다", async () => {
  const M = await import("../src/engine/races.js"); assert.deepEqual(Object.values(NEW.RACES).map((r) => r.mem), M.RACES.map((r) => r.id)); assert.equal(Object.keys(NEW.RACES).length, M.RACES.length);
  for (const r of M.RACES) { assert.equal(NEW.raceById(r.id), r.label); if (r.id !== "human") assert.notEqual(NEW.kindOf(r.id), "인간", r.id); }
  assert.equal(NEW.raceOf("용인"), "드래곤"); assert.equal(NEW.raceOf("천족"), "천사"); assert.ok(NEW.RACES["용"] && NEW.RACES["드래곤"]);
});
test("장기기억: 용과 드래곤을 가르고, 이미 저장된 dragon 기록은 그대로 읽는다", async () => {
  const M = await import("../src/engine/races.js");
  for (const [t, id] of [["드래곤", "dragon"], ["용족", "dragon"], ["레드 드래곤", "dragon"], ["용", "ryu"], ["용 (청룡)", "ryu"], ["흑룡", "ryu"], ["용왕", "ryu"], ["이무기", "imugi"], ["공룡", ""], ["용병", ""], ["네코마타", "nekomata"]]) assert.equal(M.raceIdOf(t), id, t);
  const f = { extra: { race: { a: { name: "리나", id: "dragon", label: "" }, b: { name: "청", id: "ryu", label: "" } } } }; assert.equal(M.raceFor(f, "리나").label, "드래곤"); assert.equal(M.raceFor(f, "청").label, "용");
  assert.equal(NEW.seedFromMemory(f, "리나").race, "드래곤"); assert.equal(NEW.seedFromMemory(f, "청").race, "용");
});

test("지형: 용암은 태우되 죽이지 않고 불 속성은 안 타며, 높은 곳이 유리하고 절벽은 못 오른다", () => {
  const mk = (map, a = {}) => { const S = NEW.fresh(); NEW.loadEncounter(S, { name: "t", map, units: [{ id: "a", preset: "병사", ...a }, { id: "b", preset: "병사" }], place: [{ ref: "a", team: "ally", x: 2, y: 2 }, { ref: "b", team: "enemy", x: 3, y: 2, ai: "guard" }] }); return S; };
  const L = Array(6).fill("llllllll"), S = mk(L); S.battle.units.b.x = 7; S.battle.units.b.y = 5; const ev = []; S.battle.units.a.hp = 2; for (let i = 0; i < 3; i++) NEW.endTurn(S, ev); assert.ok(ev.some((e) => e.t === "burn")); assert.equal(S.battle.units.a.hp, 1); const F = mk(L, { elem: "fire" }), e2 = []; F.battle.units.b.x = 7; F.battle.units.b.y = 5; NEW.endTurn(F, e2); assert.ok(!e2.some((e) => e.t === "burn" && e.id === "a"));
  const hi = mk(["........", ".Hh.....", "........", "........"]), flat = mk(["........", "........", "........", "........"]), f = (s, x, y) => NEW.forecast(s, s.battle.units[x], s.battle.units[y], null).a;
  assert.ok(f(hi, "a", "b").hi > 0 && f(hi, "b", "a").hi < 0); assert.equal(f(flat, "a", "b").hi, 0);
  const c = mk([".....", "..H..", ".....", "....."]), k = NEW.K(2, 1); assert.ok(!NEW.reach(c, c.battle.units.a).has(k), "절벽"); const g = mk([".....", ".hH..", ".....", "....."], {}); g.battle.units.b.x = 4; g.battle.units.b.y = 3; assert.ok(NEW.reach(g, g.battle.units.a).has(k)); const w = mk([".....", "..H..", ".....", "....."], { mtype: "fly" }); w.battle.units.b.x = 4; w.battle.units.b.y = 3; assert.ok(NEW.reach(w, w.battle.units.a).has(k));
  for (const m of Object.keys(NEW.MAPS).slice(-20)) { const s = mk(Array(6).fill("........")); NEW.loadEncounter(s, { name: m, mapPreset: m, units: [{ id: "a", preset: "병사" }, { id: "b", preset: "기병" }], place: [{ ref: "a", team: "ally", x: 2, y: 5 }, { ref: "b", team: "enemy", x: 11, y: 5 }] }); const ev2 = []; for (let i = 0; i < 12; i++) NEW.endTurn(s, ev2); }
});

test("적 도감: 프리셋이 모두 싸울 수 있고, 봇이 지은 이름도 알맞은 모형을 찾으며 사람은 사람으로 남는다", () => {
  assert.ok(Object.keys(NEW.PRE).length >= 80); const names = Object.keys(NEW.PRE);
  for (let i = 0; i < names.length; i++) { const S = NEW.fresh(); S.seed = i; NEW.loadEncounter(S, { name: "t", map: Array(6).fill("........"), units: [{ id: "a", preset: names[i], level: 8 }, { id: "b", preset: "병사", level: 8 }], place: [{ ref: "a", team: "ally", x: 3, y: 3 }, { ref: "b", team: "enemy", x: 5, y: 3 }] }); const ev = []; for (let t = 0; t < 4; t++) NEW.endTurn(S, ev); assert.ok(ev.length, names[i]); }
  for (const [n, m] of [["서리 늑대왕", "wolf"], ["고대 화룡 이그니스", "dragon"], ["저주받은 갑옷", "armor"], ["거대 거미 여왕", "spider"], ["보물 상자", "mimic"], ["늑대 수인 카이", ""], ["드래곤 슬레이어 렌", ""], ["용병", ""], ["박쥐 사냥꾼", ""], ["왕국 병사", ""], ["뱀파이어 백작", ""], ["게일", ""], ["해골 병사", "skeleton"]]) assert.equal(NEW.modelOf({ name: n, cls: "" }), m, n);
  assert.equal(NEW.modelOf({ name: "리나", cls: "마법사", race: "드래곤" }), ""); assert.equal(NEW.modelOf({ name: "아무개", model: "hydra" }), "hydra"); assert.equal(NEW.modelOf({ name: "아무개", model: "constructor" }), "");
});
