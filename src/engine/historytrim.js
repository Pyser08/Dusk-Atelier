// 요약된 옛 대화 빼고 보내기(2.0.1): 장기 기억에 이미 분석된(coveredAt 이하) 옛 대화를 모델 요청 사본에서 뺀다.
// 최근 keepTurns턴(사용자 말 기준)은 언제나 남긴다. 요청 글과 채팅 글을 앞부분으로 맞춰 보고, 못 맞춘 글은 건드리지 않는다(안전).
import { extractMessageText, isUserMessage } from "./chattext.js";
import { estimateTokens } from "./tokens.js";

const norm = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const keyOf = (t) => { const n = norm(t); return n.length >= 12 ? n : null; };   // 11-22: 앞 48자 → 글 전체(머리말 같은 카드)

// 묶음 빼기(step): 경계를 step턴마다만 옮긴다 — 그 사이 요청 앞부분이 같아 프롬프트 캐시가 맞는다.
// 최근 keepTurns~keepTurns+step-1턴이 남고, 분석(coveredAt)이 경계에 못 미치면 이전 묶음 경계로 물러난다.
// 빼는 마지막 메시지 번호(채팅 message 배열 기준). 뺄 것이 없으면 -1.
// 최근 keepTurns턴은 남기고, step>1이면 경계를 step턴마다만 옮기며, 분석(coveredAt)을 넘지 않는다.
export function trimUntil(chatMsgs, { keepTurns = 20, step = 1, coveredAt = -1 } = {}) {
  if (!Array.isArray(chatMsgs) || !(coveredAt >= 0)) return -1;
  const users = []; chatMsgs.forEach((m, i) => { if (isUserMessage(m)) users.push(i); });
  if (users.length <= keepTurns) return -1;
  const st = Math.max(1, Math.floor(step) || 1);
  if (st === 1) return Math.min(users[users.length - keepTurns] - 1, coveredAt);
  let b = Math.floor((users.length - keepTurns) / st) * st;
  while (b > 0 && users[b] - 1 > coveredAt) b -= st;
  return b > 0 ? users[b] - 1 : -1;
}
// 2.2.11 리스 처리 단계(process 스크립트 훅)용: 메시지 번호(chat_index)가 from보다 작으면 빈 글이 되어 요청에서 빠진다.
// 첫 메시지(chat_index -1)는 남긴다. 요청 글 모양(정규식·이름표·템플릿)과 상관없이 빠진다.
export function gateProcess(text, from) {
  if (!(from > 0)) return text;
  return `{{#if {{greater_equal::{{chat_index}}::${from}}}}}\n${text}\n{{/if}}{{#if {{less::{{chat_index}}::0}}}}\n${text}\n{{/if}}`;
}

// 글 c 안에서 (공백을 접은) 옛 글 t가 한 줄(들)을 통째로 차지하면(앞에 "이름:" 허용) 그 줄들을 지운다. 없으면 c 그대로.
const PRE = /^[ \t]*(?:[^\n:：]{1,40}[:：][ \t]*)?$/;
function cutEmbedded(c, t) {
  if (!t) return c;
  let n = "", pos = [], ws = false;
  for (let i = 0; i < c.length; i++) { const ch = c[i]; if (/\s/.test(ch)) { if (!ws) { n += " "; pos.push(i); ws = true; } } else { n += ch; pos.push(i); ws = false; } }
  for (let k = n.indexOf(t); k >= 0; k = n.indexOf(t, k + 1)) {
    const s = pos[k], e = pos[k + t.length - 1] + 1;
    const ls = c.lastIndexOf("\n", s - 1) + 1; let le = c.indexOf("\n", e); if (le < 0) le = c.length;
    if (PRE.test(c.slice(ls, s)) && /^[ \t]*$/.test(c.slice(e, le))) return c.slice(0, ls) + c.slice(le);
  }
  return c;
}

