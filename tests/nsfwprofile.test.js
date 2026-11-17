import test from "node:test";
import assert from "node:assert/strict";
import { normalizeNsfw, applyNsfwReports, nsfwSection, withRolledSexual, prefValue } from "../src/engine/nsfwprofile.js";
import { applyNsfwQueue } from "../src/data/nsfwturn.js";
import { nsfwFrom, NSFW_STAGE1 } from "../src/engine/recorder.js";
import { peopleImportBatchPrompt } from "../src/data/pot/people-import.js";
import { missingNsfw, profileText } from "../src/data/profileseed.js";
import { nsfwGauges } from "../src/ui/screens/memory/nsfwcard.js";

const RAW = { sexual: { eroticInterest: 70, sexualSpontaneity: "40", sexualOpenness: 120, sexualMomentum: 55 }, axes: { initiative: 30, publicOpenness: 20 }, pref: { f: 20, m: 80, x: 0 },
  positions: [{ label: "기승위", preference: "선호", reason: "주도하는 걸 좋아함" }, { label: "공공장소", preference: "disliked" }, { label: "상호 존중", preference: "???" }, { label: "기승위", preference: "preferred" }],
  seduction: { frequency: 60, directness: 80, styles: ["노골적으로 만진다"], typicalSituations: ["둘만 있을 때"] } };

test("정리: 숫자 자르기·선호 값 한국어 허용·중복·모르는 값 버림·끌림 비율", () => {
  const n = normalizeNsfw(RAW);
  assert.deepEqual(n.sexual, { eroticInterest: 70, sexualSpontaneity: 40, sexualOpenness: 100, sexualMomentum: 55 });
  assert.deepEqual(n.positions.map((p) => [p.label, p.preference]), [["기승위", "preferred"], ["공공장소", "disliked"]]);
  assert.deepEqual(n.pref, { f: 20, m: 80, x: 0 });
  assert.deepEqual(n.seduction.situations, ["둘만 있을 때"]);
  assert.equal(normalizeNsfw({}), null);
  assert.equal(prefValue("싫어함"), "disliked");
});

test("턴 반영: taste·sexval만, 같은 값은 그대로, 기록 남김", () => {
  const n = normalizeNsfw(RAW);
  const r = applyNsfwReports(n, [{ kind: "taste", label: "후배위", preference: "preferred", quote: "q" }, { kind: "taste", label: "기승위", preference: "preferred" }, { kind: "sexval", key: "eroticInterest", delta: 15 }, { kind: "sexval", key: "nope", delta: 3 }]);
  assert.deepEqual(r.changed, ["후배위 좋아함", "성적 관심 70→80"]);
  assert.equal(r.nsfw.log.length, 1);
  assert.equal(applyNsfwReports(n, []).nsfw, n);
});

test("기록기 줄: taste·sexval 읽기, {{user}} 무시", () => {
  const r = nsfwFrom("taste|민지|like|샤워실|\"여기서 해\"\nsexval|민지|sexualOpenness|+3|q\ntaste|{{user}}|like|x|q\nwho|민지|웃음", [{ name: "민지" }]);
  assert.deepEqual(r.map((x) => x.kind), ["taste", "sexval"]);
  assert.equal(r[0].label, "샤워실"); assert.equal(r[1].delta, 3);
  assert.match(NSFW_STAGE1, /taste\|Name/);
});

test("폴더 반영: 이름·별칭으로 문서를 찾아 채팅별로 저장, 없던 인물도 새로", () => {
  const f = { wiki: { documents: { d1: { id: "d1", type: "Character", title: "지하연", aliases: ["하연"] } } } };
  const out = applyNsfwQueue(f, [{ kind: "taste", name: "하연", label: "차 안", preference: "preferred" }, { kind: "taste", name: "없는사람", label: "x", preference: "preferred" }]);
  assert.deepEqual(out.map((o) => o.name), ["지하연"]);
  assert.equal(f.nsfw.d1.positions[0].label, "차 안");
});

