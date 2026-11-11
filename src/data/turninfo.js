// 응답 아래 표시 런타임 (1.8.3): ② 주사위 결과 · ③ 모델 호출 정보(+ 화면 구석 상태 칩).
// · 요청 직전(beforeRequest): 시작 시각·모델·입력 토큰(어림)을 '대기 기록'으로 만든다
// · 응답(output): 응답 앞부분 열쇠를 붙여 저장, 첫 글자·마지막 글자 시각으로 시간을 잰다
// · 화면(display): 열쇠가 맞는 응답 아래에 접는 블록을 붙인다 (저장된 채팅은 건드리지 않음)
// RisuBard(bardWiki 있음)에서는 쓰지 않는다. 훅 안에서는 오래 기다리지 않는다(HOST-COMPAT 3-3).
import { headKey, tailKey, matchRecord } from "../engine/lorelog.js";
import { onAux, mergeSide } from "../engine/auxlog.js";
import { parseRollMarks } from "../engine/fairplay.js";
import { estimateTokens, diceHtml, callHtml, fmtSec, fmtTokens, prefixInfo, cacheLine, promptParts } from "../engine/turninfo.js";

export const DICE_SHOW_KEY = "dusk.ui.diceShow";   // 기본 꺼짐
export const CALL_SHOW_KEY = "dusk.ui.callShow";   // 기본 꺼짐
export const CACHE_ALERT_KEY = "dusk.ui.cacheAlert";   // 기본 켜짐
export const TURN_LOG_KEY = "dusk-turn-info";
const MAX_RECS = 100;
const TICK_MAX = 5 * 60e3;
const isOn = (raw) => raw === "on" || raw === true || raw === "true";
export async function loadDiceShow(api) { try { return isOn(await api.pluginStorage.getItem(DICE_SHOW_KEY)); } catch { return false; } }
export async function loadCallShow(api) { try { return isOn(await api.pluginStorage.getItem(CALL_SHOW_KEY)); } catch { return false; } }
export async function loadCacheAlert(api) { try { const v = await api.pluginStorage.getItem(CACHE_ALERT_KEY); return !(v === "off" || v === false || v === "false"); } catch { return true; } }
// 캐시 깨짐 알림 기준: 앞부분이 이 비율보다 적게 같고, 프롬프트가 이만큼은 클 때만(짧은 프롬프트는 캐시 의미가 적다)
export const ALERT_RATIO = 0.5, ALERT_MIN_TOKENS = 1500;
export const isBardHost = (api) => typeof api?.bardWiki?.getDocuments === "function";

const CHIP_CSS = 'position:fixed;left:12px;bottom:84px;z-index:2147483000;max-width:min(92vw,380px);font:12px/1.5 system-ui,sans-serif;background:rgba(24,22,36,.94);color:#e8e4ff;border:1px solid rgba(124,92,240,.5);border-radius:12px;padding:3px 10px;box-shadow:0 4px 16px rgba(0,0,0,.35)';
const KEYFRAMES = "@keyframes dusk-dice-roll{0%{transform:rotate(-220deg) scale(.3);opacity:0}60%{transform:rotate(25deg) scale(1.25);opacity:1}100%{transform:none}}@media (prefers-reduced-motion:reduce){[x-dusk=dice] span{animation:none!important}}";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const textOf = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("\n") : String(c ?? "");

