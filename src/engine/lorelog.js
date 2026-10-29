// 로어북 로그: 이번 응답에 어떤 로어북 항목이 들어갔는지 알아낸다 (순수 함수)
// 1) 프롬프트를 볼 수 있으면(beforeRequest) 각 항목 본문이 실제 프롬프트에 들어 있는지로 판단한다 → 정확
// 2) 못 보면 키·항상 켜짐·Dusk 규칙 결과로 추정한다
import { bodyOf, cbsLite, collectManaged, ruleOf } from './lorerules.js';

const ws = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
// 비교용: 공백·기호를 빼고 소문자로
export const squash = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

// 프롬프트에 그대로 남는 줄만 고른다: CBS 태그를 걷고, 짧은 줄은 뺀다
export function probeLines(content, names = {}) {
  let t = cbsLite(bodyOf(content), names);
  for (let i = 0; i < 6 && /\{\{[^{}]*\}\}/.test(t); i++) t = t.replace(/\{\{[^{}]*\}\}/g, "\n");
  const lines = t.split("\n").map(ws).filter((l) => l.length >= 8 && !/^@@/.test(l));
  if (!lines.length) {
    const all = ws(t);
    return all.length >= 4 ? [all] : [];
  }
  return lines.sort((a, b) => b.length - a.length).slice(0, 3);
}

// 본문의 모든 의미 있는 줄(긴 순). 비슷한 로어북끼리 겹치는 줄과 이 항목만의 줄을 가르는 데 쓴다.
export function bodyLines(content, names = {}) {
  let t = cbsLite(bodyOf(content), names);
  for (let i = 0; i < 6 && /\{\{[^{}]*\}\}/.test(t); i++) t = t.replace(/\{\{[^{}]*\}\}/g, "\n");
  return [...new Set(t.split("\n").map(ws).filter((l) => l.length >= 8 && !/^@@/.test(l)))].sort((a, b) => b.length - a.length);
}

const isConstant = (e) => !!e.alwaysActive || e.mode === "constant";
// 리스 규칙상 스스로 켜질 수 있는 항목인가: 항상 켜짐 · 키 있음 · @@activate · Dusk 규칙. 아니면 내용이 프롬프트에 비슷하게 있어도 이 항목 때문이 아니다.
export const canFire = (e) => isConstant(e) || !!ruleOf(e) || !!String(e.key ?? "").trim() || /^\s*@@activate/m.test(e.content ?? "");

const reasonOf = (e, duskWhy) => {
  if (duskWhy) return `Dusk 규칙 · ${duskWhy}`;
  if (ruleOf(e)) return "Dusk 규칙";
  if (isConstant(e)) return "항상 켜짐";
  return "키 일치";
};