test("RP 주입: 최근 글에 나온 인물만, 제목 줄 포함", () => {
  const f = { wiki: { documents: { d1: { id: "d1", type: "Character", title: "민지" }, d2: { id: "d2", type: "Character", title: "수아" } } }, nsfw: { d1: normalizeNsfw(RAW), d2: normalizeNsfw(RAW) } };
  const t = nsfwSection(f, "민지가 웃었다");
  assert.match(t, /Sexual profile/); assert.match(t, /민지: 성적 관심 70/); assert.match(t, /좋아함: 기승위/); assert.doesNotMatch(t, /수아/);
  assert.equal(nsfwSection(f, "아무도 없음"), "");
});

test("무작위 성적 수치: 사용자가 고친 값은 덮지 않음", () => {
  const n = normalizeNsfw(RAW);
  assert.equal(withRolledSexual(n, { eroticInterest: 10 }).sexual.eroticInterest, 10);
  assert.equal(withRolledSexual({ ...n, by: "user" }, { eroticInterest: 10 }).sexual.eroticInterest, 70);
});

test("묶음 성격 지시문: nsfw 켜면 사람마다 nsfw 모양·규칙이 붙고, 끄면 없음", () => {
  const on = peopleImportBatchPrompt([{ name: "가", aliases: [], source_refs: ["r"] }], [{ ref: "r", content: "c" }], "req:z", { nsfw: true });
  assert.match(on, /"nsfw":\{"sexual"/); assert.match(on, /kind position/); assert.doesNotMatch(on, /adult character|adult person|adult roleplay/);
  assert.doesNotMatch(peopleImportBatchPrompt([{ name: "가", aliases: [], source_refs: ["r"] }], [{ ref: "r", content: "c" }], "req:z", {}), /"nsfw"/);
});

test("채우기 대상: 성격은 있고 이 채팅 nsfw가 없는 인물만(성적 욕망 꺼둔 인물 제외)", () => {
  const scope = { documents: { a: { id: "a", type: "Character", title: "a" }, b: { id: "b", type: "Character", title: "b" }, c: { id: "c", type: "Character", title: "c" }, d: { id: "d", type: "Character", title: "d" } },
    people: { profiles: { a: {}, b: {}, d: { sexualDesireEnabled: false } } } };
  assert.deepEqual(missingNsfw(scope, { b: {} }).map((x) => x.id), ["a"]);
  assert.match(profileText({ summary: "차분함", sexualDesire: { text: "기승위" } }), /성적 욕망: 기승위/);
});

test("화면 게이지: 겹치는 이름은 긴 쪽만", () => {
  const g = nsfwGauges(normalizeNsfw({ ...RAW, axes: { initiative: 30, publicOpenness: 20, spontaneity: 10 } }));
  const labels = g.map((x) => x.label);
  assert.ok(labels.includes("성적 개방성") && !labels.includes("개방성") && !labels.includes("즉흥성") && labels.includes("주도성"));
});

test("체위 이름 다듬기: 음역·괄호 덧이름을 흔히 쓰는 한국어로", async () => {
  const { cleanPosLabel } = await import("../src/engine/nsfwprofile.js");
  assert.equal(cleanPosLabel("정면(미션어리)"), "정상위");
  assert.equal(cleanPosLabel("카우걸"), "기승위");
  assert.equal(cleanPosLabel("리버스 카우걸"), "역기승위");
  assert.equal(cleanPosLabel("도기 스타일"), "후배위");
  assert.equal(cleanPosLabel("벽에 기대서 (standing against wall)"), "벽에 기대서");
  assert.equal(cleanPosLabel("missionary"), "정상위");
  assert.equal(cleanPosLabel("교실(방과 후)"), "교실");
  assert.equal(cleanPosLabel("기승위"), "기승위");
  assert.equal(normalizeNsfw({ sexual: { eroticInterest: 1 }, positions: [{ label: "정면(미션어리)", preference: "preferred" }, { label: "정상위", preference: "preferred" }] }).positions.length, 1, "다듬은 뒤 같은 이름은 하나로");
});

test("체위·장소·플레이 갈래: 모델이 준 kind, 없으면 이름으로 짐작, 기록기 taste 줄도 갈래를 받는다", async () => {
  const { posKind } = await import("../src/engine/nsfwprofile.js");
  assert.equal(posKind("place", "x"), "place"); assert.equal(posKind("", "후배위"), "position"); assert.equal(posKind("", "샤워실"), "place"); assert.equal(posKind("", "목 애무"), "play");
  const r = nsfwFrom("taste|민지|like|play|눈 가리기|q\ntaste|민지|dislike|차 안|q", [{ name: "민지" }]);
  assert.deepEqual(r.map((x) => [x.label, x.posKind, x.preference]), [["눈 가리기", "play", "preferred"], ["차 안", "", "disliked"]]);
  const n = applyNsfwReports(normalizeNsfw({ sexual: { eroticInterest: 1 } }), r).nsfw;
  assert.deepEqual(n.positions.map((p) => p.kind), ["play", "place"]);
});

test("RP 주입: 위키의 성적 욕망·이상성향 글도 같은 줄에(짧게)", () => {
  const f = { wiki: { documents: { d1: { id: "d1", type: "Character", title: "민지" } }, people: { profiles: { d1: { sexualDesire: { text: "위에서 주도하는 걸 좋아한다" }, paraphilia: { text: "<추정> 노출" } } } } }, nsfw: { d1: normalizeNsfw(RAW) } };
  const t = nsfwSection(f, "민지가 웃었다");
  assert.match(t, /성적 욕망: 위에서 주도하는 걸 좋아한다/); assert.match(t, /이상성향: 노출/); assert.doesNotMatch(t, /추정/);
});

test("플레이 이름은 흔히 쓰는 말로: 펠라티오→펠라치오, 엉덩이 때리기→스팽킹 등(이미 저장된 표현도 화면에서 바로잡힘)", async () => {
  const { cleanPosLabel, posKind } = await import("../src/engine/nsfwprofile.js");
  const cases = [["펠라티오", "펠라치오"], ["펠라치오", "펠라치오"], ["Fellatio", "펠라치오"], ["엉덩이 때리기", "스팽킹"], ["엉덩이 찰싹 때리기", "스팽킹"], ["spanking", "스팽킹"],
    ["손가락", "핑거링"], ["손가락 애무", "핑거링"], ["더러운 말", "더티 토크"], ["질내 사정", "질내사정"], ["정면(미션어리)", "정상위"], ["손가락 빨기", "손가락 빨기"], ["목 애무", "목 애무"]];
  for (const [a, b] of cases) assert.equal(cleanPosLabel(a), b, a);
  for (const t of ["펠라치오", "스팽킹", "핑거링", "더티 토크", "질내사정"]) assert.equal(posKind("", t), "play", t);
  const src = (await import("node:fs")).readFileSync(new URL("../src/engine/nsfwprofile.js", import.meta.url), "utf8");
  assert.ok(src.includes("펠라치오, 손가락") === false && src.includes("펠라치오") && src.includes("스팽킹") && !src.includes("펠라티오, "), "지시문 예시도 흔히 쓰는 말");
});

test("체위·플레이는 한 묶음(체위/플레이), 장소는 따로 — 저장된 갈래는 그대로", async () => {
  const { POS_GROUPS, posGroup } = await import("../src/engine/nsfwprofile.js");
  assert.deepEqual(POS_GROUPS.map((g) => [g.id, g.label, g.kinds]), [["act", "체위/플레이", ["position", "play"]], ["place", "장소", ["place"]]]);
  assert.equal(posGroup("position"), "act"); assert.equal(posGroup("play"), "act"); assert.equal(posGroup("place"), "place");
  const fs = await import("node:fs");
  const ui = fs.readFileSync(new URL("../src/ui/screens/memory/nsfwcard.js", import.meta.url), "utf8");
  assert.ok(ui.includes("POS_GROUPS") && !ui.includes('["position", "place", "play"]'), "카드·고치기 창 모두 두 묶음");
});
