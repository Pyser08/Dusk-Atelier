// 게이지 서비스: 정의(idx.gauges[chaId]) · 값/이력(folder.gauge) 저장, AI 설계, 분석에 얹기, 채팅 표시용 보기.
import { runAI } from "../engine/runai.js";
import { parseJson } from "../engine/memoryprompt.js";
import { knownPeople } from "../engine/memoryapply.js";
import { headKey, tailKey, matchRecord } from "../engine/lorelog.js";
import { gaugeBoxHtml } from "../engine/gaugeview.js";
import * as G from "../engine/gauge.js";

const DESIGN_RULES = [
  "You design ONE trackable gauge for a roleplay memory system. Return ONE JSON object only:",
  '{"name":"","desc":"","min":0,"max":10,"init":0,"step":3,"measure":"what to look at in each response (<=300 chars)","rule":"how the value moves, with examples (<=300 chars)","update":"how to write the per-person change: integer delta, |delta|<=step, evidence required (<=300 chars)","look":{"hue":0-359,"shape":"orb|ring|bar|ticks","icon":"1 emoji","c1":"#hex gradient start","c2":"#hex gradient end","text":"#hex title color","card":"inline CSS for the card: background, border, border-radius, box-shadow...","fill":"inline CSS for the filled part: box-shadow, filter, border...","track":"inline CSS for the empty track"}}',
  "Keep the user's name and description. Pick a range that fits (small integer scale 0-10 or 0-100). The gauge applies to individual people; no formulas that reference other gauges. Design the look yourself so it is original, vivid and fits the meaning (mood, element, season...). `card`/`fill`/`track` are semicolon-separated CSS declarations only (allowed: background, border, border-radius, box-shadow, text-shadow, filter, opacity, outline, clip-path polygon, padding); no url(), var(), or comments. Use dark translucent cards so text stays readable."
].join("\n");

