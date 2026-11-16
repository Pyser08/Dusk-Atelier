// Dusk Atelier 커스텀 애드온 — 오토 스크롤 v0.1.0. 홈 → 애드온 → 불러오기로 넣어요.
// 소스: addons/autoscroll/custom.js · runner.js (Dusk Atelier 라이선스, 저장소 LICENSE)
// src/engine/autoscroll.js
var SPEED_MIN = 10;
var SPEED_MAX = 400;
var SPEED_DEF = 60;
var SPEED_STEPS = [10, 15, 20, 30, 40, 50, 60, 80, 100, 130, 160, 200, 260, 330, 400];
var SPEED_PRESETS = [["느리게", 30], ["보통", 60], ["빠르게", 120], ["아주 빠르게", 220]];
function clampSpeed(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, n)) : SPEED_DEF;
}
function nudgeSpeed(cur, dir) {
  const v = clampSpeed(cur);
  if (dir > 0) return SPEED_STEPS.find((s) => s > v) ?? SPEED_MAX;
  return [...SPEED_STEPS].reverse().find((s) => s < v) ?? SPEED_MIN;
}
function stepY(y, speed, dtMs, maxDt = 100) {
  const dt = Math.min(maxDt, Math.max(0, Number(dtMs) || 0));
  return y + clampSpeed(speed) * dt / 1e3;
}
function lastCharIndex(messages) {
  if (!Array.isArray(messages)) return -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "char") return i;
  return -1;
}

