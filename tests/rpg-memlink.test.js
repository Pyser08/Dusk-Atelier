// Dusk Saga 직업 · 장기기억 연계
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/rpg/engine/index.js";
import { createMemoryLink } from "../src/rpg/data/memorylink.js";

const battle = (job = "검사", level = 21) => { const S = E.fresh(); S.seed = 4; E.loadEncounter(S, { name: "다리 싸움", mapPreset: "평원", units: [{ id: "a", preset: "병사", name: "아린", level, job, sex: "f", race: "엘프" }, { id: "b", preset: "산적", level: 1 }], place: [{ ref: "a", team: "ally", x: 5, y: 5 }, { ref: "b", team: "enemy", x: 6, y: 5 }] }); return S; };
const folder = (at = 10) => ({ chaId: "c", chatId: "t", v: 3, cursor: { at }, wiki: { documents: { d1: { id: "d1", type: "Character", title: "아린", aliases: ["린"] } } }, people: {}, extra: {} });

test("직업 36개: 기본직마다 상급직 둘, 무기·기술이 유효하다", () => {
  const all = Object.entries(E.CLASSES), base = all.filter(([, c]) => c.tier === 1); assert.equal(base.length, 12); assert.equal(all.length, 36);
  const ids = new Set(); for (const [n, c] of all) { assert.ok(c.weapons.every((w) => E.WT[w]), n); if (c.tier === 1) { assert.equal(c.adv.length, 2); for (const a of c.adv) assert.equal(E.CLASSES[a].base, n); assert.ok(E.CAT[c.start] && c.weapons.includes(E.CAT[c.start].type), n); } else { assert.ok(!ids.has(c.skill.id)); ids.add(c.skill.id); } }
});
test("모든 기본직이 두 갈래로 전직하고, 손으로 고른 전직은 되감아도 남는다", () => {
  for (const [job, c] of Object.entries(E.CLASSES)) if (c.tier === 1) for (const to of c.adv) {
    const S = battle(job), d = S.defs.a, hp = d.stats.hp; assert.equal(d.job, job); E.mark(S, "x"); const ev = []; E.actWait(S, S.battle.units.a); E.mark(S, "y");
    assert.equal(E.promote(S, "a", "없는직업"), null); const r = E.promote(S, "a", to); assert.equal(r.to, to); assert.ok(d.stats.hp >= hp && d.skills.concat(d.later || []).includes(E.CLASSES[to].skill.id)); assert.equal(E.promote(S, "a", to), null);
    assert.ok(E.canUse(d, d.weapons[0])); assert.ok(E.pulse(S, S.hist.length - 2)); assert.equal(S.defs.a.job, to); assert.equal(S.defs.a.mtype, d.mtype); for (let t = 0; t < 6; t++) E.endTurn(S, ev);
  }
  const low = battle("검사", 20); assert.equal(E.promote(low, "a", "검성"), null);
});
test("직업이 못 쓰는 무기로는 공격할 수 없다", () => {
  const S = battle("검사"); S.defs.a.weapons.push(E.normWeapon({ name: "철의 도끼" })); assert.deepEqual(E.options(S, S.battle.units.a).filter((o) => o.kind === "attack" && !o.art).map((o) => o.label), ["철의 검"]);
});
test("전투가 끝나면 장기기억에 직업과 전적이 한 번만 남고 다른 칸은 그대로다", () => {
  const f = folder(), keep = JSON.stringify({ w: f.wiki, p: f.people, x: f.extra }), S = battle(); S.battle.status = "victory"; S.battle.units.b.hp = 0; const ev = [{ t: "strike", from: "a", to: "b", hp: 0, dmg: 9 }];
  assert.equal(E.recordBattle(f, S, "b1", ev), true); assert.equal(E.recordBattle(f, S, "b1", ev), false);
  const v = E.unitView(f, "린"); assert.deepEqual([v.name, v.job, v.kills, v.battles], ["아린", "검사", 1, 1]); assert.equal(JSON.stringify({ w: f.wiki, p: f.people, x: f.extra }), keep);
  assert.match(E.rpgSection(f, ["아린", "린"]), /아린: 검사 · Lv 21 · 철의 검/); assert.equal(E.rpgSection(f, ["모르는 사람"]), "");
});
test("전직·개명은 같은 인물로 이어지고, 이야기를 되감으면 그 뒤 기록이 사라진다", () => {
  const f = folder(10), S = battle(); E.recordSheets(f, S); f.cursor.at = 20; E.promote(S, "a", "검성"); E.recordSheets(f, S); f.wiki.documents.d1.title = "아리엔"; f.wiki.documents.d1.aliases.push("아린");
  assert.equal(E.unitView(f, "아리엔").job, "검성"); E.recordSheets(f, S); assert.equal(Object.keys(f.rpg.units).length, 1);
  f.cursor.at = 12; assert.equal(E.unitView(f, "아린").job, "검사"); assert.equal(f.rpg.units["doc:d1"].log.length, 2, "보기만으로는 지우지 않는다"); E.prune(f); assert.equal(f.rpg.units["doc:d1"].log.length, 1);
});
test("장기기억이 아는 종족·성별·직업으로 새 시트를 채운다", () => {
  const f = folder(); f.extra.race = { x: { name: "아린", id: "elf", label: "숲의 다크 엘프" }, y: { name: "렌", id: "vampire", label: "" } }; f.orient = { 아린: { g: "f" } }; assert.deepEqual(E.seedFromMemory(f, "린"), { race: "다크엘프", sex: "f" }); assert.equal(E.seedFromMemory(f, "렌").race, "흡혈귀"); assert.deepEqual(E.seedFromMemory({}, "x"), {});
});
test("장기기억이 없거나 꺼졌거나 채팅이 바뀌면 쓰지 않는다", async () => {
  const S = battle(), f = folder(); let on = true, cur = { chaId: "c", chatId: "t" }, n = 0; const M = { version: 1, currentChat: async () => cur, folder: async () => f, update: async (fn) => { n++; await fn(f); return true; } }, ext = { get: (a, b) => (a === "svc" && b === "memoryApi" ? M : null) };
  const L = createMemoryLink(ext, { enabled: () => on }); assert.equal(await L.sheets(S, "", cur), 1); assert.equal((await L.view("아린")).job, "검사"); const chat = cur;
  cur = { chaId: "c", chatId: "다른" }; assert.equal(await L.sheets(S, "", chat), false); on = false; assert.equal(await L.sheets(S), false); assert.equal(n, 1);
  const none = createMemoryLink({ get: () => null }); assert.equal(await none.section(["아린"]), ""); assert.deepEqual(await none.seed("아린"), {});
  const bad = createMemoryLink({ get: () => ({ version: 1, currentChat: async () => { throw new Error("x"); } }) }); assert.equal(await bad.sheets(S), false);
});

