// v1.6.4 4단계 — 턴 흐름 시험: 가짜 리스 api + 가짜 모델로 "요청 직전 → 응답 뒤 기록하기"를 실제 리수폿 컨트롤러째 돌린다.
// 예제는 블루 아카이브(샬레 예산 회의): 유우카·호시노·노아.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createMemory } from "../src/data/memory.js";
import { createMemoryStoreV3 } from "../src/data/memorystore3.js";
import { personKey } from "../src/data/memorystore.js";
import { createPotStorage, scopeIdsOf } from "../src/data/potstorage.js";
import { stageOf, promptKeysOf } from "../src/data/memoryturn.js";
import { SECTION_MARK } from "../src/engine/duskwriter.js";

const LIB = JSON.parse(fs.readFileSync(new URL("../src/data/pot/prompts.json", import.meta.url), "utf8"));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await wait(15); } return false; };

// 장면 대본: 문자열 표식 [T1]… 이 AI 글에 들어 있고, 가짜 모델이 그 표식을 보고 답한다.
const PAD = " 샬레 사무실에는 비 오는 소리가 낮게 깔려 있었고, 서류 넘기는 소리만이 이어졌다. 선생님은 조용히 상황을 지켜보았다.";
const SCRIPT = {
  T1: { text: "[T1] 유우카가 예산 장부에서 누락된 항목을 발견하고 호시노에게는 말하지 않기로 결심했다." + PAD, doc: { key: "yuuka", title: "하야세 유우카", aliases: ["유우카"], text: "밀레니엄 세미나 회계. 샬레 예산 장부의 누락을 발견함." },
    dusk: { people: [{ name: "하야세 유우카", act: "장부 누락을 발견하고 호시노에게 말하지 않기로 함", p: 3, s: 3, r: 2, know: ["유우카"] }], scene: { sum: "비 오는 샬레, 예산 회의", facts: ["장부 누락"], place: "샬레", who: ["유우카", "선생님"], changed: true },
      open: { add: [{ text: "장부 누락의 진짜 원인", kind: "question", who: ["유우카"] }], close: [] } } },
  T2: { text: "[T2] 호시노는 옥상에서 낮잠을 자다 선생님의 발소리에 눈을 떴다." + PAD, doc: { key: "hoshino", title: "타카나시 호시노", aliases: ["호시노"], text: "아비도스 대책위원회 소속. 낮잠을 즐김." },
    dusk: { people: [{ name: "타카나시 호시노", act: "옥상에서 낮잠을 자다 깨어남", p: 1, s: 1, r: 1 }], scene: { sum: "옥상의 호시노", facts: [], place: "옥상", who: ["호시노", "선생님"], changed: true } } },
  T3: { text: "[T3] 유우카는 끝내 장부 이야기를 꺼내지 못하고 커피만 내려놓았다." + PAD, dusk: { people: [{ name: "하야세 유우카", act: "장부 이야기를 꺼내지 못하고 커피만 내려놓음", p: 1, s: 1, r: 1 }], scene: null } },
  T4: { text: "[T4] 노아가 조용히 문을 열고 들어와 유우카의 안색을 살폈다." + PAD, doc: { key: "noa", title: "이치죠 노아", aliases: ["노아"], text: "유우카의 동료. 눈치가 빠름." },
    dusk: { people: [{ name: "이치죠 노아", act: "유우카의 안색을 살피며 걱정함", p: 1, s: 2, r: 1 }], scene: { sum: "사무실에 노아가 합류", facts: [], place: "샬레", who: ["유우카", "노아"], changed: true }, rel: [{ from: "노아", to: "유우카", d: "걱정이 깊어짐", dir: "+" }] } },
  T5: { text: "[T5] 노아는 아무것도 묻지 않고 유우카 옆자리에 앉았다." + PAD, dusk: { people: [], scene: null } },
  T6: { text: "[T6] 호시노가 사무실에 들러 간식을 찾으며 서성였다." + PAD, dusk: { people: [{ name: "타카나시 호시노", act: "간식을 찾아 사무실을 서성임", p: 1, s: 1, r: 1 }], scene: { sum: "호시노가 사무실에 들름", facts: [], place: "샬레", who: ["호시노", "유우카"], changed: true } } },
  T7: { text: "[T7] 유우카는 장부를 서랍 깊숙이 넣고 열쇠를 잠갔다." + PAD, dusk: { people: [{ name: "하야세 유우카", act: "장부를 서랍에 넣고 잠금", p: 2, s: 2, r: 1, know: ["유우카", "노아"] }], scene: null } },
  T8: { text: "[T8] 비가 그치고 구름 사이로 저녁 빛이 스며들었다." + PAD, dusk: { people: [], scene: null } },
  T9: { text: "[T9] 노아가 유우카에게 차 한 잔을 건네며 말없이 곁을 지켰다." + PAD, dusk: { people: [{ name: "이치죠 노아", act: "유우카에게 차를 건네며 곁을 지킴", p: 1, s: 2, r: 1 }], scene: null } },
  T11: { text: "[T11] 유우카는 장부 누락을 발견했지만 끝내 입을 열지 못하고 커피만 내려놓았다." + PAD, doc: { key: "yuuka", title: "하야세 유우카", aliases: ["유우카"], text: "밀레니엄 세미나 회계. 샬레 예산 장부의 누락을 발견함." }, dusk: { people: [{ name: "하야세 유우카", act: "장부 누락을 알고도 말을 못 하고 커피만 내려놓음", p: 2, s: 2, r: 1 }], scene: null } },
  T10: { text: "[T10] 선생님이 유우카에게 내일 다시 이야기하자고 말했다." + PAD, dusk: { people: [{ name: "하야세 유우카", act: "선생님과 내일 이야기하기로 약속함", p: 2, s: 2, r: 1 }], scene: null, open: { add: [{ text: "선생님과 내일 장부 이야기를 하기로 함", kind: "promise", who: ["유우카", "선생님"] }], close: [] } } }
};

