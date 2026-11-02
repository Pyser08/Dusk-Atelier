import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetIndex, sceneState, fixImgTags } from "../src/engine/imgtagfix.js";
import { HINT_MARK, buildHint, insertHint, presentChars, hintForMessages } from "../src/engine/imghint.js";

const kws = (c, o, list) => list.map((k) => `${c}.${o}.${k}`);
const idx = buildAssetIndex([
  "Shirogane_Miyuki.default",
  ...kws("Fujiwara_Chika", "school_uniform", ["default", "smiling", "hug", "missionary_sex"]),
  ...kws("Fujiwara_Chika", "nude", ["default", "smiling", "missionary_sex"]),
  ...kws("Shinomiya_Kaguya", "school_uniform", ["default", "smiling", "hug", "missionary_sex"]),
  ...kws("Shinomiya_Kaguya", "nude", ["default", "smiling"]),
  ...kws("Hayasaka_Ai", "school_uniform", ["default", "smiling"]),
]);

test("scene state keeps the last outfit and tag per character (old → new)", () => {
  const st = sceneState([
    '<img="Fujiwara_Chika.school_uniform.smiling">',
    '<img="fujiwara_chika.Nude.missionary">\n\n<img="Shinomiya_Kaguya.school_uniform.hug">',
  ], idx);
  assert.equal(st.Fujiwara_Chika.outfit, "nude");
  assert.equal(st.Fujiwara_Chika.kw, "missionary_sex");
  assert.equal(st.Shinomiya_Kaguya.kw, "hug");
  assert.equal(st.Shirogane_Miyuki, undefined);
});

test("the remembered outfit is used when the reply forgets it", () => {
  const st = sceneState(['<img="Fujiwara_Chika.nude.smiling">'], idx);
  assert.equal(fixImgTags('<img="Fujiwara_Chika.hug">', idx, { state: st }).text, '<img="Fujiwara_Chika.school_uniform.hug">');   // 동작 우선: hug가 있는 옷으로
});

test("present characters: tags in recent replies first, then names mentioned", () => {
  const texts = ["오래된 글 Hayasaka_Ai", '<img="Fujiwara_Chika.nude.smiling">', "Shinomiya Kaguya가 들어왔다."];
  const st = sceneState(texts, idx);
  const names = presentChars(texts, idx, st).map((c) => c.name);
  assert.deepEqual(names, ["Fujiwara_Chika", "Shinomiya_Kaguya"]);
});

test("hint lists state, current-outfit keywords (deduplicated) and the priority rule", () => {
  const texts = ['<img="Fujiwara_Chika.school_uniform.missionary_sex">', '<img="Shinomiya_Kaguya.school_uniform.smiling"> <img="Shirogane_Miyuki.default">'];
  const st = sceneState(texts, idx);
  const hint = buildHint({ idx, state: st, present: presentChars(texts, idx, st) });
  assert.ok(hint.startsWith(HINT_MARK));
  assert.match(hint, /NSFW action > interaction > emotion > default/);
  assert.match(hint, /Fujiwara_Chika — outfit: school_uniform · last tag: <img="Fujiwara_Chika\.school_uniform\.missionary_sex">/);
  assert.match(hint, /Shinomiya_Kaguya \(school_uniform\): default, smiling, hug, missionary_sex/);   // 최근 캐릭터가 먼저
  assert.match(hint, /Fujiwara_Chika \(school_uniform\): same as Shinomiya_Kaguya/);
  assert.match(hint, /Shirogane_Miyuki — default only/);
  assert.doesNotMatch(hint, /Hayasaka_Ai/);
});

test("a character without a known outfit lists outfits only; very long lists drop keywords", () => {
  const texts = ["Shinomiya_Kaguya가 문을 열었다."];
  const st = sceneState(texts, idx);
  const hint = buildHint({ idx, state: st, present: presentChars(texts, idx, st) });
  assert.match(hint, /Shinomiya_Kaguya — outfits: school_uniform, nude/);
  const many = buildAssetIndex(kws("Big_One", "a", Array.from({ length: 900 }, (_, i) => `keyword_number_${i}`)));
  const t2 = ['<img="Big_One.a.keyword_number_1">'];
  const s2 = sceneState(t2, many);
  const h2 = buildHint({ idx: many, state: s2, present: presentChars(t2, many, s2) });
  assert.ok(h2.length < 3000);
  assert.match(h2, /Big_One — outfit: a/);
  assert.doesNotMatch(h2, /keyword_number_500/);
});

const msgs = (...list) => list.map(([role, content]) => ({ role, content }));

