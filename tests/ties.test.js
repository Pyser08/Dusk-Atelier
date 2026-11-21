import test from "node:test";
import assert from "node:assert/strict";
import { tieKind, tieReport, applyTie, tiesBetween, tieFloor, tieLines, setTies, TIE_STAGE1 } from "../src/engine/ties.js";
import { extraFrom, applyExtra, extraOf } from "../src/engine/memextra.js";
import { stageOf } from "../src/engine/memoryhuman.js";

test("2.2.30 관계 종류: 기록기 줄 → 저장, 위아래·끝남", () => {
  assert.equal(tieKind("직장 동료"), "coworker"); assert.equal(tieKind("mentor"), "mentor"); assert.equal(tieKind("??"), "");
  const rep = extraFrom("tie|세라|유나|family|\ntie|세라|{{user}}|mentor|{{user}}\ntie|유나|영수|boss|철수", (n) => (["세라", "유나", "민지"].includes(n) ? n : ""));
  assert.equal(rep.length, 2, "모르는 인물 줄은 버림"); assert.equal(rep[1].up, "{{user}}");
  const f = {}; applyExtra(f, rep, { turn: 3 });
  const t = tiesBetween(extraOf(f).ties, "세라", "{{user}}");
  assert.deepEqual(t.map((x) => x.label), ["사제(스승)"], "세라 쪽에서 보면 유저가 스승");
  assert.deepEqual(tiesBetween(extraOf(f).ties, "{{user}}", "세라").map((x) => x.label), ["사제(제자)"]);
  applyExtra(f, extraFrom("tie|세라|{{user}}|mentor|ended", (n) => n), { turn: 9 });
  assert.equal(tiesBetween(extraOf(f).ties, "세라", "{{user}}").length, 0, "끝난 관계는 지움");
  assert.match(TIE_STAGE1, /tie\|Name\|Other\|kind/);
});

test("2.2.30 관계 종류: 가족은 처음 만난 장면이어도 엔진 진도가 친한 사이부터(감정 상한용)", () => {
  const f = { scenes: [], emo: {}, extra: {} };
  assert.equal(stageOf(f, "세라", "유나", 0).stage, "just met");
  f.extra = { ties: {} }; applyTie(f.extra.ties, { a: "세라", b: "유나", tie: "family", up: "" });
  assert.equal(stageOf(f, "세라", "유나", 0).stage, "close");
  assert.equal(tieFloor(f.extra.ties, "유나", "세라"), 2);
  assert.match(tieLines(f.extra.ties, ["세라", "유나"]).join(), /세라 ↔ 유나: family/);
});

test("2.2.30 관계 종류: 직접 고치면 잠겨서 기록기가 못 바꿈", () => {
  const ties = {}; setTies(ties, "세라", "유나", [{ id: "party" }]);
  assert.equal(applyTie(ties, { a: "유나", b: "세라", tie: "enemy", up: "" }), "");
  assert.deepEqual(tiesBetween(ties, "세라", "유나").map((x) => x.id), ["party"]);
});

test("2.2.30 친밀도: 가족은 장면이 적어도 높고, 함께한 장면·추억·감정으로 오르며, 적대는 깎고, 직접 정하면 그 값", async () => {
  const { intimacyOf, setIntimacy } = await import("../src/engine/memoryhuman.js");
  const f = { scenes: [], emo: {}, extra: { ties: {} } };
  assert.equal(intimacyOf(f, "세라", "유나", 0).v, 0);
  applyTie(f.extra.ties, { a: "세라", b: "유나", tie: "sibling", up: "세라" });
  const fam = intimacyOf(f, "세라", "유나", 0).v; assert.ok(fam >= 6, `가족 ${fam}`);
  const g = { scenes: Array.from({ length: 6 }, (_, i) => ({ at: i, who: ["민지", "하나"] })), emo: { "민지>하나": { from: "민지", to: "하나", tags: { affection: 8, trust: 7 } } }, bonds: [{ a: "민지", b: "하나", moment: "x" }], extra: {} };
  const warm = intimacyOf(g, "민지", "하나", 6).v; assert.ok(warm >= 5, `쌓인 사이 ${warm}`);
  g.emo["하나>민지"] = { from: "하나", to: "민지", tags: { hostility: 9 } };
  assert.ok(intimacyOf(g, "민지", "하나", 6).v < warm, "적대는 깎음");
  setIntimacy(g, "하나", "민지", 4); assert.deepEqual(intimacyOf(g, "민지", "하나", 6), { v: 4, manual: true });
});

