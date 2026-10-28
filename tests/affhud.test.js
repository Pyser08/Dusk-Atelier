import test from "node:test";
import assert from "node:assert/strict";
import { hasHud, installHud, uninstallHud, parseDelta, readPotAffinity, clampAff, MARK_A, buildAffMessages, designMessages, hudHtml, validateHud, extractHud, previewDoc } from "../src/engine/affhud.js";
import { createAffHud } from "../src/data/affhud.js";

test("installHud: 배경 HTML 교체·기본 변수 보존, uninstall로 원복", () => {
  const ch = { backgroundHTML: "<p>기존</p>", defaultVariables: "mood=happy\naff=40" };
  const a = installHud(ch, { min: -50, max: 150, start: 0 });
  assert.ok(hasHud(a.backgroundHTML) && a.backgroundHTML.startsWith("<p>기존</p>"));
  assert.match(a.defaultVariables, /aff=40/);          // 사용자가 둔 시작값 유지
  assert.match(a.defaultVariables, /aff_min=-50/);
  const b = installHud(a, { min: -10, max: 10 });      // 다시 설치: HUD 한 개만
  assert.equal(b.backgroundHTML.split(MARK_A).length, 2);
  assert.match(b.defaultVariables, /aff_max=10/);
  const c = uninstallHud(b);
  assert.equal(c.backgroundHTML, "<p>기존</p>");
  assert.equal(c.defaultVariables, "mood=happy");
});

test("parseDelta: JSON 추출·한도 자르기·실패", () => {
  assert.equal(parseDelta('```json\n{"delta": 3, "reason":"웃음"}\n```', 5), 3);
  assert.equal(parseDelta('{"delta": -99}', 5), -5);
  assert.equal(parseDelta("모르겠음", 5), null);
  assert.equal(clampAff(400, -100, 300), 300);
});

test("readPotAffinity: 사용자 대상 affinity.score, 이름 일치 우선", () => {
  const wiki = { documents: { a: { title: "다른이", metrics: [{ slotId: "affinity.score", targetRefs: ["actor:user"], value: 10, minimum: -100, maximum: 300, lastDelta: 1 }] },
    b: { title: "아루", aliases: [], metrics: [{ slotId: "affinity.score", targetRefs: ["actor:user"], value: 77, minimum: -100, maximum: 300, lastDelta: -2 }, { slotId: "suspicion.score", value: 5 }] } } };
  const r = readPotAffinity(wiki, "아루");
  assert.deepEqual([r.value, r.delta], [77, -2]);
  assert.equal(readPotAffinity({ documents: {} }, "x"), null);
});

function fakeApi(msgs) {
  const chat = { id: "c1", message: msgs, scriptstate: {} };
  const ch = { chaId: "cha1", name: "아루", backgroundHTML: installHud({}).backgroundHTML };
  return { chat, api: { getCharacterFromIndex: async () => ch, getChatFromIndex: async () => structuredClone(chat), setChatToIndex: async (_c, _t, v) => { chat.scriptstate = v.scriptstate; } } };
}
function fakeStore(flowOn, wiki) {
  const idx = { settings: { flow: { on: flowOn } }, affhud: { cha1: { on: true } } };
  return { getIndex: async () => idx, updateIndex: async (fn) => fn(idx), getWiki: async () => wiki };
}
const msgs = (t) => [{ role: "user", data: "안녕" }, { role: "char", data: t }];

test("syncAt: 리스폿 켜짐+값 있음 → A(복사)", async () => {
  const { api, chat } = fakeApi(msgs("반가워"));
  const wiki = { documents: { a: { title: "아루", metrics: [{ slotId: "affinity.score", targetRefs: ["actor:user"], value: 50, minimum: -100, maximum: 300, lastDelta: 4 }] } } };
  const hud = createAffHud(api, { store: fakeStore(true, wiki), ask: async () => { throw new Error("호출되면 안 됨"); } });
  assert.equal(await hud.syncAt(0, 0), "pot");
  assert.equal(chat.scriptstate.$aff, "50");
  assert.equal(chat.scriptstate.$aff_d, "4");
  assert.equal(await hud.syncAt(0, 0), "same");   // 같은 응답은 다시 하지 않음
});

test("syncAt: 리스폿 꺼짐 → B(보조모델 누적, 다시 생성은 되돌려 계산)", async () => {
  const { api, chat } = fakeApi(msgs("반가워"));
  let n = 0;
  const hud = createAffHud(api, { store: fakeStore(false, null), ask: async () => `{"delta": ${++n === 1 ? 3 : 2}}` });
  assert.equal(await hud.syncAt(0, 0), "own");
  assert.deepEqual([chat.scriptstate.$aff, chat.scriptstate.$aff_d], ["3", "3"]);
  chat.message = msgs("다시 생성한 답");             // 같은 자리 재생성
  assert.equal(await hud.syncAt(0, 0), "own");
  assert.equal(chat.scriptstate.$aff, "2");         // 3+2가 아니라 0+2
});

