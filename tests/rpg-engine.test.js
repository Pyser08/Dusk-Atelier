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
  const maps = Object.keys(E.MAPS), pre = Object.keys(E.PRE), d = E.demo();
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
