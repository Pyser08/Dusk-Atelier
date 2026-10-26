import test from "node:test";
import assert from "node:assert/strict";
import { selectBackend, capabilitiesOf } from "../src/data/memorybackend.js";
import { createBardWikiBackend } from "../src/data/memorybackend-bardwiki.js";
import { createMemoryStore } from "../src/data/memorystore.js";
import { createMemoryRunner } from "../src/data/memoryrunner.js";
import { parseSections, eventBullets, characterDigest, sourceToIndex, adaptDocuments, stripVirtualContext, VIRTUAL_MARK, parseGrades } from "../src/engine/bardwikiadapt.js";

const msgs = [{ chatId: "m0" }, { chatId: "m1" }, { chatId: "dup" }, { chatId: "dup" }, { chatId: "inherited:x" }];
const docs = [
  { id: "c1", type: "character", status: "active", title: "미나", aliases: ["미나짱"], content: "## 현재 상태\n지쳐 있음\n## 관계와 신뢰\n하루를 믿음" },
  { id: "c2", type: "character", status: "active", title: "Haru", aliases: [], content: "## Current State\nWaiting\n## Story History\n- x" },
  { id: "e1", type: "event", status: "active", title: "옥상", sourceMessageIds: ["m1"], updated: "2026-01-02", content: "## 이야기 요약\n- 미나가 비밀을 밝힘\n- Haru는 대답하지 않음\n- 비가 내림" },
  { id: "e0", type: "event", status: "active", title: "시작", sourceMessageIds: ["m0"], updated: "2026-01-01", content: "## Story Summary\n- 미나짱이 인사함" },
  { id: "e2", type: "event", status: "superseded", title: "옛날", sourceMessageIds: ["m0"], content: "## 이야기 요약\n- 폐기됨" },
  { id: "l1", type: "location", status: "active", title: "옥상", content: "높은 곳" },
  { id: "s1", type: "scene", status: "active", title: "옥상 장면", updated: "2026-01-03", content: "- 비 오는 옥상" }
];

