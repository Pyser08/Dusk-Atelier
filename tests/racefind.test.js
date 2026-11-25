// 종족 찾기: 로어북·봇 설정·본문에서 찾고, 헷갈리는 표현에는 속지 않는다
import test from "node:test";
import assert from "node:assert/strict";
import { findRace, raceOfText, raceFinds } from "../src/engine/racefind.js";
import { raceIdOf, raceFor } from "../src/engine/races.js";
import { applyExtra } from "../src/engine/memextra.js";
import { createCastReader, castSources } from "../src/data/castlore.js";
const id = (names, src) => findRace(names, src)?.id ?? "";
const lore = (content, o = {}) => ({ entries: [{ key: "세라", comment: "세라", content, ...o }] });

test("로어북 항목에 적힌 종족을 여러 형식에서 찾는다", () => {
  for (const [t, want] of [["종족: 다크엘프\n나이: 120", "darkelf"], ["- **종족**: 고양이 수인 (묘인족)", "cat"], ["Race: Half-Elf", "halfelf"], ["{ \"species\": \"vampire\" }", "vampire"], ["[이름: 세라 | 종족 = 서큐버스 | 성별: 여]", "succubus"], ["종족은 드래고니안이다.", "dragon"], ["세라는 천 년을 산 흡혈종이다.", "vampire"], ["숲에서 자란 엘프다. 활을 잘 쏜다.", "elf"], ["종족: 용(청룡)", "ryu"], ["종족: 비인간(서큐버스)", "succubus"], ["종족: 인간", "human"]]) assert.equal(id(["세라"], lore(t)), want, t);
});
test("여러 인물이 든 항목에서 다른 인물의 종족을 가져오지 않는다", () => {
  const e = { entries: [{ key: "등장인물", comment: "인물 목록", content: "■ 세라\n종족: 엘프\n\n■ 미오\n종족: 오크" }], others: ["세라", "미오"] };
  assert.equal(id(["세라"], e), "elf"); assert.equal(id(["미오"], e), "orc"); assert.equal(id(["없는이"], e), "");
});
test("본문에서 주어가 그 인물인 문장만 믿는다", () => {
  for (const [t, want] of [["세라는 엘프였다.", "elf"], ["엘프 소녀 세라가 웃었다.", "elf"], ["세라(늑대 수인)가 으르렁거렸다.", "wolf"], ["\"나는 뱀파이어야.\" 세라가 속삭였다.", "vampire"], ["Sera is a dark elf.", ""], ["세라는 하프엘프이며 궁수다.", "halfelf"]]) assert.equal(id(["세라"], { text: t }), want, t);
  assert.equal(id(["Sera"], { text: "Sera is a dark elf archer." }), "darkelf");
});
test("부정·비유·곁가지에 속지 않는다", () => {
  for (const t of ["세라는 엘프가 아니다.", "세라는 엘프 마을에서 왔다.", "세라는 드래곤 슬레이어다.", "세라는 악마와 계약했다.", "세라는 엘프처럼 아름답다.", "세라는 엘프를 싫어하는 사람이 많다고 했다.", "세라의 친구 미오는 오크다.", "세라는 흡혈귀인 척했다.", "세라는 공룡이다.", "세라는 용병이다."]) assert.equal(id(["세라"], { text: t }), "", t);
  assert.equal(raceOfText("엘프가 아닌 인간").id, "human"); assert.equal(raceOfText("악마와 계약한 인간").id, "human"); assert.equal(raceIdOf("비인간"), "");
});
test("짧은 이름이 다른 낱말 속에 있어도 걸리지 않고, 서로 맞서는 근거면 비워 둔다", () => {
  assert.equal(id(["린"], { text: "린은 엘프다." }), "", "한 글자 이름은 쓰지 않는다"); assert.equal(id(["유나"], { text: "유나이티드는 엘프다." }), "");
  assert.equal(id(["세라"], { text: "세라는 엘프다. 세라는 오크다." }), "");
});
test("기록: 빈칸과 근거 없는 ‘인간’을 메우고, 직접 고른 값·이야기 속 변화는 지킨다", () => {
  const f = { extra: {} }, find = () => raceFinds([{ names: ["세라"] }], lore("종족: 엘프"), f.extra.race ?? {});
  applyExtra(f, [{ kind: "race", name: "세라", id: "human", label: "" }], { turn: 1 }); applyExtra(f, find(), { turn: 2 }); assert.equal(raceFor(f, "세라").id, "elf"); assert.equal(f.extra.race["세라"].src, "lore");
  applyExtra(f, [{ kind: "race", name: "세라", id: "human", label: "" }], { turn: 3 }); assert.equal(raceFor(f, "세라").id, "elf", "흘린 ‘인간’은 못 덮음");
  applyExtra(f, [{ kind: "race", name: "세라", id: "vampire", label: "" }], { turn: 4 }); applyExtra(f, find(), { turn: 5 }); assert.equal(raceFor(f, "세라").id, "vampire", "이야기에서 변한 종족을 로어북이 되돌리지 않음");
  f.extra.race["세라"].manual = true; assert.equal(find().length, 0);
});
test("로어북을 읽고, 다른 봇으로 옮겼으면 쓰지 않는다", async () => {
  const ch = { chaId: "c1", name: "봇", desc: "세라는 엘프다.", globalLore: [{ key: "미오", comment: "미오", content: "종족: 오크" }], chats: [{ localLore: [], message: [] }] };
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => ch, getDatabase: async () => ({ modules: [{ id: "m", lorebook: [{ key: "유나", comment: "유나", content: "종족: 구미호" }] }], enabledModules: ["m"] }) };
  const src = await createCastReader(api).sources("c1"); assert.deepEqual(raceFinds([{ names: ["세라"] }, { names: ["미오"] }, { names: ["유나"] }], src).map((r) => r.id), ["elf", "orc", "gumiho"]); assert.equal(await castSources(api, "c2"), null);
});