test("스탯 탭: 스탯·장비·기술이 보이고 바뀐 만큼 표시되며, 애드온이 꺼지면 탭이 없다", async () => {
  const { statusCardHtml } = await import("../src/engine/namecard.js"); const { activate } = await import("../addons/rpg/index.js");
  const f = folder(), S = battle(); S.defs.a.weapons[0].name = "<b>검</b>"; E.recordSheets(f, S); assert.equal(f.rpg.units["doc:d1"].log[0].race, undefined); f.cursor.at = 11; S.defs.a.stats.str += 2; E.recordSheets(f, S); E.recordSheets(f, S); assert.equal(f.rpg.units["doc:d1"].log.length, 2);
  const h = E.statTabHtml(f, ["린"]); for (const w of ["검사", "Lv 21", "장비", "기술", "+2"]) assert.ok(h.includes(w), w); assert.ok(!h.includes("<b>검</b>"), "이름은 이스케이프"); assert.equal(E.statTabHtml(f, ["없음"]), "");
  const d = f.wiki.documents.d1, on = statusCardHtml(f, d, { adult: false, battle: h }); assert.match(on, /data-tab="s"/); assert.match(on, />스탯</); assert.ok(!statusCardHtml(f, d, { adult: false }).includes("스탯"));
  const svc = new Map(), ext = { add: (k, id, v) => { svc.set(id, v); return () => svc.delete(id); }, get: (k, id) => svc.get(id) }; const a = await activate({}, { ext }); assert.equal(svc.get("rpgStats").tabFor(f, ["아린"]), h); a.deactivate(); assert.ok(!svc.has("rpgStats"));
});