export function createGaugeService(api, { store, log = () => {}, call = null } = {}) {
  const run = call ?? ((msgs, pick, signal) => runAI(api, msgs, pick, signal));
  const gx = (idx, chaId) => idx.gauges?.[chaId] ?? { defs: [], sug: G.newSuggestState(), chats: {} };
  const ensure = (idx, chaId) => { idx.gauges ??= {}; const g = (idx.gauges[chaId] ??= { defs: [], sug: G.newSuggestState(), chats: {} }); g.sug ??= G.newSuggestState(); g.chats ??= {}; return g; };

  const getDefs = async (chaId) => gx(await store.getIndex(), chaId).defs;
  const getSuggest = async (chaId) => gx(await store.getIndex(), chaId).sug;
  const setDefs = (chaId, fn) => store.updateIndex((idx) => { const g = ensure(idx, chaId); g.defs = fn(g.defs) ?? g.defs; view = null; return g.defs; });

  async function addDef(chaId, raw) {
    return setDefs(chaId, (defs) => {
      if (defs.length >= 30) throw new Error("게이지는 봇마다 30개까지 만들 수 있어요.");
      const d = G.normalizeDef(raw);
      if (G.isDuplicateName(defs, d.name)) throw new Error("비슷한 이름의 게이지가 이미 있어요.");
      return [...defs, d];
    });
  }
  const updateDef = (chaId, id, raw) => setDefs(chaId, (defs) => {
    const old = defs.find((d) => d.id === id); if (!old) throw new Error("게이지를 찾을 수 없어요.");
    const d = G.normalizeDef({ ...old, ...raw }, { id });
    if (G.isDuplicateName(defs, d.name, id)) throw new Error("비슷한 이름의 게이지가 이미 있어요.");
    return defs.map((x) => x.id === id ? d : x);
  });
  async function removeDef(chaId, id) {
    const chats = Object.keys(gx(await store.getIndex(), chaId).chats);
    await setDefs(chaId, (defs) => defs.filter((d) => d.id !== id));
    for (const chatId of chats) await store.updateFolder(chaId, chatId, (f) => { G.removeFromFolder(f, id); }).catch(() => {});
    view = null;
  }

  // AI가 이름+설명으로 설계 → 검증 → (저장 안 함) 초안 반환
  async function design({ bot = "", name, desc }, model, signal) {
    const n = String(name ?? "").trim(); if (!n) throw new Error("게이지 이름을 적어 주세요.");
    const msgs = [{ role: "system", content: DESIGN_RULES }, { role: "user", content: JSON.stringify({ bot: String(bot).slice(0, 120), name: n.slice(0, 24), desc: String(desc ?? "").slice(0, 200) }) }];
    let raw = await run(msgs, model, signal), obj;
    try { obj = parseJson(raw); } catch {
      raw = await run([...msgs, { role: "assistant", content: String(raw ?? "").slice(0, 2000) }, { role: "user", content: "Return only the JSON object." }], model, signal);
      obj = parseJson(raw);
    }
    return G.validateDesign(obj, { name: n, desc });
  }

  // ── 분석에 얹기 ───────────────────────────────
  // 반환: null(얹을 것 없음) | { input:{gauges,suggestGauge}, due }
  function prepare(idx, existing, chaId, ordinal) {
    const { defs, sug } = gx(idx, chaId);
    const st = existing?.gauge, run0 = Math.min(st?.run ?? 0, ordinal);
    if (ordinal - run0 < G.EVERY_TURNS) return null;
    const known = existing ? knownPeople(existing, 60).map((p) => p.name) : [];
    const gauges = G.gaugesForPrompt(existing ?? {}, defs, known);
    const suggestGauge = G.canSuggest(sug);
    if (!gauges.length && !suggestGauge) return null;
    return { input: { ...(gauges.length ? { gauges } : {}), ...(suggestGauge ? { suggestGauge: true } : {}) }, due: true };
  }
  // updateFolder 안에서 부른다. 반환: 새로 생긴 제안 후보(없으면 null)
  function apply(folder, idx, chaId, result, anchor, { ordinal, text }) {
    const { defs } = gx(idx, chaId);
    const known = knownPeople(folder, 60).map((p) => p.name);
    const head = headKey(text), tail = tailKey(text);
    const r = G.applyGauge(folder, defs, result?.gauge, anchor, { known, head, tail, ordinal });
    if (r.bundle) {
      const touched = new Set(r.bundle.items.map((i) => i.g));
      const snap = [];
      for (const d of defs.filter((x) => touched.has(x.id))) for (const n of G.targetsOf(d, known)) { if (snap.length < 24) snap.push({ g: d.id, who: n, v: G.valueOf(folder, d, n) }); }
      r.bundle.snap = snap;
    }
    return { idea: result?.gaugeIdea ?? null, bundle: r.bundle };
  }
  async function afterAnalyze(chaId, chatId, out) {
    if (!out) return;
    const { idea, bundle } = out;
    if (!idea && !bundle) return;
    await store.updateIndex((idx) => {
      const g = ensure(idx, chaId); g.chats[chatId] = 1;
      if (idea) G.addSuggestion(g.sug, idea, g.defs);
    });
    view = null;
  }
  const resolveSuggestion = (chaId, id, action) => store.updateIndex((idx) => G.resolveSuggestion(ensure(idx, chaId).sug, id, action));
  const setSuggestOn = (chaId, on) => store.updateIndex((idx) => { ensure(idx, chaId).sug.on = !!on; });

  // 수락: 설계를 받아 모든 인물용 게이지로 만든다(꺼진 채 초안은 호출 쪽에서 확인 뒤 addDef)
  const acceptSuggestion = async (chaId, id, model, bot) => {
    const sug = await getSuggest(chaId), x = sug.list.find((s) => s.id === id); if (!x) throw new Error("제안을 찾을 수 없어요.");
    const d = await design({ bot, name: x.name, desc: x.desc }, model);
    await addDef(chaId, { ...d, on: true, src: "suggest", targets: "all" });
    await resolveSuggestion(chaId, id, "accept");
  };

  // ── 채팅 표시용 보기 ──────────────────────────
  let view = null;   // {entries, defs}
  async function ensureView() {
    if (view) return view;
    const idx = await store.getIndex(), entries = [], defs = [];
    for (const [chaId, g] of Object.entries(idx.gauges ?? {})) {
      defs.push(...g.defs);
      for (const chatId of Object.keys(g.chats ?? {})) {
        const f = await store.getFolder(chaId, chatId);
        for (const b of f?.gauge?.log ?? []) if (b.head && b.snap?.length) entries.push({ head: b.head, tail: b.tail, snap: b.snap, items: b.items });
      }
    }
    return view = { entries: entries.slice(-300), defs };
  }
  const invalidate = () => { view = null; };
  async function onDisplay(text) {
    try {
      if (typeof text !== "string" || text.includes('x-dusk="gauge"')) return text;
      const v = await ensureView();   // 메시지마다 불리므로 저장소는 처음 한 번만 읽는다(캐시). 게이지가 없으면 바로 돌려준다
      if (!v.defs.length) return text;
      const r = matchRecord(v.entries, text);
      return r ? text + gaugeBoxHtml(r, v.defs) : text;
    } catch { return text; }
  }

  // 되돌리기 / 직접 수정 (채팅 폴더 기준)
  async function undo(chaId, chatId) {
    const defs = await getDefs(chaId); let res = null;
    await store.updateFolder(chaId, chatId, (f) => { res = G.undoLast(f, defs); });
    view = null; return res;
  }
  async function setValue(chaId, chatId, defId, person, value) {
    const def = (await getDefs(chaId)).find((d) => d.id === defId); if (!def) throw new Error("게이지를 찾을 수 없어요.");
    await store.updateFolder(chaId, chatId, (f) => { G.manualSet(f, def, person, value); });
  }
  return { getDefs, getSuggest, addDef, updateDef, removeDef, design, prepare, apply, afterAnalyze, resolveSuggestion, setSuggestOn, acceptSuggestion, onDisplay, invalidate, undo, setValue };
}
