// 오토 스크롤 런타임: 리스 채팅의 마지막 AI 응답 맨 위에 '오토 스크롤' 버튼을 달고, 누르면 정한 속도로 천천히 내려간다.
// 리스 화면은 SafeElement(비동기 래퍼)로만 만질 수 있고 scrollTop을 직접 바꿀 수 없다(HOST-COMPAT 7).
// 0.2.0: 매 순간 조금씩 옮기면(30ms마다 호출) 플러그인↔리스 사이 지연 때문에 걸음이 고르지 않아 버벅였다.
//   → 내려가는 움직임은 브라우저가 직접 그리게 한다: 채팅 목록에 transform 전환(linear)을 한 번 걸고,
//     멈추거나 한 구간이 끝나면 그 자리를 진짜 스크롤 위치로 바꾼다(응답 안 안 보이는 표식 + scrollIntoView).
// - 멈춤: 떠 있는 막대의 ■, 응답 위 버튼 다시 누르기, 채팅을 손가락·마우스로 누르기(pointerdown), 끝에 닿기
// - 응답이 아직 길어지는 중이면 구간이 끝날 때 다시 재서 이어 간다
// - 좌우 스크롤 막기(선택): 채팅 화면이 옆으로 밀리지 않게 CSS를 넣는다(켜 둔 동안 계속)
import { clampSpeed, nudgeSpeed, lastCharIndex } from "../../src/engine/autoscroll.js";

const SCREEN = ".default-chat-screen";
const ATTR = "x-dusk-as";
const BTN_TEXT = "▼ 오토 스크롤", BTN_STOP = "■ 멈추기";
const BTN_CSS = "position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:5;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 14px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:rgba(28,28,34,.85);color:#fff;font:600 12.5px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;";
const PROBE_CSS = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
const BAR_CSS = "position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(28,28,34,.94);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font:600 13px/1 system-ui,sans-serif;max-width:calc(100vw - 24px);user-select:none;";
const BAR_BTN = "white-space:nowrap;min-width:38px;min-height:38px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:inherit;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;";
const PAD = "36px";   // 버튼 자리만큼 응답 위를 띄운다
// 좌우 스크롤 막기: 채팅 화면 자체가 옆으로 밀리지 않게 + 손가락으로 옆으로 미는 동작을 막는다(넓은 표·코드도 옆으로 밀리지 않음)
export const NOX_CSS = `${SCREEN}{overflow-x:hidden!important;overscroll-behavior-x:none!important;touch-action:pan-y pinch-zoom!important}${SCREEN} .chat-message-container{max-width:100%;overflow-x:clip}`;   // 메시지 밖으로 삐져나온 넓은 것을 잘라 옆으로 밀릴 거리 자체를 없앤다
const END_PAD = 24;   // 응답 끝을 화면 아래에서 이만큼 위까지 올린다