test("syncAt: 리스폿 켜졌지만 수치 없음 → B로 대체 / source=own이면 항상 B", async () => {
  const f = fakeApi(msgs("응"));
  const hud = createAffHud(f.api, { store: fakeStore(true, { documents: {} }), ask: async () => '{"delta": 1}' });
  assert.equal(await hud.syncAt(0, 0), "own");
  const g = fakeApi(msgs("응"));
  const st = fakeStore(true, { documents: { a: { title: "아루", metrics: [{ slotId: "affinity.score", value: 90 }] } } });
  st.getIndex = async () => ({ settings: { flow: { on: true } }, affhud: { cha1: { on: true, source: "own" } } });
  assert.equal(await createAffHud(g.api, { store: st, ask: async () => '{"delta": 1}' }).syncAt(0, 0), "own");
});

test("syncAt: 파싱 실패는 기록하지 않음", async () => {
  const { api, chat } = fakeApi(msgs("응"));
  const hud = createAffHud(api, { store: fakeStore(false, null), ask: async () => "잘 모르겠어요", log: () => {} });
  assert.equal(await hud.syncAt(0, 0), "parse-fail");
  assert.equal(chat.scriptstate.$aff, undefined);
});

test("validateHud: 기본 HUD 통과, 로직 훼손·위험 요소 거부", () => {
  const base = hudHtml();
  assert.deepEqual(validateHud(base), { ok: true, errors: [] });
  assert.equal(validateHud(base.replace("{{getvar::aff_d}}", "")).ok, false);
  assert.equal(validateHud(base.replace("<style>", "<script>alert(1)</script><style>")).ok, false);
  assert.equal(validateHud(base.replace("</style>", ".dafx-aff{background:url(https://x.y/a.png)}</style>")).ok, false);
  assert.equal(validateHud(base.replace('class="dafx-aff-bar"', 'class="bar"')).ok, false);
  assert.equal(validateHud(base.replace("clamp(0%,", "calc(")).ok, false);
  assert.equal(validateHud(base.replace(/<summary/, '<summary onclick="x()"')).ok, false);
});
test("extractHud: 코드펜스·앞뒤 설명 제거 / 사용자 CSS 변경은 통과", () => {
  const css = hudHtml().replace("#eee", "#ffd6e8");
  assert.equal(extractHud("```html\n" + css + "\n```"), css);
  assert.equal(extractHud("여기요:\n" + css + "\n끝"), css);
  assert.equal(validateHud(css).ok, true);
});
test("previewDoc: 식을 풀어 샘플로 보여 줌", () => {
  const d = previewDoc(hudHtml());
  assert.ok(!d.includes("{{"));
  assert.match(d, /호감도 148/);
  assert.match(d, /▲ \+3/);
  assert.match(d, /width:clamp\(0%,62(\.\d+)?%,100%\)/);
});
test("design: 검사 실패 시 한 번 다시 부탁, 적용하면 설정에 저장", async () => {
  const { api } = fakeApi(msgs("x"));
  let calls = 0;
  const ch = { chaId: "cha1", name: "아루", backgroundHTML: "" };
  api.getCharacterFromIndex = async () => ch; api.setCharacterToIndex = async (_i, v) => Object.assign(ch, v);
  const store = fakeStore(false, null);
  const good = hudHtml().replace("#eee", "#ffd6e8");
  const hud = createAffHud(api, { store, ask: async () => (++calls === 1 ? "<div>망가진 결과</div>" : good) });
  const r = await hud.design(0, "핑크로");
  assert.equal(calls, 2); assert.equal(r.ok, true);
  await hud.applyDesign(0, r.html);
  assert.ok(ch.backgroundHTML.includes("#ffd6e8"));
  await hud.resetDesign(0);
  assert.ok(!ch.backgroundHTML.includes("#ffd6e8") && hasHud(ch.backgroundHTML));
  await assert.rejects(hud.applyDesign(0, "<div></div>"));
});

test("프롬프트: 자리표시자가 모두 채워지고 기준 메모·프로필이 들어감", () => {
  const m = buildAffMessages({ charName: "아루", userName: "선생", recent: [{ user: true, text: "안녕" }, { user: false, text: "응." }], value: 10, min: -100, max: 300, step: 5, profile: "츤데레", note: "무례하면 -3" });
  const all = m.map((x) => x.content).join("\n");
  assert.ok(!/\{(char|user|value|min|max|step|chat|profile|note)\}/.test(all));
  assert.match(all, /츤데레/); assert.match(all, /무례하면 -3/); assert.match(all, /선생: 안녕/); assert.match(all, /±5/);
  const d = designMessages({ request: "핑크", current: hudHtml(), charName: "아루" }).map((x) => x.content).join("\n");
  assert.ok(!/\{(markA|markB|macros|max|request|current)\}/.test(d));
  assert.match(d, /핑크/); assert.match(d, /DAFX-AFF/);
});
