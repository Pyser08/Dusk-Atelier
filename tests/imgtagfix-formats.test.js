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

// 5) 명일방주: <img="Amiya_smile">, 이름에 밑줄이 든 <img="Amiya_Demon_King_sad">, NSFW <img="Amiya_missionary_sex">
const ST = ["angry", "smile", "sad", "blushing_shyly", "playful_wink"];
const POS = ["missionary_sex", "missionary_hard_sex", "missionary_fingering", "missionary_ejaculation", "missionary_after_sex", "doggystyle_sex", "cowgirl_sex", "cowgirl_grinding"];
const K = [];
for (const c of ["Amiya", "Amiya_Demon_King", "Kal'tsit", "Mudrock", "Skadi", "Skadi_the_Corrupting_Heart"]) for (const k of [...ST, ...POS]) K.push(`${c}_${k}`);
const IK = buildAssetIndex(K);

test("format 5: names that contain underscores and spaces-for-underscores", () => {
  assert.equal(fx(IK, "Amiya_Demon_King_sad"), T("Amiya_Demon_King_sad"));
  assert.equal(fx(IK, "Amiya_Demon_King_smiling"), T("Amiya_Demon_King_smile"));
  assert.equal(fx(IK, "Kal'tsit_blushing shyly"), T("Kal'tsit_blushing_shyly"));
  assert.equal(fx(IK, "Skadi the Corrupting Heart_smile"), T("Skadi_the_Corrupting_Heart_smile"));
  assert.equal(fx(IK, "Amiya smiling"), T("Amiya_smile"));   // 지침의 WRONG 예시
});
test("format 5: a cut-off position picks the base variant; merged emotion+position keeps the position", () => {
  assert.equal(fx(IK, "Amiya_missionary"), T("Amiya_missionary_sex"));   // 지침의 WRONG 예시
  assert.equal(fx(IK, "Mudrock_smile_missionary_sex"), T("Mudrock_missionary_sex"));
  assert.equal(fx(IK, "Amiya"), T("Amiya"));   // 무엇을 원했는지 알 수 없으면 그대로
});

// 모듈이 여러 개: 모듈마다 이름 규칙이 달라도 각각 읽는다(목록을 묶음으로 넘김)
test("several modules with different naming rules are read separately", () => {
  const bot = [];
  const dottedMod = ["Fujiwara_Chika.school_uniform.smiling", "Fujiwara_Chika.school_uniform.default", "Fujiwara_Chika.nude.default", "Fujiwara_Chika.nude.smiling"];
  const underMod = ["yeri_smile", "yeri_default", "yeri_angry", "bora_smile", "bora_default"];
  const bgMod = Array.from({ length: 12 }, (_, i) => `bg.room.${i}`);   // 태그와 무관한 배경 에셋 모듈
  const idx = buildAssetIndex([bot, dottedMod, underMod, bgMod]);
  assert.equal(fx(idx, "fujiwara_chika.school_uniform.Smiling"), T("Fujiwara_Chika.school_uniform.smiling"));
  const state = sceneState([T("Fujiwara_Chika.nude.default")], idx);
  assert.equal(fx(idx, "Fujiwara_Chika.smiling", { state }), T("Fujiwara_Chika.nude.smiling"));
  assert.equal(fx(idx, "Yeri_smiling"), T("yeri_smile"));
  assert.equal(fx(idx, "bora_ecstatic"), T("bora_default"));
  const flat = buildAssetIndex([...dottedMod, ...underMod, ...bgMod]);   // 한 목록으로 섞으면 소수 규칙이 깨질 수 있음(참고)
  assert.ok(flat.size > 0);
});
