// PC 리스 메인 화면 오른쪽 아래 '빠른 가져오기' 상자 (메인 화면 접근 권한이 있을 때만)
// 상자를 누르면 Dusk 가져오기 화면이 열리고, 거기에 끌어 놓으면 에셋을 여러 개씩 동시에 올린다.
// ×를 누르면 동그란 아이콘으로 작아지고, 아이콘을 누르면 다시 상자로 펼쳐진다.
// 마우스로 끌어서 옮길 수 있다. 접힌 상태와 위치는 기억한다.
// 봇에 들어가 채팅 화면이 떠 있는 동안에는 상자·아이콘을 숨기고, 채팅 화면에서 나오면 다시 보인다.
// 리스는 플러그인에 drop 이벤트를 주지 않아서 상자 위에 놓은 파일은 받을 수 없다
// → 상자에는 '눌러서 열기'로만 안내한다. 모바일은 + 메뉴에 이미 버튼이 있으니 띄우지 않는다.
//
// 리스 샌드박스 주의: 메인 화면 요소에는 x- 로 시작하는 속성만 넣을 수 있다(title 등은 오류).
// 이벤트도 click·pointer·mouse 계열만 되고, 좌표 같은 값만 넘어온다.
import { isMobileDevice } from '../data/presets.js';
import { readUi, watchDefaults } from './watch.js';

var MARK = "quickimport";
var STATE_KEY = "rbm:quickimport:v1";
var MARGIN = 8, DRAG_PX = 5;
// 기본 위치: 오른쪽 아래. 채팅 입력칸·보내기 버튼을 가리지 않게 띄운다.
var DEFAULT_POS = { right: 16, bottom: 96 };
var SIZE = { wide: { w: 292, h: 104 }, mini: { w: 52, h: 52 } };
// z-index는 Dusk 창(플러그인 화면, 1000)보다 낮게: Dusk를 열면 상자가 창 뒤로 숨는다.
var BASE = "position:fixed;z-index:999;display:flex;align-items:stretch;background:linear-gradient(135deg,#1b1930,#221f3a);border:1px solid #4b4580;box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 1px rgba(124,92,240,.2);color:#ecebf6;font:13px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;user-select:none;-webkit-user-select:none;touch-action:none;transition:opacity .2s";
var BOX = {
  wide: `${BASE};width:292px;max-width:calc(100vw - 16px);border-radius:16px`,
  mini: `${BASE};width:52px;height:52px;border-radius:26px`
};
var MAIN = {
  wide: "flex:1;min-width:0;display:flex;gap:12px;align-items:center;padding:14px 4px 14px 14px;cursor:pointer",
  mini: "flex:1;display:flex;align-items:center;justify-content:center;cursor:pointer"
};
var X = {
  wide: "flex:none;width:34px;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;cursor:pointer;color:#9d99c1;font-size:18px",
  mini: "display:none"
};
var ICON = (size) => `<span style="flex:none;display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;text-align:center;border-radius:${Math.round(size * 0.3)}px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);font-size:${Math.round(size * 0.48)}px">⚡</span>`;
var INNER = {
  wide: `${ICON(42)}<span style="display:block;flex:1;min-width:0"><b style="display:block;font-size:15px;color:#ffffff">빠른 가져오기</b><span style="display:block;font-size:12.5px;color:#b1aecb;word-break:keep-all">에셋을 여러 개씩 동시에 올려서 리스 기본 가져오기보다 빨라요</span><span style="display:block;margin-top:5px;font-size:12px;font-weight:700;color:#c4b1ff;word-break:keep-all">눌러서 연 뒤 파일을 끌어 놓으세요 →</span></span>`,
  mini: ICON(40)
};
// 채팅 화면 감지: 채팅 입력칸·채팅 화면 요소가 있으면 채팅 중으로 본다
var CHAT_SEL = "textarea.text-input-area, .default-chat-screen, .risu-chat";
var CHAT_POLL_MS = 1200;
var num = (v, d) => Number.isFinite(v) ? v : d;