test("backend auto-selection by BardWiki detection", () => {
  assert.equal(selectBackend({}, "auto").id, "local");
  assert.equal(selectBackend({ bardWiki: { getDocuments() {} } }, "auto").id, "bardwiki");
  assert.equal(selectBackend({}, "bardwiki").id, "local");
  assert.equal(selectBackend({ bardWiki: { getDocuments() {} } }, "local").duplicate, true);
  assert.equal(selectBackend({}, "off").id, "off");
  assert.equal(capabilitiesOf("bardwiki").analyze, false); assert.equal(capabilitiesOf("local").inject, true);
});
test("runner and injection hooks are not registered on bardwiki (caller gates by selectBackend)", async () => {
  const api = { bardWiki: { getDocuments() {} } }; const b = selectBackend(api, "auto");
  assert.equal(b.id, "bardwiki"); assert.equal(capabilitiesOf(b.id).analyze || capabilitiesOf(b.id).inject, false);
});
test("section parsing in ko/en and without headings", () => {
  assert.deepEqual(eventBullets(docs[2]), ["미나가 비밀을 밝힘", "Haru는 대답하지 않음", "비가 내림"]);
  assert.deepEqual(eventBullets(docs[3]), ["미나짱이 인사함"]);
  assert.deepEqual(eventBullets({ content: "그냥 본문입니다" }), ["그냥 본문입니다"]);
  assert.match(characterDigest(docs[0]), /지쳐 있음.*하루를 믿음/); assert.match(characterDigest(docs[1]), /Waiting/);
  assert.equal(characterDigest({ content: "표제 없음" }), "표제 없음");
  assert.ok("" in parseSections("앞글\n# 제목\n내용"));
});
test("sourceMessageIds → index ignores inherited and duplicate ids", () => {
  assert.equal(sourceToIndex(["m1"], msgs), 1); assert.equal(sourceToIndex(["dup"], msgs), null);
  assert.equal(sourceToIndex(["inherited:x"], msgs), null); assert.equal(sourceToIndex(["nope"], msgs), null);
});
test("adapter: superseded hidden, anchors, alias matching, current scene, refs", () => {
  const f = adaptDocuments(docs, msgs);
  assert.equal(Object.keys(f.people).length, 2);
  const events = f.scenes.filter((s) => !s.current); assert.equal(events.length, 2); assert.equal(events[0].at, 0); assert.equal(events[1].at, 1);
  assert.ok(events[1].who.includes("미나") && events[1].who.includes("Haru"));
  assert.ok(f.people["미나"].records.some((r) => r.act.includes("미나짱")), "alias line matched");
  assert.equal(f.people["미나"].records.every((r) => r.g === null), true);
  assert.equal(f.scenes.at(-1).current, true); assert.equal(f.refs[0].type, "location");
  assert.equal(adaptDocuments(docs, msgs, { showHidden: true }).scenes.filter((s) => !s.current).length, 3);
});
test("anchor failure falls back to updated-time order", () => {
  const f = adaptDocuments([{ id: "a", type: "event", status: "active", updated: "2026-02-02", content: "- b" }, { id: "b", type: "event", status: "active", updated: "2026-02-01", content: "- a" }], []);
  assert.deepEqual(f.scenes.map((s) => s.sum), ["a", "b"]); assert.equal(f.scenes[0].at, null);
});
test("virtual context removal only touches marked items and the supa section", () => {
  const chat = { hypaV3Data: { summaries: [{ text: "keep" }, { text: "v", risuBardVirtualMemory: VIRTUAL_MARK }] }, hypaV2Data: { mainChunks: [{ text: "v", risuBardVirtualMemory: VIRTUAL_MARK }, { text: "k" }] }, supaMemoryData: "앞<!-- RISUBARD_BARDWIKI_PLUGIN_CONTEXT_START -->가짜<!-- RISUBARD_BARDWIKI_PLUGIN_CONTEXT_END -->뒤" };
  const c = stripVirtualContext(chat);
  assert.deepEqual(c.hypaV3Data.summaries, [{ text: "keep" }]); assert.deepEqual(c.hypaV2Data.mainChunks, [{ text: "k" }]); assert.equal(c.supaMemoryData, "앞뒤");
  assert.equal(chat.hypaV3Data.summaries.length, 2, "input untouched");
});
test("snapshot: live query caches, other chats read snapshot, same contentHash reused", async () => {
  const m = new Map(); let calls = 0;
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, bardWiki: { getDocuments: async () => { calls++; return docs.map((d) => ({ ...d, contentHash: "h" + d.id })); } } };
  const bw = createBardWikiBackend(api, { store: createMemoryStore(api) });
  assert.equal(await bw.loadFolder("c", "other"), null);
  const live = await bw.loadFolder("c", "t", { live: true, messages: msgs }); assert.equal(live.snapshot, false); assert.ok(live.people["미나"]);
  const again = await bw.loadFolder("c", "t", { live: true, messages: msgs }); assert.equal(again.reused, true); assert.equal(calls, 2);
  const snap = await bw.loadFolder("c", "t"); assert.equal(snap.snapshot, true); assert.ok(snap.people["미나"]);
});
test("on-demand grading is stored only in the cache and merged on read", async () => {
  const m = new Map();
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } }, bardWiki: { getDocuments: async () => docs.map((d) => ({ ...d, contentHash: "h" + d.id })) },
    runLLMModel: async ({ messages }) => { const ids = JSON.parse(messages[1].content).items.map((i) => i.id); return { type: "success", result: JSON.stringify({ items: ids.map((id) => ({ id, p: 3, s: 3, r: 2 })) }) }; } };
  const bw = createBardWikiBackend(api, { store: createMemoryStore(api) });
  await bw.loadFolder("c", "t", { live: true, messages: msgs });
  const g = bw.withGrades(await bw.gradeOnDemand("c", "t", { mode: "submodel" }));
  assert.ok(Object.values(g.people["미나"].records).every((r) => r.g === "S"));
  assert.deepEqual(parseGrades('{"items":[{"id":"x","p":9,"s":0,"r":0}]}'), { x: { score: 3, g: "D" } });
});

const mkApi = (over = {}) => { const m = new Map(), saved = [];
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); } },
    bardWiki: { getDocuments: async () => docs.map((d) => ({ ...d, contentHash: "h" + d.id, ...(over.wikiGrades?.[d.id] ?? {}) })), ...(over.setGrade ? { setGrade: async (x) => { saved.push(x); return over.setGrade(x); } } : {}) },
    runLLMModel: async ({ messages }) => { const ids = JSON.parse(messages[1].content).items.map((i) => i.id); return { type: "success", result: JSON.stringify({ items: ids.map((id) => ({ id, p: 3, s: 2, r: 1 })) }) }; } };
  return { api, saved }; };
test("wiki-native grade (0-9) is read into records and never re-graded", async () => {
  const { api, saved } = mkApi({ wikiGrades: { e1: { grade: 8, gradeBy: "user" } }, setGrade: async () => ({}) });
  const bw = createBardWikiBackend(api, { store: createMemoryStore(api) });
  const f = await bw.loadFolder("c", "t", { live: true, messages: msgs });
  assert.ok(f.people["미나"].records.filter((r) => r.docId === "e1").every((r) => r.g === "S" && r.gs === 8 && r.wikiGrade && r.gby === "user"));
  await bw.gradeOnDemand("c", "t", { mode: "submodel" });
  assert.deepEqual(saved.map((x) => x.documentId), ["e0"], "only ungraded event docs are graded; e1 (user grade) untouched");
  assert.deepEqual(saved[0], { documentId: "e0", grade: 6, gradeBy: "ai", expectedContentHash: "he0" });
});
test("grading writes to the wiki when setGrade exists; falls back to cache when denied or missing", async () => {
  const denied = mkApi({ setGrade: async () => null }); const bw = createBardWikiBackend(denied.api, { store: createMemoryStore(denied.api) });
  await bw.loadFolder("c", "t", { live: true, messages: msgs });
  const g = bw.withGrades(await bw.gradeOnDemand("c", "t", { mode: "submodel" }));
  assert.equal(denied.saved.length, 1, "stops asking after the first denial");
  assert.ok(g.people["미나"].records.every((r) => r.g === "B"), "cache still applies");
  const old = mkApi(); const bo = createBardWikiBackend(old.api, { store: createMemoryStore(old.api) });
  await bo.loadFolder("c", "t", { live: true, messages: msgs });
  assert.ok(bo.withGrades(await bo.gradeOnDemand("c", "t", { mode: "submodel" })).people["미나"].records.every((r) => r.g === "B"), "old RisuBard without setGrade");
});

