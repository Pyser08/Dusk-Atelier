// 2.2.6: 게이지 배수(gaugemult)·애인 판정(lover)·호감 분리·관계도 이전 턴(folderAt)·Erosync 선호 글자 풀기·출발값 자동 만들기
import test from "node:test";
import assert from "node:assert/strict";
import { scaleDelta, scaleTarget, normalizeGauge, isDefaultGauge } from "../src/engine/gaugemult.js";
import { isLoverKind, loverPairs, isLover, setLover } from "../src/engine/lover.js";
import { applyEmo, EMO_LABEL, tagsFor } from "../src/engine/memoryemo.js";
import { parseTurnReply } from "../src/erosync/turnupdate.js";
import { buildRelMap, folderAt, relmapTurns } from "../src/engine/relmap.js";
import { fromStage2 } from "../src/engine/memorylines.js";
import { prefItem } from "../src/ui/screens/memory/erosyncwiki.js";
import { createErosyncTurn, normalizeTurnSettings } from "../src/data/erosyncturn.js";

test("게이지 배수: 기본은 그대로, 0배는 멈춤, 작은 배수에도 1칸은 남는다", () => {
  assert.deepEqual(normalizeGauge(null), { up: 1, down: 1 });
  assert.equal(isDefaultGauge({}), true);
  assert.equal(scaleDelta(2, null), 2);
  assert.equal(scaleDelta(2, { up: 2 }), 4);
  assert.equal(scaleDelta(-2, { up: 2, down: 0.5 }), -1);
  assert.equal(scaleDelta(1, { up: 0.3 }), 1);
  assert.equal(scaleDelta(3, { up: 0 }), 0);
  assert.equal(scaleDelta(3, { up: 3 }, { max: 3 }), 3);
  assert.deepEqual(normalizeGauge({ up: 9, down: -1 }), { up: 3, down: 0 });
  assert.equal(scaleTarget(50, 60, { up: 0.5 }), 55);
  assert.equal(scaleTarget(50, 40, { down: 2 }), 30);
});

test("애인 판정: 연인·배우자처럼 명확한 말만, 짝사랑·전 애인은 아니다", () => {
  for (const k of ["girlfriend", "여자친구", "연인", "아내", "약혼자", "남친"]) assert.equal(isLoverKind(k), true, k);
  for (const k of ["ex-girlfriend", "전 여자친구", "전남친", "짝사랑 상대", "썸", "친구", "가짜 연인", "wants to be girlfriend", "boss"]) assert.equal(isLoverKind(k), false, k);
  const f = { ties: { "a>b": { a: "민지", b: "{{user}}", kind: "girlfriend", at: 3 }, "c>d": { a: "유나", b: "민지", kind: "rival", at: 2 } } };
  assert.equal(isLover(f, "{{user}}", "민지"), true);
  assert.equal(isLover(f, "유나", "민지"), false);
  setLover(f, "민지", "{{user}}", false);
  assert.equal(isLover(f, "민지", "{{user}}"), false);
  setLover(f, "민지", "{{user}}", null);
  setLover(f, "유나", "민지", true);
  assert.equal(loverPairs(f).length, 2);
});

test("호감 분리 + 소유욕·독점욕은 애인일 때만 움직인다, 배수도 적용", () => {
  assert.equal(EMO_LABEL.affection, "인간적 호감");
  assert.equal(EMO_LABEL.attraction, "이성적 호감");
  assert.equal(tagsFor(false).includes("possess"), false);
  assert.equal(tagsFor(true).includes("exclusive"), true);
  const f = { ties: { x: { a: "민지", b: "{{user}}", kind: "연인", at: 1 } } };
  const lover = (a, b) => isLover(f, a, b);
  applyEmo(f, [{ from: "민지", to: "{{user}}", t: { possess: 2, attraction: 2 }, why: "질투" }, { from: "유나", to: "{{user}}", t: { possess: 2, affection: 1 }, why: "x" }], { at: 1 }, 1, { isLover: lover, gauge: { up: 0.5 } });
  assert.deepEqual(f.emo["민지>{{user}}"].tags, { possess: 1, attraction: 1 });
  assert.deepEqual(f.emo["유나>{{user}}"].tags, { affection: 1 });
});

