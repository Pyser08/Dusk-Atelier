// SDStudio 이식(애드온 sdstudio 전용): 프롬프트 문법. 순수. 원본 SDStudio models/PromptService.ts 규칙.
// - `##주석##` 지움 · 줄바꿈 = 쉼표 · `{a|b}` 그 자리에서 하나 고름(`{태그}` 강조는 그대로)
// - `<모음.조각>` 조각 전개(여러 줄 조각(multi)은 한 줄을 무작위로) · 순환·과한 중첩은 오류
// - 상위 프롬프트의 `|` 자리에 씬 조합(중간)을 끼움. 남은 것은 뒤에 · 하위 프롬프트는 맨 뒤
// - 씬 조합: 슬롯(열)마다 켜진 조각 하나씩 고르는 데카르트 곱

export var stripComments = (s) => String(s ?? "").replace(/##[\s\S]*?##/g, "");
export var toPARR = (s) => stripComments(s).replace(/\r\n?|\n/g, ",").split(",").map((x) => x.trim()).filter(Boolean);

export function expandInlineRandom(text, rng = Math.random) {
  const pick = (a) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  const expand = (v) => {
    let out = "";
    for (let i = 0; i < v.length; i++) {
      if (v[i] !== "{") { out += v[i]; continue; }
      let depth = 1, close = -1;
      const seps = [];
      for (let j = i + 1; j < v.length; j++) {
        if (v[j] === "{") depth++;
        else if (v[j] === "}") { if (--depth === 0) { close = j; break; } }
        else if (v[j] === "|" && depth === 1) seps.push(j);
      }
      if (close < 0) { out += v.slice(i); break; }
      if (!seps.length) out += `{${expand(v.slice(i + 1, close))}}`;
      else {
        const opts = []; let st = i + 1;
        for (const sp of seps) { opts.push(v.slice(st, sp)); st = sp + 1; }
        opts.push(v.slice(st, close));
        out += expand(pick(opts).trim());
      }
      i = close;
    }
    return out;
  };
  return expand(String(text ?? ""));
}

// libs: [{ name, pieces: [{ name, prompt, multi }] }]
export function findPiece(libs, ref) {
  const inner = ref.slice(1, -1), dot = inner.indexOf(".");
  if (dot < 1) throw new Error(`올바르지 않은 조각 문법 "${ref}" — <모음.조각> 꼴로 써요`);
  const lib = (libs ?? []).find((l) => l.name === inner.slice(0, dot));
  if (!lib) throw new Error(`없는 조각 모음 "${inner.slice(0, dot)}"`);
  const piece = lib.pieces.find((p) => p.name === inner.slice(dot + 1));
  if (!piece) throw new Error(`없는 조각 "${ref}"`);
  return piece;
}
var isRef = (w) => w.length > 2 && w[0] === "<" && w[w.length - 1] === ">";
export function expandWord(word, libs, rng = Math.random, seen = new Set(), counter = { n: 0 }) {
  if (!isRef(word)) return [word];
  if (seen.has(word)) throw new Error(`조각이 자기 자신을 불러요: ${word}`);
  if (seen.size >= 50 || ++counter.n > 10000) throw new Error(`조각이 너무 깊게 겹쳐 있어요: ${word}`);
  const piece = findPiece(libs, word);
  seen.add(word);
  try {
    let text = piece.prompt ?? "";
    if (piece.multi) { const lines = text.split(/\r\n?|\n/).filter((l) => toPARR(l).length); text = lines.length ? lines[Math.min(lines.length - 1, Math.floor(rng() * lines.length))] : ""; }
    return toPARR(text).flatMap((w) => expandWord(w, libs, rng, seen, counter));
  } finally { seen.delete(word); }
}
export var expandPieces = (text, libs, rng = Math.random) => toPARR(text).flatMap((w) => expandWord(w, libs, rng)).join(", ");

// 상위(front)에 `|`가 있으면 그 자리에 중간(middle) 조각을 차례로 끼운다(중간 쪽 `|`는 다시 상위로 돌아감)
export function interleave(front, middle) {
  const out = [];
  let l = 0, r = 0, side = 0;
  while (l < front.length && r < middle.length) {
    if (side === 0) { if (front[l] === "|") { side = 1; l++; continue; } out.push(front[l++]); }
    else { if (middle[r] === "|") { side = 0; r++; continue; } out.push(middle[r++]); }
  }
  for (; l < front.length; l++) if (front[l] !== "|") out.push(front[l]);
  for (; r < middle.length; r++) if (middle[r] !== "|") out.push(middle[r]);
  return out;
}

// 씬 조합: slots = [[{ prompt, on }]]
var onPieces = (slot) => (slot ?? []).filter((p) => p && p.on !== false);
export function combinationCount(slots) {
  if (!slots?.length) return 1;
  let t = 1;
  for (const s of slots) { t *= onPieces(s).length; if (!t) return 0; }
  return t;
}
// i번째 조합(0부터, 혼합 진법) — 전부 펼치지 않고 바로 고른다
export function combinationAt(slots, i) {
  const out = [];
  let k = Math.max(0, Math.floor(i));
  for (let c = (slots?.length ?? 0) - 1; c >= 0; c--) {
    const ps = onPieces(slots[c]);
    if (!ps.length) return null;
    out[c] = ps[k % ps.length]; k = Math.floor(k / ps.length);
  }
  return out;
}
export var middleOf = (combo) => (combo ?? []).map((p) => p?.prompt ?? "").filter((x) => x.trim()).join(", ");

// 최종 프롬프트: 상위(+캐릭터 외형) | 씬 조합 | 하위 → 조각 전개 → {a|b} 고르기
export function buildPrompt({ top = "", own = "", middle = "", back = "" }, libs = [], rng = Math.random) {
  const front = [...toPARR(top), ...toPARR(own)];
  const words = [...interleave(front, toPARR(middle)), ...toPARR(back)];
  return expandInlineRandom(words.flatMap((w) => expandWord(w, libs, rng)).join(", "), rng);
}
export var buildNegative = (uc, libs = [], rng = Math.random) => expandInlineRandom(expandPieces(uc, libs, rng), rng);

// 문법 칠하기(화면용): [{ text, kind }] kind = text|weight-up|weight-down|weight-neg|brace|bracket|piece|comment|pipe|random
export function highlight(text) {
  const s = String(text ?? ""), out = [];
  const push = (t, kind) => { if (!t) return; const last = out[out.length - 1]; if (last && last.kind === kind) last.text += t; else out.push({ text: t, kind }); };
  const re = /##[\s\S]*?##|-?\d*\.?\d+::[\s\S]*?::|<[^<>\n]+>|\{+[^{}\n]*\}+|\[+[^[\]\n]*\]+|\|/g;
  let at = 0, m;
  while ((m = re.exec(s))) {
    push(s.slice(at, m.index), "text");
    const t = m[0];
    let kind = "text";
    if (t.startsWith("##")) kind = "comment";
    else if (t.includes("::")) { const w = parseFloat(t); kind = w < 0 ? "weight-neg" : w < 1 ? "weight-down" : "weight-up"; }
    else if (t[0] === "<") kind = "piece";
    else if (t[0] === "{") kind = t.includes("|") ? "random" : "brace";
    else if (t[0] === "[") kind = "bracket";
    else if (t === "|") kind = "pipe";
    push(t, kind);
    at = m.index + t.length;
  }
  push(s.slice(at), "text");
  return out;
}
