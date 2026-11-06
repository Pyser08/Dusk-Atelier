// 호감도 HUD 프리셋 런타임: 응답이 끝나면 호감도를 채팅 변수($aff…)에 써 둔다.
//  A) 리스폿 흐름이 켜져 있고 위키에 affinity.score가 있으면 그 값을 그대로 복사한다.
//  B) 아니면 자체 보조모델이 이번 응답의 변화량만 판정해 누적한다. (cfg.source === "own"이면 항상 B)
// 설정은 캐릭터별(저장소 인덱스 affhud[chaId]). 배경 HTML에 HUD가 설치된 봇에서만 동작한다.
import { extractMessageText, isUserMessage, hashText, isChatGenerating as isGenerating } from "../engine/chattext.js";
import { runAI } from "../engine/runai.js";
import { pickForStage } from "./modelhub.js";
import { readDb, entriesOf, ops as moduleOps } from "./modules.js";
import { AFF_DEFAULTS, buildAffMessages, clampAff, designMessages, designRetry, extractHud, hasHud, hudHtml, installHud, installHudModule, uninstallHudModule, parseDelta, readPotAffinity, uninstallHud, validateHud } from "../engine/affhud.js";

const sv = (n) => "$" + n;
const num = (v) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) ? n : null; };
const WAIT_MS = 180000;

