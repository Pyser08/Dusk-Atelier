// 오토 스크롤 런타임: 리스 채팅의 마지막 AI 응답 맨 위에 '오토 스크롤' 버튼을 달고, 누르면 정한 속도로 천천히 내려간다.
// 리스 화면은 SafeElement(비동기 래퍼)로만 만질 수 있고 scrollTop을 직접 바꿀 수 없다(HOST-COMPAT 7).
// 그래서 응답 안에 보이지 않는 표식(probe)을 두고, 표식을 조금씩 아래로 옮기며 scrollIntoView로 따라가게 한다.
// - 멈춤: 떠 있는 막대의 ■, 응답 위 버튼 다시 누르기, 채팅을 손가락·마우스로 누르기(pointerdown), 끝에 닿기
// - 마우스 휠로 위치를 바꾸면 그 자리에서 이어서 내려간다(주기적으로 실제 위치를 다시 잰다)
import { clampSpeed, nudgeSpeed, stepY, lastCharIndex } from "../../src/engine/autoscroll.js";

const SCREEN = ".default-chat-screen";
const ATTR = "x-dusk-as";
const BTN_TEXT = "▼ 오토 스크롤", BTN_STOP = "■ 멈추기";
const BTN_CSS = "position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:5;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 14px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:rgba(28,28,34,.85);color:#fff;font:600 12.5px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;";
const PROBE_CSS = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
const BAR_CSS = "position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(28,28,34,.94);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font:600 13px/1 system-ui,sans-serif;max-width:calc(100vw - 24px);user-select:none;";
const BAR_BTN = "white-space:nowrap;min-width:38px;min-height:38px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:inherit;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;";
const PAD = "36px";   // 버튼 자리만큼 응답 위를 띄운다

export function createAutoScroll(api, {
  getSpeed = () => 60, setSpeed = () => {}, onDenied = () => {},
  pollMs = 1000, tickMs = 30, measureEvery = 8,
  now = () => Date.now(), scheduler = globalThis, log = () => {}
} = {}) {
  let enabled = false, doc = null, denied = false, poll = null, busy = false;
  let seenKey, doneKey;     // 맨 아래 메시지 x-hashed: 두 번 연달아 같을 때만(스트리밍 중엔 계속 바뀜) 채팅을 읽는다
  let placed = null;        // { msg, btn, idx, pos, pad }
  let run = null;           // { msg, sc, probe, y, end, last, timer, n, prev, stuck, listenId }
  let bar = null;           // { el, label, ls: [{ el, id }] }
  // 리스는 플러그인이 단 이벤트를 따로 기억한다 → 요소를 지울 때 이벤트도 직접 뗀다
  const unlisten = async (ls) => { for (const l of ls ?? []) { try { await l.el.removeEventListener("click", l.id); } catch { /* 이미 사라짐 */ } } };
  let pointerStopAt = -Infinity;

  async function getDoc() {
    if (denied || typeof api?.getRootDocument !== "function") return null;
    if (doc) return doc;
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) { denied = true; onDenied(); return null; }
      doc = await api.getRootDocument();
    } catch (e) { log(`화면 접근 실패 ${e?.message ?? e}`); doc = null; }
    return doc;
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
    for (let i = 0; i < 4; i++) {   // 새로고침 전 남은 버튼·표식(예전 실행분)
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
  }
  async function setBtnText(t) { try { await placed?.btn.setTextContent(t); } catch { /* 버튼 사라짐 */ } }

  // ── 내려가기 ──
  // 실제 위치를 다시 잰다: 화면 맨 위가 응답 안에서 몇 px 내려왔는지(y), 어디까지 갈지(end)
  async function measure(r, force = false) {
    const sR = await r.sc.getBoundingClientRect(), mR = await r.msg.getBoundingClientRect();
    if (!mR || !mR.height || !sR?.height) return false;   // 응답이 다시 그려져 사라짐
    const actual = sR.top - mR.top;
    r.end = mR.height - sR.height + 24;
    if (force || Math.abs(actual - r.y) > 12) r.y = actual;   // 휠로 옮겼으면 거기서 이어서
    if (!force) r.stuck = actual <= r.prev + 0.5 ? r.stuck + 1 : 0;   // 더 내려갈 데가 없음(채팅 끝)
    r.prev = actual;
    return true;
  }
  async function start(msg) {
    const d = await getDoc();
    if (!d || run) return;
    const sc = await d.querySelector(SCREEN);
    if (!sc) return;
    const probe = await d.createElement("div");
    await probe.setAttribute(ATTR, "probe");
    await probe.setStyleAttribute(PROBE_CSS);
    await msg.appendChild(probe);
    const r = { msg, sc, probe, y: 0, end: 0, prev: -Infinity, stuck: 0, n: 0, last: now(), timer: null, listenId: null };
    run = r;
    try {
      if (!await measure(r, true) || r.y >= r.end - 2) { await stop("short"); return; }
      try { r.listenId = await sc.addEventListener("pointerdown", onPointer); } catch { /* 누르기로 멈추기 없이 */ }
      await showBar(d);
      await setBtnText(BTN_STOP);
    } catch (e) { log(`시작 실패 ${e?.message ?? e}`); await stop("error"); return; }
    if (run === r) { r.last = now(); r.timer = scheduler.setTimeout(tick, tickMs); }
  }
  async function tick() {
    const r = run;
    if (!r) return;
    const t = now();
    r.y = stepY(r.y, getSpeed(), t - r.last);
    r.last = t;
    try {
      if (++r.n % measureEvery === 0) {
        if (!await measure(r)) return stop("gone");
        if (r.stuck >= 3) return stop("end");
      }
      let done = r.y >= r.end;
      if (done) r.y = r.end;
      await r.probe.setStyle("top", `${Math.round(r.y)}px`);
      await r.probe.scrollIntoView({ block: "start", behavior: "instant" });
      if (done) {   // 응답이 아직 길어지는 중(스트리밍)일 수 있어 한 번 더 잰다
        if (!await measure(r)) return stop("gone");
        done = r.y >= r.end - 2;
        if (done) return stop("end");
      }
    } catch (e) { log(`스크롤 실패 ${e?.message ?? e}`); return stop("error"); }
    if (run === r) r.timer = scheduler.setTimeout(tick, tickMs);
  }
  async function stop(_why) {
    const r = run;
    if (!r) return;
    run = null;
    if (r.timer !== null) scheduler.clearTimeout(r.timer);
    try { await r.probe.remove(); } catch { /* 이미 사라짐 */ }
    if (r.listenId) { try { await r.sc.removeEventListener("pointerdown", r.listenId); } catch { /* 이미 사라짐 */ } }
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
      refresh();
    } else {
      if (poll !== null) scheduler.clearInterval(poll);
      poll = null;
      await stop("off");
      await removeBtn();
    }
  }

  return {
    setEnabled, refresh, stop,
    isEnabled: () => enabled, isRunning: () => !!run, isDenied: () => denied,
    retry: () => { denied = false; doc = null; seenKey = doneKey = undefined; return refresh(); },
    dispose: () => setEnabled(false)
  };
}
