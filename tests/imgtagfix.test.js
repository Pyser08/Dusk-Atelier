import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetIndex, fixImgTags } from "../src/engine/imgtagfix.js";

const kws = (c, o, list) => list.map((k) => `${c}.${o}.${k}`);
const ASSETS = [
  "Shirogane_Miyuki.default",
  ...kws("Fujiwara_Chika", "school_uniform", ["default", "smiling", "angry", "hug"]),
  ...kws("Fujiwara_Chika", "casual", ["default", "smiling"]),
  ...kws("Shinomiya_Kaguya", "school_uniform", ["default", "smiling", "blushing_shyly", "hug", "missionary_sex"]),
  ...kws("Shinomiya_Kaguya", "nude", ["default", "smiling", "hug"]),
];
const idx = buildAssetIndex(ASSETS);
const fix = (t, o) => fixImgTags(t, idx, o);

test("valid tags and non-asset images stay byte-identical", () => {
  const t = [
    '<img="Fujiwara_Chika.school_uniform.smiling">',
    "<img src=Shinomiya_Kaguya.nude.hug>",
    '<img src="https://example.com/a.png">',
    "<img src='data:image/png;base64,AAAA'>",
    '<img src="{{raw::Fujiwara_Chika.casual.default}}">',
    '<img src="a.png" class="x">',
  ].join("\n\n");
  const r = fix(t);
  assert.equal(r.text, t);
  assert.equal(r.changed, false);
  assert.deepEqual(r.fixes, []);
});

test("empty asset list never changes anything", () => {
  const t = '<img="Nobody.smiling">';
  assert.equal(fixImgTags(t, buildAssetIndex([])).text, t);
});

test("case, spacing and separator variants snap to the real name and keep the tag syntax", () => {
  assert.equal(fix('<img="fujiwara_chika.School_Uniform.Smiling">').text, '<img="Fujiwara_Chika.school_uniform.smiling">');
  assert.equal(fix("<img src=Shinomiya_Kaguya.school_uniform.blushing shyly>").text, "<img src=Shinomiya_Kaguya.school_uniform.blushing_shyly>");
  assert.equal(fix('<img src="Shinomiya_Kaguya.nude.Hug">').text, '<img src="Shinomiya_Kaguya.nude.hug">');
});

test("typos snap to the nearest keyword; a clear miss falls back to default of that outfit", () => {
  assert.equal(fix('<img="Fujiwara_Chika.school_uniform.smilling">').text, '<img="Fujiwara_Chika.school_uniform.smiling">');
  const r = fix('<img="Fujiwara_Chika.school_uniform.ecstatic">');
  assert.equal(r.text, '<img="Fujiwara_Chika.school_uniform.default">');
  assert.equal(r.fixes[0].kind, "default");
});

test("tags merged into one tag keep only the most specific (rarest) keyword", () => {
  assert.equal(fix('<img="Shinomiya_Kaguya.school_uniform.smiling,hug">').text, '<img="Shinomiya_Kaguya.school_uniform.hug">');
  assert.equal(fix('<img="Shinomiya_Kaguya.school_uniform.smiling_missionary_sex">').text, '<img="Shinomiya_Kaguya.school_uniform.missionary_sex">');
  assert.equal(
    fix('<img="Shinomiya_Kaguya.school_uniform.smiling" "Shinomiya_Kaguya.school_uniform.hug">').text,
    '<img="Shinomiya_Kaguya.school_uniform.hug">',
  );
  assert.equal(fix('<img="Shinomiya_Kaguya.school_uniform.smiling + Shinomiya_Kaguya.school_uniform.blushing_shyly">').fixes[0].kind, "merged");
});

test("separate tags (even on one line) are not merged", () => {
  const t = '<img="Fujiwara_Chika.school_uniform.smiling"><img="Fujiwara_Chika.school_uniform.hug">';
  assert.equal(fix(t).text, t);
});