export function createQuickImport(api, { getDoc, onOpen } = {}) {
  let doc = null, box = null, main = null, x = null;
  let enabled = false, mini = false, mounting = null;
  let pos = { ...DEFAULT_POS };
  let view = { w: 0, h: 0 };
  // 끌기: 메인 화면 전체의 pointermove·pointerup은 끄는 동안에만 듣는다
  let drag = null, lastDragEnd = 0;
  // 채팅 화면이 떠 있는 동안 숨긴다
  let hidden = false, chatTimer = null, chatBusy = false;

  async function loadState() {
    try {
      const raw = await api.pluginStorage.getItem(STATE_KEY);
      const v = typeof raw === "string" ? JSON.parse(raw) : raw;
      mini = v?.mini === true;
      pos = { right: num(v?.right, DEFAULT_POS.right), bottom: num(v?.bottom, DEFAULT_POS.bottom) };
    } catch {
    }
  }
  const saveState = () => api.pluginStorage.setItem(STATE_KEY, JSON.stringify({ mini, right: pos.right, bottom: pos.bottom })).catch(() => {
  });

  // 화면 크기 (알 수 없으면 0 → 화면 안으로 당기기를 건너뛴다)
  async function readView() {
    try {
      const html = await doc.querySelector("html");
      const [w, h] = await Promise.all([html.clientWidth(), html.clientHeight()]);
      if (w > 0 && h > 0) view = { w, h };
    } catch {
    }
  }
  // 창 크기가 줄었거나 접기·펼치기로 크기가 바뀌어도 화면 밖으로 나가지 않게
  function clamp(p) {
    const s = SIZE[mini ? "mini" : "wide"];
    let { right, bottom } = p;
    if (view.w > 0) right = Math.min(Math.max(MARGIN, right), Math.max(MARGIN, view.w - s.w - MARGIN));
    if (view.h > 0) bottom = Math.min(Math.max(MARGIN, bottom), Math.max(MARGIN, view.h - s.h - MARGIN));
    return { right: Math.round(right), bottom: Math.round(bottom) };
  }
  const boxStyle = (visible) => `${BOX[mini ? "mini" : "wide"]};right:${pos.right}px;bottom:${pos.bottom}px;opacity:${visible ? 1 : 0}${hidden ? ";display:none" : ""}`;

  // 자동 감지가 켜져 있으면 감지기가 먼저 메인 화면을 얻는다. 허락 창이 두 번 뜨지 않게 잠시 기다린다.
  async function rootDoc(waitForWatcher) {
    for (let i = 0; waitForWatcher && i < 20 && !getDoc?.(); i++) await new Promise((r) => setTimeout(r, 500));
    const d = getDoc?.();
    if (d) return d;
    try {
      return await api.getRootDocument();
    } catch {
      return null;
    }
  }

  // 지금 상태(상자/아이콘)에 맞게 모양을 바꾼다
  async function paint(visible = true) {
    if (!box) return;
    const k = mini ? "mini" : "wide";
    pos = clamp(pos);
    await Promise.all([
      main.setStyleAttribute(MAIN[k]),
      main.setInnerHTML(INNER[k]),
      x.setStyleAttribute(X[k]),
      box.setStyleAttribute(boxStyle(visible))
    ]);
  }

  async function inChat() {
    try {
      return !!(await doc.querySelector(CHAT_SEL));
    } catch {
      return false;
    }
  }
  async function checkChat() {
    if (chatBusy || !box || !doc || drag) return;
    chatBusy = true;
    try {
      const now = await inChat();
      if (now !== hidden && box) {
        hidden = now;
        await box.setStyle("display", hidden ? "none" : "flex").catch(() => {
        });
      }
    } finally {
      chatBusy = false;
    }
  }
  function startChatWatch() {
    if (chatTimer) return;
    chatTimer = setInterval(() => checkChat(), CHAT_POLL_MS);
  }
  function stopChatWatch() {
    clearInterval(chatTimer);
    chatTimer = null;
    hidden = false;
  }

  async function setMini(on) {
    if (mini === on) return;
    mini = on;
    await readView();
    await paint().catch(() => {
    });
    saveState();
  }

  async function startDrag(e) {
    if (drag || !box || !doc) return;
    if (e?.button !== void 0 && e.button !== 0) return;
    const d = { x0: e.clientX, y0: e.clientY, start: { ...pos }, moved: false, ids: [], pending: false, next: null };
    drag = d;
    readView();
    const move = (ev) => {
      if (drag !== d) return;
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
      if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return;
      d.moved = true;
      pos = clamp({ right: d.start.right - dx, bottom: d.start.bottom - dy });
      // 메인 화면 호출은 왕복이라, 앞의 것이 끝나기 전에 온 움직임은 마지막 것만 반영한다
      d.next = { ...pos };
      if (d.pending) return;
      d.pending = true;
      (async () => {
        while (d.next && box) {
          const p = d.next;
          d.next = null;
          await Promise.all([box.setStyle("right", `${p.right}px`), box.setStyle("bottom", `${p.bottom}px`)]).catch(() => {
          });
        }
        d.pending = false;
      })();
    };
    const end = () => {
      if (drag !== d) return;
      drag = null;
      for (const [t, id] of d.ids) doc?.removeEventListener(t, id)?.catch?.(() => {
      });
      if (d.moved) {
        lastDragEnd = Date.now();
        saveState();
      }
    };
    try {
      d.ids = await Promise.all(["pointermove", "pointerup", "pointercancel"].map(async (t) => [t, await doc.addEventListener(t, t === "pointermove" ? move : end)]));
    } catch {
      drag = null;
    }
  }
  // 끌기가 끝난 직후 따라오는 클릭은 무시한다 (끌어서 옮겼는데 창이 열리거나 접히지 않게)
  const wasDrag = () => drag?.moved || Date.now() - lastDragEnd < 400;

  async function mount(waitForWatcher = false) {
    if (box || !enabled || isMobileDevice()) return;
    if (mounting) return mounting;
    mounting = (async () => {
      try {
        const d = await rootDoc(waitForWatcher);
        if (!d || box || !enabled) return;
        doc = d;
        const body = await d.querySelector("body");
        if (!body) return;
        // 플러그인을 다시 불러온 경우 남아 있는 상자를 치운다
        const old = await d.querySelector(`[x-dusk="${MARK}"]`).catch(() => null);
        if (old) await old.remove().catch(() => {
        });
        await readView();
        // 메인 화면 호출은 하나하나가 왕복이라, 서로 상관없는 것은 한꺼번에 보낸다
        const [b, m, xx] = await Promise.all([d.createElement("div"), d.createElement("div"), d.createElement("div")]);
        await Promise.all([
          b.setAttribute("x-dusk", MARK),
          xx.setInnerText("×"),
          b.addEventListener("pointerdown", (e) => startDrag(e)),
          // 상자를 누르면 가져오기 화면, 아이콘을 누르면 다시 상자로
          m.addEventListener("click", () => {
            if (wasDrag()) return;
            if (mini) setMini(false);
            else onOpen?.();
          }),
          xx.addEventListener("click", () => {
            if (wasDrag()) return;
            setMini(true);
          })
        ]);
        box = b;
        main = m;
        x = xx;
        await paint(false);
        await Promise.all([b.appendChild(m), b.appendChild(xx)]);
        await body.appendChild(b);
        setTimeout(() => paint(true).catch(() => {
        }), 30);
        startChatWatch();
        checkChat();
      } catch (e) {
        console.log(`[Dusk Atelier] 빠른 가져오기 상자를 띄우지 못했어요: ${e?.message ?? e}`);
        box = main = x = null;
      } finally {
        mounting = null;
      }
    })();
    return mounting;
  }

  async function unmount() {
    const b = box;
    stopChatWatch();
    box = main = x = null;
    if (b) await b.remove().catch(() => {
    });
  }

  return {
    async start() {
      const ui = watchDefaults(await readUi(api));
      enabled = ui.quickImport;
      await loadState();
      await mount(ui.autoDetect);
    },
    async setEnabled(on) {
      enabled = on;
      if (on) await mount();
      else await unmount();
    },
    get shown() {
      return !!box;
    },
    get mini() {
      return mini;
    }
  };
}