test("줄 기록: 고백은 이성적 호감, 질투 행동은 소유욕·독점욕", () => {
  const src = "널 좋아해 진짜로 말이야";
  const r = fromStage2([{ tag: "to", f: ["{{user}}", "warm", "confess", "널 좋아해"] }], "민지", { known: [{ name: "{{user}}" }], source: src });
  assert.ok(r.emo[0].t.attraction >= 2);
  const j = fromStage2([{ tag: "to", f: ["{{user}}", "same", "jealous", "널 좋아해"] }], "민지", { known: [{ name: "{{user}}" }], source: src });
  assert.deepEqual(j.emo[0].t, { possess: 1, exclusive: 1 });
});

test("Erosync 매 턴 계산도 배수를 따른다", () => {
  const t = [{ id: "p1", values: { initiative: 50 } }];
  assert.deepEqual(parseTurnReply({ characters: [{ id: "p1", changes: { initiative: 60 } }] }, t, ["initiative"], { up: 0.5 }).p1.changes, { initiative: 55 });
  assert.equal(parseTurnReply({ characters: [{ id: "p1", changes: { initiative: 60 } }] }, t, ["initiative"], { up: 0 }).p1, undefined);
});

test("관계도 이전 턴: 그 시점 뒤의 기록·관계·감정은 빠진다", () => {
  const f = {
    people: { a: { name: "민지", records: [{ act: "만남", at: 0 }, { act: "고백", at: 4 }] }, b: { name: "유나", records: [{ act: "등장", at: 5 }] } },
    rels: { "민지>유나": { from: "민지", to: "유나", items: [{ d: "싸움", dir: "-", at: 5 }] } },
    emo: { "민지>{{user}}": { from: "민지", to: "{{user}}", tags: { affection: 7 }, log: [{ t: { affection: 3 }, at: 0 }, { t: { affection: 7 }, at: 4 }] } },
    scenes: [{ at: 0, who: ["민지"] }, { at: 4, who: ["민지"] }, { at: 5, who: ["유나"] }]
  };
  assert.deepEqual(relmapTurns(f), [0, 4, 5]);
  const past = folderAt(f, 0);
  assert.equal(past.people.a.records.length, 1);
  assert.equal(past.emo["민지>{{user}}"].tags.affection, 3);
  assert.equal(f.emo["민지>{{user}}"].tags.affection, 7);   // 원본 그대로
  const m = buildRelMap(past);
  assert.deepEqual(m.nodes.map((n) => n.name), ["민지"]);
  assert.equal(buildRelMap(f).nodes.length, 2);
});

test("Erosync 선호: 글자로 저장된 JSON도 이름·좋고 싫음·확신도로 푼다", () => {
  const raw = '{"id":"casual","label":"Casual uncommitted encounters","preference":"preferred","basis":"explicit","confidence":90,"evidence":["x"],"reason":"...[truncated]';
  assert.deepEqual(prefItem(raw), { label: "Casual uncommitted encounters", preference: "preferred", confidence: 90, reason: "" });
  assert.equal(prefItem({ label: "Deep bond", preference: "disliked", confidence: 80 }).preference, "disliked");
  assert.equal(prefItem("간단한 글").label, "간단한 글");
});

test("출발값 자동 만들기: 기본 켜짐, 출발값이 없으면 전체 분석을 한 번만 시작", async () => {
  assert.equal(normalizeTurnSettings({}).autoStart, true);
  const calls = [];
  const store = new Map();
  const api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } };
  const erosync = { on: () => true, isRunning: () => true, read: async () => ({ ok: true, scope: { scopeKey: "s1" }, people: [] }),
    profile: async (op, ...a) => { calls.push([op, ...a]); return op === "status" ? { running: false } : { ok: true }; } };
  const T = createErosyncTurn(api, { erosync });
  await T.onTurn({ key: "k1", people: [{ name: "민지" }], rp: "본문" });
  await T.onTurn({ key: "k2", people: [{ name: "민지" }], rp: "본문" });
  assert.deepEqual(calls.filter((c) => c[0] === "start"), [["start", "full"]]);
  assert.equal(calls.some((c) => c[0] === "turn"), false);
});