function harness({ model = {} } = {}) {
  const m = new Map(), hooks = {}, calls = [];
  const chat = { id: "t1", name: "예산 회의", message: [] };
  const character = { chaId: "ba", name: "샬레", chats: [chat] };
  const known = new Set(); // 이미 위키에 만든 문서
  const key = (prompt) => /\[T(\d+)\]/.exec(prompt.split("# Current Writer Run Data")[1] ?? prompt)?.[0]?.slice(1, -1);
  const api = {
    pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] },
    getCurrentCharacterIndex: async () => 0, getCurrentChatIndex: async () => 0, getCharacter: async () => character,
    getCharacterFromIndex: async () => character, getChatFromIndex: async () => chat, setChatToIndex: async (_c, _t, nc) => { Object.assign(chat, nc); },
    addRisuScriptHandler: async (n, f) => { hooks[n] = f; }, addRisuReplacer: async (n, f) => { hooks["r:" + n] = f; }, removeRisuReplacer: async (n, f) => { if (hooks["r:" + n] === f) delete hooks["r:" + n]; },
    addRisuChatListener: async (n, f) => { hooks["c:" + n] = f; }, removeRisuChatListener: async (n, f) => { if (hooks["c:" + n] === f) delete hooks["c:" + n]; },
    requestPluginPermission: async () => true,
    runLLMModel: async (opts) => {
      const prompt = opts.messages.map((x) => x.content).join("\n");
      const kind = /Writer output guide/.test(prompt) ? "writer" : /Router v1 Output Contract/.test(prompt) ? "router" : /Director/.test(prompt) && /"pass"|Director/.test(prompt) && !/private memory recorder/.test(prompt) ? "director" : /private memory recorder/.test(prompt) ? "dusk" : "other";
      const rec = { kind, prompt, turn: key(prompt) }; calls.push(rec);
      if (model[kind]) { const r = await model[kind](rec); if (r !== undefined) return r; }
      const s = SCRIPT[rec.turn];
      if (kind === "writer") {
        const ref = /"request_ref":"(req:[^"]+)"/.exec(prompt)[1], docs = [], run0 = prompt.split("# Current Writer Run Data")[1] ?? prompt;
        if (s?.doc && !run0.includes(`"title":"${s.doc.title}"`)) { docs.push({ document_ref: "new:" + s.doc.key, operation: "create", type: "character", title: s.doc.title, aliases_add: s.doc.aliases, aliases_remove: [], tags_add: [], tags_remove: [], event_context: null, entries: [{ operation: "upsert", entry_ref: null, slot_id: "core.identity", target_refs: [], context_key: null, label: "기본정보", assertion: "fact", text: s.doc.text, evidence_refs: ["source:rp"], links: [], reason: "RP에서 처음 등장한 인물" }] }); }
        // 계약대로: 검토 대상으로 준 기존 문서(doc:…)마다 "변화 없음"을 남긴다.
        const run = prompt.split("# Current Writer Run Data")[1] ?? prompt, refs = [...new Set([...run.matchAll(/"(doc:[a-z0-9]+)"/g)].map((x) => x[1]))];
        const issues = refs.map((r) => ({ code: "no_canonical_change", document_ref: r, detail: "변화 없음" }));
        if (!docs.length && !refs.length) issues.push({ code: "no_canonical_change", document_ref: null, detail: "변화 없음" });
        const body = { schema_version: 1, request_ref: ref, documents: docs, metric_ops: [], people_ops: [], issues };
        if (prompt.includes(SECTION_MARK) && s?.dusk) body.dusk = s.dusk;
        return JSON.stringify(body);
      }
      if (kind === "dusk") return JSON.stringify(SCRIPT[/\[T(\d+)\]/.exec(prompt)?.[0]?.slice(1, -1)]?.dusk ?? { people: [], scene: null });
      return "{}";
    }
  };
  const mem = createMemory(api, { potLibrary: LIB });
  const say = async (user, turnKey, { requestOnly = false } = {}) => {
    chat.message.push({ role: "user", data: user, chatId: "u" + chat.message.length });
    const req = [{ role: "system", content: "샬레 세계관" }, ...chat.message.slice(-7).map((x) => ({ role: x.role === "char" ? "assistant" : "user", content: x.data }))];  // 실제 리스 요청처럼 최근 대화가 같이 들어간다
    const out = await hooks["r:beforeRequest"](req, "model");
    if (requestOnly) return { out };
    const text = SCRIPT[turnKey].text, idx = chat.message.length;
    chat.message.push({ role: "char", data: text, chatId: "a" + idx });
    hooks["c:output"]?.({ characterIndex: 0, chatIndex: 0, messageIndex: idx, chat: structuredClone(chat), char: character });
    hooks.output?.(text);
    const done = await until(async () => mem.runner.session().tick?.at_msg === idx && mem.runner.session().tick?.result && !mem.flow.runtime()?.auto.scopeBusy("0:0") && !mem.flow.runtime()?.auto.processingKeys.size);
    assert.ok(done, `${turnKey} 처리가 끝나지 않음: ${JSON.stringify(mem.runner.session().tick)}`);
    return { out, idx };
  };
  const folder = () => mem.store.getFolder("ba", "t1");
  return { api, chat, hooks, calls, mem, say, folder, m };
}
const turnOn = async (h, mode = "fast") => {
  await h.mem.store.updateIndex((i) => { i.settings.flow.on = true; i.settings.flow.mode = mode; i.settings.confirm = "now"; i.settings.debounceSec = 0.05; i.settings.minChars = 10; });
  assert.equal(await h.mem.start(), "local");
  assert.equal(h.mem.flow.isOn(), true);
};
const systemTexts = (out) => out.filter((x) => x.role === "system").map((x) => String(x.content));

