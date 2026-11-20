// 장기기억 애드온: 지난 대화 분석 진행 표시를 화면 밖에 둔다. 다른 창에 갔다 와서 화면을 다시 그려도
//   진행 막대·취소 버튼이 이어서 보이게 한다(분석 자체는 그대로 돈다). 키: 캐릭터 번호|채팅 번호
import { h, replace } from "../../dom.js";
import { btn, progressBar } from "../../kit.js";

const RUN = new Map();
export const bfKey = (ci, ti) => `${ci}|${ti}`;
export const bfRunning = (key) => RUN.has(key);
function paint(r) {
  for (const el of r.els) {
    const cancel = btn("취소", { size: "sm", onClick: () => r.ctrl.abort() });
    replace(el, progressBar(r.t ? Math.round(r.n / r.t * 100) : 0), r.t ? h("span", { class: "rb-muted" }, `${r.n}/${r.t} · 실패 ${r.f}`) : null, cancel);
  }
}
// 다시 그린 화면의 진행 칸을 붙인다. 진행 중이 아니면 false
export function bfAttach(key, prog) {
  const r = RUN.get(key); if (!r || !prog) return false;
  for (const el of [...r.els]) if (!el.isConnected) r.els.delete(el);
  r.els.add(prog); paint(r); return true;
}
// fn(onProgress) 를 돌리는 동안 진행을 기억한다
export async function bfRun(key, ctrl, prog, fn) {
  const r = { n: 0, t: 0, f: 0, ctrl, els: new Set([prog]) };
  RUN.set(key, r); paint(r);
  try { return await fn((n, t, f) => { r.n = n; r.t = t; r.f = f; paint(r); }); }
  finally { if (RUN.get(key) === r) RUN.delete(key); for (const el of r.els) replace(el); }
}