test("이성적 감정 관계도: 거리=나에게 끌림, 선=인물끼리 끌림·애인", () => {
  const f = {
    people: { a: { name: "민지", records: [{ act: "x", at: 1 }] }, b: { name: "유나", records: [{ act: "y", at: 1 }] }, c: { name: "철수", records: [{ act: "z", at: 1 }] } },
    emo: { "민지>{{user}}": { from: "민지", to: "{{user}}", tags: { attraction: 8, affection: 2 }, log: [] }, "유나>철수": { from: "유나", to: "철수", tags: { attraction: 5 }, log: [] } },
    ties: { t: { a: "민지", b: "{{user}}", kind: "girlfriend", at: 1 } }, scenes: [{ at: 1, who: [] }]
  };
  const m = buildRelMap(f, { mode: "romance" });
  assert.equal(m.romance, true);
  assert.equal(m.nodes.find((n) => n.name === "민지").aff, 80);
  assert.match(m.nodes.find((n) => n.name === "민지").uLabel, /애인/);
  const e = m.edges.find((x) => x.label === "끌림");
  assert.ok(e && e.sp === 1);
  assert.equal(buildRelMap(f).romance, undefined);
});

import { rollAdult, seedWikiCandidates, DESIRES, KINKS } from "../src/engine/adultseed.js";
import { romanceLines, styleOf } from "../src/engine/romancecue.js";
import { seedErosyncNow, saveSeedOpt } from "../src/data/adultseed.js";
import { buildMessages } from "../src/engine/memoryprompt.js";

test("유저 편향 없애기: {{user}}를 향한 이성적 호감은 반만·두 번 쌓여야·진도 상한 안", () => {
  const f = {};
  const one = (t) => applyEmo(f, [{ from: "민지", to: "{{user}}", t, why: "x" }, { from: "민지", to: "유나", t, why: "x" }], { at: 1 }, 1, { userGuard: true, ceilingOf: () => 5 });
  one({ attraction: 3 });
  assert.equal(f.emo["민지>{{user}}"].tags.attraction, undefined);   // 3 → 반(1) → 약한 신호라 한 번엔 안 움직임
  assert.equal(f.emo["민지>유나"].tags.attraction, 3);                // 인물끼리는 그대로
  one({ attraction: 1 }); assert.equal(f.emo["민지>{{user}}"].tags.attraction, 1);   // 같은 방향 두 번째에 한 칸
  one({ attraction: 3 }); one({ attraction: 3 }); one({ attraction: 3 }); one({ attraction: 3 });
  assert.equal(f.emo["민지>{{user}}"].tags.attraction, 3);
  for (let i = 0; i < 10; i++) one({ attraction: 3 });
  assert.equal(f.emo["민지>{{user}}"].tags.attraction, 5);   // 관계 진도 상한
});

test("기록 지침: 인물끼리 끌림도 적고 {{user}}는 특별하지 않다", () => {
  const sys = buildMessages({ bot: "b", newest: { index: 0, text: "t" } })[0].content;
  assert.match(sys, /ANY two characters/);
  assert.match(sys, /\{\{user\}\} is NOT special/);
});

test("썸 행동 지침: 단계·성격에 따라 다르게, 애인은 따로", () => {
  const f = {
    emo: { a: { from: "민지", to: "{{user}}", tags: { attraction: 7 } }, b: { from: "유나", to: "철수", tags: { attraction: 3 } }, c: { from: "철수", to: "{{user}}", tags: { attraction: 0 } } },
    wiki: { documents: { d1: { title: "민지" } }, people: { profiles: { d1: { axes: { guardedness: 80, relationalInitiative: 20 } } } } }
  };
  const L = romanceLines(f);
  assert.match(L[0], /Slow burn/);
  assert.match(L.find((x) => x.includes("민지")), /charged ambiguity.*denial.*waits/);
  assert.match(L.find((x) => x.includes("유나")), /curious/);
  assert.equal(L.some((x) => x.includes("철수 →")), false);
  f.ties = { t: { a: "민지", b: "{{user}}", kind: "여자친구", at: 1 } };
  assert.match(romanceLines(f).find((x) => x.includes("민지")), /lovers/);
  assert.equal(styleOf(null), "");
});

test("처음 등장 때 성인 항목 무작위: 이름마다 같고, 인물마다 다르고, 켜기 전 인물은 그대로", () => {
  assert.deepEqual(rollAdult("민지"), rollAdult("민지"));
  const names = ["민지", "유나", "서연", "하린", "지우", "예린", "수아", "다은"];
  assert.ok(new Set(names.map((n) => rollAdult(n).desires.join())).size >= 5);
  for (const n of names) { const r = rollAdult(n); assert.ok(r.desires.every((d) => DESIRES.includes(d)) && r.kinks.every((k) => KINKS.includes(k))); assert.ok(Object.values(r.sexual).every((v) => v >= 3 && v <= 97)); }
  const wiki = { documents: { old: { id: "old", type: "Character", title: "옛" }, nw: { id: "nw", type: "Character", title: "새" } },
    people: { profiles: { old: { createdAt: "2026-01-01T00:00:00Z" }, nw: { createdAt: "2026-11-16T00:00:00Z" } }, candidates: {} } };
  const seeded = [];
  assert.deepEqual(seedWikiCandidates(wiki, seeded, { since: Date.parse("2026-06-01") }), ["nw"]);
  const c = Object.values(wiki.people.candidates);
  assert.ok(c.length >= 1 && c.every((x) => x.documentId === "nw" && x.status === "review" && ["sexual_desire", "paraphilia"].includes(x.axis)));
  assert.deepEqual(seedWikiCandidates(wiki, seeded, { since: 1 }), []);   // 한 번만
});