export function createTurnInfo(api, { onCacheAlert = null, diceSource = () => null, loreFor = () => null, loreLast = () => null, now = Date.now, chip = true, quietMs = 1500, watchReplacers = null, relastMs = 300, log = (...a) => console.log("[Dusk 호출표시]", ...a) } = {}) {
  let cacheAlert = true, prevMsgs = null, diceShow = false, callShow = false, recs = null, pending = null, saveTimer = null, hooked = false, quiet = null, names = { at: -Infinity, main: "", sub: "" };
  const supported = () => !isBardHost(api);

  const ensure = async () => {
    if (recs) return recs;
    try { const raw = await api.pluginStorage.getItem(TURN_LOG_KEY); const v = typeof raw === "string" ? JSON.parse(raw) : raw; recs = Array.isArray(v?.recs) ? v.recs : []; } catch { recs = []; }
    return recs;
  };
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => api.pluginStorage.setItem(TURN_LOG_KEY, JSON.stringify({ v: 1, recs: (recs ?? []).slice(-MAX_RECS) })).catch((e) => log("저장 실패", e?.message ?? e)), 800); };

  async function modelName(aux) {
    if (now() - names.at > 30e3) {
      try { const db = await api.getDatabase?.(["aiModel", "subModel"]); names = { at: now(), main: String(db?.aiModel ?? ""), sub: String(db?.subModel ?? "") }; } catch { names = { ...names, at: now() }; }
    }
    return aux ? names.sub : names.main;
  }

  // ── 화면 구석 상태 칩 (리스 화면 문서에 직접. 실패해도 응답 아래 블록은 그대로 동작) ──
  const ui = { doc: null, tick: null, hide: null, started: false };
  async function doc() { if (!chip) return null; try { return ui.doc ??= await api.getRootDocument?.(); } catch { return null; } }
  async function chipSet(text, bodyHtml) {
    try {
      const d = await doc(); if (!d) return;
      let t = await d.querySelector('[x-dusk="callchip-t"]');
      if (!t) {
        const css = await d.createElement("style"); await css.setAttribute("x-dusk", "turn-css"); await css.setInnerText(KEYFRAMES);
        const head = await d.querySelector("head") ?? await d.querySelector("body"); if (head && !(await d.querySelector('[x-dusk="turn-css"]'))) await head.appendChild(css);
        const box = await d.createElement("div"); await box.setAttribute("x-dusk", "callchip"); await box.setAttribute("style", CHIP_CSS);
        await box.setInnerHTML('<details><summary style="cursor:pointer;list-style:none"><span x-dusk="callchip-t"></span></summary><div x-dusk="callchip-b" style="padding:2px 0 4px;max-height:40vh;overflow:auto"></div></details>');
        await (await d.querySelector("body")).appendChild(box); t = await d.querySelector('[x-dusk="callchip-t"]');
      }
      await t?.setInnerText(text);
      if (bodyHtml != null) { const b = await d.querySelector('[x-dusk="callchip-b"]'); await b?.setInnerHTML(bodyHtml); }
    } catch (e) { log("상태 칩 실패", e?.message ?? e); }
  }
  async function chipRemove() { try { const d = await doc(); const el = d && await d.querySelector('[x-dusk="callchip"]'); if (el) await el.remove(); } catch { /* 없으면 그대로 */ } }
  const stopTick = () => { clearInterval(ui.tick); ui.tick = null; };
  function chipRun(rec) {
    if (!chip || !callShow) return;
    clearTimeout(ui.hide); stopTick();
    const label = () => { const el = now() - rec.startAt; return `${rec.aux ? "보조" : "메인"} · ${rec.model || "모델"} · ${rec.firstAt ? "출력 중" : "추론 중"} ${fmtSec(el)}`; };
    chipSet(label(), "");
    // 응답이 안 오면(실패·중단) 5분 뒤 멈추고 칩을 치운다. 끄면 바로 멈춘다.
    ui.tick = setInterval(() => { if (rec.done || !callShow) return stopTick(); if (now() - rec.startAt > TICK_MAX) { stopTick(); chipRemove(); return; } chipSet(label()); }, 700);
  }
  function chipDone(rec) {
    if (!chip || !callShow) return;
    stopTick();
    const lore = loreLast?.(); const names = (lore?.entries ?? []).map((e) => esc(e.n)).filter(Boolean);
    const cpct = rec.cache ? ` · 캐시 약 ${Math.round(rec.cache.ratio * 100)}%` : "";
    chipSet(`${rec.aux ? "보조" : "메인"} · ${rec.model || "모델"} · 완료 ${fmtSec(rec.lastAt - rec.startAt)} · 입력 약 ${fmtTokens(rec.inTok ?? 0)} · 출력 약 ${fmtTokens(rec.outTok ?? 0)}${cpct}`, `${rec.cache ? `<div style="margin-top:2px">캐시(어림) · ${esc(cacheLine(rec.cache))}</div>` : ""}<div style="font-weight:700;margin-top:2px">들어간 로어북 ${names.length}개</div>${names.length ? names.map((n) => `<div>· ${n}</div>`).join("") : "<div style='opacity:.7'>없어요</div>"}`);
    clearTimeout(ui.hide); ui.hide = setTimeout(chipRemove, 15e3);
  }

  // 캐시 깨짐 알림: 모델 호출 표시를 꺼 둬도 잠깐 띄운다
  function alertCache(pi) {
    try { onCacheAlert?.(pi); } catch { /* 알림만 실패 */ }
    if (!chip || callShow) return;   // 호출 표시가 켜져 있으면 그 칩에 이미 캐시 %가 나온다
    chipSet(`⚠ 캐시가 깨졌어요 · ${cacheLine(pi)}`, "<div style='opacity:.75'>앞부분이 바뀌면 그 뒤 전체를 새로 읽어서 비용·시간이 늘어요. 옛 메시지를 고쳤다면 자연스러운 일이에요.</div>");
    clearTimeout(ui.hide); ui.hide = setTimeout(chipRemove, 9e3);
  }
  // ── 훅 ──
  async function beforeRequest(messages, type) {
    try {
      if (!supported() || (!diceShow && !callShow && !cacheAlert)) return messages;
      const aux = !!type && type !== "model";
      const prompt = (Array.isArray(messages) ? messages : []).map((m) => textOf(m?.content)).join("\n");
      const rec = { at: now(), startAt: now(), aux, model: await modelName(aux), inTok: estimateTokens(prompt), firstAt: 0, lastAt: 0 };
      if (aux) {   // 보조 호출은 끝을 알 수 없어(출력 훅이 안 불림) 잠깐 알려만 준다
        if (callShow && chip) { chipSet(`보조 · ${rec.model || "모델"} · 호출 중 · 입력 약 ${fmtTokens(rec.inTok)}`, ""); clearTimeout(ui.hide); ui.hide = setTimeout(chipRemove, 4e3); }
        return messages;
      }
      // 캐시 어림: 직전 메인 요청과 앞부분 비교(글만 보관)
      const flatMsgs = (Array.isArray(messages) ? messages : []).map((m) => ({ role: m?.role, content: textOf(m?.content) }));
      const pi = prefixInfo(prevMsgs, flatMsgs); prevMsgs = flatMsgs;
      rec.parts = promptParts(messages).slice(0, 8).map((p) => ({ label: p.label, tok: p.tok }));   // 입력 내역(2.1.4)
      if (pi) rec.cache = { ratio: pi.ratio, same: pi.same, total: pi.total, breakAt: pi.breakAt, at: pi.at, of: pi.of, dusk: pi.dusk };
      if (cacheAlert && pi && pi.total >= ALERT_MIN_TOKENS && pi.ratio < ALERT_RATIO) alertCache(pi);
      if (auxBuf.length) { for (const e of auxBuf) rec.side = mergeSide(rec.side, e); auxBuf = []; }   // 첫 메인 요청 전에 나간 보조 호출
      if (diceShow || callShow) { pending = rec; chipRun(rec); } else pending = null;   // 캐시 알림만이면 응답 기록은 남기지 않는다
    } catch (e) { log("요청 확인 실패", e?.message ?? e); }
    return messages;
  }
  function commit(rec, head, text) {
    rec.id = `${rec.at.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    rec.head = head; rec.tail = tailKey(text);
    const d = diceSource?.(); if (d && d.at >= rec.at - 2000) rec.dice = { rolls: d.rolls, cuts: d.cuts, mode: d.mode };
    recs.push(rec); if (recs.length > MAX_RECS) recs.splice(0, recs.length - MAX_RECS);
  }
  async function onOutput(text) {
    try {
      if (!supported() || !pending || typeof text !== "string") return text;
      const head = headKey(text); if (head.length < 4) return text;
      await ensure();
      const t = now(), rec = pending;
      if (!rec.firstAt) rec.firstAt = t;
      rec.lastAt = t; rec.outTok = estimateTokens(text);
      if (!rec.id) commit(rec, head, text);
      else if (head.startsWith(rec.head) || rec.head.startsWith(head)) { rec.head = head; rec.tail = tailKey(text); }
      else return text;
      clearTimeout(quiet); quiet = setTimeout(settle, quietMs); save();
    } catch (e) { log("응답 기록 실패", e?.message ?? e); }
    return text;
  }
  // 출력이 잠잠해지면 한 번: 완료 처리
  async function settle() {
    clearTimeout(quiet); const rec = pending; if (!rec || rec.done) return;
    rec.done = true; chipDone(rec); save();
  }
  async function onDisplay(text) {
    try {
      if (!supported() || typeof text !== "string" || text.includes('x-dusk="turn"') || text.includes('x-dusk="dice"')) return text;
      if (!diceShow && !callShow) return text;
      await ensure(); const rec = matchRecord(recs, text); if (!rec) return text;
      let out = text;
      if (diceShow && rec.dice) out += diceHtml(rec, parseRollMarks(text));
      if (callShow) out += callHtml(rec, await loreFor?.(text));
      return out;
    } catch { return text; }
  }

  // 보조 호출 장부(2.1.4): 이 메인 요청부터 다음 메인 요청 전까지 나간 보조 호출을 이 응답 기록에 작업별로 더한다
  let auxBuf = [], unAux = null;
  function noteSide(e) {
    if (!callShow || !supported()) return;
    const rec = pending;
    if (!rec) { auxBuf.push(e); if (auxBuf.length > 200) auxBuf.shift(); return; }
    rec.side = mergeSide(rec.side, e);
    if (rec.id) save();
  }
  let unwatch = null, relastTimer = null, relasting = false;
  async function relast() {
    if (relasting || typeof api.removeRisuReplacer !== "function") return;
    relasting = true;
    try { await api.removeRisuReplacer("beforeRequest", beforeRequest); await api.addRisuReplacer("beforeRequest", beforeRequest); } catch { /* 순서만 못 바꿈 */ } finally { relasting = false; }
  }
  async function hook() {
    if (hooked || !supported()) return hooked;
    try {
      if (typeof api.addRisuReplacer === "function") await api.addRisuReplacer("beforeRequest", beforeRequest);
      if (typeof api.addRisuScriptHandler === "function") { await api.addRisuScriptHandler("output", onOutput); await api.addRisuScriptHandler("display", onDisplay); }
      hooked = true;
      unAux ??= onAux(noteSide);
      // 요청 훅은 등록 순서대로 불린다. Dusk의 다른 훅(장기 기억 등)이 나중에 붙어도 최종 프롬프트를 보도록 잠시 뒤 맨 뒤로 다시 단다.
      setTimeout(() => relast(), 5000);
      // 2.1.4: 애드온(장기 기억 등)은 5초보다 늦게 붙을 수 있다 → 다른 beforeRequest 훅이 붙을 때마다 다시 맨 뒤로(입력 내역이 최종 프롬프트를 세게)
      if (typeof watchReplacers === "function" && !unwatch) unwatch = watchReplacers((type, fn) => { if (type === "beforeRequest" && fn !== beforeRequest) { clearTimeout(relastTimer); relastTimer = setTimeout(() => relast(), relastMs); } });
    } catch (e) { log("훅 등록 실패", e?.message ?? e); }
    return hooked;
  }
  async function start() { diceShow = await loadDiceShow(api); callShow = await loadCallShow(api); cacheAlert = await loadCacheAlert(api); if (supported() && (diceShow || callShow || cacheAlert)) await hook(); return supported(); }
  async function setCacheAlert(v) { cacheAlert = !!v; await api.pluginStorage.setItem(CACHE_ALERT_KEY, cacheAlert ? "on" : "off"); if (cacheAlert) await hook(); return cacheAlert; }
  async function setDiceShow(v) { diceShow = !!v; await api.pluginStorage.setItem(DICE_SHOW_KEY, diceShow ? "on" : "off"); if (diceShow) await hook(); return diceShow; }
  async function setCallShow(v) { callShow = !!v; await api.pluginStorage.setItem(CALL_SHOW_KEY, callShow ? "on" : "off"); if (callShow) await hook(); else { stopTick(); chipRemove(); } return callShow; }
  return { start, setCacheAlert, isCacheAlert: () => cacheAlert, setDiceShow, setCallShow, isDiceShow: () => diceShow, isCallShow: () => callShow, supported, beforeRequest, onOutput, onDisplay, settle };
}
