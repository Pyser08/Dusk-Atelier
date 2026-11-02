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
  assert.equal(fix('<img="Shinomiya_Kaguya.nude.missionary_sex">').text, '<img="Shinomiya_Kaguya.nude.default">');
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
  assert.equal(f("<img src=jiyoon_ecstatic>"), "");
  assert.equal(f("<img src=jiyoon_blushing shyly>"), "<img src=jiyoon_blushing shyly>");
});