test("hintForMessages only acts on bots that use image tags, and inserts before the last user message", () => {
  assert.equal(hintForMessages(msgs(["system", "plain bot"], ["user", "hi"]), idx), null);
  const m = msgs(["system", 'Use <img="[Character].[Outfit].[Keyword]">'], ["assistant", '<img="Fujiwara_Chika.nude.smiling"> 안녕'], ["user", "안아 줘"]);
  const r = hintForMessages(m, idx);
  assert.ok(r.hint.includes("Fujiwara_Chika — outfit: nude"));
  assert.equal(r.state.Fujiwara_Chika.outfit, "nude");
  const out = insertHint(m, r.hint);
  assert.equal(out.length, 4);
  assert.equal(out[2].role, "system");
  assert.ok(out[2].content.startsWith(HINT_MARK));
  assert.equal(out[3].content, "안아 줘");
  assert.equal(m.length, 3);   // 원본 배열은 그대로
  const again = insertHint(out, r.hint);   // 다시 넣어도 하나만
  assert.equal(again.filter((x) => String(x.content).startsWith(HINT_MARK)).length, 1);
});

test("array content parts are read too", () => {
  const m = [{ role: "system", content: [{ type: "text", text: "<img=...> rules" }] }, { role: "assistant", content: [{ type: "text", text: '<img="Fujiwara_Chika.nude.smiling">' }] }, { role: "user", content: "x" }];
  assert.equal(hintForMessages(m, idx).state.Fujiwara_Chika.outfit, "nude");
});

// ── 태그 고정 방지 ──
test("hint describes the last state without telling the model to keep it", () => {
  const texts = ['<img="Fujiwara_Chika.nude.missionary_sex">'];
  const st = sceneState(texts, idx);
  const hint = buildHint({ idx, state: st, present: presentChars(texts, idx, st) });
  assert.doesNotMatch(hint, /keep its keyword/);
  assert.match(hint, /If the action or its stage changed, switch to the matching tag; if it ended, go back to an emotion tag/);
});

test("the same tag used in several replies in a row is called out", () => {
  const t = '<img="Fujiwara_Chika.nude.missionary_sex">';
  const st = sceneState([t, t, t], idx);
  assert.equal(st.Fujiwara_Chika.streak, 3);
  const hint = buildHint({ idx, state: st, present: presentChars([t, t, t], idx, st) });
  assert.match(hint, /used in 3 replies in a row — change it if the scene moved on/);
  const st2 = sceneState([t, '<img="Fujiwara_Chika.nude.smiling">', t], idx);
  assert.equal(st2.Fujiwara_Chika.streak, 1);
});

test("tags older than the last two replies are not shown as the last tag (outfit still is)", () => {
  const m = [
    { role: "system", content: "<img> rules" },
    { role: "assistant", content: '<img="Fujiwara_Chika.nude.missionary_sex">' },
    { role: "user", content: "a" }, { role: "assistant", content: "Fujiwara Chika는 말이 없다." },
    { role: "user", content: "b" }, { role: "assistant", content: "Fujiwara Chika가 웃었다." },
    { role: "user", content: "c" },
  ];
  const r = hintForMessages(m, idx);
  assert.match(r.hint, /Fujiwara_Chika — outfit: nude/);
  assert.doesNotMatch(r.hint, /last tag: <img="Fujiwara_Chika\.nude\.missionary_sex">/);
  assert.equal(r.state.Fujiwara_Chika.outfit, "nude");   // 교정용 옷 기억은 그대로
});

test("only the recent replies are read for the scene state (long chats stay cheap)", () => {
  const m = [{ role: "system", content: "<img> rules" }];
  m.push({ role: "assistant", content: '<img="Hayasaka_Ai.school_uniform.smiling">' });
  for (let i = 0; i < 40; i++) { m.push({ role: "user", content: "u" }); m.push({ role: "assistant", content: i === 39 ? '<img="Fujiwara_Chika.nude.smiling">' : "글" }); }
  m.push({ role: "user", content: "끝" });
  const r = hintForMessages(m, idx);
  assert.equal(r.state.Hayasaka_Ai, undefined);   // 아주 오래된 태그는 읽지 않음
  assert.equal(r.state.Fujiwara_Chika.outfit, "nude");
});

test("hint says an action beats the outfit", () => {
  const texts = ['<img="Fujiwara_Chika.nude.smiling">'];
  const st = sceneState(texts, idx);
  assert.match(buildHint({ idx, state: st, present: presentChars(texts, idx, st) }), /If the action keyword you need exists only in another outfit, use that outfit/);
});