export function trimCovered(reqMsgs, chatMsgs, { keepTurns = 20, step = 1, coveredAt = -1, textOf = extractMessageText } = {}) {
  const same = { messages: reqMsgs, dropped: 0 };
  if (!Array.isArray(reqMsgs) || !Array.isArray(chatMsgs)) return same;
  const until = trimUntil(chatMsgs, { keepTurns, step, coveredAt });
  if (until < 0) return same;
  const users = []; chatMsgs.forEach((m, i) => { if (isUserMessage(m)) users.push(i); });
  const cut = users[users.length - keepTurns];          // 이 위치부터는 남긴다
  // 11-22 버그리포트2: 앞 48자 키는 머리말이 같은 카드에서 전부 겹쳐 아무것도 못 뺐다 → 글 전체로 맞추고,
  // 처리 단계 정규식 등으로 글이 바뀌었으면 줄 단위로 겹치는 정도(60% 이상)로 어느 채팅 글인지 찾는다.
  const full = new Map(), lineIdx = new Map();
  const linesOf = (t) => String(t ?? "").split(/\n/).map(norm).filter((l) => l.length >= 10);
  chatMsgs.forEach((cm, i) => {
    const raw = textOf(cm), f = norm(raw);
    if (f) { if (!full.has(f)) full.set(f, []); full.get(f).push(i); }
    for (const l of new Set(linesOf(raw))) { if (!lineIdx.has(l)) lineIdx.set(l, []); lineIdx.get(l).push(i); }
  });
  const recentFull = new Set(); for (let i = cut; i < chatMsgs.length; i++) { const f = norm(textOf(chatMsgs[i])); if (f) recentFull.add(f); }
  const used = new Set();
  // 옛(뺄 수 있는) 채팅 글 번호, 못 찾거나 최근 글이면 -1
  const matchOld = (text) => {
    const f = norm(text); if (!f) return -1;
    if (full.has(f)) { if (recentFull.has(f)) return -1; const i = full.get(f).find((j) => j <= until && !used.has(j)); return i ?? -1; }
    const ls = linesOf(text); if (!ls.length) return -1;
    const hit = new Map(); for (const l of ls) for (const j of lineIdx.get(l) ?? []) hit.set(j, (hit.get(j) ?? 0) + 1);
    let best = -1, bn = 0; for (const [j, n] of hit) if (n > bn || (n === bn && j > best)) { best = j; bn = n; }
    if (best < 0 || bn / ls.length < 0.6 || best > until || used.has(best)) return -1;
    return best;
  };
  const LABEL = /^[ \t]*[^\n:：]{1,40}[:：][ \t]*/;
  const keep = new Set(recentFull);
  let dropped = 0;
  // 2.2.29: 요청 끝쪽(최신 입력과 바로 앞 대화)은 무슨 일이 있어도 남긴다
  const tailFrom = (() => { let n = 0, at = reqMsgs.length; for (let i = reqMsgs.length - 1; i >= 0; i--) { const r = reqMsgs[i]?.role; if (r === "user" || r === "assistant" || r === "char") { n++; at = i; if (n >= 4) return i; } } return at; })();   // 11-22: 대화 메시지가 4개보다 적으면(대화를 본문 글로 넣는 프리셋) 있는 것만 지킨다(예전엔 0 → 전부 지켜 아무것도 안 빠짐)
  const out = reqMsgs.filter((m, idx) => {
    if (idx >= tailFrom || !m) return true;
    const c = typeof m.content === "string" ? m.content : textOf(m);
    let j = -1;
    if (m.role === "user" || m.role === "assistant" || m.role === "char") {
      j = matchOld(c); if (j < 0 && LABEL.test(c)) j = matchOld(c.replace(LABEL, ""));
    } else if (m.role === "system" && LABEL.test(c) && !/\n[ \t]*(?:user|assistant|char|model|system)[ \t]*[:：]/i.test(c)) {
      // 11-22: 'system으로 보내기' 프리셋 — 턴 하나짜리 system 메시지("이름: 글")는 통째로 뺀다
      j = matchOld(c.replace(LABEL, ""));
    }
    if (j < 0) return true;
    used.add(j); dropped++; return false;
  });
  // 11-22: 대화를 본문 글로 넣는 프리셋(역할 system, "user: …"·"assistant: …")은 글 안에서 옛 대화 덩어리를 찾아 뺀다
  const olds = []; for (let i = 0; i <= until; i++) { if (used.has(i)) continue; const t = norm(textOf(chatMsgs[i])); const k = keyOf(t); if (t.length >= 20 && k && !keep.has(k)) olds.push(t); }
  let embedded = 0;
  const out2 = olds.length ? out.map((m, idx) => {
    if (idx >= tailFrom || !m || typeof m.content !== "string" || m.content.length < 200) return m;
    let c = m.content, n = 0;
    for (const t of olds) {   // 2.2.42: 정규식(글 전체) 대신 공백을 접은 글에서 indexOf — 긴 글에서 스택 넘침·느림 방지
      const c2 = cutEmbedded(c, t); if (c2 !== c) { c = c2; n++; }
    }
    if (!n) return m;
    embedded += n; return { ...m, content: c.replace(/\n{3,}/g, "\n\n") };
  }) : out;
  dropped += embedded;
  return dropped ? { messages: out2, dropped } : same;
}

// 11-22: 빼기 전·뒤 요청 글의 토큰 차이(대략). 기록에 '약 N토큰 줄였어요'로 알린다
export function trimSaved(before, after, textOf = extractMessageText) {
  const sum = (ms) => (ms ?? []).reduce((n, m) => n + estimateTokens(typeof m?.content === "string" ? m.content : textOf(m)), 0);
  return Math.max(0, sum(before) - sum(after));
}
