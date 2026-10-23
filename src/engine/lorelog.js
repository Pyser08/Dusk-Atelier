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

const reasonOf = (e, duskWhy) => {
  if (duskWhy) return `Dusk 규칙 · ${duskWhy}`;
  if (ruleOf(e)) return "Dusk 규칙";
  if (e.alwaysActive) return "항상 켜짐";
  return "키 일치";
};

// tagged: [{ entry, src }]  promptText: 보낼 메시지 내용을 이은 글
export function detectInPrompt(tagged, promptText, { names, duskFired = {} } = {}) {
  const hay = ws(promptText);
  const out = [];
  const seen = new Set();
  for (const { entry: e, src } of tagged) {
    if (!e || e.mode === "folder" || e.enabled === false) continue;
    const probes = probeLines(e.content, names);
    if (!probes.length || !probes.some((p) => hay.includes(p))) continue;
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
    let on = !!e.alwaysActive;
    if (!on && !e.useRegex) on = hit(e.key) && (!e.selective || !String(e.secondkey ?? "").trim() || hit(e.secondkey));
    if (on) out.push({ n: name, s: src, w: reasonOf(e) });
  }
  return out;
}

// 응답 글로 기록을 찾는 열쇠: 앞부분 60자(공백·기호 제외)
export const headKey = (text) => squash(text).slice(0, 60);
export function matchRecord(recs, text) {
  const t = squash(text);
  if (t.length < 4) return null;
  for (let i = recs.length - 1; i >= 0; i--) {
    const r = recs[i];
    if (r.head && r.head.length >= 4 && t.includes(r.head)) return r;
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