test("흐름이 꺼져 있으면(기본) 기존 v1.6.2 경로 그대로: 훅 2개, 위키 없음", async () => {
  const h = harness();
  assert.equal(await h.mem.start(), "local");
  assert.equal(h.mem.flow.isOn(), false);
  assert.ok(h.hooks.output && h.hooks["r:beforeRequest"]);
  assert.equal(h.hooks["c:output"], undefined);
});

test("켜면 요청 직전 훅은 하나(이중 주입 방지)이고 출력 훅 두 개가 붙음", async () => {
  const h = harness(); await turnOn(h);
  assert.ok(h.hooks["r:beforeRequest"] && h.hooks["c:output"] && h.hooks.output);
  await h.mem.flow.stop();
  assert.equal(h.mem.flow.isOn(), false);
  assert.equal(h.hooks["c:output"], undefined, "리수폿 출력 훅이 내려감");
  assert.ok(h.hooks["r:beforeRequest"], "Dusk 주입 훅이 다시 올라감");
});

test("빠른 모드 10턴: 응답마다 모델 호출 1회(기록하기+Dusk 구획 합침), 위키와 Dusk 기록이 같이 쌓임", async () => {
  const h = harness(); await turnOn(h);
  for (let n = 1; n <= 10; n++) await h.say(n === 6 ? "호시노는 뭐 하고 있어?" : `계속하자 (${n})`, "T" + n);
  const kinds = h.calls.map((c) => c.kind);
  assert.equal(kinds.filter((k) => k === "dusk").length, 0, "따로 호출하는 Dusk 분석이 없어야 함");
  assert.equal(kinds.filter((k) => k === "writer").length, 10, "응답마다 기록하기 1회");
  assert.equal(h.calls.length, 10, "빠른 모드는 응답 뒤 호출 1회뿐(고르기·정리 노트 없음)");
  assert.ok(h.calls.every((c) => c.prompt.includes(SECTION_MARK)), "모든 기록하기에 Dusk 구획이 실림: " + h.calls.map((c) => c.turn + ":" + c.prompt.includes(SECTION_MARK)).join(" "));
  const f = await h.folder();
  assert.deepEqual(Object.values(f.wiki.documents).map((d) => d.title).sort(), ["이치죠 노아", "타카나시 호시노", "하야세 유우카"]);
  assert.ok(f.people[personKey("하야세 유우카")].records.length >= 3);
  assert.equal(f.people[personKey("이치죠 노아")].records.length, 2);
  assert.ok(f.scenes.length >= 4);
  assert.ok(f.open.some((o) => /장부 누락/.test(o.text)) && f.open.some((o) => o.kind === "promise"));
  assert.ok(Object.keys(f.rels).length >= 1);
  assert.equal(h.mem.runner.session().combined, 10, "러너가 합쳐진 결과를 10번 썼다");
  assert.equal(h.mem.runner.session().calls, 0);
});

