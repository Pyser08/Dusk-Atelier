// 2.2.4 응답 자동 정리(태그·생각 글) · 긴 응답 나눠 읽기 · 분기 채팅 기억 이어받기
import test from "node:test";
import assert from "node:assert/strict";
import { cleanForMemory, splitParts, mergeParts } from "../src/engine/cleantext.js";
import { findForkParent, loadReconciled } from "../src/data/memoryload.js";
import { messageIdentity } from "../src/engine/chattext.js";

test("태그는 벗기고 글자는 남긴다 · 생각 글은 뺀다 · HTML 아닌 꺾쇠는 그대로", () => {
  const s = `<think>속으로 계획을 세운다</think><div class="st"><b>호감도</b>: 7</div><p>미나가 웃었다.</p><style>.x{color:red}</style><마법의 검>을 들었다 <3 &amp; a < b`;
  const c = cleanForMemory(s);
  assert.ok(!/think|계획|color|<div|<b>/.test(c), c);
  assert.match(c, /호감도: 7/); assert.match(c, /미나가 웃었다\./);
  assert.match(c, /<마법의 검>을 들었다 <3 & a < b/);
  assert.equal(cleanForMemory("그냥 글"), "그냥 글");
});
test("긴 응답은 문단 경계에서 나누고, 조각 결과를 합친다", () => {
  const para = "가".repeat(2500);
  const parts = splitParts([para, para, para].join("\n\n"), 6000);
  assert.equal(parts.length, 2); assert.ok(parts.every((p) => p.length <= 6000));
  const m = mergeParts([{ people: [{ name: "미나", act: "a" }], scene: { sum: "앞", facts: ["x"], who: ["미나"], changed: false }, emo: [] }, { people: [{ name: "하루", act: "b" }], scene: { sum: "뒤", facts: ["y"], who: ["하루"], changed: true }, emo: [{ from: "미나" }] }]);
  assert.deepEqual(m.people.map((p) => p.name), ["미나", "하루"]);
  assert.equal(m.scene.sum, "앞 뒤"); assert.equal(m.scene.changed, true); assert.deepEqual(m.scene.who, ["미나", "하루"]); assert.equal(m.emo.length, 1);
});

const msg = (data, chatId, role = "char") => ({ role, data, chatId });
const chatMsgs = (n, tag = "") => Array.from({ length: n }, (_, i) => msg(`메시지 ${i}${tag}`, `m${i}`, i % 2 ? "char" : "user"));
const folderFrom = (msgs, upto) => ({ v: 3, chaId: "c", chatId: "p", people: { 미나: { name: "미나", aliases: [], records: msgs.slice(0, upto).map((m, i) => ({ id: "r" + i, act: "x" + i, at: i, mid: m.chatId, h: messageIdentity(m) })) } }, scenes: [], emo: {}, open: [] });

test("분기 채팅: 메시지가 맞는 원본을 고르고, 인사말만 같은 채팅은 고르지 않는다", async () => {
  const parent = chatMsgs(20), branch = parent.slice(0, 10);
  const other = [parent[0], ...chatMsgs(9, "다른")];   // 첫 인사말만 같다
  const F = { p: folderFrom(parent, 20), o: folderFrom(other, 10) };
  const best = await findForkParent([{ chatId: "o" }, { chatId: "p" }], async (id) => F[id], branch);
  assert.equal(best.chatId, "p");
  assert.equal(await findForkParent([{ chatId: "o" }], async (id) => F[id], [other[0], ...chatMsgs(9, "또다른")]), null);
});
test("분기 채팅: 기억이 빈 채팅을 열면 원본 기억을 이어받고, 갈라진 뒤 기록은 빠진다 · 지운 채팅은 다시 안 가져온다", async () => {
  const parent = chatMsgs(20), branch = [...parent.slice(0, 10), msg("갈라진 뒤 새 응답", "n1")];
  const folders = { p: folderFrom(parent, 20) }; let noInherit = {};
  const store = {
    getIndex: async () => ({ settings: { inject: {} }, noInherit }),
    getFolder: async (c, id) => (folders[id] ? structuredClone(folders[id]) : null),
    botFolders: async () => Object.keys(folders).map((id) => ({ chaId: "c", chatId: id, updatedAt: 1 })),
    adoptFolder: async (c, from, to) => { folders[to] = { ...structuredClone(folders[from]), chatId: to, adoptedFrom: from }; return true; }
  };
  const f = await loadReconciled(store, "c", "b", branch);
  const live = f.people.미나.records.filter((r) => !r.orphan);
  assert.equal(f.adoptedFrom, "p"); assert.equal(live.length, 10);
  noInherit = { "c|d": true };
  assert.equal(await loadReconciled(store, "c", "d", branch), null, "사용자가 지운 채팅");
});
