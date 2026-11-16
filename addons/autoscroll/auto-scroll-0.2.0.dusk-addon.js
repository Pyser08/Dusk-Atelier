// Dusk Atelier 커스텀 애드온 — 오토 스크롤 v0.2.0. 홈 → 애드온 → 불러오기로 넣어요.
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
function lastCharIndex(messages) {
  if (!Array.isArray(messages)) return -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "char") return i;
  return -1;
}
var speedLabel = (v) => {
  const s = clampSpeed(v), p = SPEED_PRESETS.find(([, n]) => n === s);
  return p ? `${p[0]} (${s})` : String(s);
};

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
var NOX_CSS = `${SCREEN}{overflow-x:hidden!important;overscroll-behavior-x:none!important;touch-action:pan-y pinch-zoom!important}${SCREEN} .chat-message-container{max-width:100%;overflow-x:clip}`;
var END_PAD = 24;
function createAutoScroll(api, {
  getSpeed = () => 60,
  setSpeed = () => {
  },
  onDenied = () => {
  },
  noX = false,
  pollMs = 1e3,
  settleMs = 60,
  now = () => Date.now(),
  scheduler = globalThis,
  log = () => {
  }
} = {}) {
  let enabled = false, doc = null, denied = false, poll = null, busy = false, noXOn = !!noX;
  let seenKey, doneKey;
  let placed = null;
  let run = null;
  let bar = null;
  let pointerStopAt = -Infinity;
  const unlisten = async (ls) => {
    for (const l of ls ?? []) {
      try {
        await l.el.removeEventListener(l.type ?? "click", l.id);
      } catch {
      }
    }
  };
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
  async function syncNoX() {
    const d = doc ?? (enabled && noXOn ? await getDoc() : null);
    if (!d) return;
    try {
      const want = enabled && noXOn, cur = await d.querySelector(`[${ATTR}="nox"]`);
      if (want && !cur) {
        const css = await d.createElement("style");
        await css.setAttribute(ATTR, "nox");
        await css.setInnerText(NOX_CSS);
        await (await d.querySelector("head") ?? await d.querySelector("body") ?? d).appendChild(css);
      } else if (!want && cur) await cur.remove();
    } catch (e) {
      log(`좌우 스크롤 막기 실패 ${e?.message ?? e}`);
    }
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
      if (noXOn && !await d.querySelector(`[${ATTR}="nox"]`)) await syncNoX();
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
    await respeed();
  }
  async function setBtnText(t) {
    try {
      await placed?.btn.setTextContent(t);
    } catch {
    }
  }
  async function where(r) {
    const sR = await r.sc.getBoundingClientRect(), mR = await r.msg.getBoundingClientRect();
    if (!mR || !mR.height || !sR?.height) return null;
    return { y: sR.top - mR.top, end: mR.height - sR.height + END_PAD };
  }
  async function segment(r) {
    const w = await where(r);
    if (!w || run !== r) return false;
    const dist = w.end - w.y;
    if (dist < 2) return false;
    const speed = clampSpeed(getSpeed()), dur = dist / speed;
    await r.list.setStyle("transition", "none");
    await r.list.setStyle("willChange", "transform");
    await r.list.setStyle("transform", "translateY(0px)");
    await r.list.getBoundingClientRect();
    if (run !== r) return false;
    await r.list.setStyle("transition", `transform ${dur.toFixed(3)}s linear`);
    await r.list.setStyle("transform", `translateY(${(-dist).toFixed(2)}px)`);
    r.seg = { dist, speed };
    r.timer = scheduler.setTimeout(() => {
      segEnd(r);
    }, dur * 1e3 + settleMs);
    return true;
  }
  async function commit(r) {
    if (!r.seg) return;
    if (r.timer !== null) {
      scheduler.clearTimeout(r.timer);
      r.timer = null;
    }
    const seg = r.seg;
    r.seg = null;
    let y = null;
    try {
      const t0 = now(), w = await where(r), rtt = now() - t0;
      if (w) y = w.y + seg.speed * rtt / 2e3;
    } catch {
    }
    const jobs = [];
    if (y !== null) jobs.push(r.probe.setStyle("top", `${y.toFixed(2)}px`));
    jobs.push(r.list.setStyle("transition", "none"), r.list.setStyle("transform", r.orig.transform || ""));
    if (y !== null) jobs.push(r.probe.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
    await Promise.allSettled(jobs);
  }
  async function segEnd(r) {
    if (run !== r) return;
    r.timer = null;
    try {
      await commit(r);
      if (run === r && !await segment(r)) await stop("end");
    } catch (e) {
      log(`스크롤 실패 ${e?.message ?? e}`);
      await stop("error");
    }
  }
  async function respeed() {
    const r = run;
    if (!r?.seg) return;
    try {
      await commit(r);
      if (run === r && !await segment(r)) await stop("end");
    } catch {
      await stop("error");
    }
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
      try {
        r.listenId = await sc.addEventListener("pointerdown", onPointer);
      } catch {
      }
      if (!await segment(r)) {
        await stop("short");
        return;
      }
      await setBtnText(BTN_STOP);
      await showBar(d);
    } catch (e) {
      log(`시작 실패 ${e?.message ?? e}`);
      await stop("error");
    }
  }
  async function stop(_why) {
    const r = run;
    if (!r) return;
    try {
      await commit(r);
    } catch {
    }
    run = null;
    if (r.timer !== null) scheduler.clearTimeout(r.timer);
    try {
      await r.list.setStyle("transition", r.orig.transition || "");
      await r.list.setStyle("willChange", r.orig.willChange || "");
      await r.list.setStyle("transform", r.orig.transform || "");
    } catch {
    }
    try {
      await r.probe.remove();
    } catch {
    }
    if (r.listenId) await unlisten([{ el: r.sc, id: r.listenId, type: "pointerdown" }]);
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
    setEnabled,
    refresh,
    stop,
    setNoX: async (v) => {
      noXOn = !!v;
      await syncNoX();
    },
    respeed,
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

// addons/autoscroll/settingsui.js
var QS_TITLE = "오토 스크롤";
var QS_DESC = "응답 위 버튼을 누르면 천천히 내려가요.";
var summary = (st) => st.on ? `켜짐 · ${speedLabel(st.speed)}` : "꺼짐";
function settingsBody({ h, switchEl, chip }, st, act, { withOn = true } = {}) {
  const sync = (el, v) => el.setAttribute("aria-checked", v ? "true" : "false");
  const row = (title, desc, on, onChange, id) => h(
    "div",
    { class: "rb-srow", id },
    h("span", { class: "t" }, title, h("small", null, desc)),
    switchEl(on, { label: title, onChange: (v, el) => {
      sync(el, v);
      onChange(v);
    } })
  );
  const num = h("b", { style: "min-width:3em;text-align:right;font-variant-numeric:tabular-nums" });
  const range = h("input", { type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: "5", value: String(st.speed), "aria-label": "오토 스크롤 속도 (초당 픽셀)", class: "rb-as-range", style: "flex:1;min-width:140px;accent-color:var(--rb-acc)" });
  const chips = SPEED_PRESETS.map(([label, v]) => {
    const c = chip(label, { onClick: () => {
      show(v);
      act.setSpeed(v);
    } });
    c.dataset.v = String(v);
    return c;
  });
  const show = (v) => {
    v = clampSpeed(v);
    range.value = String(v);
    num.textContent = String(v);
    for (const c of chips) c.setAttribute("aria-pressed", Number(c.dataset.v) === v ? "true" : "false");
  };
  range.addEventListener("input", () => show(range.value));
  range.addEventListener("change", () => {
    show(range.value);
    act.setSpeed(range.value);
  });
  show(st.speed);
  return h(
    "div",
    { class: "rb-as-set", style: "display:flex;flex-direction:column" },
    withOn ? row("사용하기", "켜면 리스 채팅의 마지막 AI 응답 맨 위에 ‘▼ 오토 스크롤’ 버튼이 생겨요. 누르면 내려가고, 다시 누르거나 채팅을 터치·클릭하면 멈춰요.", st.on, act.setOn, "rb-as-on") : null,
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:10px;padding:12px 0", class: "rb-as-speed" },
      h(
        "span",
        { style: "display:flex;flex-direction:column;gap:2px" },
        h("b", { style: "font-size:14.5px;font-weight:500" }, "내려가는 속도"),
        h("small", { class: "rb-muted", style: "white-space:normal" }, "초당 몇 픽셀 내려갈지 정해요. 내려가는 동안 화면 위에 뜨는 −/+ 로도 바꿀 수 있어요.")
      ),
      h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, ...chips),
      h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" }, range, h("span", { style: "display:inline-flex;align-items:baseline;gap:4px" }, num, h("small", { class: "rb-muted" }, "px/초")))
    ),
    row("좌우 스크롤 막기", "채팅이 옆으로 밀리거나 흔들리지 않게 해요. 넓은 표·코드도 옆으로 밀리지 않아요.", st.noX, act.setNoX, "rb-as-nox")
  );
}