export function createAffHud(api, { store, link = null, ask = null, log = (...a) => console.log("[Dusk 호감도]", ...a), debounceMs = 5000, retryMs = 2000 } = {}) {
  const askAI = ask ?? (async (messages) => runAI(api, messages, await pickForStage(api, "writer")));
  let timer = null, running = false, dirty = false;

  const getCfg = async (chaId) => ({ on: false, source: "auto", ...AFF_DEFAULTS, ...((await store.getIndex()).affhud?.[chaId] ?? {}) });
  async function setCfg(chaId, patch) {
    await store.updateIndex((i) => { i.affhud ??= {}; i.affhud[chaId] = { ...(i.affhud[chaId] ?? {}), ...patch }; });
  }

  async function install(ci, patch = {}) {
    const ch = await api.getCharacterFromIndex(ci), chaId = String(ch.chaId);
    await setCfg(chaId, { on: true, ...patch });
    const c = await getCfg(chaId);
    await api.setCharacterToIndex(ci, installHud(ch, c));
    return c;
  }

  // AI 디자인 변경: 요청대로 새 HUD를 만든다(적용 전 후보). 검사를 통과하지 못하면 이유를 알려 한 번 고쳐 달라고 다시 부탁한다.
  async function design(ci, request) {
    const ch = await api.getCharacterFromIndex(ci);
    return designFor(String(ch.chaId), ch.name ?? "캐릭터", request);
  }
  async function designFor(key, charName, request) {
    const cfg = await getCfg(key);
    const current = cfg.html || hudHtml();
    let html = extractHud(await askAI(designMessages({ request, current, charName })));
    let v = validateHud(html);
    if (!v.ok) {
      const retry = [...designMessages({ request, current, charName }), { role: "assistant", content: html }, { role: "user", content: designRetry(v.errors) }];
      html = extractHud(await askAI(retry)); v = validateHud(html);
    }
    return { html, ...v };
  }
  async function applyDesign(ci, html) {
    const v = validateHud(html);
    if (!v.ok) throw new Error(v.errors[0]);
    const ch = await api.getCharacterFromIndex(ci);
    await setCfg(String(ch.chaId), { html });
    return install(ci);
  }
  async function resetDesign(ci) {
    const ch = await api.getCharacterFromIndex(ci);
    await setCfg(String(ch.chaId), { html: "" });
    return install(ci);
  }
  async function uninstall(ci) {
    const ch = await api.getCharacterFromIndex(ci);
    await setCfg(String(ch.chaId), { on: false });
    await api.setCharacterToIndex(ci, uninstallHud(ch));
  }

  // ── 모듈 판 (v1.6.9): 설정 키는 "m:<모듈 id>", HUD는 모듈 배경 HTML에 들어간다 ──
  const mkey = (id) => "m:" + id;
  async function getModule(id) {
    const db = await readDb(api, ["modules", "pluginCustomStorage", "enabledModules"]);
    const m = entriesOf(db).find((e) => e.module.id === id)?.module;
    if (!m) throw new Error("모듈을 다시 찾지 못했어요. 새로 고침을 눌러 주세요.");
    return m;
  }
  async function installMod(id, patch = {}) {
    await setCfg(mkey(id), { on: true, ...patch });
    const c = await getCfg(mkey(id)), m = await getModule(id);
    await moduleOps.update(api, id, { backgroundEmbedding: installHudModule(m, c).backgroundEmbedding });
    return c;
  }
  const designMod = (id, request) => designFor(mkey(id), "캐릭터", request);
  async function applyDesignMod(id, html) {
    const v = validateHud(html);
    if (!v.ok) throw new Error(v.errors[0]);
    await setCfg(mkey(id), { html });
    return installMod(id);
  }
  async function resetDesignMod(id) { await setCfg(mkey(id), { html: "" }); return installMod(id); }
  async function uninstallMod(id) {
    await setCfg(mkey(id), { on: false });
    const m = await getModule(id);
    await moduleOps.update(api, id, { backgroundEmbedding: uninstallHudModule(m).backgroundEmbedding });
  }
  // 이 채팅에 쓰이는 HUD 주인: 봇 자신 → 켜진 모듈(전체·봇·채팅 모듈) 순
  async function ownerOf(character, chat) {
    const cfg = await getCfg(String(character.chaId));
    if (cfg.on && hasHud(character.backgroundHTML)) return { cfg };
    const db = await readDb(api, ["modules", "pluginCustomStorage", "enabledModules"]);
    const ids = new Set([...(db.enabledModules ?? []), ...(character.modules ?? []), ...(chat?.modules ?? [])]);
    for (const { module: m } of entriesOf(db)) {
      if (!ids.has(m.id) || !hasHud(m.backgroundEmbedding)) continue;
      const c = await getCfg(mkey(m.id));
      if (c.on) return { cfg: c };
    }
    return null;
  }

  async function writeVars(ci, ti, vars) {
    const chat = await api.getChatFromIndex(ci, ti);  // 가장 최신 채팅을 다시 읽어 변수만 덮는다
    if (!chat) return false;
    chat.scriptstate = { ...(chat.scriptstate ?? {}), ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [sv(k), String(v)])) };
    await api.setChatToIndex(ci, ti, chat);
    return true;
  }

  const lastAi = (msgs) => { for (let i = msgs.length - 1; i >= 0; i--) if (!isUserMessage(msgs[i]) && extractMessageText(msgs[i])) return i; return -1; };

  // 한 번 맞춘다. 반환: "off" | "same" | "pot" | "own" | "parse-fail" | "noai"
  async function syncAt(ci, ti) {
    const character = await api.getCharacterFromIndex(ci), chaId = String(character.chaId);
    const chat = await api.getChatFromIndex(ci, ti), msgs = chat?.message ?? [];
    const owner = await ownerOf(character, chat);
    if (!owner) return "off";
    const cfg = owner.cfg;
    const i = lastAi(msgs);
    if (i < 0) return "noai";
    const ss = chat.scriptstate ?? {}, hash = hashText(extractMessageText(msgs[i]));
    if (ss[sv("aff_h")] === hash) return "same";
    const cur = num(ss[sv("aff")]) ?? cfg.start;
    const idx = await store.getIndex();
    const potOn = idx.settings?.flow?.on === true;

    if (cfg.source !== "own" && potOn) {
      const r = readPotAffinity(await store.getWiki(chaId, String(chat.id ?? ti)), character.name);
      if (r) {
        const min = r.min ?? cfg.min, max = r.max ?? cfg.max, had = ss[sv("aff_h")] !== void 0;
        await writeVars(ci, ti, { aff: r.value, aff_d: had ? r.value - cur : r.delta, aff_min: min, aff_max: max, aff_h: hash, aff_n: i });
        return "pot";
      }
    }
    // B: 같은 자리(i)를 다시 생성했으면 직전에 더하기 전 값에서 다시 계산한다
    const base = String(ss[sv("aff_n")]) === String(i) && num(ss[sv("aff_prev")]) !== null ? num(ss[sv("aff_prev")]) : cur;
    const recent = msgs.slice(Math.max(0, i - 3), i + 1).map((m) => ({ user: isUserMessage(m), text: extractMessageText(m).slice(0, 700) }));
    const text = await askAI(buildAffMessages({ charName: character.name ?? "캐릭터", recent, value: base, min: cfg.min, max: cfg.max, step: cfg.step, profile: [character.desc, character.personality].filter(Boolean).join("\n"), note: cfg.note }));
    const d = parseDelta(text, cfg.step);
    if (d === null) { log("변화량을 읽지 못했어요", String(text).slice(0, 80)); return "parse-fail"; }
    const value = clampAff(base + d, cfg.min, cfg.max);
    await writeVars(ci, ti, { aff: value, aff_d: value - base, aff_min: cfg.min, aff_max: cfg.max, aff_h: hash, aff_n: i, aff_prev: base });
    return "own";
  }

  async function tick(since = Date.now()) {
    if (running) { dirty = true; return; }
    running = true; dirty = false;
    try {
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      if (!(ci >= 0) || !(ti >= 0)) return;
      const character = await api.getCharacterFromIndex(ci);
      if (isGenerating(character)) {
        if (Date.now() - since < WAIT_MS) { running = false; timer = setTimeout(() => tick(since), retryMs); }
        return;
      }
      if (link?.settle) await link.settle(ci, ti).catch(() => {});  // 리스폿 Writer가 끝날 때까지 기다린다
      await syncAt(ci, ti);
    } catch (e) { log("동기화 실패", e?.message ?? e); }
    finally { if (running) running = false; if (dirty) schedule(); }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => tick(), debounceMs); }
  const onOutput = (text) => { schedule(); return text; };  // 본문은 그대로 반환

  async function start() {
    if (typeof api.addRisuScriptHandler !== "function") return false;
    try { await api.addRisuScriptHandler("output", onOutput); return true; } catch (e) { log("출력 훅 등록 실패", e?.message ?? e); return false; }
  }

  return { start, syncAt, tick, install, uninstall, design, applyDesign, resetDesign, getCfg, setCfg, onOutput, getModule, installMod, uninstallMod, designMod, applyDesignMod, resetDesignMod };
}