// addons/autoscroll/runner.js
var SCREEN = ".default-chat-screen";
var ATTR = "x-dusk-as";
var BTN_TEXT = "▼ 오토 스크롤";
var BTN_STOP = "■ 멈추기";
var BTN_CSS = "position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:5;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 14px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:rgba(28,28,34,.85);color:#fff;font:600 12.5px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;";
var PROBE_CSS = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
var BAR_CSS = "position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(28,28,34,.94);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);font:600 13px/1 system-ui,sans-serif;max-width:calc(100vw - 24px);user-select:none;";
var BAR_BTN = "white-space:nowrap;min-width:38px;min-height:38px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:inherit;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;";
var PAD = "36px";
function createAutoScroll(api, {
  getSpeed = () => 60,
  setSpeed = () => {
  },
  onDenied = () => {
  },
  pollMs = 1e3,
  tickMs = 30,
  measureEvery = 8,
  now = () => Date.now(),
  scheduler = globalThis,
  log = () => {
  }
} = {}) {
  let enabled = false, doc = null, denied = false, poll = null, busy = false;
  let seenKey, doneKey;
  let placed = null;
  let run = null;
  let bar = null;
  const unlisten = async (ls) => {
    for (const l of ls ?? []) {
      try {
        await l.el.removeEventListener("click", l.id);
      } catch {
      }
    }
  };
  let pointerStopAt = -Infinity;
  async function getDoc() {
    if (denied || typeof api?.getRootDocument !== "function") return null;
    if (doc) return doc;
    try {
      if (typeof api.requestPluginPermission === "function" && !await api.requestPluginPermission("mainDom")) {
        denied = true;
        onDenied();
        return null;
      }
      doc = await api.getRootDocument();
    } catch (e) {
      log(`화면 접근 실패 ${e?.message ?? e}`);
      doc = null;
    }
    return doc;
  }
  async function removeBtn() {
    const p = placed;
    placed = null;
    if (p) {
      await unlisten([{ el: p.btn, id: p.lid }]);
      try {
        await p.btn.remove();
      } catch {
      }
      try {
        await p.msg.setStyle("paddingTop", p.pad || "");
        await p.msg.setStyle("position", p.pos || "");
      } catch {
      }
    }
    const d = doc;
    if (!d) return;
    for (let i = 0; i < 4; i++) {
      try {
        const old = await d.querySelector(`[${ATTR}="btn"]`);
        if (!old) break;
        await old.remove();
      } catch {
        break;
      }
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
    const lid = await b.addEventListener("click", () => {
      onBtn(msg);
    });
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
        if (await placed.msg.querySelector(`[${ATTR}="btn"]`)) return;
      } else if (key !== seenKey) {
        seenKey = key;
        return;
      }
      doneKey = key;
      if (!key) {
        await removeBtn();
        return;
      }
      const ci = await api.getCurrentCharacterIndex(), ti = await api.getCurrentChatIndex();
      const chat = await api.getChatFromIndex(ci, ti);
      const idx = lastCharIndex(chat?.message);
      const msg = idx >= 0 ? await d.querySelector(`${SCREEN} .risu-chat[data-chat-index="${idx}"]`) : null;
      if (!msg) {
        await removeBtn();
        return;
      }
      if (placed?.idx === idx && await msg.querySelector(`[${ATTR}="btn"]`)) return;
      await removeBtn();
      if (enabled) await place(d, msg, idx);
    } catch (e) {
      log(`버튼 달기 실패 ${e?.message ?? e}`);
      doneKey = void 0;
    } finally {
      busy = false;
    }
  }
  async function showBar(d) {
    if (bar) return;
    try {
      const el = await d.createElement("div");
      await el.setAttribute(ATTR, "bar");
      await el.setStyleAttribute(BAR_CSS);
      const ls = [];
      const mk = async (text, css, fn) => {
        const b = await d.createElement("button");
        await b.setStyleAttribute(BAR_BTN + css);
        await b.setTextContent(text);
        if (fn) ls.push({ el: b, id: await b.addEventListener("click", fn) });
        await el.appendChild(b);
        return b;
      };
      await mk("−", "font-size:18px;", () => {
        changeSpeed(-1);
      });
      const label = await mk(`▼ ${clampSpeed(getSpeed())}`, "min-width:64px;cursor:default;", null);
      await mk("+", "font-size:18px;", () => {
        changeSpeed(1);
      });
      await mk(BTN_STOP, "background:rgba(255,107,107,.22);", () => {
        stop("bar");
      });
      const body = await d.querySelector("body") || d;
      for (let i = 0; i < 4; i++) {
        const old = await d.querySelector(`[${ATTR}="bar"]`);
        if (!old) break;
        try {
          await old.remove();
        } catch {
          break;
        }
      }
      await body.appendChild(el);
      bar = { el, label, ls };
    } catch (e) {
      log(`조절 막대 실패 ${e?.message ?? e}`);
    }
  }
  async function hideBar() {
    const b = bar;
    bar = null;
    if (b) {
      await unlisten(b.ls);
      try {
        await b.el.remove();
      } catch {
      }
    }
  }
  async function changeSpeed(dir) {
    const v = nudgeSpeed(getSpeed(), dir);
    try {
      await setSpeed(v);
    } catch {
    }
    try {
      await bar?.label.setTextContent(`▼ ${v}`);
    } catch {
    }
  }
  async function setBtnText(t) {
    try {
      await placed?.btn.setTextContent(t);
    } catch {
    }
  }
  async function measure(r, force = false) {
    const sR = await r.sc.getBoundingClientRect(), mR = await r.msg.getBoundingClientRect();
    if (!mR || !mR.height || !sR?.height) return false;
    const actual = sR.top - mR.top;
    r.end = mR.height - sR.height + 24;
    if (force || Math.abs(actual - r.y) > 12) r.y = actual;
    if (!force) r.stuck = actual <= r.prev + 0.5 ? r.stuck + 1 : 0;
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
      if (!await measure(r, true) || r.y >= r.end - 2) {
        await stop("short");
        return;
      }
      try {
        r.listenId = await sc.addEventListener("pointerdown", onPointer);
      } catch {
      }
      await showBar(d);
      await setBtnText(BTN_STOP);
    } catch (e) {
      log(`시작 실패 ${e?.message ?? e}`);
      await stop("error");
      return;
    }
    if (run === r) {
      r.last = now();
      r.timer = scheduler.setTimeout(tick, tickMs);
    }
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
      if (done) {
        if (!await measure(r)) return stop("gone");
        done = r.y >= r.end - 2;
        if (done) return stop("end");
      }
    } catch (e) {
      log(`스크롤 실패 ${e?.message ?? e}`);
      return stop("error");
    }
    if (run === r) r.timer = scheduler.setTimeout(tick, tickMs);
  }
  async function stop(_why) {
    const r = run;
    if (!r) return;
    run = null;
    if (r.timer !== null) scheduler.clearTimeout(r.timer);
    try {
      await r.probe.remove();
    } catch {
    }
    if (r.listenId) {
      try {
        await r.sc.removeEventListener("pointerdown", r.listenId);
      } catch {
      }
    }
    await hideBar();
    await setBtnText(BTN_TEXT);
  }
  function onPointer() {
    if (run) {
      pointerStopAt = now();
      stop("touch");
    }
  }
  function onBtn(msg) {
    if (now() - pointerStopAt < 600) return;
    if (run) stop("btn");
    else start(msg);
  }
  async function setEnabled(v) {
    v = !!v;
    if (v === enabled) return;
    enabled = v;
    if (v) {
      seenKey = doneKey = void 0;
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
    setEnabled,
    refresh,
    stop,
    isEnabled: () => enabled,
    isRunning: () => !!run,
    isDenied: () => denied,
    retry: () => {
      denied = false;
      doc = null;
      seenKey = doneKey = void 0;
      return refresh();
    },
    dispose: () => setEnabled(false)
  };
}

