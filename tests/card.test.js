import test from "node:test";
import assert from "node:assert/strict";
import { autoGrade, tagCountOf, colorOf, stepGrade, deriveTheme, GRADE_COLOR, MEMORY_LEVEL } from "../src/engine/card/grade.js";
import { parseTags, normalizeTags, calcStats, displayStats, DEFAULT_TAG_TEXT } from "../src/engine/card/tags.js";
import { replaceRole, displayRole, normalizeMemories, memoryText, sourceMemories, excerptAt, excerptCount } from "../src/engine/card/memories.js";
import { newCard, verifyCard, editCard, portable, sha256, sha256Bytes } from "../src/engine/card/card.js";
import { embedCard, extractCard, chunks, crc32 } from "../src/engine/card/png.js";
import { cardLayout, wrap, CARD_W, CARD_H } from "../src/engine/card/layout.js";
import { cardPrompt, normalizeCardResponse, linkPrompt, normalizeLinkResponse, linkLore, shortlistAssets, parsePicks, parseLoose } from "../src/engine/card/prompt.js";
import { createCardStore } from "../src/data/cardstore.js";
import { buildCardCharacter } from "../src/data/cardbot.js";

const parsed = parseTags(DEFAULT_TAG_TEXT);
const measure = (t, size) => String(t).length * size * 0.55;