test("user grade: written with gradeBy user, cleared cache, unsupported/denied handled", async () => {
  const ok = mkApi({ setGrade: async () => ({}) }); const bw = createBardWikiBackend(ok.api, { store: createMemoryStore(ok.api) });
  await bw.loadFolder("c", "t", { live: true, messages: msgs });
  assert.equal(await bw.setGradeByUser("c", "t", "e1", 7), true);
  assert.deepEqual(ok.saved.at(-1), { documentId: "e1", grade: 7, gradeBy: "user", expectedContentHash: "he1" });
  await assert.rejects(bw.setGradeByUser("c", "t", "e1", 10), /0~9/);
  const no = mkApi({ setGrade: async () => null }); const b2 = createBardWikiBackend(no.api, { store: createMemoryStore(no.api) });
  await b2.loadFolder("c", "t", { live: true, messages: msgs }); assert.equal(await b2.setGradeByUser("c", "t", "e1", null), false);
  const old = mkApi(); const b3 = createBardWikiBackend(old.api, { store: createMemoryStore(old.api) }); assert.equal(b3.canSetGrade(), false);
  await b3.loadFolder("c", "t", { live: true, messages: msgs }); await assert.rejects(b3.setGradeByUser("c", "t", "e1", 5), /지원하지 않아요/);
});
test("nothing to grade reports total 0; regrade redoes AI grades but keeps user grades", async () => {
  const { api, saved } = mkApi({ wikiGrades: { e1: { grade: 8, gradeBy: "user" } }, setGrade: async () => ({}) });
  const bw = createBardWikiBackend(api, { store: createMemoryStore(api) });
  await bw.loadFolder("c", "t", { live: true, messages: msgs });
  await bw.gradeOnDemand("c", "t", { mode: "submodel" });
  await bw.loadFolder("c", "t", { live: true, messages: msgs });
  assert.equal((await bw.gradeOnDemand("c", "t", { mode: "submodel" })).lastGrade.total, 1, "e0 only (mock wiki does not persist grades)");
  const m2 = mkApi({ wikiGrades: { e0: { grade: 5, gradeBy: "ai" }, e1: { grade: 8, gradeBy: "user" } }, setGrade: async () => ({}) });
  const b2 = createBardWikiBackend(m2.api, { store: createMemoryStore(m2.api) }); await b2.loadFolder("c", "t", { live: true, messages: msgs });
  assert.equal((await b2.gradeOnDemand("c", "t", { mode: "submodel" })).lastGrade.total, 0);
  const r = await b2.gradeOnDemand("c", "t", { mode: "submodel" }, undefined, { regrade: true });
  assert.equal(r.lastGrade.total, 1); assert.deepEqual(m2.saved.map((x) => x.documentId), ["e0"]);
});
test("리스바드 모든 위키 작성 언어 표제와 예전 표제를 읽는다", async () => {
  const { eventBullets, characterDigest } = await import("../src/engine/bardwikiadapt.js");
  for (const [title, line] of [["物語の要約", "日本語の出来事"], ["故事摘要", "简体事件"], ["故事概要", "繁體事件"], ["확정된 사건", "예전 표제"], ["Established Events", "legacy heading"]]) {
    assert.deepEqual(eventBullets({ content: `# 문서\n\n## ${title}\n- ${line}\n\n## 기타\n- 무시` }), [line]);
  }
  assert.match(characterDigest({ content: "## 現在の状態\n- 屋上にいる\n\n## 関係と信頼\n- 信頼している\n\n## 장비\n- 무시" }), /屋上にいる.*信頼している/);
  assert.match(characterDigest({ content: "## 当前状态\n- 在屋顶" }), /在屋顶/);
});

test("진단 문구: 훅·점검 결과를 사람이 읽는 문장으로", async () => {
  const { diagText } = await import("../src/engine/memorydiag.js");
  assert.match(diagText({ hooks: 0, displays: 3, tick: null }), /출력 훅 아직 안 불림.*화면 갱신 3회.*아직 점검한 적 없음/);
  assert.match(diagText({ hooks: 2, hookAt: Date.now(), displays: 0, tick: { at: Date.now(), result: "short" } }), /출력 훅 2회.*응답이 짧아서/);
});