// tagged: [{ entry, src }]  promptText: 보낼 메시지 내용을 이은 글
export function detectInPrompt(tagged, promptText, { names, duskFired = {} } = {}) {
  const hay = ws(promptText);
  const out = [];
  const seen = new Set();
  // 줄이 몇 개 항목에 들어 있는지: 겹치는 줄(예: SFW/NSFW 두 로어북의 공통 줄)만으로는 어느 항목이 들어갔는지 알 수 없다
  const lineCount = new Map();
  const linesOf = new Map();
  for (const { entry: e } of tagged) {
    if (!e || e.mode === "folder" || e.enabled === false) continue;
    const ls = bodyLines(e.content, names);
    linesOf.set(e, ls);
    for (const l of ls) lineCount.set(l, (lineCount.get(l) ?? 0) + 1);
  }
  for (const { entry: e, src } of tagged) {
    if (!e || e.mode === "folder" || e.enabled === false) continue;
    if (!canFire(e)) continue;
    const ls = linesOf.get(e) ?? [];
    const own = ls.filter((l) => lineCount.get(l) === 1);
    let hit;
    if (own.length) hit = own.slice(0, 3).some((p) => hay.includes(p)); // 이 항목만의 줄이 있으면 그 줄로만 판단
    else {
      const probes = probeLines(e.content, names);
      hit = probes.length > 0 && probes.every((p) => hay.includes(p)); // 전부 겹치는 줄뿐이면 모두 들어 있어야
    }
    if (!hit) continue;
    const name = e.comment || ws(e.key).slice(0, 30) || "(이름 없음)";
    const k = `${src}|${name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ n: name, s: src, w: reasonOf(e, duskFired[name]) });
  }
  return out;
}

// 프롬프트를 못 볼 때: 리스 방식에 가깝게 추정 (최근 depth개 메시지에서 키 찾기)
export function estimateUsed(tagged, messages, { depth = 5, duskFired = {} } = {}) {
  const texts = (messages ?? []).slice(-Math.max(1, depth)).map((m) => squash(m.data ?? m));
  const hit = (keys) => String(keys ?? "").split(",").map((k) => squash(k)).filter(Boolean).some((k) => texts.some((t) => t.includes(k)));
  const managed = new Set(collectManaged(tagged.map((x) => x.entry)).map((x) => x.entry));
  const out = [];
  for (const { entry: e, src } of tagged) {
    if (!e || e.mode === "folder" || e.enabled === false) continue;
    const name = e.comment || ws(e.key).slice(0, 30) || "(이름 없음)";
    if (managed.has(e)) {
      if (duskFired[name] !== undefined) out.push({ n: name, s: src, w: reasonOf(e, duskFired[name]) });
      continue;
    }
    if (/^\s*@@dont_activate/m.test(e.content ?? "")) continue;
    let on = isConstant(e);
    if (!on && !e.useRegex) on = hit(e.key) && (!e.selective || !String(e.secondkey ?? "").trim() || hit(e.secondkey));
    if (on) out.push({ n: name, s: src, w: reasonOf(e) });
  }
  return out;
}

// 응답 글로 기록을 찾는 열쇠: 앞부분 60자(공백·기호 제외). 화면 글에는 테마·정규식이 넣은 HTML 태그(<br>, <p> 등)가
// 섞일 수 있어 태그와 엔티티를 먼저 걷고 비교한다(안 그러면 'br' 같은 글자가 끼어 못 찾는다).
const plain = (t) => String(t ?? "").replace(/<[^>]*>/g, "").replace(/&(?:nbsp|amp|lt|gt|quot|#\d+|#x[\da-f]+);/gi, "");
export const headKey = (text) => squash(plain(text)).slice(0, 60);
export const tailKey = (text) => { const t = squash(plain(text)); return t.length > 40 ? t.slice(-40) : ""; };
export function matchRecord(recs, text) {
  const t = squash(plain(text));
  if (t.length < 4) return null;
  for (let i = recs.length - 1; i >= 0; i--) {
    const r = recs[i];
    if (!r.head || r.head.length < 4) continue;
    if (t.includes(r.head) || (r.tail && t.includes(r.tail)) || (r.head.length > 24 && t.includes(r.head.slice(0, 24)))) return r;
  }
  return null;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// 응답 아래에 붙일 접는 버튼 (리스 메시지 안이라 인라인 style만 쓴다)
export function loreButtonHtml(rec) {
  const list = rec.entries ?? [];
  const rows = list.length
    ? list.map((x) => `<div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(157,153,193,.18)"><b style="flex:1;min-width:0;word-break:keep-all;color:inherit">${esc(x.n)}</b><span style="flex:none;font-size:11px;opacity:.7">${esc(x.s)}</span><span style="flex:none;font-size:11px;padding:1px 7px;border-radius:999px;background:rgba(124,92,240,.18);color:#c4b1ff">${esc(x.w)}</span></div>`).join("")
    : `<div style="padding:4px 0;opacity:.7">들어간 로어북이 없어요</div>`;
  const how = rec.method === "prompt" ? "보낸 프롬프트 기준" : "추정 (키·규칙 기준)";
  return `\n\n<details x-dusk="lore" style="margin-top:8px;font-size:13px;line-height:1.5;border:1px solid rgba(124,92,240,.35);border-radius:10px;padding:2px 10px;background:rgba(124,92,240,.06)"><summary style="cursor:pointer;padding:5px 0;font-weight:700;color:#b8acff;list-style:none">📖 로어북 ${list.length}개</summary>${rows}<div style="padding:6px 0 4px;font-size:11px;opacity:.6">${how} · 더 보기: Dusk → 도구 → 로어북 로그</div></details>`;
}