export function createAutoScroll(api, {
  getSpeed = () => 60, setSpeed = () => {}, onDenied = () => {}, noX = false,
  pollMs = 1000, settleMs = 60,
  now = () => Date.now(), scheduler = globalThis, log = () => {}
} = {}) {
  let enabled = false, doc = null, denied = false, poll = null, busy = false, noXOn = !!noX;
  let seenKey, doneKey;     // 맨 아래 메시지 x-hashed: 두 번 연달아 같을 때만(스트리밍 중엔 계속 바뀜) 채팅을 읽는다
  let placed = null;        // { msg, btn, idx, pos, pad, lid }
  let run = null;           // { msg, sc, list, probe, orig, seg, timer, listenId }
  let bar = null;           // { el, label, ls }
  let pointerStopAt = -Infinity;
  // 리스는 플러그인이 단 이벤트를 따로 기억한다 → 요소를 지울 때 이벤트도 직접 뗀다
  const unlisten = async (ls) => { for (const l of ls ?? []) { try { await l.el.removeEventListener(l.type ?? "click", l.id); } catch { /* 이미 사라짐 */ } } };

  async function getDoc() {
    if (denied || typeof api?.getRootDocument !== "function") return null;
    if (doc) return doc;
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { denied = true; onDenied(); return null; }
      doc = await api.getRootDocument();
    } catch (e) { log(`화면 접근 실패 ${e?.message ?? e}`); doc = null; }
    return doc;
  }

  // ── 좌우 스크롤 막기 CSS ──
  async function syncNoX() {
    const d = doc ?? (enabled && noXOn ? await getDoc() : null);
    if (!d) return;
    try {
      const want = enabled && noXOn, cur = await d.querySelector(`[${ATTR}="nox"]`);
      if (want && !cur) {
        const css = await d.createElement("style");
        await css.setAttribute(ATTR, "nox");
        await css.setInnerText(NOX_CSS);
        await ((await d.querySelector("head")) ?? (await d.querySelector("body")) ?? d).appendChild(css);
      } else if (!want && cur) await cur.remove();
    } catch (e) { log(`좌우 스크롤 막기 실패 ${e?.message ?? e}`); }
  }

  // ── 버튼 달기·떼기 ──
  async function removeBtn() {
    const p = placed; placed = null;
    if (p) {
      await unlisten([{ el: p.btn, id: p.lid }]);
      try { await p.btn.remove(); } catch { /* 이미 사라짐 */ }
      try { await p.msg.setStyle("paddingTop", p.pad || ""); await p.msg.setStyle("position", p.pos || ""); } catch { /* 응답이 다시 그려져 사라짐 */ }
    }
    const d = doc;
    if (!d) return;
    for (let i = 0; i < 4; i++) {   // 새로고침 전 남은 버튼(예전 실행분)
      try { const old = await d.querySelector(`[${ATTR}="btn"]`); if (!old) break; await old.remove(); } catch { break; }
    }
  }
  async function place(d, msg, idx) {
    const pos = await msg.getStyle("position"), pad = await msg.getStyle("paddingTop");
    await msg.setStyle("position", "relative");
    await msg.setStyle("paddingTop", PAD);
    const b = await d.createElement("button");
    await b.setAttribute(ATTR, "btn");
    await b.setStyleAttribute(BTN_CSS);
    await b.setTextContent(run ? BTN_STOP : BTN_TEXT);
    const lid = await b.addEventListener("click", () => { onBtn(msg); });
    await msg.prepend(b);
    placed = { msg, btn: b, idx, pos, pad, lid };
  }

  async function refresh() {
    if (busy || !enabled) return;
    busy = true;
    try {
      const d = await getDoc();
      if (!d || !enabled) return;
      if (noXOn && !(await d.querySelector(`[${ATTR}="nox"]`))) await syncNoX();
      const first = await d.querySelector(`${SCREEN} .chat-message-container`);
      const key = first ? await first.getAttribute("x-hashed") : null;
      if (key === doneKey) {
        if (!placed) return;
        if (await placed.msg.querySelector(`[${ATTR}="btn"]`)) return;   // 그대로 붙어 있음
      } else if (key !== seenKey) { seenKey = key; return; }   // 한 번 더 같은 값일 때(그리기가 끝났을 때) 읽는다
      doneKey = key;
      if (!key) { await removeBtn(); return; }
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      const chat = await api.getChatFromIndex(ci, ti);
      const idx = lastCharIndex(chat?.message);
      const msg = idx >= 0 ? await d.querySelector(`${SCREEN} .risu-chat[data-chat-index="${idx}"]`) : null;
      if (!msg) { await removeBtn(); return; }
      if (placed?.idx === idx && await msg.querySelector(`[${ATTR}="btn"]`)) return;
      await removeBtn();
      if (enabled) await place(d, msg, idx);
    } catch (e) { log(`버튼 달기 실패 ${e?.message ?? e}`); doneKey = undefined; }
    finally { busy = false; }
  }

  // ── 떠 있는 조절 막대(돌고 있는 동안만) ──
  async function showBar(d) {
    if (bar) return;
    try {
      const el = await d.createElement("div");
      await el.setAttribute(ATTR, "bar");
      await el.setStyleAttribute(BAR_CSS);
      const ls = [];
      const mk = async (text, css, fn) => { const b = await d.createElement("button"); await b.setStyleAttribute(BAR_BTN + css); await b.setTextContent(text); if (fn) ls.push({ el: b, id: await b.addEventListener("click", fn) }); await el.appendChild(b); return b; };
      await mk("−", "font-size:18px;", () => { changeSpeed(-1); });
      const label = await mk(`▼ ${clampSpeed(getSpeed())}`, "min-width:64px;cursor:default;", null);
      await mk("+", "font-size:18px;", () => { changeSpeed(1); });
      await mk(BTN_STOP, "background:rgba(255,107,107,.22);", () => { stop("bar"); });
      const body = await d.querySelector("body") || d;
      for (let i = 0; i < 4; i++) { const old = await d.querySelector(`[${ATTR}="bar"]`); if (!old) break; try { await old.remove(); } catch { break; } }
      await body.appendChild(el);
      bar = { el, label, ls };
    } catch (e) { log(`조절 막대 실패 ${e?.message ?? e}`); }
  }
  async function hideBar() { const b = bar; bar = null; if (b) { await unlisten(b.ls); try { await b.el.remove(); } catch { /* 이미 사라짐 */ } } }
  async function changeSpeed(dir) {
    const v = nudgeSpeed(getSpeed(), dir);
    try { await setSpeed(v); } catch { /* 저장 실패해도 이번 실행엔 쓴다 */ }
    try { await bar?.label.setTextContent(`▼ ${v}`); } catch { /* 막대 사라짐 */ }
    await respeed();
  }
  async function setBtnText(t) { try { await placed?.btn.setTextContent(t); } catch { /* 버튼 사라짐 */ } }

  // ── 내려가기 ──
  // 화면 맨 위가 응답 안에서 몇 px 내려왔는지(보이는 위치, transform 포함)와 어디까지 갈지
  async function where(r) {
    const sR = await r.sc.getBoundingClientRect(), mR = await r.msg.getBoundingClientRect();
    if (!mR || !mR.height || !sR?.height) return null;   // 응답이 다시 그려져 사라짐
    return { y: sR.top - mR.top, end: mR.height - sR.height + END_PAD };
  }
  // 한 구간: 지금 자리에서 응답 끝까지를 transform 전환 하나로 내려간다(브라우저가 매 프레임 고르게 그림)
  async function segment(r) {
    const w = await where(r);
    if (!w || run !== r) return false;
    const dist = w.end - w.y;
    if (dist < 2) return false;
    const speed = clampSpeed(getSpeed()), dur = dist / speed;
    await r.list.setStyle("transition", "none");
    await r.list.setStyle("willChange", "transform");
    await r.list.setStyle("transform", "translateY(0px)");
    await r.list.getBoundingClientRect();   // 시작 모양을 먼저 그리게 해서 전환이 0부터 시작하게
    if (run !== r) return false;
    await r.list.setStyle("transition", `transform ${dur.toFixed(3)}s linear`);
    await r.list.setStyle("transform", `translateY(${(-dist).toFixed(2)}px)`);
    r.seg = { dist, speed };
    r.timer = scheduler.setTimeout(() => { segEnd(r); }, dur * 1000 + settleMs);
    return true;
  }
  // 움직이던 모양을 진짜 스크롤 위치로 바꾼다(보이는 자리는 그대로)
  async function commit(r) {
    if (!r.seg) return;
    if (r.timer !== null) { scheduler.clearTimeout(r.timer); r.timer = null; }
    const seg = r.seg; r.seg = null;
    let y = null;
    try {
      const t0 = now(), w = await where(r), rtt = now() - t0;
      if (w) y = w.y + seg.speed * rtt / 2000;   // 재는 동안에도 조금 내려갔다
    } catch { /* 잴 수 없으면 원래대로만 */ }
    const jobs = [];
    if (y !== null) jobs.push(r.probe.setStyle("top", `${y.toFixed(2)}px`));
    // 아래 세 호출은 기다리지 않고 잇달아 보내 한 프레임 안에 바뀌게 한다
    jobs.push(r.list.setStyle("transition", "none"), r.list.setStyle("transform", r.orig.transform || ""));
    if (y !== null) jobs.push(r.probe.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
    await Promise.allSettled(jobs);
  }
  async function segEnd(r) {
    if (run !== r) return;
    r.timer = null;
    try {
      await commit(r);
      if (run === r && !await segment(r)) await stop("end");   // 응답이 더 길어졌으면 이어서
    } catch (e) { log(`스크롤 실패 ${e?.message ?? e}`); await stop("error"); }
  }
  async function respeed() {
    const r = run;
    if (!r?.seg) return;
    try { await commit(r); if (run === r && !await segment(r)) await stop("end"); } catch { await stop("error"); }
  }
  async function start(msg) {
    const d = await getDoc();
    if (!d || run) return;
    const sc = await d.querySelector(SCREEN);
    const first = await d.querySelector(`${SCREEN} .chat-message-container`);
    const list = first ? await first.getParent() : null;
    if (!sc || !list) return;
    const probe = await d.createElement("div");
    await probe.setAttribute(ATTR, "probe");
    await probe.setStyleAttribute(PROBE_CSS);
    await msg.appendChild(probe);
    const orig = { transform: await list.getStyle("transform"), transition: await list.getStyle("transition"), willChange: await list.getStyle("willChange") };
    const r = { msg, sc, list, probe, orig, seg: null, timer: null, listenId: null };
    run = r;
    try {
      try { r.listenId = await sc.addEventListener("pointerdown", onPointer); } catch { /* 누르기로 멈추기 없이 */ }
      if (!await segment(r)) { await stop("short"); return; }
      await setBtnText(BTN_STOP);
      await showBar(d);
    } catch (e) { log(`시작 실패 ${e?.message ?? e}`); await stop("error"); }
  }
  async function stop(_why) {
    const r = run;
    if (!r) return;
    try { await commit(r); } catch { /* 그대로 */ }
    run = null;
    if (r.timer !== null) scheduler.clearTimeout(r.timer);
    try { await r.list.setStyle("transition", r.orig.transition || ""); await r.list.setStyle("willChange", r.orig.willChange || ""); await r.list.setStyle("transform", r.orig.transform || ""); } catch { /* 이미 사라짐 */ }
    try { await r.probe.remove(); } catch { /* 이미 사라짐 */ }
    if (r.listenId) await unlisten([{ el: r.sc, id: r.listenId, type: "pointerdown" }]);
    await hideBar();
    await setBtnText(BTN_TEXT);
  }
  function onPointer() { if (run) { pointerStopAt = now(); stop("touch"); } }
  function onBtn(msg) {
    if (now() - pointerStopAt < 600) return;   // 같은 누르기의 pointerdown이 방금 멈췄다 → 다시 시작하지 않는다
    if (run) stop("btn"); else start(msg);
  }

  async function setEnabled(v) {
    v = !!v;
    if (v === enabled) return;
    enabled = v;
    if (v) {
      seenKey = doneKey = undefined;
      poll = scheduler.setInterval(refresh, pollMs);
      await refresh();
      await syncNoX();
    } else {
      if (poll !== null) scheduler.clearInterval(poll);
      poll = null;
      await stop("off");
      await removeBtn();
      await syncNoX();
    }
  }

  return {
    setEnabled, refresh, stop,
    setNoX: async (v) => { noXOn = !!v; await syncNoX(); },
    respeed,
    isEnabled: () => enabled, isRunning: () => !!run, isDenied: () => denied,
    retry: () => { denied = false; doc = null; seenKey = doneKey = undefined; return refresh(); },
    dispose: () => setEnabled(false)
  };
}