test("등급 규칙: 태그 수·색·단계 이동·자동 산정", () => {
  assert.deepEqual(["D", "C", "B", "A", "S", "EX"].map(tagCountOf), [0, 1, 2, 3, 4, 5]);
  assert.equal(colorOf("EX"), "#ffd24a"); assert.equal(colorOf("??"), GRADE_COLOR.D);
  assert.equal(stepGrade("S", 1), "EX"); assert.equal(stepGrade("EX", 1), "EX"); assert.equal(stepGrade("D", -1), "D");
  assert.equal(autoGrade([{ g: "C" }, { g: "A" }, { g: "B" }]), "A"); assert.equal(autoGrade([]), "D");
  assert.equal(MEMORY_LEVEL.A, "M3"); assert.equal(MEMORY_LEVEL.D, "M0");
});
test("등급색 하나에서 테마 파생", () => {
  const t = deriveTheme("#9a6bff");
  assert.equal(t.nameGradient.length, 6); assert.match(t.tagBorder, /^#[0-9a-f]{8}$/); assert.equal(t.nightRgb.length, 3);
});
test("기본 태그 정의가 오류 없이 파싱된다", () => {
  assert.deepEqual(parsed.errors, []); assert.ok(Object.keys(parsed.stats).length >= 6); assert.ok(Object.keys(parsed.tags).length > 10);
});
test("태그 파서: 스탯·태그·오류", () => {
  const p = parseTags("힘:세다(ST)\n용기:겁없음(힘:10)\n용기:중복(힘:1)\n나쁨:설명(없음:3)\n#주석");
  assert.equal(p.stats["힘"], "세다"); assert.deepEqual(p.tags["용기"].stats, { 힘: 1 });
  assert.ok(p.errors.some((e) => e.includes("중복 태그")) && p.errors.some((e) => e.includes("미정의 스탯")));
  assert.deepEqual(calcStats(["용기"], p.tags), { 힘: 1 }); assert.equal(displayStats(["용기"], p.tags, ["힘"]).힘, 51);
});
test("태그 정규화: 등급 수로 자르고, 정의 밖 태그는 추가 정의", () => {
  const first = Object.keys(parsed.tags)[0];
  const r = normalizeTags([first, { name: "신규", description: "새 태그", stats: { 근력: 3, 없는스탯: 9 } }, "셋째"], parsed, "B");
  assert.equal(r.names.length, 2); assert.deepEqual(Object.keys(r.additions), ["신규"]); assert.deepEqual(r.definitions["신규"].stats, { 근력: 3 });
  assert.equal(normalizeTags([first], parsed, "D").names.length, 0);
});
test("{{user}} 통일과 화면 표기", () => {
  assert.equal(replaceRole("선생이 말했다. 선생을 봤다", ["선생"]), "{{user}}이 말했다. {{user}}을 봤다");
  assert.equal(replaceRole({ a: ["Tom님", "{{ User }}"] }, ["Tom"]).a[1], "{{user}}");
  assert.equal(displayRole("{{user}}가 웃는다"), "당신이 웃는다"); assert.equal(displayRole("{{user}}를 본다"), "당신을 본다");
});
test("기억 정규화: 중요도 상한·인용 규칙", () => {
  const rows = [{ importance: "M0", event: "산책", quotes: ["C: 안녕"] }, { importance: "M1", event: "다툼" }, ...Array.from({ length: 5 }, (_, i) => ({ importance: "M3", event: "분기" + i, quotes: ["C: a", "U: b"] }))];
  const { memories, warnings } = normalizeMemories(rows);
  assert.equal(memories[0].importance, "M1"); assert.equal(memories[1].importance, "M0");
  assert.equal(memories.filter((m) => m.importance === "M3").length, 3); assert.ok(warnings.length >= 2);
  assert.equal(memoryText({ importance: "M1", time: "밤", event: "e", quotes: ["C: 응", "U: 어"] }, "하나"), "기억 · 밤 · e · 하나: 응 · {{user}}: 어");
});
test("기록 → 기억 변환: 레벨·발췌·orphan 제외", () => {
  const messages = [{ role: "user", data: "앞 문장" }, { role: "char", data: "그녀가 말했다. 가지 마요." }];
  const folder = { scenes: [{ id: "s1", place: "옥상", when: "밤" }] };
  const rs = [{ at: 1, g: "A", person: "하나", act: "붙잡음", sit: "s1" }, { at: 0, g: "D", person: "하나", act: "인사" }, { at: 1, g: "S", orphan: true, act: "x" }];
  assert.equal(excerptCount(rs), 1);
  const out = sourceMemories(folder, rs.slice(0, 2), messages);
  assert.equal(out[0].level, "M3"); assert.match(out[0].excerpt, /가지 마요/); assert.equal(out[0].place, "옥상"); assert.equal(out[1].excerpt, undefined);
  assert.equal(excerptAt(messages, 5), "");
});
test("카드 모델: 해시 무결성, 편집, 이식용 사본", async () => {
  const body = normalizeCardResponse({ keyword: "k", quote: "q", before: "b", after: "a", tags: [Object.keys(parsed.tags)[0]], memories: [] }, { name: "하나", grade: "C", parsed });
  const card = await newCard({ body, grade: "C", source: { chaId: "x" } });
  await verifyCard(card);
  const edited = await editCard(card, { grade: "S", name: "하나코" });
  assert.notEqual(edited.hash, card.hash); assert.equal(edited.color, colorOf("S")); await verifyCard(edited);
  await assert.rejects(() => verifyCard({ ...edited, quote: "조작" }), /해시/);
  assert.equal(portable({ ...card, image: { ref: "/내/경로", crop: { zoom: 2 } } }).image.ref, undefined);
  // 이미지 편집은 해시를 바꾸지 않는다
  assert.equal(await (async () => (await editCard(card, { image: { ref: "z", crop: { zoom: 3 } } })).hash)(), card.hash);
});
test("sha256: 순수 JS 구현이 표준 구현과 같다(보안 컨텍스트가 아닐 때 대비)", async () => {
  for (const t of ["", "abc", "하나코".repeat(50), "x".repeat(55), "x".repeat(56), "x".repeat(64), "y".repeat(1000)]) {
    assert.equal(sha256Bytes(new TextEncoder().encode(t)), await sha256(t));
  }
  assert.equal(sha256Bytes(new TextEncoder().encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("PNG tEXt 왕복(한글·큰 데이터)과 기존 청크 교체", () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...[0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]]);
  const card = { name: "하나코", memories: Array.from({ length: 300 }, (_, i) => ({ event: "사건 " + i })) };
  const a = embedCard(png, card), b = embedCard(a, { name: "교체" });
  assert.deepEqual(extractCard(a).name, "하나코"); assert.equal(extractCard(b).name, "교체");
  assert.equal(chunks(b).filter((c) => c.type === "tEXt").length, 1); assert.equal(extractCard(png), null);
  assert.equal(crc32(new TextEncoder().encode("IEND")), 0xae426082);
  assert.throws(() => extractCard(new Uint8Array([1, 2, 3])), /PNG/);
});
test("레이아웃: 줄바꿈·태그 줄 나눔·긴 이름 축소·경계", () => {
  assert.ok(wrap((t) => t.length * 10, "가나다라마바사 아자차카타파하", 60).every((l) => l.length * 10 <= 60 || !l.includes(" ")));
  const card = { grade: "EX", name: "아주아주긴이름의캐릭터이름입니다정말로", keyword: "키워드", quote: "대사 ".repeat(60), tags: ["가나다라마바", "사랑하는", "집착하는", "헌신적인", "동경하는"] };
  const L = cardLayout(card, measure);
  assert.ok(L.name.width <= CARD_W * 0.88 + 1); assert.ok(L.rows.length >= 1 && L.chips.length === 5);
  for (const r of L.rows) { assert.ok(r.w <= CARD_W * 0.83 + 1); for (const c of r.chips) assert.ok(c.x >= 0 && c.x + c.w <= CARD_W); }
  assert.ok(L.quote.lines.length <= 3 || L.quote.size <= CARD_W * 0.031 + 1); assert.ok(L.quote.y + L.quote.lines.length * L.quote.lineH <= CARD_H);
  assert.equal(cardLayout({ ...card, grade: "D" }, measure).chips.length, 0);
});
test("프롬프트: 카드·연결 정규화", async () => {
  const msgs = cardPrompt({ name: "하나", grade: "B", memories: [], parsed, lang: "en" });
  assert.match(msgs[0].content, /English/); assert.match(msgs[1].content, /tagCatalog/);
  assert.throws(() => normalizeCardResponse({ before: "b" }, { name: "하나", grade: "B", parsed }), /BEFORE/);
  const body = normalizeCardResponse({ before: "b", after: "a", tags: [], memories: [{ importance: "M2", event: "e", quotes: ["C: 응"] }] }, { name: "하나", grade: "B", parsed });
  const card = await newCard({ body, grade: "B", source: {} });
  const { messages, picks } = linkPrompt({ card, mode: "fate" });
  assert.equal(picks.length, 1); assert.match(messages[0].content, /BEFORE profile/);
  const link = normalizeLinkResponse({ desc: "설명", relationship: "관계", entries: [{ id: picks[0].id, key: "하나, 옥상", content: "내용" }] }, { card, picks, mode: "fate" });
  assert.equal(link.entries[0].key, "하나,옥상");
  const lore = linkLore({ link, name: "하나" }); assert.equal(lore.length, 2); assert.equal(lore[0].alwaysActive, true);
  assert.throws(() => normalizeLinkResponse({}, { card, picks, mode: "memory" }), /설명/);
});
test("응답 JSON 느슨한 해석과 에셋 고르기", () => {
  assert.equal(parseLoose('```json\n{"a":1,}\n```').a, 1);
  assert.deepEqual(parsePicks('{"picks":[2,2,9,"1",-1]}', 4), [2, 1]);
  const assets = Array.from({ length: 200 }, (_, i) => ({ name: i === 150 ? "하나 웃음" : "asset" + i, path: "p" + i }));
  const short = shortlistAssets(assets, { name: "하나", keyword: "", quote: "", tags: [] }, 20);
  assert.equal(short.length, 20); assert.equal(short[0].path, "p150");
});
test("카드 저장소: 저장·목록·삭제·설정 기본값", async () => {
  const mem = new Map();
  const api = { pluginStorage: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => void mem.set(k, v), removeItem: async (k) => void mem.delete(k) } };
  const s = createCardStore(api);
  const body = normalizeCardResponse({ before: "b", after: "a" }, { name: "하나", grade: "D", parsed });
  const c1 = await newCard({ body, grade: "D", source: { chaId: "A" } }), c2 = await newCard({ body, grade: "S", source: { chaId: "B" }, now: new Date(Date.now() + 5000) });
  await Promise.all([s.save(c1), s.save(c2)]);
  assert.equal((await s.list()).length, 2); assert.deepEqual((await s.list("A")).map((x) => x.id), [c1.id]); assert.equal((await s.list())[0].id, c2.id);
  assert.equal((await s.get(c1.id)).name, "하나"); await s.remove(c1.id); assert.equal(await s.get(c1.id), null); assert.equal((await s.list()).length, 1);
  const cfg = await s.getCfg(); assert.equal(cfg.tagText, DEFAULT_TAG_TEXT); assert.deepEqual(cfg.entryLevels, ["M2", "M3"]);
  assert.equal((await s.setCfg({ lang: "en", tagText: "   " })).lang, "en"); assert.equal((await s.getCfg()).tagText, DEFAULT_TAG_TEXT);
});
test("카드로 새 봇: 설명·로어북·태그·이미지·에셋, 원본 불변", async () => {
  const body = normalizeCardResponse({ before: "b", after: "a", tags: [Object.keys(parsed.tags)[0]] }, { name: "하나", grade: "C", parsed });
  const card = await newCard({ body, grade: "C", source: {} });
  const source = { name: "원본", image: "i.png", tags: ["x"], globalLore: [{ key: "a", comment: "외모", content: "c" }], chats: [{}] }, snap = JSON.stringify(source);
  const link = { desc: "새 설명", relationship: "관계", entries: [{ id: "E0001", key: "k", content: "c", memory: "M2" }], mode: "memory" };
  const c = buildCardCharacter({ source, card, link: { ...link, desc: "{{char}}의 설명", relationship: "{{char}}와 {{user}}의 관계", entries: [{ id: "e1", key: "{{char}}, 옥상", content: "{{char}}가 기다린다" }] }, firstMessage: "{{char}}가 문을 열었다.", lorePicks: [{ entry: source.globalLore[0], checked: true }], characters: [{ name: "원본 · 하나" }], imageUse: "card", cardAssetKey: "card.png", withPng: true, illustrationPath: "il.png" });
  assert.equal(c.name, "원본 · 하나 (2)"); assert.equal(c.desc, "원본 · 하나 (2)의 설명"); assert.equal(c.firstMessage, "원본 · 하나 (2)가 문을 열었다."); assert.equal(c.globalLore[1].content, "원본 · 하나 (2)와 {{user}}의 관계"); assert.equal(c.globalLore[2].key, "원본 · 하나 (2), 옥상"); assert.match(c.creatorNotes, /카드: 하나 · C · 기억 연결/);
  assert.equal(c.globalLore.length, 3); assert.equal(c.globalLore[1].alwaysActive, true);
  assert.deepEqual(c.tags, ["x", card.tags[0]]); assert.equal(c.image, "card.png"); assert.deepEqual(c.additionalAssets, [["Dusk 카드 · 하나", "card.png", "png"]]);
  assert.equal(buildCardCharacter({ source, card, link, imageUse: "illustration", illustrationPath: "il.png" }).image, "il.png");
  assert.equal(buildCardCharacter({ source, card, link, imageUse: "source" }).image, "i.png"); assert.equal(buildCardCharacter({ source, card, link, imageUse: "none" }).image, undefined);
  assert.equal(JSON.stringify(source), snap);
});