test("Erosync 무작위 출발값: 처음 본 채팅의 기존 인물은 기준, 뒤에 생긴 인물만 넣는다", async () => {
  const store = new Map(), api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } };
  const edits = [], er = { profile: async (op, id, patch) => { edits.push([op, id, patch]); return {}; } };
  const snap = (people) => ({ ok: true, scope: { scopeKey: "s" }, people });
  assert.equal(await seedErosyncNow(api, er, snap([{ id: "p1", name: "민지" }])), 0);   // 꺼져 있음
  await saveSeedOpt(api, true);
  assert.equal(await seedErosyncNow(api, er, snap([{ id: "p1", name: "민지" }])), 0);   // 처음 본 채팅 = 기준
  assert.equal(await seedErosyncNow(api, er, snap([{ id: "p1", name: "민지" }, { id: "p2", name: "유나" }, { id: "p3", name: "고양이", nonPerson: true }])), 1);
  assert.equal(edits[0][0], "edit"); assert.equal(edits[0][1], "p2"); assert.ok(Number.isFinite(edits[0][2].eroticInterest));
});

import { normalizeSeedOpt, poolOf, pickable } from "../src/engine/adultseed.js";
import { normCfg, JEV_PROVIDERS, createJev } from "../src/data/jev.js";

test("무작위 설정: 고를 것 토글·끈 항목·직접 넣은 항목·분류별 묶음", () => {
  const d = normalizeSeedOpt({});
  assert.equal(d.on, false); assert.equal(d.cycle && d.sexual && d.desires && d.kinks, true);
  const o = normalizeSeedOpt({ off: ["연상에게 끌린다"], custom: [{ kind: "desire", cat: "age", text: "동갑에게 끌린다" }, { kind: "kink", cat: "zzz", text: "가죽 옷에 끌린다" }, { kind: "kink", cat: "zzz", text: "가죽 옷에 끌린다" }] });
  assert.equal(o.custom.length, 2);
  const age = poolOf(o, "desire").find((g) => g.id === "age");
  assert.deepEqual(age.on, ["연하를 챙기며 끌린다", "동갑에게 끌린다"]);
  assert.equal(poolOf(o, "kink").at(-1).label, "직접 넣은 항목");
  assert.ok(!pickable(o, "desire").includes("연상에게 끌린다"));
  // 성적 욕망만 끄면 욕망은 비고, 이상성향 결과는 그대로
  const all = rollAdult("민지"), noD = rollAdult("민지", null, { desires: false });
  assert.deepEqual(noD.desires, []); assert.deepEqual(noD.kinks, all.kinks);
  assert.equal(rollAdult("민지", null, { sexual: false }).sexual, null);
  // 한 항목만 켜 두면 그것만 나온다
  const only = normalizeSeedOpt({ off: pickable({}, "desire").filter((t) => t !== "역할극을 좋아한다" && t !== "눈을 맞추는 것만으로 설렌다") });
  for (const n of ["가", "나", "다", "라"]) assert.ok(rollAdult(n, null, only).desires.every((x) => x === "눈을 맞추는 것만으로 설렌다"));
});

test("Erosync 월경: 여성 인물만 월경 추적을 켠다", async () => {
  const store = new Map(), api = { pluginStorage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => { store.set(k, v); } } };
  const edits = [], er = { profile: async (op, id, patch) => { edits.push([id, patch]); return {}; } };
  await saveSeedOpt(api, { on: true, sexual: false });
  await seedErosyncNow(api, er, { ok: true, scope: { scopeKey: "s" }, people: [] });
  await seedErosyncNow(api, er, { ok: true, scope: { scopeKey: "s" }, people: [{ id: "a", name: "민지", gender: "f" }, { id: "b", name: "철수", gender: "m" }] });
  assert.deepEqual(edits, [["a", { cycle: "on" }]]);
});

