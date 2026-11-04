// 번역 보조 (v1.9.3, 순수): 마크업 보호 · 용어집/가이드/이전 번역 주입 · 구분자 누수 제거.
const PATTERNS = [/```[\s\S]*?```/g, /`[^`\n]+`/g, /<[a-zA-Z\/][^>\n]{0,300}>/g, /\{\{[^}\n]{1,200}\}\}/g, /!\[[^\]\n]*\]\([^)\n]+\)/g, /\[[^\]\n]{1,60}\]\([^)\n]+\)/g, /\bhttps?:\/\/[^\s)>\]]+/g];
export function protect(text, extra = []) {
  const map = []; let out = String(text ?? "");
  const pats = [...PATTERNS, ...extra.map((r) => { try { return new RegExp(r, "g"); } catch { return null; } }).filter(Boolean)];
  for (const re of pats) out = out.replace(re, (m) => { const t = `⟦${map.length}⟧`; map.push(m); return t; });
  return { text: out, map };
}
export function restore(text, map) {
  let out = String(text ?? ""); const missing = [];
  map.forEach((orig, i) => { const t = `⟦${i}⟧`; if (!out.includes(t)) missing.push(i); else out = out.split(t).join(orig); });
  return { text: out, missing };
}
const bytes = (s) => new TextEncoder().encode(s).length;
export function clipBytes(s, max) { if (bytes(s) <= max) return s; let lo = 0, hi = s.length; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (bytes(s.slice(0, mid)) <= max) lo = mid; else hi = mid - 1; } return s.slice(0, lo); }
export function glossaryBlock(entries, maxBytes = 8192) {
  const lines = (entries ?? []).filter((e) => e?.key && e?.value).map((e) => `${e.key} = ${e.value}`);
  if (!lines.length) return "";
  let body = ""; for (const l of lines) { if (bytes(`${body}${l}\n`) > maxBytes) break; body += `${l}\n`; }
  return `<glossary>\n${body}</glossary>`;
}
export function guideBlock(text, maxBytes = 8192) { const t = clipBytes(String(text ?? "").trim(), maxBytes); return t ? `<translation-guide>\n${t}\n</translation-guide>` : ""; }
// 이전 번역 쌍(오래된 것부터 버림)
export function historyBlock(pairs, turns = 2, maxBytes = 4096) {
  const use = (pairs ?? []).slice(-Math.max(0, turns)); const kept = [];
  for (let i = use.length - 1; i >= 0; i--) { const cur = [use[i], ...kept]; const txt = cur.map((p) => `<source>${p.source}</source>\n<translation>${p.target}</translation>`).join("\n"); if (bytes(txt) > maxBytes) break; kept.unshift(use[i]); }
  if (!kept.length) return "";
  return `<history>\n${kept.map((p) => `<source>${p.source}</source>\n<translation>${p.target}</translation>`).join("\n")}\n</history>`;
}
export function stripDelims(text, delims) { let o = String(text ?? ""); for (const d of delims ?? []) if (d) o = o.split(d).join(""); return o.trim(); }
export function translationMessages({ text, lang = "Korean", glossary = "", guide = "", history = "", protectMarkup = true, extra = [] }) {
  const p = protectMarkup ? protect(text, extra) : { text: String(text ?? ""), map: [] };
  const sys = [`Translate the user's text into ${lang}. Output only the translation.`, protectMarkup ? "Keep every ⟦n⟧ token exactly as it is." : "", glossary, guide, history].filter(Boolean).join("\n\n");
  return { messages: [{ role: "system", content: sys }, { role: "user", content: p.text }], map: p.map };
}
