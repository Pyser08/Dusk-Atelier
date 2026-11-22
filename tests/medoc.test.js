// 11-22 요청: 장기기억 설정에서 켜면 ‘나’(페르소나) 위키 문서를 모든 채팅에 자동으로 만든다(AI 호출 없음, 페르소나 설명으로)
import test from "node:test";
import assert from "node:assert/strict";
import { ensureMeDoc, meVisible } from "../src/engine/medoc.js";

test("나 문서: 없으면 만들고, 페르소나가 같으면 그대로, 바뀌면 갱신", () => {
  const f = { people: {} };
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "검은 머리의 용병", now: 1 }), true);
  assert.deepEqual([f.people["{{user}}"].name, f.meDoc.name, f.meDoc.desc], ["{{user}}", "Jade", "검은 머리의 용병"]);
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "검은 머리의 용병", now: 2 }), false);
  assert.equal(ensureMeDoc(f, { name: "Jade", desc: "은퇴한 용병", now: 3 }), true);
  assert.equal(f.meDoc.desc, "은퇴한 용병");
});

test("기존 나 기록은 건드리지 않음", () => {
  const f = { people: { "{{user}}": { name: "{{user}}", aliases: ["제이드"], pinned: false, records: [{ act: "a" }] } } };
  ensureMeDoc(f, { name: "Jade", desc: "" });
  assert.equal(f.people["{{user}}"].records.length, 1); assert.deepEqual(f.people["{{user}}"].aliases, ["제이드"]);
});

test("목록에 보이기: 기록이 없어도 나 문서가 있으면 보임", () => {
  const f = { people: {} }; ensureMeDoc(f, { name: "Jade", desc: "x" });
  assert.equal(meVisible(f, f.people["{{user}}"]), true);
  assert.equal(meVisible(f, { name: "세라", records: [] }), false);
  assert.equal(meVisible({}, { name: "{{user}}", records: [] }), false);
});

// 11-22 요청: 설정을 켜면 나도 위키 인물 문서를 만들어 AI가 다른 인물처럼 채운다. 성인·몸 정보는 그대로 유저 칸(actor:user)에
test("나 위키 인물 문서: 없으면 페르소나 이름 + {{user}} 별칭으로 만들고, 있으면 그대로", async () => {
  const { ensureMeWikiDoc } = await import("../src/engine/medoc.js");
  const { createEmptyWikiScope } = await import("../src/engine/pot/wiki-schema.js");
  const f = { wiki: createEmptyWikiScope({ characterId: "c", chatKey: "k" }) };
  assert.equal(ensureMeWikiDoc(f, { name: "Jade" }), true);
  const d = Object.values(f.wiki.documents).find((x) => x.type === "Character");
  assert.equal(d.title, "Jade"); assert.ok(d.aliases.includes("{{user}}"));
  assert.equal(ensureMeWikiDoc(f, { name: "Jade" }), false);
  assert.equal(Object.values(f.wiki.documents).filter((x) => x.type === "Character").length, 1);
  assert.equal(ensureMeWikiDoc({}, { name: "Jade" }), false, "위키가 아직 없으면 다음에");
});

test("유저 위키 문서가 있어도 성인·몸 칸은 유저 칸(actor:user)이고, NPC 목록엔 안 들어간다", async () => {
  const { characterDocs, npcDocs, setUserNsfwNames, USER_NSFW_ID } = await import("../src/engine/usernsfw.js");
  setUserNsfwNames(["Jade"]);
  const f = { wiki: { documents: { a: { id: "a", type: "Character", title: "Jade", aliases: ["{{user}}"] }, b: { id: "b", type: "Character", title: "세라", aliases: [] } } } };
  assert.deepEqual(characterDocs(f).map((d) => d.id).sort(), [USER_NSFW_ID, "b"].sort());
  assert.deepEqual(npcDocs(f).map((d) => d.id), ["b"]);
  setUserNsfwNames([]);
});
