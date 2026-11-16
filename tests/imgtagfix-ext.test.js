// 2.2.6 확장자 제보: 에셋 이름이 .png·.webp·.avif이거나 확장자가 없을 때, AI가 다른 확장자를 붙이거나 빼먹어도 실제 이름으로 고친다.
import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetIndex, fixImgTags } from "../src/engine/imgtagfix.js";

const fix = (names, tag) => fixImgTags(`앞 ${tag} 뒤`, buildAssetIndex(names)).text.replace(/^앞 | 뒤$/g, "");

test("확장자 없는 에셋: AI가 붙인 어떤 확장자도 뗀다(대소문자·jpeg·avif·두 겹)", () => {
  const A = ["Mina_smile", "Mina_angry", "Mina_default"];
  for (const ext of [".png", ".webp", ".avif", ".jpg", ".jpeg", ".gif", ".PNG", ".Webp", ".AVIF", ".jfif", ".bmp", ".apng", ".png.webp"]) assert.equal(fix(A, `<img="Mina_smile${ext}">`), '<img="Mina_smile">', ext);
  assert.equal(fix(A, `<img src="Mina_angry.webp">`), '<img src="Mina_angry">');
});

test("확장자 있는 에셋: 빼먹었거나 다른 확장자를 붙이면 실제 확장자로", () => {
  for (const real of ["png", "webp", "avif", "jpeg"]) {
    const A = [`Mina_smile.${real}`, `Mina_angry.${real}`, `Mina_default.${real}`];
    assert.equal(fix(A, '<img="Mina_smile">'), `<img="Mina_smile.${real}">`, real);
    for (const wrong of ["png", "webp", "avif", "jpg"]) assert.equal(fix(A, `<img="Mina_smile.${wrong}">`), `<img="Mina_smile.${real}">`, `${real}←${wrong}`);
    assert.equal(fix(A, `<img="Mina_smile.${real.toUpperCase()}">`), `<img="Mina_smile.${real}">`);
  }
});

test("한 봇에 확장자가 섞여 있어도 각자 제 확장자로", () => {
  const A = ["Mina_smile.png", "Mina_angry.webp", "Mina_cry.avif", "Mina_default"];
  assert.equal(fix(A, '<img="Mina_smile.webp">'), '<img="Mina_smile.png">');
  assert.equal(fix(A, '<img="Mina_angry.png">'), '<img="Mina_angry.webp">');
  assert.equal(fix(A, '<img="Mina_cry">'), '<img="Mina_cry.avif">');
  assert.equal(fix(A, '<img="Mina_default.png">'), '<img="Mina_default">');
});

test("이미 맞는 태그는 그대로(확장자째 이름·확장자 없는 이름 모두)", () => {
  const A = ["Mina_smile.png", "Mina_angry"];
  for (const t of ['<img="Mina_smile.png">', '<img="Mina_angry">', '<img src="Mina_smile.png">']) assert.equal(fixImgTags(t, buildAssetIndex(A)).changed, false, t);
});

test("점 구분 이름(캐릭터.옷.키워드)에도 확장자", () => {
  const A = ["Hayul.hanbok.happy.webp", "Hayul.hanbok.sad.webp", "Hayul.school.happy"];
  assert.equal(fix(A, '<img="Hayul.hanbok.happy.png">'), '<img="Hayul.hanbok.happy.webp">');
  assert.equal(fix(A, '<img="Hayul.hanbok.happy">'), '<img="Hayul.hanbok.happy.webp">');
  assert.equal(fix(A, '<img="Hayul.school.happy.webp">'), '<img="Hayul.school.happy">');
});

test("같은 이름이 확장자만 달리 두 개 있으면 AI가 쓴 확장자를 존중", () => {
  const A = ["Mina_smile.png", "Mina_smile.webp", "Mina_angry.png"];
  assert.equal(fixImgTags('<img="Mina_smile.webp">', buildAssetIndex(A)).changed, false);
  assert.equal(fixImgTags('<img="Mina_smile.png">', buildAssetIndex(A)).changed, false);
  assert.equal(fix(A, '<img="Mina_smile.avif">'), '<img="Mina_smile.png">');
});
