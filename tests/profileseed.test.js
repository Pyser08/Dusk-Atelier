import test from "node:test";
import assert from "node:assert/strict";
import { ensureProfiles, missingProfiles } from "../src/data/profileseed.js";
import { planPeopleBatches, peopleImportBatchPrompt } from "../src/data/pot/people-import.js";

test("기본 성격 없는 인물만 골라 묶음으로 만든다(최대 max명)", async () => {
  const scope = { documents: { a: { id: "a", type: "Character", title: "가" }, b: { id: "b", type: "Character", title: "나" }, c: { id: "c", type: "Character", title: "다" }, l: { id: "l", type: "Location" } }, people: { profiles: { a: {} } } };
  assert.deepEqual(missingProfiles(scope).map((d) => d.id), ["b", "c"]);
  const calls = [];
  const imp = { runCharacters: async (ids) => { calls.push(ids); for (const id of ids) scope.people.profiles[id] = {}; return { made: ids, failed: [] }; } };
  const memory = { flow: { runtime: () => ({ wiki: { snapshot: () => scope }, settings: { snapshot: () => ({}) } }), tools: () => ({ importer: imp, busy: () => false }) } };
  assert.equal(await ensureProfiles(memory, { max: 4 }), 2);
  assert.deepEqual(calls, [["b", "c"]], "한 번에 넘긴다");
});

test("인물 프로필을 꺼 두었거나 다른 작업 중이면 만들지 않는다", async () => {
  const scope = { documents: { z: { id: "z", type: "Character" } }, people: { profiles: {} } };
  const imp = { runCharacters: async () => assert.fail("부르면 안 됨") };
  const mk = (off, busy) => ({ flow: { runtime: () => ({ wiki: { snapshot: () => scope }, settings: { snapshot: () => ({ peopleProfileEnabled: !off }) } }), tools: () => ({ importer: imp, busy: () => busy }) } });
  assert.equal(await ensureProfiles(mk(true, false)), 0);
  assert.equal(await ensureProfiles(mk(false, true)), 0);
});

test("묶음 나누기: 겹치는 자료는 한 번만 세고, 한도를 넘으면 나누고, 혼자 넘는 인물은 한 사람씩", () => {
  const S = (ref, n) => ({ ref, label: ref, content: "x".repeat(n) });
  const card = S("card", 400);
  const it = (id, extra) => ({ id, related: [card, ...extra] });
  const { batches, single } = planPeopleBatches([it("a", [S("la", 100)]), it("b", [S("lb", 100)]), it("c", [S("lc", 100)]), it("big", [S("huge", 5000)]), it("d", [S("ld", 100)]), it("e", [S("le", 100)])], { max: 4, limit: 1200 });
  assert.deepEqual(batches.map((b) => b.map((x) => x.id)), [["a", "b", "c", "d"], ["e"]]);
  assert.deepEqual(single.map((x) => x.id), ["big"]);
});

test("묶음 지시문: 한 사람 지시문 규칙을 그대로 쓰고 people 배열로 받는다", () => {
  const p = peopleImportBatchPrompt([{ name: "가", aliases: [], source_refs: ["r1"] }, { name: "나", aliases: [], source_refs: ["r2"] }], [{ ref: "r1", content: "c" }], "req:x", { sexualDesireEnabled: true });
  assert.match(p, /"people":\[\{"name"/);
  assert.match(p, /EACH identified person/);
  assert.match(p, /sexual_desire/);
  assert.match(p, /# PEOPLE\n/);
  assert.match(p, /Sexual desire is a concrete list/);
});

test("묶음 지시문 캐시: 요청 번호는 맨 끝에만, 같은 자료면 앞부분이 같다", () => {
  const src = [{ ref: "card", content: "카드" }, { ref: "lore1", content: "로어" }];
  const a = peopleImportBatchPrompt([{ name: "가", aliases: [], source_refs: ["card"] }], src, "req:aaa", {});
  const b = peopleImportBatchPrompt([{ name: "나", aliases: [], source_refs: ["card"] }], [...src].reverse(), "req:bbb", {});
  assert.equal(a.indexOf("req:aaa"), a.lastIndexOf("req:aaa"));
  assert.ok(a.indexOf("req:aaa") > a.indexOf("# PEOPLE"));
  const head = (t) => t.slice(0, t.indexOf("# PEOPLE"));
  assert.equal(head(a), head(b));
});