test("2.2.30 관계도: 관계 종류가 선 이름이 되고, 기록 없는 두 사람도 잇고, 나와의 선은 관계 종류(없으면 친밀도)", async () => {
  const { buildRelMap } = await import("../src/engine/relmap.js");
  const rec = (id, act, at) => ({ id, act, g: "B", at, orphan: false });
  const f = { people: { 세라: { name: "세라", records: [rec("a", "검을 닦았다", 1)] }, 유나: { name: "유나", records: [rec("b", "책을 읽었다", 2)] } }, scenes: [], emo: {}, extra: { ties: {} } };
  applyTie(f.extra.ties, { a: "세라", b: "유나", tie: "mentor", up: "세라" });
  applyTie(f.extra.ties, { a: "{{user}}", b: "세라", tie: "coworker", up: "" });
  const m = buildRelMap(f);
  const e = m.edges.find((x) => x.tie); assert.ok(e, JSON.stringify(m.edges)); assert.equal(e.label, "사제");
  assert.match(e.items[0][1], /세라가 스승/);
  assert.match(m.nodes.find((n) => n.name === "세라").uLabel, /직장 동료/);
  assert.match(m.nodes.find((n) => n.name === "유나").uLabel, /친밀도 \d/);
});

test("2.2.30 메인 주입: 관계 종류가 ‘Relationships’ 묶음에 유저와의 관계까지 들어간다", async () => {
  const { buildBlock } = await import("../src/engine/memoryinject.js");
  const rec = (id, act, at) => ({ id, act, g: "A", at, orphan: false });
  const f = { people: { 세라: { name: "세라", records: [rec("a", "세라가 {{user}}에게 검술을 가르쳤다", 1)] } }, scenes: [{ at: 1, who: ["세라"], sum: "검술 수업" }], emo: {}, extra: { ties: {} } };
  applyTie(f.extra.ties, { a: "세라", b: "{{user}}", tie: "mentor", up: "세라" });
  const out = buildBlock(f, { recentText: "세라가 검을 들었다", messageCount: 2 });
  const text = typeof out === "string" ? out : out?.text ?? JSON.stringify(out);
  assert.match(text, /세라 ↔ \{\{user\}\}: mentor \(세라 is 스승\)/);
});

test("2.2.30 고르기 재사용 열쇠: 위키 목록·대화에 나온 위키 인물이 같으면 같은 열쇠, 다르면 다름, 이름이 없으면 null", async () => {
  const { castKey } = await import("../src/engine/retrycache.js");
  const P = (user, recent, cat) => `x\n"current_user":${JSON.stringify(user)}\n<<<RISUPOT_REFERENCE_DATA_START>>>\n${JSON.stringify({ recent_chat: recent, wiki_catalog: cat })}\n<<<RISUPOT_REFERENCE_DATA_END>>>`;
  const cat = { "doc:a": { title: "하야세 유우카", aliases: ["유우카"] }, "doc:b": { title: "타카나시 호시노", aliases: ["호시노"] } };
  const k1 = castKey(P("유우카, 장부 얘기 좀", [{ text: "유우카가 커피를 내려놓았다" }], cat));
  const k2 = castKey(P("유우카 오늘 바빠?", [{ text: "유우카는 고개를 끄덕였다" }], cat));
  assert.ok(k1); assert.equal(k1, k2, "같은 인물만 나오면 재사용");
  assert.notEqual(castKey(P("호시노는?", [{ text: "유우카가 말했다" }], cat)), k1, "다른 인물이 끼면 새로");
  assert.notEqual(castKey(P("유우카", [], { ...cat, "doc:c": { title: "노아" } })), castKey(P("유우카", [], cat)), "위키 목록이 바뀌면 새로");
  assert.equal(castKey(P("비가 오네", [], cat)), null, "이름이 없으면 재사용 안 함");
});
