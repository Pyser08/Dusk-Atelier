// 실제 봇 지침 4종의 태그 형식(사용자 제공)으로 교정이 맞게 동작하는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetIndex, fixImgTags, sceneState } from "../src/engine/imgtagfix.js";
import { buildHint, presentChars } from "../src/engine/imghint.js";

const fx = (idx, payload, opts) => fixImgTags(`<img="${payload}">`, idx, opts).text;
const T = (payload) => `<img="${payload}">`;

// 1) <img="karina_emotion_blushing_shyly">, <img="severa_missionary.sex">, <img="harry potter_exception_neutral">
const E = ["default", "blushing_shyly", "happy_tears"].map((k) => "emotion_" + k);
const S = ["missionary.sex", "missionary.hard sex", "missionary.ejaculation", "upright_straddle.sex"];
const A = [];
for (const c of ["karina", "severa", "freda", "georgia"]) for (const k of [...E, ...S]) A.push(`${c}_${k}`);
A.push("harry potter_exception_neutral", "ron weasley_exception_neutral", "freda&georgia_twins cowgirl.sex", "freda&georgia_twins cowgirl.ejaculation");
const IA = buildAssetIndex(A);

test("format 1: name_emotion_x and name_position.sex mixed — dots inside keywords are not outfits", () => {
  assert.equal(IA.dotted, false);
  assert.equal(fx(IA, "karina_emotion_blushing_shyly"), T("karina_emotion_blushing_shyly"));
  assert.equal(fx(IA, "Karina_blushing_shyly"), T("karina_emotion_blushing_shyly"));
  assert.equal(fx(IA, "karina_missionary_sex"), T("karina_missionary.sex"));
  assert.equal(fx(IA, "karina_emotion_ecstatic"), T("karina_emotion_default"));
});
test("format 1: exception characters always snap to their only image; '&' names survive", () => {
  assert.equal(fx(IA, "Harry Potter_smiling"), T("harry potter_exception_neutral"));
  assert.equal(fx(IA, "harry_potter_exception_neutral"), T("harry potter_exception_neutral"));
  assert.equal(fx(IA, "Freda&Georgia_twins cowgirl sex"), T("freda&georgia_twins cowgirl.sex"));
  assert.equal(fixImgTags('앞\n<img="<Character Command>_<State Command>">\n뒤', IA).text, "앞\n뒤");
});

// 2) <img="Astra Yao_smiling">, <img="Astra Yao_Sex_Missionary_Cum">
const B = [];
for (const c of ["Astra Yao", "Sigrid de L'Azur"]) for (const k of ["default", "smiling", "happy smiling", "Kiss", "Sex_Missionary", "Sex_Missionary_Cum", "Nude_Breasts Spanking"]) B.push(`${c}_${k}`);
const IB = buildAssetIndex(B);

test("format 2: names with spaces/apostrophes and keywords with underscores", () => {
  assert.equal(fx(IB, "Astra Yao_Sex_Missionary"), T("Astra Yao_Sex_Missionary"));
  assert.equal(fx(IB, "astra yao_Missionary_Cum"), T("Astra Yao_Sex_Missionary_Cum"));
  assert.equal(fx(IB, "Sigrid de L'Azur_smilling"), T("Sigrid de L'Azur_smiling"));
  assert.equal(fx(IB, "Astra Yao_Amused Smile"), T("Astra Yao_default"));   // 지침 예시에만 있는 없는 키워드
});

// 3) <img="iroha_real_blushing shyly">, 스탠딩 <img="akira">
const C = [];
for (const f of ["real", "virtual"]) for (const k of ["default", "smile", "blushing shyly"]) C.push(`iroha_${f}_${k}`);
C.push("iroha_real_cowgirl sex", "akira", "rai");
const IC = buildAssetIndex(C);

test("format 3: name-only standing images are kept, and extra keywords fall back to the name", () => {
  assert.equal(fx(IC, "akira"), T("akira"));
  assert.equal(fx(IC, "Akira"), T("akira"));
  assert.equal(fx(IC, "akira_smile"), T("akira"));
});
test("format 3: form (real/virtual) works like an outfit — kept, remembered, and an action it lacks becomes its default", () => {
  assert.equal(fx(IC, "iroha_virtual_blushing_shyly"), T("iroha_virtual_blushing shyly"));
  const state = sceneState([T("iroha_virtual_smile")], IC);
  assert.equal(state.iroha.outfit, "virtual");
  assert.equal(fx(IC, "iroha_blushing shyly", { state }), T("iroha_virtual_blushing shyly"));
  assert.equal(fx(IC, "iroha_virtual_cowgirl sex"), T("iroha_virtual_default"));
  assert.equal(fx(IC, "iroha_cowgirl sex"), T("iroha_real_cowgirl sex"));
});
test("format 3: hint shows standing characters as name only", () => {
  const texts = [T("akira") + "\n\n" + T("iroha_real_smile")];
  const st = sceneState(texts, IC);
  const hint = buildHint({ idx: IC, state: st, present: presentChars(texts, IC, st) });
  assert.match(hint, /akira — name only/);
  assert.match(hint, /iroha — outfit: real/);
});

// 4) <img="Mika_smile">, <img="Mika_head pat"> (감정과 스킨십은 따로 쓰는 규칙)
const D = [];
for (const c of ["Mika", "arona"]) for (const k of ["default", "smile", "head pat", "doggystyle"]) D.push(`${c}_${k}`);
const ID = buildAssetIndex(D);

test("format 4: emotion+skinship merged into one tag keeps the later (action) one; template removed", () => {
  assert.equal(fx(ID, "mika_smiling"), T("Mika_smile"));
  assert.equal(fx(ID, "Mika_smile_head pat"), T("Mika_head pat"));
  assert.equal(fx(ID, "Arona_Head Pat"), T("arona_head pat"));
  assert.equal(fixImgTags('<img="[Name]_[tag]">', ID).text, "");
  assert.equal(fixImgTags('<img="[Name]_[emotion]">', ID).text, "");
});