// addons/autoscroll/custom.js
var meta = {
  id: "auto-scroll",
  name: "오토 스크롤",
  version: "0.2.0",
  desc: "홈 빠른 설정에서 켜면 채팅의 마지막 AI 응답 맨 위에 ‘오토 스크롤’ 버튼이 생겨요. 누르면 정한 속도로 부드럽게 내려가요. 속도·좌우 스크롤 막기는 빠른 설정의 ‘설정’에서 바꿔요.",
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
  const kit = { h, switchEl: ui.switchEl, chip: ui.chip };
  const st = {
    on: await storage.get("on", false) === true,
    speed: clampSpeed(await storage.get("speed", SPEED_DEF)),
    noX: await storage.get("noX", false) === true
  };
  const R = createAutoScroll(api, {
    getSpeed: () => st.speed,
    noX: st.noX,
    setSpeed: async (v) => {
      st.speed = clampSpeed(v);
      await storage.set("speed", st.speed);
    },
    onDenied: () => toast("리스 화면 접근을 허락해야 오토 스크롤 버튼을 달 수 있어요. 다시 켜면 다시 물어봐요.", { error: true }),
    log: (m) => console.log(`[Dusk Atelier] 오토 스크롤: ${m}`)
  });
  const save = async (k, v) => {
    try {
      await storage.set(k, v);
    } catch (e) {
      toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const act = {
    async setOn(v) {
      st.on = !!v;
      await save("on", st.on);
      if (st.on && R.isDenied()) R.retry();
      await R.setEnabled(st.on);
      toast(st.on ? "오토 스크롤을 켰어요. 채팅의 마지막 AI 응답 맨 위에 버튼이 생겨요." : "오토 스크롤을 껐어요.");
    },
    async setSpeed(v) {
      st.speed = clampSpeed(v);
      await save("speed", st.speed);
      await R.respeed();
    },
    async setNoX(v) {
      st.noX = !!v;
      await save("noX", st.noX);
      await R.setNoX(st.noX);
      toast(st.noX ? st.on ? "채팅 좌우 스크롤을 막았어요." : "좌우 스크롤 막기는 오토 스크롤을 켜면 적용돼요." : "좌우 스크롤 막기를 껐어요.");
    }
  };
  const body = (withOn) => settingsBody(kit, st, act, { withOn });
  const offs = [];
  if (typeof dusk.addQuickSetting === "function") {
    dusk.addQuickSetting({ id: "rb-qs-autoscroll", title: QS_TITLE, desc: QS_DESC, value: () => summary(st), settings: (el) => el.append(body(true)) });
  } else offs.push(legacyQuickRow());
  const card = () => h("section", { class: "rb-card bordered rb-scard", id: "rb-autoscroll" }, h("span", { class: "h" }, "오토 스크롤"), body(true));
  if (typeof dusk.addSettingsCard === "function") dusk.addSettingsCard({ title: "오토 스크롤", render: (el) => el.append(body(true)) });
  else if (ext) offs.push(ext.add("slot", "settings.cards", card));
  dusk.addPage({ title: "오토 스크롤", render(el) {
    ui.replace(el, ui.card("오토 스크롤", body(true)));
  } });
  if (st.on) R.setEnabled(true).catch(() => {
  });
  return {
    async deactivate() {
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
  function legacyQuickRow() {
    const doc = globalThis.document;
    const chevron = () => {
      const t = doc.createElement("template");
      t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
      return t.content.firstChild;
    };
    const win = () => ctx.app?.win ?? doc?.querySelector(".rb-win") ?? doc?.body;
    const openSettings = () => {
      const host = win();
      if (!host) return;
      const back = h("div", { class: "rb-modal" });
      const close = () => {
        back.remove();
        doc.removeEventListener("keydown", onKey, true);
        doc.querySelectorAll("#rb-qs-autoscroll .val").forEach((v) => {
          v.textContent = summary(st);
        });
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      };
      back.append(h(
        "div",
        { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": QS_TITLE },
        h("div", { class: "hd" }, h("b", null, QS_TITLE)),
        body(true),
        h("div", { style: "display:flex;justify-content:flex-end;margin-top:12px" }, ui.btn("닫기", { kind: "primary", onClick: close }))
      ));
      back.addEventListener("mousedown", (e) => {
        if (e.target === back) close();
      });
      doc.addEventListener("keydown", onKey, true);
      host.append(back);
    };
    const row = () => h(
      "button",
      { type: "button", class: "rb-srow dicebox", id: "rb-qs-autoscroll", "aria-haspopup": "dialog", onClick: openSettings },
      h("span", { class: "t" }, QS_TITLE, h("small", null, QS_DESC)),
      h("span", { class: "end" }, h("span", { class: "val" }, summary(st)), h("span", { class: "go", style: "display:inline-flex" }, chevron()))
    );
    const attach = () => {
      for (const c of doc?.querySelectorAll?.(".rb-hqs .rb-story-helper") ?? []) if (!c.querySelector("#rb-qs-autoscroll")) c.appendChild(row());
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
    return () => {
      mo?.disconnect();
      doc?.querySelectorAll?.("#rb-qs-autoscroll").forEach((el) => el.remove());
    };
  }
}
export {
  activate,
  meta
};
