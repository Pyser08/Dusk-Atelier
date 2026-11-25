// 신고 #19: 장면이 이어지는 동안의 ‘지금 시각’(순수). 장면 when은 시작 시각이라 그대로 두고, 이어지는 응답의 시각은 scene.nowWhen에 둔다.
import { parseIso } from "./weather.js";
import { wordTime } from "./kvstatus.js";
import { timeFromText } from "./storytime.js";

const pad = (n, w = 2) => String(n).padStart(w, "0");
const iso = (w) => { const p = parseIso(w); return p ? `${pad(p.y, 4)}-${pad(p.m)}-${pad(p.d)}` : ""; };
const clockText = (w) => { const s = String(w ?? ""); const m = /(밤|저녁|오후|새벽|아침|낮|오전)?\s*(?<!\d)(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/.exec(s);
  const t = timeFromText(s); if (t || !m) return t;
  let h = +m[2]; if (h > 24) return ""; if (/밤|저녁|오후|낮/.test(m[1] ?? "") && h < 12 && !(m[1] === "밤" && h < 6) && !(m[1] === "낮" && h > 9)) h += 12; if (m[1] === "밤" && h === 12) h = 0;
  return `${pad(h % 24)}:${pad(m[4] ? 30 : Math.min(59, +(m[3] ?? 0)))}`; };
export const clockOf = (w) => clockText(w) || wordTime(w);
export const sceneWhen = (s) => s?.nowWhen || s?.when || "";
// 같은 장면이 이어질 때: 새로 읽은 시각(when)·날짜(storyDate)로 지금 시각을 민다. 뒤로는 안 간다(회상). 자정 넘김(밤 → 새벽)은 받는다
export function advanceNow(scene, when, storyDate = "") {
  const cur = sceneWhen(scene), d0 = iso(cur), d1 = storyDate || iso(when) || d0, t0 = clockOf(cur), t1 = clockOf(when);
  if (d0 && d1 && d1 < d0) return false;
  if (d1 === d0) {
    if (!t1 || t1 === t0) return false;
    if (t0 && t1 < t0 && !(t0 >= "18:00" && t1 < "06:00")) return false;
  }
  const next = [d1, t1].filter(Boolean).join(" ");
  if (!next) return false;
  scene.nowWhen = next; return true;
}
