// 프로바이더 진행 창의 요청 상태(순수, 2.0.0). Provider Manager의 진행 창을 참고하되 동시 요청을 제대로 다룬다.
// - 요청 ID마다 상태를 따로 둔다(예전 방식처럼 상태 하나를 덮어쓰지 않음).
// - 끝난 요청은 linger(기본 5초) 동안 '완료/실패'로 남았다가 빠진다. 창은 진행 중인 요청이 하나도 없고 남은 카드도 없을 때만 숨긴다.
// - 요청의 수명은 화면(DOM)과 무관하다: 창을 껐다 켜거나 설정을 바꿔도 상태·타이머는 여기 그대로.
export const PHASES = { send: "보내는 중", wait: "기다리는 중", recv: "받는 중", retry: "다시 시도" };
export function createBoard({ now = () => Date.now(), linger = 5000 } = {}) {
  const cards = new Map();
  const subs = new Set();
  const emit = () => subs.forEach((f) => { try { f(); } catch { /* 화면 오류 무시 */ } });
  return {
    start(id, info = {}) { cards.set(id, { id, at: now(), phase: "send", done: false, status: "", note: "", chars: 0, attempt: 1, ...info }); emit(); },
    update(id, patch) { const c = cards.get(id); if (!c || c.done) return; Object.assign(c, patch); emit(); },
    end(id, status = "ok", note = "") { const c = cards.get(id); if (!c || c.done) return; Object.assign(c, { done: true, status, note, endAt: now() }); emit(); },
    // 남은 시간이 지난 끝난 카드를 뺀다. 반환: 뺀 id들
    sweep() { const t = now(), gone = []; for (const [id, c] of cards) if (c.done && t - c.endAt >= linger) { cards.delete(id); gone.push(id); } if (gone.length) emit(); return gone; },
    list: () => [...cards.values()].sort((a, b) => a.at - b.at),
    active: () => [...cards.values()].filter((c) => !c.done).length,
    visible: () => cards.size > 0,
    nextSweepIn() { const t = now(); let m = Infinity; for (const c of cards.values()) if (c.done) m = Math.min(m, Math.max(0, linger - (t - c.endAt))); return m === Infinity ? null : m; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    linger
  };
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const secs = (ms) => `${Math.max(0, Math.round(ms / 1000))}초`;
// 카드 목록 → HTML(리스 화면에 그대로 넣는다. 글자는 모두 이스케이프)
export function boardHtml(list, now = Date.now()) {
  const row = (c) => {
    const tone = c.done ? (c.status === "ok" ? "#4caf7d" : c.status === "abort" ? "#9d99c1" : "#e0605a") : "#7c5cf0";
    const state = c.done ? (c.status === "ok" ? "완료" : c.status === "abort" ? "취소됨" : "실패") : PHASES[c.phase] ?? "진행 중";
    const extra = [c.attempt > 1 ? `${c.attempt}번째 시도` : "", c.waitUntil && !c.done ? `${secs(c.waitUntil - now)} 뒤 다시` : "", c.chars ? `${c.chars.toLocaleString()}자${c.tokens ? ` · 약 ${c.tokens.toLocaleString()}토큰` : ""}` : "", !c.done ? secs(now - c.at) : ""].filter(Boolean).join(" · ");
    return `<div data-req="${esc(c.id)}" style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)">`
      + `<span style="flex:none;width:8px;height:8px;margin-top:6px;border-radius:50%;background:${tone}"></span>`
      + `<span style="flex:1;min-width:0"><b style="font-size:12px">${esc(c.label || c.model || "요청")}</b> <span style="font-size:11px;color:#9d99c1">${esc(state)}</span>`
      + `${extra ? `<br><span style="font-size:11px;color:#9d99c1">${esc(extra)}</span>` : ""}${c.note ? `<br><span style="font-size:11px;color:${tone}">${esc(c.note)}</span>` : ""}</span></div>`;
  };
  return list.map(row).join("");
}
