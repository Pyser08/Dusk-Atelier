// 2.2.24: 캐릭터 상태창을 응답 안이 아니라 리스 화면 맨 위에 직접 띄운다.
// 응답 안에 넣은 상태창은 리스가 메시지마다 만든 겹침 층에 갇혀 다른 UI가 뚫고 나오고, 바깥 막도 그 층만 덮어 닫히지 않았다.
// 사진(data URL)도 응답 안에선 리스가 이미지 주소를 바꿔 깨졌다. 여기서는 createElement로 직접 만들어 소독기를 거치지 않는다.
// 응답 안에는 이름만 <span data-dusk="nm" data-pid="…">로 두고, 그 요소들을 찾아 클릭을 단다(리스가 메시지를 다시 그리면 다시 찾는다).

// 상태창 상자(가운데). 리스 테마 색을 그대로 쓴다
const BOX = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 28px));max-height:min(80vh,680px);overflow:auto;overscroll-behavior:contain;padding:14px 14px 10px;border-radius:20px;background:var(--risu-theme-bgcolor,#1b1a24);color:var(--risu-theme-textcolor,#eee);border:1px solid rgba(139,111,224,.32);box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);font-size:13px;line-height:1.5;text-align:left;box-sizing:border-box";

// HTML 글 → 리스 화면 요소(속성은 그대로, style은 setStyleAttribute). <img>는 배경 그림 span으로(일부 판은 src를 막는다)
export async function mountNodes(d, target, html, Parser = globalThis.DOMParser) {
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
      const el = await d.createElement(tag);
      for (const a of [...k.attributes]) {
        const n = a.name.toLowerCase();
        if (n.startsWith("on") || n === "src" || n === "href") continue;
        if (n === "style") await el.setStyleAttribute?.(a.value + extra);
        else { try { await el.setAttribute(n, a.value); } catch { /* 막힌 속성은 건너뜀 */ } }
      }
      if (extra && !k.hasAttribute("style")) await el.setStyleAttribute?.(extra.slice(1));
      await walk(el, k);
      await to.appendChild(el);
    }
  };
  await walk(target, root);
}

// cardOf(pid) → 상태창 안쪽 HTML(없으면 ""). ensureDoc() → 리스 화면 문서(권한 없으면 null)
export function createCardOverlay({ ensureDoc, cardOf, pids = () => [], log = () => {} }) {
  let open = null, hooking = false, timers = [], keyHooked = false, loop = null;
  const close = async () => { const w = open; open = null; if (w) { try { await w.remove(); } catch { /* 이미 없음 */ } } };
  async function show(pid) {
    const d = await ensureDoc(); if (!d) return false;
    await close();
    const html = cardOf(pid); if (!html) return false;
    const body = await d.querySelector("body"); if (!body) return false;
    const wrap = await d.createElement("div"); await wrap.setAttribute("x-dusk", "card-ov");
    await wrap.setStyleAttribute("position:fixed;inset:0;z-index:2147483000;");
    const bg = await d.createElement("div"); await bg.setStyleAttribute("position:absolute;inset:0;background:rgba(0,0,0,.36);");
    await bg.addEventListener("click", () => { close().catch(() => {}); });
    const box = await d.createElement("div"); await box.setAttribute("data-dusk", "pcbox"); await box.setStyleAttribute(BOX);
    await mountNodes(d, box, html + '<span style="display:block;margin-top:10px;font-size:10.5px;opacity:.5;text-align:right">바깥을 누르면 닫혀요 · Dusk 캐릭터 상태창</span>');
    // 2.2.28: 닫기(×) — 바깥 누르기가 안 먹는 환경 대비
    const x = await d.createElement("div"); await x.setAttribute("role", "button"); await x.setAttribute("aria-label", "닫기");
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
        const list = await d.querySelectorAll(`[data-pid="${safe}"]:not([data-hk]), .dusk-pid-${safe}:not([data-hk]), .x-risu-dusk-pid-${safe}:not([data-hk])`);
        const len = typeof list?.length === "function" ? await list.length() : list?.length ?? 0;
        for (let i = 0; i < len; i++) {
          const el = typeof list.at === "function" ? await list.at(i) : typeof list.item === "function" ? await list.item(i) : list[i]; if (!el) continue;
          try { await el.setAttribute("data-hk", "1"); } catch { /* 표시만 못 함 — 다음에 또 달 수 있음 */ }
          await el.addEventListener("click", () => { show(pid).then((ok) => { if (!ok) log("상태창을 열지 못했어요", pid); }).catch((e) => log("상태창 열기 실패", e?.message ?? e)); });
          n++;
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
  return { show, close, hook, soon, stop: () => { if (loop) clearInterval(loop); loop = null; } };
}
