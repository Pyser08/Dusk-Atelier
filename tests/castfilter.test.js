import test from "node:test";
import assert from "node:assert/strict";
import { loreCast, inCast, dropCreates } from "../src/engine/castfilter.js";

const cast = loreCast({ botName: "민지", description: "{{char}}는 대학생이다.", entries: [
  { key: "세라, 세라 선배", comment: "선배", content: "학과 선배." },
  { key: "카페", comment: "장소", content: "민지의 오빠 민준이 운영하는 카페." },
] });

test("로어북에 이름이 있으면 통과, 없으면 막는다", () => {
  assert.ok(inCast(cast, "민지"));            // 봇 이름
  assert.ok(inCast(cast, "민준"));            // 다른 항목 내용 안
  assert.ok(inCast(cast, "세라"));            // 키워드
  assert.ok(inCast(cast, "세라 선배님"));     // 키워드가 이름 안에
  assert.ok(!inCast(cast, "점원"));
  assert.ok(!inCast(cast, "지나가던 남자"));
  assert.ok(inCast(cast, "점원", ["민준"]), "별칭 하나라도 있으면 통과");
});

test("로어북이 비었거나 정보가 없으면 막지 않는다", () => {
  assert.ok(inCast(loreCast({ botName: "민지", entries: [] }), "점원"));
  assert.ok(inCast(null, "점원"));
});

test("한 글자 이름·{{char}} 같은 자리표시는 맞춤에 쓰지 않는다", () => {
  const c = loreCast({ botName: "A", entries: [{ key: "a", content: "{{user}}" }] });
  assert.ok(!inCast(c, "user")); assert.ok(!inCast(c, "에이"));
});

test("리수폿 봉투에서 로어북 밖 새 인물과 그 인물을 가리키는 것만 뺀다", () => {
  const env = { schema_version: 1, documents: [
    { document_ref: "new:1", operation: "create", type: "character", title: "점원", entries: [{ slot_id: "x", target_refs: [] }] },
    { document_ref: "new:2", operation: "create", type: "character", title: "민준", entries: [{ slot_id: "x", target_refs: ["actor:user"] }] },
    { document_ref: "doc:a", operation: "update", type: "character", title: null, entries: [{ slot_id: "rel", target_refs: ["new:1"] }, { slot_id: "rel", target_refs: ["new:2"] }] },
    { document_ref: "doc:b", operation: "update", type: "character", title: null, entries: [{ slot_id: "rel", target_refs: ["new:1"] }] },
  ], metric_ops: [{ document_ref: "new:1", slot_id: "affinity.score" }, { document_ref: "doc:a", slot_id: "affinity.score", target_refs: ["new:1"] }, { document_ref: "new:2", slot_id: "affinity.score" }],
  people_ops: [{ document_ref: "new:1" }], issues: [{ code: "x", document_ref: "new:1" }] };
  const { env: out, dropped } = dropCreates(env, (t) => inCast(cast, t));
  assert.deepEqual(dropped, ["점원"]);
  assert.deepEqual(out.documents.map((d) => d.document_ref), ["new:2", "doc:a"]);
  assert.equal(out.documents[1].entries.length, 1);
  assert.deepEqual(out.metric_ops.map((m) => m.document_ref), ["new:2"]);
  assert.equal(out.people_ops.length, 0); assert.equal(out.issues.length, 0);
});

test("뺄 게 없으면 그대로, 다 빠지면 '변화 없음' 이슈를 남긴다", () => {
  const env = { documents: [{ document_ref: "new:1", operation: "create", type: "character", title: "점원", entries: [] }], metric_ops: [], people_ops: [], issues: [] };
  assert.equal(dropCreates(env, () => true).env, env);
  const { env: out } = dropCreates(env, () => false);
  assert.equal(out.documents.length, 0); assert.equal(out.issues[0].code, "no_canonical_change");
});

test("castlore: 캐릭터·채팅·켜진 모듈 로어북을 모으고, 봇이 다르거나 로어북이 없으면 막지 않는다", async () => {
  const { createCastReader } = await import("../src/data/castlore.js");
  let reads = 0, t = 0;
  const ch = { chaId: "c1", name: "민지", desc: "", modules: ["m2"], globalLore: [{ key: "세라", content: "" }], chats: [{ localLore: [{ key: "", content: "민준이 있다" }], modules: [] }] };
  const api = { getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => { reads++; return ch; },
    getDatabase: async () => ({ enabledModules: [], modules: [{ id: "m2", lorebook: [{ key: "하루" }] }, { id: "off", lorebook: [{ key: "꺼진모듈인물" }] }] }) };
  const read = createCastReader(api, { now: () => t });
  const cast = await read("c1");
  assert.ok(cast("세라") && cast("민준") && cast("하루") && cast("민지"));
  assert.ok(!cast("꺼진모듈인물") && !cast("점원"));
  await read("c1"); assert.equal(reads, 1, "60초 안에는 다시 읽지 않음");
  assert.equal(await read("다른봇"), null);
  t = 61_000; ch.globalLore = []; ch.chats[0].localLore = []; ch.modules = [];
  assert.equal(await read("c1"), null, "로어북이 비면 막지 않음");
});
