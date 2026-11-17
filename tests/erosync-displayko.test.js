// addon-rebuild: Erosync 화면 글 한국어 보기(시험판 피드백: NSFW 탭 성적 항목이 영어)
import test from "node:test";
import assert from "node:assert/strict";
import { koStrings, koApply, koParse, koMerge, needsKo } from "../src/erosync/displayko.js";

test("옮길 글: 한글 없는 화면 글만, 이미 옮긴 건 빼고", () => {
  const e = { sexualPreferences: [{ label: "Late-night talks", preference: "preferred", reason: "Feels safe" }, { label: "다정한 말" }],
    positionPreferences: ['{"label":"Overly serious romantic pressure","preference":"disliked"}'],
    seduction: { styles: ["Spontaneous and accidental"], typicalSituations: ["No seduction is described"] }, sexualHumor: { styles: ["Meme-format innuendo"] } };
  assert.deepEqual(koStrings(e, { "Feels safe": "편안함" }), ["Late-night talks", "Overly serious romantic pressure", "Spontaneous and accidental", "No seduction is described", "Meme-format innuendo"]);
  assert.equal(needsKo("123"), false); assert.equal(needsKo("한국어 OK"), false);
});

test("AI 답 정리·적용: 물어본 글만, 한글 번역만", () => {
  const asked = ["Late-night talks", "Meme-format innuendo"];
  const m = koParse({ items: [{ src: "Late-night talks", ko: "늦은 밤 대화" }, { src: "Meme-format innuendo", ko: "Meme" }, { src: "hack", ko: "해킹" }] }, asked);
  assert.deepEqual(m, { "Late-night talks": "늦은 밤 대화" });
  assert.equal(koApply("Late-night talks", m), "늦은 밤 대화"); assert.equal(koApply("Other", m), "Other");
  assert.deepEqual(koParse(["늦은 밤 대화", "밈 형식 농담"], asked), { "Late-night talks": "늦은 밤 대화", "Meme-format innuendo": "밈 형식 농담" });
  assert.equal(Object.keys(koMerge(Object.fromEntries([...Array(310)].map((_, i) => [`k${i}`, "v"])), { a: "가" })).length, 300);
});

test("NSFW 탭: 영어 화면 글이 있으면 한 번만 한국어 보기를 부탁하고, 엔진은 duskKo를 저장·화면에 적용한다", async () => {
  const { detailHasEnglish } = await import("../src/ui/screens/memory/erosyncwiki.js").catch(() => ({}));
  if (detailHasEnglish) {
    assert.equal(detailHasEnglish({ prefs: [{ label: "늦은 밤 대화" }], seduction: { styles: ["Meme-format innuendo"], situations: [] } }), true);
    assert.equal(detailHasEnglish({ prefs: [{ label: "늦은 밤 대화" }], likes: ["다정한 말"] }), false);
  }
  const fs = await import("node:fs");
  const eng = fs.readFileSync(new URL("../src/erosync/erosync.js", import.meta.url), "utf8");
  assert.ok(eng.includes("normalized.duskKo = koMerge("), "저장 정리에서 duskKo가 떨어지면 안 된다");
  assert.ok(eng.includes("korean: duskKoFill") && eng.includes("if (!axesOnly) { try { await duskKoFill(profileId); }"), "연결부·1인 분석 뒤 채우기");
  assert.ok(eng.includes("const km = isPlainObject(profile?.duskKo)") && eng.includes("koApply(typeof x === 'string'"), "화면 글에 적용");
});
