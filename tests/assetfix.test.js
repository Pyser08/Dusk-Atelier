import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetIndex } from "../src/engine/imgtagfix.js";
import { scanReplies, changeRows, aiItems, aiMessages, parseAiReply, applyRows, renameIds } from "../src/engine/assetfix.js";

const kws = (c, o, list) => list.map((k) => `${c}.${o}.${k}`);
const idx = buildAssetIndex([
  ...kws("Kaguya", "school_uniform", ["default", "smiling", "angry", "hug"]),
  ...kws("Kaguya", "nude", ["default", "smiling", "missionary_sex", "missionary_ejaculation"]),
]);
const T = (n) => `<img="${n}">`;

test("scan classifies each tag: exact, engine-fixed, fell back to default (unresolved), kept, removed", () => {
  const msgs = [{ key: 3, text: `가.\n\n${T("kaguya.school_uniform.Smiling")}\n\n나 ${T("Kaguya.school_uniform.ecstatic")} ${T("Kaguya.nude.smiling")} ${T("Nobody.smile")}` }];
  const [r] = scanReplies(msgs, idx);
  const kinds = r.tags.map((t) => t.engine);
  assert.deepEqual(kinds, ["case", "default", "exact", "unknown"]);
  assert.equal(r.tags[1].unresolved, "default");
  assert.equal(r.tags[0].unresolved, undefined);
});

test("rows list engine changes; applying rebuilds the text and removes lone tag lines cleanly", () => {
  const text = `가.\n\n${T("kaguya.school_uniform.Smiling")}\n\n${T("[Character].[Outfit].[Keyword]")}\n\n나.`;
  const scan = scanReplies([{ key: 0, text }], idx);
  const rows = changeRows(scan);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].to, T("Kaguya.school_uniform.smiling"));
  assert.equal(rows[1].to, null);
  const out = applyRows(scan, rows, rows.map((r) => r.id));
  assert.deepEqual(out, [{ key: 0, before: text, after: `가.\n\n${T("Kaguya.school_uniform.smiling")}\n\n나.` }]);
  assert.deepEqual(applyRows(scan, rows, []), []);   // 아무것도 안 고르면 그대로
});

test("the same tag three replies in a row is marked as unresolved (repeat)", () => {
  const t = T("Kaguya.nude.missionary_sex");
  const scan = scanReplies([{ key: 1, text: t }, { key: 3, text: t }, { key: 5, text: t }], idx);
  assert.equal(scan[2].tags[0].unresolved, "repeat");
  assert.equal(scan[1].tags[0].unresolved, undefined);
});

test("AI items: 'unresolved' mode only sends what the engine could not settle; 'all' sends every tag; keyword sets are shared", () => {
  const scan = scanReplies([{ key: 0, text: `안고 있다. ${T("Kaguya.school_uniform.smiling")} 그리고 ${T("Kaguya.school_uniform.ecstatic")}` }], idx);
  const a = aiItems(scan, idx, { mode: "unresolved" });
  assert.equal(a.items.length, 1);
  assert.equal(a.items[0].why, "default");
  const b = aiItems(scan, idx, { mode: "all" });
  assert.equal(b.items.length, 2);
  assert.equal(Object.keys(b.sets).length, 1);
  assert.deepEqual(b.sets[b.items[0].set], ["default", "smiling", "angry", "hug", "missionary_sex", "missionary_ejaculation"]);   // 동작 우선: 그 캐릭터의 모든 옷 키워드
  assert.match(b.items[0].text, /안고 있다/);
  assert.equal(aiItems(scanReplies([{ key: 0, text: T("Kaguya.nude.smiling") }], idx), idx, { mode: "unresolved" }).items.length, 0);
  const m = aiMessages(b, { instruction: "NSFW는 nude만" });
  assert.equal(m[0].role, "system");
  assert.match(m[1].content, /NSFW는 nude만/);
});

test("AI reply is validated against the real keyword set; bad or unchanged answers are dropped", () => {
  const scan = scanReplies([{ key: 0, text: `안고 있다. ${T("Kaguya.school_uniform.smiling")} ${T("Kaguya.school_uniform.angry")}` }], idx);
  const a = aiItems(scan, idx, { mode: "all" });
  const raw = '설명 {"changes":[{"id":1,"kw":"hug","why":"안는 중"},{"id":2,"kw":"flying","why":"x"},{"id":2,"kw":"angry"},{"id":9,"kw":"hug"}]} 끝';
  const ch = parseAiReply(raw, a);
  assert.deepEqual(ch.map((c) => [c.id, c.name]), [[1, "Kaguya.school_uniform.hug"]]);
  assert.equal(ch.notes.length, 1);   // 목록에 없는 키워드
  const rows = changeRows(scan, ch);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].by, "ai");
  assert.equal(rows[0].why, "안는 중");
  assert.equal(applyRows(scan, rows, [rows[0].id])[0].after, `안고 있다. ${T("Kaguya.school_uniform.hug")} ${T("Kaguya.school_uniform.angry")}`);
  assert.equal(parseAiReply("엉망", a).length, 0);
});

test("AI change on top of an engine change keeps one row (the AI one)", () => {
  const scan = scanReplies([{ key: 0, text: T("kaguya.school_uniform.Smiling") }], idx);
  const a = aiItems(scan, idx, { mode: "all" });
  const rows = changeRows(scan, parseAiReply('{"changes":[{"id":1,"kw":"hug"}]}', a));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].to, T("Kaguya.school_uniform.hug"));
  assert.equal(rows[0].by, "ai");
});

test("renameIds replaces memory identities anywhere in a folder (and nothing else)", () => {
  const folder = { recs: [{ h: "mid:a:1", at: 3, text: "mid:a:1 그대로" }], done: ["mid:a:1", "mid:b:2"], cursor: { h: "mid:a:1" }, scene: { src: { hash: "mid:a:1" } } };
  const n = renameIds(folder, new Map([["mid:a:1", "mid:a:9"]]));
  assert.equal(n, 4);
  assert.deepEqual(folder, { recs: [{ h: "mid:a:9", at: 3, text: "mid:a:1 그대로" }], done: ["mid:a:9", "mid:b:2"], cursor: { h: "mid:a:9" }, scene: { src: { hash: "mid:a:9" } } });
});

test("action first: an AI keyword that only exists in another outfit switches to that outfit; same-outfit keyword is preferred", () => {
  const scan = scanReplies([{ key: 0, text: `눕혔다. ${T("Kaguya.school_uniform.smiling")} ${T("Kaguya.nude.default")}` }], idx);
  const a = aiItems(scan, idx, { mode: "all" });
  const ch = parseAiReply('{"changes":[{"id":1,"kw":"missionary_sex"},{"id":2,"kw":"smiling"}]}', a);
  assert.deepEqual(ch.map((c) => c.name), ["Kaguya.nude.missionary_sex", "Kaguya.nude.smiling"]);
});
