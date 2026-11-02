// 응답 아래 표시 (1.8.3, 순수): 주사위 결과 · 모델 호출 정보. 리스 메시지 안이라 인라인 style만 쓴다.
import { DEFAULT_CUTS } from "./fairplay.js";

export const VERDICTS = ["대실패", "실패", "애매", "성공", "대성공"];
const COLOR = { 대실패: "#ff6b6b", 실패: "#ff9f6b", 애매: "#e0c050", 성공: "#6bcf8f", 대성공: "#53c7ff" };
const CUTS = [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"], ["extreme", "극악"]];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 굴림 − 목표치. 20 이상 대성공 · 5 이상 성공 · ±5 안 애매 · −25 초과 실패 · 그 이하 대실패. 1은 늘 대실패, 100은 늘 대성공.
export function judgeRoll(roll, cutoff) {
  if (roll <= 1) return "대실패";
  if (roll >= 100) return "대성공";
  const d = roll - cutoff;
  if (d >= 20) return "대성공";
  if (d >= 5) return "성공";
  if (d > -5) return "애매";
  if (d > -25) return "실패";
  return "대실패";
}
export function estimateTokens(text) {
  const s = String(text ?? ""); let n = 0;
  for (const ch of s) n += ch.charCodeAt(0) < 128 ? 0.27 : 0.8;
  return Math.ceil(n);
}
export const fmtTokens = (n) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
export const fmtSec = (ms) => `${(Math.max(0, ms) / 1000).toFixed(1)}초`;

const BOX = 'margin-top:8px;font-size:13px;line-height:1.5;border:1px solid rgba(124,92,240,.35);border-radius:10px;padding:2px 10px;background:rgba(124,92,240,.06)';
const SUM = 'cursor:pointer;padding:5px 0;font-weight:700;color:#b8acff;list-style:none';
const anim = (i) => `animation:dusk-dice-roll .7s ease-out ${i * 0.18}s both`;

// 주사위: 굴림값 + 난이도 4개마다 '목표 vs 실제 → 판정'
export function diceHtml(rec) {
  const d = rec?.dice; if (!d?.rolls?.length) return "";
  const cuts = d.cuts ?? DEFAULT_CUTS;
  const head = CUTS.map(([k, t]) => `<span style="text-align:center;font-size:11px;opacity:.75">${t} 목표 ${cuts[k]}</span>`).join("");
  const rows = d.rolls.map((r, i) => `<span style="display:inline-block;${anim(i)};font-weight:800;font-size:16px;text-align:center;min-width:2.2em">🎲 ${r}</span>${CUTS.map(([k]) => { const v = judgeRoll(r, cuts[k]); return `<span style="text-align:center;font-size:12px;font-weight:700;color:${COLOR[v]}">${r} → ${v}</span>`; }).join("")}`).join("");
  return `\n\n<details x-dusk="dice" style="${BOX}"><summary style="${SUM}">🎲 주사위 ${d.rolls.join(" · ")}</summary><div style="display:grid;grid-template-columns:auto repeat(4,minmax(0,1fr));gap:4px 6px;align-items:center;padding:4px 0"><span></span>${head}${rows}</div><div style="padding:2px 0 4px;font-size:11px;opacity:.6">AI가 행동마다 난이도를 고르고, 굴림은 순서대로 한 번씩 써요. 굴림 ≥ 목표면 성공이에요.</div></details>`;
}

// 모델 호출: 접힌 줄에 요약, 펼치면 상세 + 들어간 로어북
export function callHtml(rec, lore = null) {
  if (!rec) return "";
  const total = (rec.lastAt ?? 0) - (rec.startAt ?? rec.at ?? 0);
  const wait = rec.firstAt ? rec.firstAt - (rec.startAt ?? rec.at ?? 0) : 0;
  const kind = rec.aux ? "보조" : "메인";
  const sum = `⏱ ${kind} · ${esc(rec.model || "모델 알 수 없음")} · ${fmtSec(total)}${rec.inTok != null ? ` · 입력 약 ${fmtTokens(rec.inTok)}` : ""}${rec.outTok != null ? ` · 출력 약 ${fmtTokens(rec.outTok)}` : ""}`;
  const row = (k, v) => `<div style="display:flex;gap:8px;padding:3px 0;border-top:1px solid rgba(157,153,193,.18)"><b style="flex:none;min-width:5em">${k}</b><span style="min-width:0;word-break:break-word">${v}</span></div>`;
  const names = (lore?.entries ?? []).map((e) => esc(e.n)).filter(Boolean);
  return `\n\n<details x-dusk="turn" style="${BOX}"><summary style="${SUM}">${sum}</summary>${row("구분", `${kind} 모델`)}${row("모델", esc(rec.model || "알 수 없음"))}${row("걸린 시간", `첫 글자까지 ${fmtSec(wait)} (추론·대기) · 출력 ${fmtSec(Math.max(0, total - wait))} · 합계 ${fmtSec(total)}`)}${row("예상 토큰", `입력 약 ${fmtTokens(rec.inTok ?? 0)} · 출력 약 ${fmtTokens(rec.outTok ?? 0)} (글자 수로 어림)`)}${rec.cache ? row("캐시(어림)", esc(cacheLine(rec.cache))) : ""}${row("로어북", names.length ? `${names.length}개 · ${names.join(", ")}` : "들어간 로어북이 없어요")}</details>`;
}

// ── 캐시 적중 어림 (1.8.3): 직전 메인 요청과 앞부분이 어디까지 같은지. 프롬프트 캐시는 '앞부분이 글자까지 같은 만큼'만 다시 쓴다. ──
const DUSK_SRC = [["[Dusk Fairness]", "공정한 전개"], ["[Dusk Dice]", "유저 편향 주사위"], ["[Dusk Time]", "이야기 시간"], ["[Dusk · image tag", "이미지 태그 알림"], ["# Dusk Memory Section", "장기 기억"], ["[USER ADDED RULES", "내 프롬프트"], ["bardwiki-plugin-context", "BardWiki"]];
const flat = (c) => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => typeof p === "string" ? p : p?.text ?? "").join("") : String(c ?? "");
const duskOf = (m) => { const t = flat(m?.content); const hit = DUSK_SRC.find(([k]) => t.includes(k)); return hit ? hit[1] : null; };
export function prefixInfo(prev, cur) {
  if (!Array.isArray(prev) || !Array.isArray(cur) || !prev.length) return null;
  const ser = (m) => `${m?.role ?? ""}\n${flat(m?.content)}`;
  let same = 0, total = 0, breakAt = -1;
  for (const m of cur) total += estimateTokens(ser(m));
  for (let i = 0; i < cur.length; i++) {
    const a = i < prev.length ? ser(prev[i]) : null, b = ser(cur[i]);
    if (a === b) { same += estimateTokens(b); continue; }
    breakAt = i;
    if (a != null) { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; same += estimateTokens(b.slice(0, k)); }
    break;
  }
  const dusk = breakAt < 0 ? null : (duskOf(cur[breakAt]) ?? duskOf(prev[breakAt]));
  return { same, total, ratio: total ? same / total : 1, breakAt, at: breakAt < 0 ? cur.length : breakAt, of: cur.length, dusk };
}
export function cacheLine(p) {
  if (!p) return "비교할 직전 요청이 없어요";
  const pct = Math.round(p.ratio * 100);
  const where = p.breakAt < 0 ? "전부 같음" : `${p.of}개 중 ${p.breakAt + 1}번째 메시지부터 달라짐`;
  return `앞부분 약 ${pct}% 같음 (${fmtTokens(p.same)} 토큰) · ${where}${p.dusk ? ` · Dusk '${p.dusk}'에서 달라졌어요` : ""}`;
}

// 주사위 기록 통계: 굴림 수·평균, '보통' 목표 기준 판정 개수(AI가 고른 난이도는 알 수 없어 보통 기준으로 센다)
export function diceStats(entries) {
  const verdicts = Object.fromEntries(VERDICTS.map((v) => [v, 0])); let n = 0, sum = 0;
  for (const e of entries ?? []) for (const r of e?.rolls ?? []) { n++; sum += r; verdicts[judgeRoll(r, (e.cuts ?? DEFAULT_CUTS).normal)]++; }
  return { n, avg: n ? Math.round(sum / n) : 0, verdicts };
}