test("Jev 공급자: 오픈라우터·Vercel, 기본 주소·모델은 공급자 따라, 키는 따로", async () => {
  assert.equal(normCfg({}).provider, "openrouter");
  const v = normCfg({ provider: "vercel", url: JEV_PROVIDERS.openrouter.url, model: JEV_PROVIDERS.openrouter.model });
  assert.equal(v.url, JEV_PROVIDERS.vercel.url); assert.equal(v.model, JEV_PROVIDERS.vercel.model);
  assert.equal(normCfg({ provider: "vercel", model: "my/model" }).model, "my/model");
  const mem = new Map(), local = { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, val) => { mem.set(k, val); } };
  mem.set("dusk.jev.cfg.v1", JSON.stringify({ cfg: { on: true }, key: "sk-or-old" }));   // 예전 저장분
  const calls = [];
  const J = createJev({ getLocalPluginStorage: async () => local, nativeFetch: async (url, o) => { calls.push([url, o.headers.Authorization]); return { ok: true, json: async () => ({ answers: { r0: { score: 3 }, r1: { score: 0 } } }) }; } }, { log: () => {} });
  await J.load(); assert.equal(J.keyValue("openrouter"), "sk-or-old");
  const s = await J.save({ provider: "vercel", key: "vck" });
  assert.equal(s.persisted, true); assert.equal(J.keyValue("openrouter"), "sk-or-old"); assert.equal(J.keyValue(), "vck");
  await J.test();
  assert.deepEqual(calls[0], [JEV_PROVIDERS.vercel.url, "Bearer vck"]);
});

import { attractionCap } from "../src/engine/memoryhuman.js";
import { seedFromTies, tieSeedOf } from "../src/engine/emoseed.js";
import { applyAnalysis } from "../src/engine/memoryapply.js";

test("이성적 호감 상한: 처음 봄 3, 큰 사건은 한 단계 위, 인간적 호감+3, 적대 6↑이면 4, 애인 10", () => {
  const f = { scenes: [] };
  assert.equal(attractionCap(f, "민지", "유나", 0), 3);
  assert.equal(attractionCap(f, "민지", "유나", 0, { big: true }), 5);
  assert.equal(attractionCap(f, "민지", "유나", 0, { big: true, tags: { affection: 1 } }), 4);
  assert.equal(attractionCap(f, "민지", "유나", 0, { big: true, tags: { hostility: 7 } }), 4);
  assert.equal(attractionCap(f, "민지", "유나", 0, { lover: true }), 10);
});

test("첫 만남에 끌림이 마구 오르지 않는다(분석 경로 전체)", () => {
  const f = { people: {}, scenes: [] };
  for (let i = 0; i < 6; i++) applyAnalysis(f, { emo: [{ from: "민지", to: "유나", t: { attraction: 2 }, why: "설렘" }] }, { at: i, h: `h${i}` }, { smooth: true });
  assert.equal(f.emo["민지>유나"].tags.attraction, 3);
});

test("관계로 처음 감정 채우기: 애인·가족·짝사랑·라이벌, 이미 있는 값은 그대로, 한 번만", () => {
  assert.deepEqual(tieSeedOf("여자친구")[1], { affection: 7, attraction: 7, trust: 6 });
  assert.equal(tieSeedOf("형사"), null);
  const f = { ties: { a: { a: "민지", b: "유나", kind: "언니", at: 1 }, b: { a: "철수", b: "민지", kind: "짝사랑", at: 1 }, c: { a: "하린", b: "{{user}}", kind: "girlfriend", at: 1 } },
    emo: { "유나>민지": { from: "유나", to: "민지", tags: { affection: 2 }, log: [] } } };
  seedFromTies(f, { at: 2 });
  assert.deepEqual(f.emo["민지>유나"].tags, { affection: 6, trust: 6 });
  assert.deepEqual(f.emo["유나>민지"].tags, { affection: 2, trust: 6 });
  assert.deepEqual(f.emo["철수>민지"].tags, { attraction: 5, affection: 5 });
  assert.equal(f.emo["민지>철수"], undefined);
  assert.equal(f.emo["하린>{{user}}"].tags.attraction, 7);
  f.emo["민지>유나"].tags.affection = 1;
  assert.equal(seedFromTies(f, { at: 3 }), 0);
  assert.equal(f.emo["민지>유나"].tags.affection, 1);
});