test("요청 직전: 위키 참고와 [Dusk Memory] 블록이 한 번씩, 고른 인물은 장면에 없어도 블록에 들어감", async () => {
  const h = harness(); await turnOn(h);
  for (let n = 1; n <= 5; n++) await h.say(`계속하자 (${n})`, "T" + n);
  const { out } = await h.say("유우카, 장부 얘기 좀 해 봐.", "T6", { requestOnly: true });
  const sys = systemTexts(out);
  assert.equal(sys.filter((t) => t.startsWith("[Dusk Memory")).length, 1, "Dusk 블록은 한 번만");
  assert.ok(sys.some((t) => /하야세 유우카/.test(t) && !t.startsWith("[Dusk Memory")), "위키 참고에 유우카가 들어감");
  const block = sys.find((t) => t.startsWith("[Dusk Memory"));
  assert.match(block, /- 하야세 유우카:/, "T5 장면(노아·유우카)과 별개로 고른 인물 기록이 블록에 있음");
  assert.ok(h.mem.flow.last().focus.includes("하야세 유우카"), "고른 인물에 유우카: " + h.mem.flow.last().focus);
});

test("Dusk 구획이 없는 응답이면 기존 방식(따로 한 번 더 호출)으로 대신하고, 위키는 그대로 저장", async () => {
  const h = harness({ model: { writer: (rec) => { const s = SCRIPT[rec.turn], ref = /"request_ref":"(req:[^"]+)"/.exec(rec.prompt)[1]; if (rec.turn !== "T1") return undefined; return JSON.stringify({ schema_version: 1, request_ref: ref, documents: [{ document_ref: "new:yuuka", operation: "create", type: "character", title: s.doc.title, aliases_add: s.doc.aliases, aliases_remove: [], tags_add: [], tags_remove: [], event_context: null, entries: [{ operation: "upsert", entry_ref: null, slot_id: "core.identity", target_refs: [], context_key: null, label: "기본정보", assertion: "fact", text: s.doc.text, evidence_refs: ["source:rp"], links: [], reason: "첫 등장" }] }], metric_ops: [], people_ops: [], issues: [] }); } } });
  await turnOn(h);
  await h.say("시작", "T1");
  const f = await h.folder();
  assert.equal(Object.keys(f.wiki.documents).length, 1);
  assert.equal(h.calls.filter((c) => c.kind === "dusk").length, 1, "Dusk 분석은 따로 1회");
  assert.ok(f.people[personKey("하야세 유우카")], "그래도 Dusk 기록은 남음");
  assert.equal(h.mem.runner.session().combined ?? 0, 0);
});

test("구획 독립: 리수폿 쪽 응답이 틀려도 Dusk 구획이 맞으면 Dusk 기록은 저장됨", async () => {
  const h = harness({ model: { writer: (rec) => { const s = SCRIPT[rec.turn]; return JSON.stringify({ schema_version: 1, request_ref: "req:wrong", documents: [], metric_ops: [], people_ops: [], issues: [], dusk: s.dusk }); } } });
  await turnOn(h);
  await h.say("시작", "T1");
  const f = await h.folder();
  assert.ok(f.people[personKey("하야세 유우카")], "Dusk 구획은 저장");
  assert.equal(Object.keys(f.wiki?.documents ?? {}).length, 0, "틀린 위키 변경은 반영하지 않음");
  assert.equal(h.calls.filter((c) => c.kind === "dusk").length, 0, "Dusk 쪽은 합친 결과를 썼으므로 따로 호출 안 함");
});

test("Dusk 구획이 깨지면(잘못된 모양) 위키는 저장되고 Dusk는 따로 호출해 채움", async () => {
  const h = harness({ model: { writer: (rec) => { const s = SCRIPT[rec.turn], ref = /"request_ref":"(req:[^"]+)"/.exec(rec.prompt)[1]; if (rec.turn !== "T1") return undefined; return JSON.stringify({ schema_version: 1, request_ref: ref, documents: [{ document_ref: "new:yuuka", operation: "create", type: "character", title: s.doc.title, aliases_add: s.doc.aliases, aliases_remove: [], tags_add: [], tags_remove: [], event_context: null, entries: [{ operation: "upsert", entry_ref: null, slot_id: "core.identity", target_refs: [], context_key: null, label: "기본정보", assertion: "fact", text: s.doc.text, evidence_refs: ["source:rp"], links: [], reason: "첫 등장" }] }], metric_ops: [], people_ops: [], issues: [], dusk: ["이건", "배열"] }); } } });
  await turnOn(h);
  await h.say("시작", "T1");
  const f = await h.folder();
  assert.equal(Object.keys(f.wiki.documents).length, 1);
  assert.equal(h.calls.filter((c) => c.kind === "dusk").length, 1);
  assert.ok(f.people[personKey("하야세 유우카")]);
});

test("리롤: 같은 자리의 응답이 바뀌면 Dusk 기록은 새 글 기준으로 교체되고 위키 문서는 중복되지 않음", async () => {
  const h = harness(); await turnOn(h);
  const { idx } = await h.say("시작", "T1");
  const before = await h.folder();
  assert.equal(before.people[personKey("하야세 유우카")].records.filter((r) => !r.orphan).length, 1);
  // 같은 위치에 다른 응답(리롤): T11 대본(같은 인물이 다시 등장)을 그 자리에 둔다
  const text = SCRIPT.T11.text; h.chat.message[idx] = { role: "char", data: text, chatId: "a-reroll" };
  h.hooks["c:output"]({ characterIndex: 0, chatIndex: 0, messageIndex: idx, chat: structuredClone(h.chat), char: h.api.getCharacter && { chaId: "ba", name: "샬레" } });
  h.hooks.output(text);
  assert.ok(await until(async () => (await h.folder()).cursor?.h !== before.cursor.h && !h.mem.flow.runtime().auto.scopeBusy("0:0") && !h.mem.flow.runtime().auto.processingKeys.size), "리롤 처리가 끝나지 않음");
  const after = await h.folder();
  const live = after.people[personKey("하야세 유우카")].records.filter((r) => !r.orphan);
  assert.equal(live.length, 1, "이전 응답의 기록은 고아로 밀려나고 새 기록 1개만 살아 있음");
  assert.match(live[0].act, /커피/);
  assert.equal(Object.keys(after.wiki.documents).length, 1, "위키 문서가 두 번 만들어지지 않음");
});

test("정확하게 모드: 고르기·정리 노트 호출이 일어나고 정리 노트 입력에 Dusk 회상이 장기기억 참고로 들어감", async () => {
  const h = harness(); await turnOn(h);
  for (let n = 1; n <= 4; n++) await h.say(`계속하자 (${n})`, "T" + n);
  await h.mem.store.updateIndex((i) => { i.settings.flow.mode = "accurate"; });
  await h.mem.flow.apply();
  const before = h.calls.length;
  await h.say("유우카, 아까 그 장부 말이야.", "T5", { requestOnly: true });
  const req = h.calls.slice(before);
  assert.ok(req.some((c) => c.kind === "router"), "고르기 호출");
  const dir = req.find((c) => c.kind === "director");
  assert.ok(dir, "정리 노트 호출");
  assert.match(dir.prompt, /"source":"dusk"/, "정리 노트 입력의 장기기억 참고에 Dusk 회상이 들어감");
  assert.match(dir.prompt, /Key moments: .*장부/);
});

test("프롬프트 라이브러리 키·단계 이름 보조 함수", () => {
  assert.ok(promptKeysOf(LIB).length > 5);
  assert.equal(stageOf("Router"), "router");
  assert.equal(stageOf("Director pass 1"), "director");
  assert.equal(stageOf("Writer batch 1/1"), "writer");
  assert.equal(stageOf(""), "writer");
});

test("저장소 어댑터: 설정·카탈로그·위키는 Dusk v3 저장소로, 나머지는 pluginStorage로", async () => {
  const m = new Map();
  const api = { pluginStorage: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); }, keys: async () => [...m.keys()] } };
  const store = createMemoryStoreV3(api), st = createPotStorage(api, store);
  assert.equal(await st.getItem("risupot.settings"), null);
  await st.setItem("risupot.settings", { schemaVersion: 9, revision: 3, settings: { a: 1 } });
  assert.equal((await store.getIndex()).pot.settings.revision, 3);
  await st.setItem("risupot.wiki.catalog.v1", { revision: 1, scopes: {} });
  assert.equal((await store.getIndex()).pot.catalog.revision, 1);
  const k = `risupot.wiki.v1:${encodeURIComponent("ba")}:${encodeURIComponent("t:1")}`;
  assert.deepEqual(scopeIdsOf(k), ["ba", "t:1"]);
  assert.equal(await st.getItem(k), null);
  await st.removeItem(k);
  assert.equal(await store.getFolder("ba", "t:1"), null, "없던 폴더를 지우려다 새로 만들지 않음");
  await st.setItem(k, { revision: 2, scope: { characterId: "ba", chatKey: "t:1", characterName: "샬레", chatName: "예산" }, documents: { a: { title: "x" } } });
  assert.equal((await store.getFolder("ba", "t:1")).botName, "샬레");
  assert.equal((await st.getItem(k)).revision, 2);
  assert.ok((await st.keys()).includes(k));
  await st.setItem("risupot.trace.x", { a: 1 });
  assert.deepEqual(m.get("risupot.trace.x"), { a: 1 }, "그 밖의 키는 그대로 pluginStorage");
  await st.removeItem(k);
  assert.equal((await st.getItem(k)), null);
  assert.ok(!(await st.keys()).includes(k));
});

test("리스 기본 메모리(Hypa) 참고는 흐름을 켜면 항상 꺼진다 — Dusk 장기기억이 대신함", async () => {
  const h = harness();
  await turnOn(h);
  const snap = (await h.mem.flow.settings()).rawSnapshot();
  assert.equal(snap.hypaReferenceEnabled, false);
  assert.equal(snap.hypaPlusReferenceEnabled, false);
});

test("다음 입력 때 확정(기본): 응답 직후엔 기록하지 않고, 리롤은 건드리지 않으며, 다음 말을 보낼 때 직전 응답을 기록", async () => {
  const h = harness();
  await h.mem.store.updateIndex((i) => { i.settings.flow.on = true; i.settings.flow.mode = "fast"; i.settings.debounceSec = 0.05; i.settings.minChars = 10; });  // confirm은 기본(next)
  assert.equal(await h.mem.start(), "local");
  const request = (user) => { h.chat.message.push({ role: "user", data: user, chatId: "u" + h.chat.message.length }); return h.hooks["r:beforeRequest"]([{ role: "system", content: "샬레 세계관" }, { role: "user", content: user }], "model"); };
  const reply = async (text, id) => { const idx = h.chat.message.length; h.chat.message.push({ role: "char", data: text, chatId: id }); h.hooks["c:output"]?.({ characterIndex: 0, chatIndex: 0, messageIndex: idx, chat: structuredClone(h.chat), char: await h.api.getCharacterFromIndex(0) }); h.hooks.output?.(text); return idx; };
  const idle = () => !h.mem.flow.runtime()?.auto.scopeBusy("0:0") && !h.mem.flow.runtime()?.auto.processingKeys.size;
  await request("시작하자");
  const i1 = await reply(SCRIPT.T1.text, "a1");
  await wait(400);
  assert.equal(h.calls.length, 0, "응답 직후에는 기록하지 않는다");
  await request("계속하자");  // 두 번째 입력 → T1 확정
  assert.ok(await until(async () => (await h.folder())?.cursor?.at === i1 && idle()), "T1이 확정돼 기록돼야 함: " + JSON.stringify(h.mem.runner.session().tick));
  assert.equal(h.calls.filter((c) => c.kind === "writer").length, 1);
  assert.equal(h.calls.filter((c) => c.kind === "dusk").length, 0, "기록하기 호출에 Dusk 구획이 실려 따로 부르지 않는다");
  await reply(SCRIPT.T2.text, "a2"); h.chat.message.pop(); const i3 = await reply(SCRIPT.T3.text, "a3");  // 리롤
  await wait(400);
  assert.equal(h.calls.length, 1, "리롤되는 응답은 기록하지 않는다");
  await request("그다음은?");
  assert.ok(await until(async () => (await h.folder())?.cursor?.at === i3 && idle()), "리롤된 최종 응답이 확정돼 기록돼야 함: " + JSON.stringify(h.mem.runner.session().tick));
  assert.equal(h.calls.filter((c) => c.kind === "writer").length, 2);
  const f = await h.folder();
  assert.equal(Object.values(f.wiki.documents).filter((d) => d.title === "하야세 유우카").length, 1, "문서가 중복되지 않는다");
});

test("화면이 저장소에 직접 쓴 위키 문서(위키 없는 인물 만들기)가 런타임 위키 사본에 곧 반영된다", async () => {
  const { createBlankPerson } = await import("../src/engine/wikiedit.js");
  const h = harness(); await turnOn(h);
  await h.say("계속하자 (1)", "T1");
  const rt = () => h.mem.flow.runtime();
  const titles = () => Object.values(rt().wiki.snapshot().documents).map((d) => d.title);
  assert.ok(!titles().includes("새 인물"));
  let notified = 0; h.mem.store.onWikiWritten(() => { notified++; });
  await h.mem.store.updateFolder("ba", "t1", (f) => { f.wiki = createBlankPerson(f.wiki, "새 인물"); });  // 인물 위키 화면의 commit과 같은 경로
  assert.equal(notified, 1, "화면의 직접 쓰기는 알린다");
  assert.ok(await until(async () => titles().includes("새 인물")), "런타임 사본이 방금 만든 문서를 알아야 한다: " + titles().join(","));
  const before = notified;
  await h.say("계속하자 (2)", "T2");  // 런타임 자신의 저장(자동 기록)은 알리지 않는다
  assert.equal(notified, before, "런타임이 자기 사본을 저장할 땐 알리지 않는다");
});
