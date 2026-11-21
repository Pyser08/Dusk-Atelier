// 2.2.24: 캐릭터 상태창을 응답 안이 아니라 리스 화면 맨 위에 직접 띄운다.
// 응답 안에 넣은 상태창은 리스가 메시지마다 만든 겹침 층에 갇혀 다른 UI가 뚫고 나오고, 바깥 막도 그 층만 덮어 닫히지 않았다.
// 사진(data URL)도 응답 안에선 리스가 이미지 주소를 바꿔 깨졌다. 여기서는 createElement로 직접 만들어 소독기를 거치지 않는다.
// 응답 안에는 이름만 <span data-dusk="nm" data-pid="…">로 두고, 그 요소들을 찾아 클릭을 단다(리스가 메시지를 다시 그리면 다시 찾는다).

// 상태창 상자(가운데). 리스 테마 색을 그대로 쓴다
const BOX = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 28px));max-height:min(80vh,680px);overflow:auto;overscroll-behavior:contain;padding:14px 14px 10px;border-radius:20px;background:var(--risu-theme-bgcolor,#1b1a24);color:var(--risu-theme-textcolor,#eee);border:1px solid rgba(139,111,224,.32);box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);font-size:13px;line-height:1.5;text-align:left;box-sizing:border-box";

// HTML 글 → 리스 화면 요소(속성은 그대로, style은 setStyleAttribute). <img>는 배경 그림 span으로(일부 판은 src를 막는다)
// 2.2.30: 리스는 x- 속성만 붙일 수 있다 → data-*·class는 x-* 로도 붙여 둔다(전역 CSS는 xifyCss로 x- 선택자를 함께 둔다).
// <details> 탭(data-dusk=tab)은 open/name 속성을 못 붙여 열고 닫을 수 없으니 div로 그리고 누르면 스타일로 바꾼다(ctx.tabs)
export const mirrorName = (n) => (n === "class" ? "x-class" : n.startsWith("data-") ? `x-${n.slice(5)}` : "");
export async function mountNodes(d, target, html, Parser = globalThis.DOMParser, ctx = { tabs: [] }) {
  const root = new Parser().parseFromString(`<body>${html}</body>`, "text/html").body;
  const walk = async (to, node) => {
    const kids = [...node.childNodes], mixed = kids.some((k) => k.nodeType === 1);
    for (const k of kids) {
      if (k.nodeType === 3) {
        const t = k.textContent; if (!t) continue;
        if (!mixed) { await to.setInnerText(t); continue; }
        if (!t.trim()) continue;
        const sp = await d.createElement("span"); await sp.setInnerText(t); await to.appendChild(sp); continue;
      }
      if (k.nodeType !== 1) continue;
      let tag = k.tagName.toLowerCase(), extra = "";
      if (tag === "img") { tag = "span"; const src = k.getAttribute("src") ?? ""; if (/^data:image\/|^https?:/i.test(src)) extra = `;display:inline-block;background:center/cover no-repeat url("${src.replace(/"/g, "%22")}")`; }
      if (tag === "script" || tag === "style" || tag === "iframe") continue;
      if (k.getAttribute("data-dusk") === "tabhint") continue;   // 화면 위 창은 탭 하나가 늘 열려 있어 안내 글이 겹친다
      const isTab = tag === "details" && k.getAttribute("data-dusk") === "tab";
      if (isTab) tag = "div"; else if (tag === "summary" && node.tagName?.toLowerCase() === "details" && node.getAttribute("data-dusk") === "tab") tag = "div";
      const el = await d.createElement(tag);
      for (const a of [...k.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith("on") || n === "src" || n === "href") continue;
        if (n === "style") await el.setStyleAttribute?.(a.value + extra);
        else {
          try { await el.setAttribute(n, a.value); } catch { /* 막힌 속성은 건너뜀 */ }
          const m = mirrorName(n); if (m) { try { await el.setAttribute(m, a.value); } catch { /* 없음 */ } }
        }
      }
      if (isTab) {
        const sum = [...k.children].find((c) => c.tagName.toLowerCase() === "summary"), panel = [...k.children].find((c) => c !== sum);
        ctx.tabs.push({ el, group: k.getAttribute("name") ?? "", kind: k.getAttribute("data-tab") ?? "", open: k.hasAttribute("open"), sumStyle: sum?.getAttribute("style") ?? "", panelStyle: panel?.getAttribute("style") ?? "", sum: null, panel: null, src: { sum, panel } });
      }
      const tabOf = ctx.tabs.find((t) => t.src.sum === k || t.src.panel === k);
      if (tabOf) { if (tabOf.src.sum === k) tabOf.sum = el; else tabOf.panel = el; }
      if (extra && !k.hasAttribute("style")) await el.setStyleAttribute?.(extra.slice(1));
      await walk(el, k);
      await to.appendChild(el);
    }
  };
  await walk(target, root);
  return ctx;
}
// 탭 켜기: 고른 탭만 내용 보이고 버튼 강조(원래 CSS [open]>summary 와 같은 모양)
const ON = "color:#fff;border-color:transparent;background:linear-gradient(135deg,#8b6fe0,#a77bf0);box-shadow:0 4px 14px rgba(139,111,224,.35)", ON_N = "color:#fff;border-color:transparent;background:linear-gradient(135deg,#e8578e,#f07aa4);box-shadow:0 4px 14px rgba(232,87,142,.35)";
export async function wireTabs(tabs) {
  const groups = new Map(); for (const t of tabs) { if (!t.sum || !t.panel) continue; if (!groups.has(t.group)) groups.set(t.group, []); groups.get(t.group).push(t); }
  for (const list of groups.values()) {
    if (!list.some((t) => t.open)) list[0].open = true;
    const paint = async (on) => { for (const t of list) { const o = t === on; t.open = o; try { await t.sum.setStyleAttribute(`${t.sumStyle};${o ? (t.kind === "n" ? ON_N : ON) : ""}`); await t.panel.setStyleAttribute(`${t.panelStyle};display:${o ? "block" : "none"}`); } catch { /* 스타일 못 바꿈 */ } } };
    await paint(list.find((t) => t.open));
    for (const t of list) { try { await t.sum.addEventListener("click", () => { paint(t).catch(() => {}); }); } catch { /* 클릭 못 받음 */ } }
  }
}
// 전역 CSS에 x- 선택자 짝을 붙인다: [data-a=b] → [x-a=b], .cls → [x-class~="cls"]
export function xifyCss(css) {
  const out = [];
  String(css).replace(/([^{}]+)\{([^{}]*)\}/g, (all, sel, body) => {
    const s = sel.trim(); if (!s || s.startsWith("@") || /^(from|to|\d+%)/.test(s)) return all;
    const x = s.replace(/\[data-/g, "[x-").replace(/\.([A-Za-z_][\w-]*)/g, '[x-class~="$1"]').replace(/(details|summary)(?=[\[:>.\s,]|$)/g, (m, t, i, str) => (/\[x-dusk=tab\]/.test(str) ? "div" : t));
    if (x !== s) out.push(`${x}{${body}}`);
    return all;
  });
  return css + out.join("");
}

// 2.2.30: 리스는 x- 로 시작하는 속성만 setAttribute를 허락한다(다른 건 예외) → 실패해도 넘어간다
const attr = async (el, n, v) => { try { await el.setAttribute(n, v); } catch { /* 막힌 속성 */ } };
// cardOf(pid) → 상태창 안쪽 HTML(없으면 ""). ensureDoc() → 리스 화면 문서(권한 없으면 null)
export function createCardOverlay({ ensureDoc, cardOf, pids = () => [], log = () => {}, onFail = () => {} }) {
  let open = null, hooking = false, timers = [], keyHooked = false, loop = null, total = 0;
  const close = async () => { const w = open; open = null; if (w) { try { await w.remove(); } catch { /* 이미 없음 */ } } };
  async function show(pid) {
    const d = await ensureDoc(); if (!d) return false;
    await close();
    const html = await cardOf(pid); if (!html) return false;
    const body = await d.querySelector("body"); if (!body) return false;
    const wrap = await d.createElement("div"); await wrap.setAttribute("x-dusk", "card-ov");
    await wrap.setStyleAttribute("position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;z-index:2147483000;");
    const bg = await d.createElement("div"); await bg.setStyleAttribute("position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.36);");
    await bg.addEventListener("click", () => { close().catch(() => {}); });
    const box = await d.createElement("div"); await attr(box, "data-dusk", "pcbox"); await box.setStyleAttribute(BOX);
    // 2.2.30: 그리다 실패해도(판마다 DOM 함수가 다름) 글자만이라도 띄운다
    let ctx = { tabs: [] };
    try { ctx = await mountNodes(d, box, html + '<span style="display:block;margin-top:10px;font-size:10.5px;opacity:.5;text-align:right">바깥을 누르면 닫혀요 · Dusk 캐릭터 상태창</span>', undefined, ctx); await wireTabs(ctx.tabs); } catch (e) { log("상태창 그리기 일부 실패", e?.message ?? e); try { await box.setInnerText(String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); } catch { /* 빈 상자라도 */ } }
    // 2.2.28: 닫기(×) — 바깥 누르기가 안 먹는 환경 대비
    const x = await d.createElement("div"); await attr(x, "role", "button"); await attr(x, "aria-label", "닫기");
    await x.setStyleAttribute("position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;line-height:1;background:rgba(127,127,127,.18);color:inherit;z-index:2;");
    await x.setInnerText("×"); await x.addEventListener("click", () => { close().catch(() => {}); }); await box.appendChild(x);
    await wrap.appendChild(bg); await wrap.appendChild(box); await body.appendChild(wrap);
    open = wrap;
    if (!keyHooked) { keyHooked = true; try { await d.addEventListener("keydown", (ev) => { if (open && (ev?.key === "Escape" || ev?.key === "Esc")) close().catch(() => {}); }); } catch { /* 키를 못 받아도 닫기 버튼 */ } }
    return true;
  }
  // 응답 안 이름(data-dusk="nm")에 클릭을 단다. 이미 단 것은 data-hk로 건너뛴다
  // 응답 안 이름에 클릭을 단다. 2.2.29: 속성을 읽지 않고(판에 따라 getAttribute가 없음) 인물마다 선택자로 찾는다 — data-pid, 클래스(리스가 x-risu- 를 붙이는 판 포함)
  async function hook() {
    if (hooking) return 0; hooking = true; let n = 0;
    try {
      const d = await ensureDoc(); if (!d) return 0;
      for (const pid of pids()) {
        const safe = String(pid).replace(/[^\w-]/g, ""); if (!safe) continue;
        const list = await d.querySelectorAll(`[data-pid="${safe}"]:not([data-hk]):not([x-dusk-hk]), .dusk-pid-${safe}:not([data-hk]):not([x-dusk-hk]), .x-risu-dusk-pid-${safe}:not([data-hk]):not([x-dusk-hk])`);
        const len = typeof list?.length === "function" ? await list.length() : list?.length ?? 0;
        for (let i = 0; i < len; i++) {
          const el = typeof list.at === "function" ? await list.at(i) : typeof list.item === "function" ? await list.item(i) : list[i]; if (!el) continue;
          await attr(el, "x-dusk-hk", "1"); await attr(el, "data-hk", "1");
          await el.addEventListener("click", () => { show(pid).then((ok) => { if (!ok) { log("상태창을 열지 못했어요", pid); onFail(); } }).catch((e) => { log("상태창 열기 실패", e?.message ?? e); onFail(); }); });
          n++; total++;
        }
      }
    } catch (e) { log("이름 클릭 달기 실패", e?.message ?? e); } finally { hooking = false; }
    return n;
  }
  // 응답이 그려진 뒤 찾는다(리스가 그리는 시점을 모르니 몇 번 나눠서)
  // 2.2.28: 리스가 메시지를 다시 그리면 클릭이 사라진다 → 몇 초마다 새 이름을 찾는다(응답 표시 직후엔 빨리)
  function soon() {
    for (const t of timers) clearTimeout(t); timers = [300, 1200, 3500].map((ms) => setTimeout(() => { hook().catch(() => {}); }, ms));
    loop ??= setInterval(() => { hook().catch(() => {}); }, 2500);
  }
  return { show, close, hook, soon, total: () => total, stop: () => { if (loop) clearInterval(loop); loop = null; } };
}
