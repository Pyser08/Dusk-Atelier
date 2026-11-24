// 개발자와 채팅(2.2.57): 신고마다 하나. 롱폴링으로 새 글을 바로 받고, 나가기·5분 무입력·화면 숨김이면 연결을 끊어 서버를 쉬게 한다.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { btn, modal } from '../kit.js';
import { REPORT_STATUS } from '../../data/hub.js';

export const IDLE_MS = 5 * 60e3, PEEK_MS = 60e3;
const CSS = `.rb-chat{max-width:560px;width:100%;display:flex;flex-direction:column;gap:10px;max-height:min(86vh,720px);box-sizing:border-box}
.rb-chat-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rb-chat-top h3{margin:0;flex:1;min-width:0}
.rb-chat-st{font-size:12.5px;color:var(--rb-sub)}.rb-chat-st.err{color:var(--rb-danger,#ff5a6a)}
.rb-chat-box{flex:1 1 320px;min-height:140px;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:var(--rb-r2);background:var(--rb-surf2)}
.rb-chat-m{max-width:84%;align-self:flex-start;display:flex;flex-direction:column;gap:2px}.rb-chat-m.me{align-self:flex-end;align-items:flex-end}
.rb-chat-m>div{padding:8px 12px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line2,transparent);white-space:pre-wrap;overflow-wrap:anywhere}
.rb-chat-m.me>div{background:var(--rb-acc-grad,#7c5cf0);color:var(--rb-acc-text,#fff)}.rb-chat-m small{font-size:11px;color:var(--rb-sub)}
.rb-chat-sys{text-align:center;font-size:12px;color:var(--rb-sub)}.rb-chat-in{display:flex;gap:8px;align-items:flex-end}.rb-chat-in textarea{flex:1;min-width:0;resize:none;min-height:44px;max-height:120px}
.rb-chat [hidden]{display:none!important}.rb-chat .btns{flex-wrap:wrap}`;
const when = (t) => { try { return new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
// 화면에 보일 상태 글(순수)
export function chatState(s, { idle = false, err = "" } = {}) {
  if (err) return err;
  if (!s) return "불러오는 중이에요…";
  if (s.closed) return "개발자가 이 대화를 닫았어요.";
  if (!s.in) return s.otherIn ? "개발자가 들어와 있어요. ‘다시 채팅하기’를 누르면 이어져요." : s.left?.by === "dev" ? "개발자가 채팅을 나가서 연결을 끊었어요." : s.left ? "채팅을 나갔어요." : "연결되어 있지 않아요.";
  if (idle) return "한동안 조용해서 연결을 쉬고 있어요.";
  return s.otherOnline ? "● 개발자 접속 중" : "개발자가 자리에 없어요. 글을 남기면 나중에 답해요.";
}

export function openReportChat(ctx, report) {
  const hub = ctx.hub, key = report.key;
  if (!document.getElementById("rb-chat-style")) document.head.appendChild(h("style", { id: "rb-chat-style" }, CSS));
  let dead = false, loop = false, idle = false, err = "", st = null, seq = 0, sig = "", last = Date.now(), sending = false, pend = null, peekT = null, shownAt = 0, resume = () => {};
  const msgs = new Map();
  const onVis = () => { if (document.visibilityState === "visible") { if (idle && st?.in) resume(); } };
  const p = modal(ctx.win, (done) => {
    const state = h("div", { class: "rb-chat-st", "aria-live": "polite" }), chip = h("span", { class: "rb-chip", style: "cursor:default" });
    const box = h("div", { class: "rb-chat-box", role: "log", "aria-label": "대화" });
    const text = h("textarea", { class: "rb-input", rows: 2, maxlength: "1000", placeholder: "글을 적어 주세요", "aria-label": "보낼 글" });
    const send = btn("보내기", { kind: "primary", onClick: () => doSend() });
    const join = btn("다시 채팅하기", { kind: "primary", onClick: () => (st?.in ? resume() : act("join")) });
    const leave = btn("채팅 나가기", { onClick: () => act("leave") });
    const inRow = h("div", { class: "rb-chat-in" }, text, send);
    function draw() {
      state.textContent = chatState(st, { idle, err }); state.className = `rb-chat-st${err ? " err" : ""}`;
      chip.textContent = REPORT_STATUS[st?.status ?? report.status] ?? ""; chip.hidden = !chip.textContent;
      const live = !!st?.in && !idle;
      inRow.hidden = !live; join.hidden = !st || live || !!st.closed; leave.hidden = !st?.in;
      join.textContent = st?.in ? "다시 연결" : st?.left || msgs.size ? "다시 채팅하기" : "채팅 시작";
      send.disabled = sending;
      const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 60 || !box.childElementCount;
      const list = [...msgs.values()].sort((a, b) => a.id - b.id);
      const sigD = `${list.length}|${list.at(-1)?.id}|${st?.read}`;
      if (box.dataset.sig !== sigD) {
        box.dataset.sig = sigD;
        box.replaceChildren(...(list.length ? list.map((m) => m.from === "sys" ? h("div", { class: "rb-chat-sys" }, m.text.replace("신고한 분이", "내가")) : h("div", { class: ["rb-chat-m", m.from === "user" && "me"] }, h("div", null, m.text), h("small", null, `${when(m.at)}${m.from === "user" && m.id <= (st?.read ?? 0) ? " · 읽음" : ""}`))) : [h("div", { class: "rb-chat-sys" }, "아직 나눈 글이 없어요.")]));
        if (stick) box.scrollTop = box.scrollHeight;
      }
    }
    function take(x) {
      for (const m of x.msgs) msgs.set(m.id, m);
      st = x; seq = Math.max(seq, x.seq || 0); if (x.sig) sig = x.sig;
      if (x.changedAt > shownAt) { shownAt = x.changedAt; hub.chatSeen?.(key, x)?.catch?.(() => {}); }
      draw();
      if (x.in && !idle) run(); else schedulePeek();
    }
    // 나간 상태에서는 1분에 한 번만 상대가 다시 들어왔는지 본다
    function schedulePeek() { clearTimeout(peekT); if (dead || st?.in) return; peekT = setTimeout(async () => { if (dead || st?.in) return; if (document.visibilityState === "visible") { try { take(await hub.chat(key, "peek", { after: seq })); return; } catch { /* 다음에 */ } } schedulePeek(); }, PEEK_MS); }
    async function run() {
      if (loop || dead) return;
      loop = true; let fail = 0;
      while (!dead && st?.in && !idle) {
        if (document.visibilityState === "hidden" || Date.now() - last > IDLE_MS) { idle = true; break; }
        try {
          const before = seq, t0 = Date.now(), x = await hub.chat(key, "poll", { after: seq, sig });
          if (dead) break;
          fail = 0; err = ""; if (x.seq > before) last = Date.now();
          take(x);
          if (x.busy) await new Promise((r) => setTimeout(r, 5000));
          else if (x.seq === before && Date.now() - t0 < 500) await new Promise((r) => setTimeout(r, 1000));   // 붙잡아 주지 않는 통로
        } catch (e) { if (dead) break; if (e?.status === 404) { err = e.message; st = null; break; } err = "연결이 끊겨 다시 잇는 중이에요."; draw(); await new Promise((r) => setTimeout(r, Math.min(30e3, 1500 * 2 ** fail++))); }
      }
      loop = false; if (!dead) draw();
    }
    async function act(op, data = {}) {
      try { idle = false; last = Date.now(); const x = await hub.chat(key, op, { after: seq, ...data }); if (dead) return false; err = ""; take(x); return true; }
      catch (e) { if (!dead) { err = e?.message === "timeout" ? "서버가 늦어요. 잠시 뒤 다시 해 주세요." : e?.message ?? String(e); if (e?.left && st) st = { ...st, in: false }; draw(); } return false; }
    }
    resume = () => { idle = false; last = Date.now(); draw(); act("open"); };
    async function doSend() {
      const t = text.value.trim(); if (!t || sending) return;
      sending = true; draw();
      // 답을 못 받아 다시 보내도 한 번만 들어가게 같은 번호를 쓴다
      if (pend?.t !== t) pend = { t, cid: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}` };
      if (await act("send", { text: t, cid: pend.cid })) { pend = null; if (text.value.trim() === t) text.value = ""; }
      sending = false; if (!dead) { draw(); text.focus(); }
    }
    text.addEventListener("input", () => { last = Date.now(); });
    text.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") return done(null); if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !matchMedia("(pointer: coarse)").matches) { e.preventDefault(); doSend(); } });
    document.addEventListener("visibilitychange", onVis);
    draw(); act("open");
    return h("div", { class: "rb-dialog rb-chat", role: "dialog", "aria-label": "개발자에게 채팅" },
      h("div", { class: "rb-chat-top" }, h("h3", { class: "rb-h3" }, `개발자에게 채팅 · #${report.no}`), chip),
      report.title ? h("div", { class: "rb-muted rb-bell-title" }, report.title) : null,
      state, box, inRow,
      h("div", { class: "rb-muted", style: "font-size:11.5px" }, "적은 글과 Dusk 버전만 보내요. 키처럼 보이는 글은 가려요."),
      h("div", { class: "btns" }, leave, join, btn("닫기", { onClick: () => done(null) })));
  });
  return p.finally(() => { dead = true; clearTimeout(peekT); document.removeEventListener("visibilitychange", onVis); });
}