// addons/autoscroll/custom.js
var meta = {
  id: "auto-scroll",
  name: "오토 스크롤",
  version: "0.1.0",
  desc: "홈 빠른 설정에서 켜면 채팅의 마지막 AI 응답 맨 위에 ‘오토 스크롤’ 버튼이 생겨요. 누르면 정한 속도로 천천히 내려가요. 속도는 설정 탭이나 이 애드온의 ‘열기’에서 바꿔요.",
  author: "Dusk Atelier",
  minCore: "2.1.0"
};
async function activate(api, ctx) {
  const dusk = ctx.dusk;
  const { ui, storage } = dusk;
  const { h } = ui;
  const ext = dusk.ext ?? ctx.ext;
  const toast = (t, o) => {
    try {
      dusk.toast(t, o);
    } catch {
    }
  };
  const setSw = (el, v) => el?.setAttribute("aria-checked", v ? "true" : "false");
  const st = { on: await storage.get("on", false) === true, speed: clampSpeed(await storage.get("speed", SPEED_DEF)) };
  const R = createAutoScroll(api, {
    getSpeed: () => st.speed,
    setSpeed: async (v) => {
      st.speed = clampSpeed(v);
      await storage.set("speed", st.speed);
    },
    onDenied: () => toast("리스 화면 접근을 허락해야 오토 스크롤 버튼을 달 수 있어요. 다시 켜면 다시 물어봐요.", { error: true }),
    log: (m) => console.log(`[Dusk Atelier] 오토 스크롤: ${m}`)
  });
  const switches = /* @__PURE__ */ new Set();
  const setOn = async (v) => {
    st.on = !!v;
    for (const el of switches) {
      if (el.isConnected) setSw(el, st.on);
      else switches.delete(el);
    }
    try {
      await storage.set("on", st.on);
    } catch (e) {
      toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
    if (st.on && R.isDenied()) R.retry();
    await R.setEnabled(st.on);
    toast(st.on ? "오토 스크롤을 켰어요. 채팅의 마지막 AI 응답 맨 위에 버튼이 생겨요." : "오토 스크롤을 껐어요.");
  };
  const setSpeed = async (v) => {
    st.speed = clampSpeed(v);
    try {
      await storage.set("speed", st.speed);
    } catch (e) {
      toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const sw = (label) => {
    const el = ui.switchEl(st.on, { label, onChange: (v) => {
      setOn(v);
    } });
    switches.add(el);
    return el;
  };
  const quickRow = () => h(
    "div",
    { class: "rb-srow", id: "rb-qs-autoscroll" },
    h("span", { class: "t" }, "오토 스크롤", h("small", null, "응답 위 버튼을 누르면 천천히 내려가요.")),
    sw("오토 스크롤")
  );
  const speedBox = () => {
    const num = h("b", { style: "min-width:3em;text-align:right;font-variant-numeric:tabular-nums" });
    const range = h("input", { type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: "5", value: String(st.speed), "aria-label": "오토 스크롤 속도 (초당 픽셀)", style: "flex:1;min-width:140px;accent-color:var(--rb-acc)" });
    const chips = SPEED_PRESETS.map(([label, v]) => ui.chip(label, { onClick: () => {
      show(v);
      setSpeed(v);
    } }));
    const show = (v) => {
      v = clampSpeed(v);
      range.value = String(v);
      num.textContent = String(v);
      SPEED_PRESETS.forEach(([, n], i) => chips[i].setAttribute("aria-pressed", n === v ? "true" : "false"));
    };
    range.addEventListener("input", () => show(range.value));
    range.addEventListener("change", () => {
      show(range.value);
      setSpeed(range.value);
    });
    show(st.speed);
    return h(
      "div",
      { style: "display:flex;flex-direction:column;gap:10px;padding:12px 0 4px" },
      h(
        "span",
        { style: "display:flex;flex-direction:column;gap:2px" },
        h("b", { style: "font-size:14.5px;font-weight:500" }, "내려가는 속도"),
        h("small", { class: "rb-muted", style: "white-space:normal" }, "초당 몇 픽셀 내려갈지 정해요. 내려가는 동안 화면 위에 뜨는 −/+ 로도 바꿀 수 있어요.")
      ),
      h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...chips),
      h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, range, h("span", { style: "display:inline-flex;align-items:baseline;gap:4px" }, num, h("small", { class: "rb-muted" }, "px/초")))
    );
  };
  const onRow = () => h(
    "div",
    { class: "rb-srow" },
    h("span", { class: "t" }, "오토 스크롤 버튼", h("small", null, "켜면 리스 채팅의 마지막 AI 응답 맨 위에 ‘▼ 오토 스크롤’ 버튼이 생겨요. 누르면 내려가고, 다시 누르거나 채팅을 터치·클릭하면 멈춰요.")),
    sw("오토 스크롤 버튼")
  );
  const settingsCard = () => h("section", { class: "rb-card bordered rb-scard", id: "rb-autoscroll" }, h("span", { class: "h" }, "오토 스크롤"), onRow(), speedBox());
  const offs = [];
  if (ext) {
    offs.push(ext.add("slot", "home.quickset", quickRow));
    offs.push(ext.add("slot", "settings.cards", settingsCard));
  }
  dusk.addPage({ title: "오토 스크롤", render(el) {
    ui.replace(el, ui.card("오토 스크롤", onRow(), speedBox()));
  } });
  const doc = globalThis.document;
  const attach = () => {
    for (const card of doc?.querySelectorAll?.(".rb-hqs .rb-story-helper") ?? []) {
      if (!card.querySelector("#rb-qs-autoscroll")) card.appendChild(quickRow());
    }
  };
  let mo = null;
  if (doc?.body && typeof MutationObserver === "function") {
    let queued = false;
    mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        attach();
      });
    });
    mo.observe(doc.body, { childList: true, subtree: true });
    attach();
  }
  if (st.on) R.setEnabled(true).catch(() => {
  });
  return {
    async deactivate() {
      mo?.disconnect();
      doc?.querySelectorAll?.("#rb-qs-autoscroll").forEach((el) => el.remove());
      offs.forEach((f) => {
        try {
          f();
        } catch {
        }
      });
      await R.dispose().catch(() => {
      });
    }
  };
}
export {
  activate,
  meta
};