test("default-only characters always resolve to default", () => {
  assert.equal(fix('<img="Shirogane_Miyuki.smiling">').text, '<img="Shirogane_Miyuki.default">');
  assert.equal(fix('<img="Shirogane_Miyuki.school_uniform.angry">').text, '<img="Shirogane_Miyuki.default">');
});

test("missing or wrong outfit uses the outfit that actually has the keyword", () => {
  assert.equal(fix('<img="Fujiwara_Chika.angry">').text, '<img="Fujiwara_Chika.school_uniform.angry">');
  assert.equal(fix('<img="Shinomiya_Kaguya.bikini.missionary_sex">').text, '<img="Shinomiya_Kaguya.school_uniform.missionary_sex">');
  assert.equal(fix('<img="Shinomiya_Kaguya.nude.missionary_sex">').text, '<img="Shinomiya_Kaguya.school_uniform.missionary_sex">');   // 동작 우선
  assert.equal(fix('<img="Shinomiya_Kaguya.nude.ecstatic">').text, '<img="Shinomiya_Kaguya.nude.default">');   // 어느 옷에도 없으면 그 옷의 기본
});

test("copied prompt template text is removed together with its empty line", () => {
  const t = "문장 하나.\n\n<img=\"[Character].[Outfit].[Keyword]\">\n\n다음 문장.";
  const r = fix(t);
  assert.equal(r.text, "문장 하나.\n\n다음 문장.");
  assert.equal(r.fixes[0].kind, "template");
  assert.equal(fix("<img src=character's name_keyword>").text, "");
});

test("characters that do not exist are removed (or kept when asked)", () => {
  assert.equal(fix("앞.\n<img=\"Nobody_Here.smiling\">\n뒤.").text, "앞.\n뒤.");
  assert.equal(fix('앞 <img="Nobody_Here.smiling"> 뒤').text, "앞  뒤");
  const kept = fix('<img="Nobody_Here.smiling">', { unknown: "keep" });
  assert.equal(kept.text, '<img="Nobody_Here.smiling">');
  assert.equal(kept.changed, false);
});

test("unfinished tags from streaming are left alone and the fix is idempotent", () => {
  assert.equal(fix('문장 <img="Shinomiya_Ka').text, '문장 <img="Shinomiya_Ka');
  const once = fix('<img="fujiwara_chika.school_uniform.Smilling,hug"> <img="[Character].[Outfit].[Keyword]">').text;
  assert.equal(fix(once).text, once);
  assert.equal(fix(once).changed, false);
});

test("underscore style assets (name_keyword with spaces in keywords)", () => {
  const i2 = buildAssetIndex(["jiyoon_blushing shyly", "jiyoon_happy tears", "jiyoon_neutral", "miro_smiling", "miro_default"]);
  const f = (t) => fixImgTags(t, i2).text;
  assert.equal(f("<img src=jiyoon_blushing_shyly>"), "<img src=jiyoon_blushing shyly>");
  assert.equal(f("<img src=Jiyoon_Happy Tears>"), "<img src=jiyoon_happy tears>");
  assert.equal(f("<img src=miro_happy_tears>"), "<img src=miro_default>");
  assert.equal(f("<img src=jiyoon_ecstatic>"), "<img src=jiyoon_neutral>");
  assert.equal(f("<img src=jiyoon_blushing shyly>"), "<img src=jiyoon_blushing shyly>");
});

// ── v1.8.2 2차: 줄임말·활용형·접두어·확장자·이름 반쪽·대체 표정·직전 옷 ──
const kw2 = (c, o, list) => list.map((k) => `${c}.${o}.${k}`);
const I2 = buildAssetIndex([
  ...kw2("Fujiwara_Chika", "school_uniform", ["default", "smiling", "hug", "missionary_sex", "missionary_after_sex", "cowgirl_sex", "cowgirl_grinding", "yuri_do_fingering"]),
  ...kw2("Fujiwara_Chika", "casual", ["default", "smiling"]),
  ...kw2("Shirogane_Kei", "school_uniform", ["default", "smiling"]),
  ...kw2("Karuizawa_Kei", "school_uniform", ["default", "smiling"]),
]);
const f2 = (t, o) => fixImgTags(t, I2, o).text;
const C = (k, o = "school_uniform") => `<img="Fujiwara_Chika.${o}.${k}">`;

