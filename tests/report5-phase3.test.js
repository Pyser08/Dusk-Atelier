import test from "node:test";
import assert from "node:assert/strict";
import { settleTarget } from "../src/data/settlescope.js";
import { imagePathFor } from "../src/data/charimg.js";
import { createCardOverlay } from "../src/data/cardoverlay.js";
import { createNameLinks } from "../src/data/namelinks.js";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("settle 대상: 런타임 위키 범위로 폴더를 한 번 읽고, 읽는 사이·뒤에 채팅이 바뀌면 쓰지 않는다", async () => {
  let scope = { characterId: "c", chatKey: "a" }, reads = [];
  const wiki = { snapshot: () => (scope ? { scope } : null) };
  const t = await settleTarget(wiki, { getFolder: async (...k) => { reads.push(k); return { emo: {} }; } });
  assert.deepEqual(reads, [["c", "a"]]); assert.equal(t.same(), true);
  scope = { characterId: "c", chatKey: "b" }; assert.equal(t.same(), false);
  assert.equal(await settleTarget(wiki, { getFolder: async () => { scope = { characterId: "c", chatKey: "z" }; return {}; } }), null);
  scope = null; assert.equal(await settleTarget(wiki, { getFolder: async () => assert.fail() }), null);
});
test("이미지 고르기 결과는 그대로(정확한 이름 → 기본 → 처음)", () => {
  const ch = { name: "봇", image: "bot.png", emotionImages: [["미나 웃음", "1"], ["미나_default", "2"]], additionalAssets: [["하루", "3"], ["하루 기본", "4"], ["", "5"]] };
  for (let i = 0; i < 2; i++) { assert.equal(imagePathFor(ch, ["봇"]), "bot.png"); assert.equal(imagePathFor(ch, ["미나"]), "2"); assert.equal(imagePathFor(ch, ["하루"]), "3"); assert.equal(imagePathFor(ch, ["없음"]), ""); }
});
test("이름 찾기: 새 이름이 없으면 한 번만 묻고, 생기면 클릭을 단다", async () => {
  let q = 0, fresh = []; const el = (pid) => ({ pid, L: {}, hk: 0, setAttribute: async function () { fresh = fresh.filter((x) => x !== this); }, addEventListener: async function (t, f) { this.L[t] = f; } });
  const list = (a) => ({ length: async () => a.length, at: async (i) => a[i] });
  const d = { querySelectorAll: async (s) => { q++; return list(s.startsWith("[data-pid]") ? [...fresh] : fresh.filter((e) => s.includes(`"${e.pid}"`))); } };
  const o = createCardOverlay({ ensureDoc: async () => d, cardOf: async () => "", pids: () => Array.from({ length: 34 }, (_, i) => `p${i}`) });
  assert.equal(await o.hook(), 0); assert.equal(q, 1);
  const e = el("p7"); fresh = [e]; assert.equal(await o.hook(), 1); assert.ok(e.L.click); q = 0; assert.equal(await o.hook(), 0); assert.equal(q, 1);
});
function links({ overlay }) {
  let imgs = 0, go; const gate = new Promise((r) => { go = r; });
  const doc = { id: "d1", type: "Character", title: "미나", aliases: [], sections: [] };
  const el = () => ({ setAttribute: async () => {}, setInnerText: async () => {}, appendChild: async () => {}, remove: async () => {} });
  const api = { getCharacterFromIndex: async () => ({ name: "봇", chats: [], additionalAssets: [["미나", "m.png"]] }), getChatFromIndex: async () => ({ message: [] }), readImage: async () => { imgs++; await gate; return null; },
    ...(overlay ? { getRootDocument: async () => ({ querySelector: async (s) => (s === "head" ? el() : null), createElement: async () => el(), querySelectorAll: async () => [], addEventListener: async () => {} }) } : {}) };
  const memory = { store: { getIndex: async () => ({ settings: { inject: {} } }), getFolder: async () => ({ people: {}, scenes: [], wiki: { documents: { d1: doc } } }) }, switches: { currentChat: async () => ({ ci: 0, ti: 0, chaId: "c" + overlay, chatId: "t" }) } };
  const n = createNameLinks(memory, api); return { n, go, imgs: () => imgs };
}
test("썸네일: 화면 위 방식은 본문 표시가 사진을 기다리지 않는다", async () => {
  const { n, imgs } = links({ overlay: true });
  const out = await Promise.race([n.link("미나가 웃었다."), wait(1500).then(() => "늦음")]);
  assert.match(out, /data-pid="d1"/); assert.equal(imgs(), 0); n.overlay.stop();
});
test("썸네일: 펼침 방식은 예전처럼 사진을 준비한 뒤 붙인다", async () => {
  const { n, go, imgs } = links({ overlay: false }); let done = false;
  const p = n.link("미나가 웃었다.").then((x) => { done = true; return x; });
  await wait(1400); assert.equal(imgs(), 1); assert.equal(done, false); go(); assert.match(await p, /x-dusk="pc"/);
});
