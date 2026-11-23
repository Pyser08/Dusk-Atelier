import test from "node:test";
import assert from "node:assert/strict";
import { normSettings, hintText, parseThoughts, stripThoughts, renderThoughts, pickImage, imageTag, detectStyle, collectFromMessages, thoughtsFor, cardTabHtml, emotionWords, summary } from "../src/engine/innerthought.js";

test("설정: 최소 ≤ 최대, 0~5로 자름", () => {
  assert.deepEqual(normSettings({ on: true, min: 3, max: 1 }), { on: true, min: 3, max: 3, image: true });
  assert.deepEqual(normSettings({ min: -2, max: 9 }), { on: false, min: 0, max: 5, image: true });
  assert.equal(summary(normSettings({ on: true, min: 1, max: 2 })), "켜짐 · 인물당 1~2번");
});

test("안내: 꺼짐·최대 0이면 없음, 켜면 횟수·감정 목록", () => {
  assert.equal(hintText(normSettings({ on: false })), "");
  assert.equal(hintText(normSettings({ on: true, max: 0 })), "");
  const h = hintText(normSettings({ on: true, min: 1, max: 2 }), { emos: ["웃음", "울음"], user: "준" });
  assert.match(h, /1~2번/); assert.match(h, /웃음, 울음/); assert.match(h, /준 제외/); assert.match(h, /<dusk-thought name=/);
});

const msg = `시로코가 고개를 돌렸다.\n<dusk-thought name="시로코" emo="부끄러움">들킨 건 아니겠지…</dusk-thought>\n"별로."`;
test("파싱·빼기", () => {
  assert.deepEqual(parseThoughts(msg), [{ name: "시로코", emo: "부끄러움", text: "들킨 건 아니겠지…" }]);
  assert.ok(!stripThoughts(msg).includes("dusk-thought") && stripThoughts(msg).includes("별로"));
});

test("화면: 그 행동·대사 끝에 💭 아이콘, 누르면(details) 풍선 + 이미지", () => {
  const out = renderThoughts(msg, () => "{{emotion::shy}}");
  assert.ok(!out.includes("<dusk-thought"));
  assert.match(out, /고개를 돌렸다\. <details x-dusk="thoughts"[^>]*display:inline-flex[^>]*><summary[^>]*>💭<span[^>]*border-radius:50%/, "같은 줄 끝에 생각풍선(꼬리 점)");
  assert.match(out, /<\/summary><span style="display:inline-block;vertical-align:middle;margin-left:10px">/, "펼친 풍선은 본문 옆");
  assert.ok(out.indexOf("<details") < out.indexOf("별로"), "본문 맨 아래가 아니라 그 자리");
  assert.match(out, /data-dusk="thought"/); assert.match(out, /\{\{emotion::shy\}\}/);
  assert.equal(renderThoughts(`본문 <dusk-thought name="시로코" emo="기쁨">반쯤`), "본문");
  const two = renderThoughts('"가자." <dusk-thought name="A">하나</dusk-thought>\n"응." <dusk-thought name="B">둘</dusk-thought>');
  assert.equal((two.match(/<details/g) ?? []).length, 2);
});

test("모델이 고르는 이미지: img 속성 읽기 + 안내에 인물별 실제 이미지 목록", async () => {
  const { buildAssetIndex } = await import("../src/engine/imgtagfix.js");
  const { assetList } = await import("../src/engine/innerthought.js");
  assert.equal(parseThoughts('<dusk-thought name="A" emo="기쁨" img="Hoshino_smile">x</dusk-thought>')[0].img, "Hoshino_smile");
  const list = assetList(buildAssetIndex(["Hoshino_smile", "Hoshino_cry", "Shiroko_blush"]));
  assert.match(list, /Hoshino: Hoshino_smile, Hoshino_cry/); assert.match(list, /Shiroko: Shiroko_blush/);
  const h = hintText(normSettings({ on: true }), { assets: list });
  assert.match(h, /img="이미지 이름"/); assert.match(h, /Shiroko_blush/); assert.match(h, /행동이나 대사 바로 뒤/);
  assert.ok(!hintText(normSettings({ on: true, image: false }), { assets: list }).includes("img="));
});

test("감정 이미지 고르기: 이름+감정, 동의어, 다른 인물 이미지는 피함", () => {
  const imgs = { emotions: ["shy", "happy", "angry"], assets: ["호시노_shy", "시로코_blush"] };
  assert.deepEqual(pickImage(imgs, "시로코", "부끄러움", { botName: "시로코" }), { kind: "asset", name: "시로코_blush" });
  assert.deepEqual(pickImage(imgs, "아로나", "기쁨", { botName: "시로코" }), { kind: "emotion", name: "happy" });
  assert.equal(pickImage(imgs, "시로코", "질투"), null);
});

test("출력 방식대로 태그", () => {
  assert.equal(detectStyle(['<img="a_b">']), "imgeq");
  assert.equal(detectStyle(["{{asset::x}}"]), "asset");
  assert.equal(detectStyle(["그냥 글"]), "imgeq");
  assert.equal(imageTag({ kind: "asset", name: "a" }, "imgeq"), '<img="a">');
  assert.equal(imageTag({ kind: "asset", name: "a" }, "img"), "{{img::a}}");
  assert.equal(imageTag({ kind: "emotion", name: "a" }, "imgeq"), "{{emotion::a}}");
});

test("상태창 탭: 인물별로 모아 최근 것이 위", () => {
  const by = collectFromMessages([{ role: "char", data: msg }, { role: "user", data: '<dusk-thought name="시로코">x</dusk-thought>' }, { role: "char", data: '<dusk-thought name="시로코" emo="기쁨">좋아</dusk-thought>' }]);
  const l = thoughtsFor(by, ["Shiroko", "시로코"]);
  assert.equal(l.length, 2);
  const html = cardTabHtml(l);
  assert.ok(html.indexOf("좋아") < html.indexOf("들킨"));
});

test("감정 낱말: 인물 이름 빼고 겹침 없이", () => {
  assert.deepEqual(emotionWords(["시로코_happy", "시로코 sad", "happy"], ["시로코"]), ["happy", "sad"]);
});

test("상태창: 속마음이 있으면 ‘속마음’ 탭(성인 아님도 탭 상자)", async () => {
  const { statusCardHtml } = await import("../src/engine/namecard.js");
  const f = { people: {}, wiki: { documents: {} } }, d = { id: "d1", type: "Character", title: "시로코" };
  const plain = statusCardHtml(f, d, { adult: false });
  assert.ok(!plain.includes("속마음"));
  const withT = statusCardHtml(f, d, { adult: false, thoughts: "<i>좋아</i>" });
  assert.match(withT, /data-tab="t"/); assert.match(withT, />속마음</); assert.match(withT, /좋아/); assert.match(withT, /data-tab="g"/);
});
