import test from "node:test";
import assert from "node:assert/strict";
import { buildMemoryCharacter } from "../src/data/memorybot.js";

const source = { name: "원본", image: "img.png", globalLore: [{ key: "a", comment: "외모", content: "x" }], customscript: [{ in: "a" }], chats: [{ message: [1] }] };
const picks = [{ entry: source.globalLore[0], checked: true }];
test("new bot is a new object with notes, lore, and relation record; source untouched", () => {
  const snap = JSON.stringify(source);
  const c = buildMemoryCharacter({ name: "원본", desc: "d", firstMessage: "fm", relationship: "관계", source, records: [{ person: "미나", g: "A", act: "고백", at: 9 }], mainName: "미나", lorePicks: picks, chatName: "채팅1", minGrade: "C", characters: [{ name: "원본" }] });
  assert.equal(c.name, "원본 (2)"); assert.equal(c.firstMessage, "fm"); assert.match(c.creatorNotes, /원본 · 채팅1/);
  assert.equal(c.globalLore.length, 3); assert.equal(c.globalLore[1].alwaysActive, true);
  assert.equal(c.image, undefined); assert.deepEqual(c.customscript, []); assert.notEqual(c.chaId, source.chaId);
  assert.equal(JSON.stringify(source), snap);
});
test("optional image and extras", () => {
  const c = buildMemoryCharacter({ source, useImage: true, copyExtras: true, lorePicks: [], records: [], characters: [] });
  assert.equal(c.image, "img.png"); assert.deepEqual(c.customscript, [{ in: "a" }]); assert.notStrictEqual(c.customscript, source.customscript);
});