test("shortened action keywords pick the closest full keyword (fewest extra words)", () => {
  assert.equal(f2(C("missionary")), C("missionary_sex"));
  assert.equal(f2(C("do_fingering")), C("yuri_do_fingering"));
  assert.equal(f2(C("cowgirl")), C("cowgirl_sex"));   // 동률이면 이 목록에서 가장 흔한 끝말(sex)을 고름
});

test("inflected forms and file extensions are understood", () => {
  assert.equal(f2(C("smile")), C("smiling"));
  assert.equal(f2(C("hugging")), C("hug"));
  assert.equal(f2(C("smiling.png")), C("smiling"));
  assert.equal(f2(C("sex_missionary")), C("missionary_sex"));   // 낱말 순서만 바뀜
});

test("half of a name works when only one character matches", () => {
  assert.equal(f2('<img="Chika.school_uniform.smiling">'), C("smiling"));
  assert.equal(f2('<img="Kei.school_uniform.smiling">'), "");   // Kei가 둘이라 정할 수 없음
});

test("no default asset: fall back to neutral, otherwise keep the tag as it was", () => {
  const i = buildAssetIndex(["yeri_neutral", "yeri_smiling", "bora_smiling", "bora_sad"]);
  assert.equal(fixImgTags("<img src=yeri_happy>", i).text, "<img src=yeri_neutral>");
  assert.equal(fixImgTags("<img src=bora_happy>", i).text, "<img src=bora_happy>");
  assert.equal(fixImgTags("<img src=bora_happy>", i).changed, false);
});

test("missing outfit follows the outfit worn last; an action that outfit lacks becomes its default", () => {
  const state = { Fujiwara_Chika: { outfit: "casual" } };
  assert.equal(f2('<img="Fujiwara_Chika.smiling">', { state }), C("smiling", "casual"));
  assert.equal(f2('<img="Fujiwara_Chika.hug">', { state }), C("hug"));   // 동작 우선: 직전 옷(casual)에 없으면 hug가 있는 옷으로
  assert.equal(f2('<img="Fujiwara_Chika.hug">'), C("hug"));   // 기록이 없으면 그 동작이 있는 옷
});

// 버그 제보(정혜 + 향하율): 에셋 이름 자체에 .webp가 들어 있는 봇(무상몰수 경자)은 확장자째 써야 이미지가 나온다.
test("asset names that literally end in an extension keep it", () => {
  const idx = buildAssetIndex([
    ["Gyeongja_blushing_shyly.webp", "Gyeongja_smile.webp", "jhkg_gyeongja_anbang.webp"],
    ["Hayul.hanbok.happy.clear", "Hayul.hanbok.sad", "Hayul.school uniform.default"],
  ]);
  const ok = 'a\n<img src="Gyeongja_blushing_shyly.webp">\nb <img="Hayul.hanbok.happy.clear">';
  assert.deepEqual(fixImgTags(ok, idx), { text: ok, changed: false, fixes: [] });
  assert.equal(fixImgTags('<img src="Gyeongja_blushing_shyly">', idx).text, '<img src="Gyeongja_blushing_shyly.webp">');
  assert.equal(fixImgTags('<img src="gyeongja_smiling.webp">', idx).text, '<img src="Gyeongja_smile.webp">');
  const solo = buildAssetIndex(["Gyeongja_blushing_shyly.webp", "Gyeongja_smile.webp"]);
  assert.equal(fixImgTags(ok.split("\n")[1], solo).changed, false);
});
