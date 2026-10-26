import test from "node:test";
import assert from "node:assert/strict";
import { buildBlock, insertBlock, shouldInject, estimateTokens, upsertLoreEntry, MARKER } from "../src/engine/memoryinject.js";
import { needsDigest, digestTargets, applyDigest, undigested } from "../src/engine/memorydigest.js";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryInjector } from "../src/data/memoryinject.js";

const rec = (i, g, act, extra = {}) => ({ id: "r" + i, at: i, h: "h" + i, act, g, orphan: false, ...extra });
const folder = (people, scenes = [{ id: "s1", at: 1, sum: "비 오는 옥상", facts: ["비밀 공개", "답 없음"], place: "옥상", who: ["미나", "하루"] }]) => ({ cursor: { at: 1 }, scenes, people });

test("no injection on the first turn, injection from the 2nd", () => {
  const f = folder({}); const s = { on: true, fromTurn: 2 };
  assert.equal(shouldInject(f, s, 1), false); assert.equal(shouldInject(f, s, 2), true); assert.equal(shouldInject(f, { on: true }, 1), true);
  assert.equal(shouldInject({ ...f, cursor: null }, s, 5), false);
  assert.equal(shouldInject(f, { on: false, fromTurn: 2 }, 5), false);
});
test("block contains scene and key moments; empty folder → empty text", () => {
  const f = folder({ 미나: { name: "미나", records: [rec(1, "A", "비밀을 밝힘"), rec(2, "D", "웃음")] } });
  const { text, manifest } = buildBlock(f, { messageCount: 60, recentText: "", settings: {} });
  assert.match(text, /Current scene: 비 오는 옥상 \(옥상\)/); assert.match(text, /미나: .*\(A\) 비밀을 밝힘/);
  assert.ok(manifest.included.some((x) => x.name === "미나"));
  assert.equal(buildBlock({ cursor: { at: 0 }, scenes: [], people: {} }, {}).text, "");
});
test("budget: oversize item is excluded whole, never truncated; target and cap respected", () => {
  const big = { name: "큰", records: Array.from({ length: 5 }, (_, i) => rec(i, "A", "가".repeat(80))) };
  const people = { 큰: { ...big, ctx: "always" } }; for (let i = 0; i < 30; i++) people["p" + i] = { name: "p" + i, ctx: "always", records: [rec(i, "B", "나".repeat(70))] };
  const s = { targetTokens: 300, capTokens: 400, sceneTokens: 300 };
  const { text, manifest } = buildBlock(folder(people), { messageCount: 200, settings: s });
  assert.ok(estimateTokens(text) <= 400);
  assert.ok(manifest.excluded.length > 0);
  for (const line of text.split("\n").filter((l) => l.startsWith("- p"))) assert.ok(line.endsWith("나".repeat(70)) || line.includes("(B) " + "나".repeat(70)));
});
test("in-scene and mentioned people are prioritized over others", () => {
  const people = { 미나: { name: "미나", records: [rec(1, "D", "장면 속 행동")] }, 다른: { name: "다른", records: [rec(1, "A", "중요한 행동")] }, 언급: { name: "언급", records: [rec(1, "D", "언급된 행동")] } };
  const { text } = buildBlock(folder(people), { messageCount: 60, recentText: "언급 이야기", settings: { targetTokens: 70, capTokens: 70 } });
  assert.match(text, /미나:/); assert.match(text, /언급:/);
});
test("context modes: never excluded, auto only when relevant, story-so-far listed", () => {
  const people = { 미나: { name: "미나", records: [rec(1, "A", "장면 행동")] }, 무관: { name: "무관", records: [rec(1, "A", "무관 행동")] }, 숨김: { name: "숨김", ctx: "never", records: [rec(1, "A", "숨김 행동")] }, 고정: { name: "고정", ctx: "always", records: [rec(1, "B", "고정 행동")] } };
  const scenes = [{ id: "s0", at: 0, sum: "첫 만남", facts: [], who: [] }, { id: "s1", at: 1, sum: "비 오는 옥상", facts: [], place: "옥상", who: ["미나"] }];
  const { text, manifest } = buildBlock(folder(people, scenes), { messageCount: 60 });
  assert.match(text, /Story so far:\n- 첫 만남/); assert.match(text, /미나:/); assert.match(text, /고정:/);
  assert.doesNotMatch(text, /무관:|숨김:/); assert.ok(manifest.excluded.some((x) => x.reason === "not-relevant"));
});
test("records within recentSkip of the latest messages are omitted", () => {
  const f = folder({ 미나: { name: "미나", records: [rec(5, "A", "오래된 일"), rec(58, "A", "방금 일")] } });
  const { text } = buildBlock(f, { messageCount: 60, settings: { recentSkip: 8 } });
  assert.match(text, /오래된 일/); assert.doesNotMatch(text, /방금 일/);
});
test("digest replaces old D/C records but A/B stay", () => {
  const f = folder({ 미나: { name: "미나", digest: "요약본", records: [rec(1, "C", "압축됨", { digested: true }), rec(2, "B", "원문 유지", { digested: true })] } });
  const { text } = buildBlock(f, { messageCount: 60 });
  assert.match(text, /요약본/); assert.doesNotMatch(text, /압축됨/); assert.match(text, /원문 유지/);
});
test("insertBlock inserts before last user, replaces an existing block, no mutation", () => {
  const msgs = [{ role: "system", content: "sys" }, { role: "user", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }];
  const a = insertBlock(msgs, MARKER + "] one"); assert.equal(a.length, 5); assert.equal(a[3].content, MARKER + "] one"); assert.equal(msgs.length, 4);
  const b = insertBlock(a, MARKER + "] two"); assert.equal(b.length, 5); assert.equal(b.filter((m) => m.content.startsWith(MARKER)).length, 1);
  assert.equal(insertBlock(msgs, MARKER + "]", "afterSystem")[1].content, MARKER + "]");
});
test("lore fallback upsert is idempotent and removable", () => {
  const a = upsertLoreEntry([], "x"), b = upsertLoreEntry(a, "x"), c = upsertLoreEntry(b, "y");
  assert.equal(a.length, 1); assert.deepEqual(a, b); assert.equal(c.length, 1); assert.equal(c[0].content, "y"); assert.equal(upsertLoreEntry(c, "").length, 0);
});
test("digest conditions: >20 records and 10 runs, user digest protected, failure leaves records", () => {
  const rs = Array.from({ length: 25 }, (_, i) => rec(i, "D", "x" + i));
  const p = { name: "미나", records: rs };
  assert.equal(needsDigest(p, 9), false); assert.equal(needsDigest(p, 10), true);
  assert.equal(needsDigest({ ...p, digestUser: true }, 99), false);
  assert.equal(needsDigest({ ...p, records: rs.slice(0, 20) }, 99), false);
  const t = digestTargets(p); assert.equal(t.length, 20);
  assert.throws(() => applyDigest(p, t, "garbage", 10)); assert.equal(undigested(p).length, 25);
  applyDigest(p, t, '{"digest":"압축"}', 10); assert.equal(p.digest, "압축"); assert.equal(undigested(p).length, 5);
  assert.equal(needsDigest(p, 12), false);
});
test("injector hook: modifies only the request copy and ignores non-model types", async () => {
  const m = new Map();
  const chat = { id: "t", message: [{ role: "user", data: "a" }, { role: "char", data: "b" }, { role: "user", data: "c" }] };
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => ({ chaId: "c", name: "봇" }), getChatFromIndex: async () => chat,
    addRisuReplacer: async (n, f) => { api.rep = f; } };
  const store = createMemoryStore(api); const inj = createMemoryInjector(api, { store });
  assert.equal(await inj.start(), "hook");
  const req = [{ role: "user", content: "c" }];
  assert.equal(await api.rep(req, "model"), req, "no folder → unchanged");
  await store.updateFolder("c", "t", (f) => { f.cursor = { at: 1 }; f.scenes.push({ id: "s", sum: "장면", facts: [], who: [] }); });
  const out = await api.rep(req, "model");
  assert.equal(out.length, 2); assert.match(out[0].content, /Current scene: 장면/); assert.equal(req.length, 1);
  assert.equal(await api.rep(req, "memory"), req);
  assert.equal(inj.lastRequest().injected, true);
  await store.updateIndex((i) => { i.settings.inject.fromTurn = 3; }); assert.equal(await api.rep(req, "model"), req, "before fromTurn → none");
});
test("injector falls back to lore mode without the hook; syncLore is idempotent", async () => {
  const m = new Map(); let saved = null;
  const chat = { id: "t", localLore: [], message: [{ role: "user", data: "a" }, { role: "char", data: "b" }, { role: "user", data: "c" }] };
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacterFromIndex: async () => ({ chaId: "c" }), getChatFromIndex: async () => chat,
    setChatToIndex: async (_c, _t, v) => { saved = v; chat.localLore = v.localLore; } };
  const store = createMemoryStore(api); const inj = createMemoryInjector(api, { store });
  assert.equal(await inj.start(), "lore");
  await store.updateFolder("c", "t", (f) => { f.cursor = { at: 1 }; f.scenes.push({ id: "s", sum: "장면", facts: [], who: [] }); });
  assert.equal(await inj.syncLore(0, 0), true); assert.equal(chat.localLore.length, 1);
  assert.equal(await inj.syncLore(0, 0), false);
});
