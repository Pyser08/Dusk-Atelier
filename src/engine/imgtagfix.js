// v1.8.2 AI 이미지 태그 교정 (순수 로직, 모델 호출 없음).
// AI 응답의 `<img="…">` / `<img src=…>` 태그가 실제 에셋 이름과 안 맞을 때(대소문자·오타·없는 키워드·지침 원문 복사·여러 키워드를 한 태그에 합침)
// 이 봇의 에셋 목록을 기준으로 가장 가까운 실제 이름으로 고친다. 이미 맞는 태그·URL·CBS 이미지는 한 글자도 바꾸지 않는다.
// 상황에 안 맞는 키워드 고르기(의미 판단)는 하지 않는다.

const PLACEHOLDER = /\[\s*(character|char|outfit|keyword|yaoi\s*keyword|charname)[^\]]*\]|character'?s\s*name|^(character|charname|keyword|outfit)$/i;
const SPLIT = /[,;|+&/"'`]|\s+and\s+/i;

export const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/[\s_\-.\[\]"'`]+/g, "");

function distance(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = v; if (v < low) low = v;
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const maxDist = (n) => (n <= 4 ? 0 : n <= 7 ? 1 : 2);

// pool: [{n: 정규화한 글, v: 값}] → 정확히 하나로 정해질 때만 돌려준다(애매하면 null)
function pick(candNorm, pool) {
  if (!candNorm) return null;
  const exact = pool.filter((p) => p.n === candNorm);
  if (exact.length) return exact[0].v;
  const lim = maxDist(candNorm.length);
  let best = Infinity, hit = [];
  for (const p of pool) {
    const d = distance(candNorm, p.n, lim);
    if (d > lim) continue;
    if (d < best) { best = d; hit = [p]; } else if (d === best) hit.push(p);
  }
  if (hit.length === 1) return hit[0].v;
  if (hit.length > 1) return null;
  if (candNorm.length >= 4) {   // 앞부분 일치(예: smile → smiling)
    const pre = pool.filter((p) => p.n.length > candNorm.length && p.n.startsWith(candNorm));
    if (pre.length === 1) return pre[0].v;
  }
  return null;
}

// 에셋 이름 목록 → 검색용 색인. 구분자는 목록에서 추정한다(점이 많으면 `캐릭터.옷.키워드`, 아니면 첫 밑줄 `캐릭터_키워드`).
export function buildAssetIndex(names) {
  const list = [...new Set((names ?? []).map((n) => String(n ?? "")).filter(Boolean))];
  const dotted = list.length > 0 && list.filter((n) => n.includes(".")).length * 2 >= list.length;
  const entries = [], byName = new Map(), chars = new Map(), kwCount = new Map();
  for (const name of list) {
    let char, outfit = null, kw;
    if (dotted) {
      const seg = name.split(".").filter((s) => s !== "");
      if (seg.length < 2) continue;
      char = seg[0]; kw = seg[seg.length - 1]; if (seg.length > 2) outfit = seg.slice(1, -1).join(".");
    } else {
      const i = name.indexOf("_");
      if (i <= 0 || i === name.length - 1) continue;
      char = name.slice(0, i); kw = name.slice(i + 1);
    }
    const e = { name, char, outfit, kw, nk: norm(kw) };
    entries.push(e);
    byName.set(norm(name), name);
    let c = chars.get(char);
    if (!c) chars.set(char, c = { name: char, n: norm(char), outfits: new Map(), entries: [] });
    c.entries.push(e);
    const key = outfit ?? "";
    if (!c.outfits.has(key)) c.outfits.set(key, { name: outfit, n: norm(outfit), entries: [] });
    c.outfits.get(key).entries.push(e);
  }
  for (const c of chars.values()) for (const o of c.outfits.values()) for (const e of o.entries) kwCount.set(e.nk, (kwCount.get(e.nk) ?? 0) + 1);
  return { dotted, entries, byName, chars, kwCount, size: entries.length };
}

const clean = (s) => String(s ?? "").replace(/[\[\]"'`]/g, "").trim();
const sortedParts = (s) => String(s).split(/[_\s.]+/).filter(Boolean).map(norm).sort().join("|");

function resolveChar(idx, raw) {
  const pool = [...idx.chars.values()].map((c) => ({ n: c.n, v: c }));
  const hit = pick(norm(raw), pool);
  if (hit) return hit;
  const parts = sortedParts(raw);   // 성·이름 순서가 바뀐 경우(Hachiman_Hikigaya)
  const swapped = [...idx.chars.values()].filter((c) => sortedParts(c.name) === parts);
  return swapped.length === 1 ? swapped[0] : null;
}

function splitKeywords(rawKw, entries) {   // smiling_hug → [smiling, hug] (각 조각이 풀에 정확히 있을 때만)
  const toks = String(rawKw).split(/[_\s]+/).filter(Boolean);
  if (toks.length < 2 || toks.length > 7) return [];
  const have = new Set(entries.map((e) => e.nk));
  const found = [];
  const walk = (start, acc) => {
    if (start === toks.length) { if (acc.length >= 2) found.push(acc); return; }
    for (let end = start + 1; end <= toks.length; end++) {
      const piece = norm(toks.slice(start, end).join(""));
      if (have.has(piece)) walk(end, [...acc, piece]);
    }
  };
  walk(0, []);
  return found.sort((a, b) => a.length - b.length)[0] ?? [];
}

// 토큰 하나(`캐릭터.옷.키워드` 꼴) → { entry, kind } | { fail: true }
function resolveToken(idx, token, inherit) {
  const t = clean(token);
  if (!t) return null;
  const whole = idx.byName.get(norm(t));
  if (whole) {
    const e = idx.entries.find((x) => x.name === whole), c = idx.chars.get(e.char);
    return { entry: e, kind: whole === t ? "exact" : "case", char: c, outfit: c.outfits.get(e.outfit ?? "") };
  }
  let seg;
  if (idx.dotted) seg = t.split(".").map((s) => s.trim()).filter(Boolean);
  else { const i = t.indexOf("_"); seg = i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t]; }
  let char = null, rest;
  const first = seg.length ? resolveChar(idx, seg[0]) : null;
  if (first) { char = first; rest = seg.slice(1); }
  else if (inherit?.char && seg.length) { char = inherit.char; rest = seg; }   // 합친 두 번째 조각: 앞 조각의 캐릭터를 잇는다
  if (!char) return { fail: true };
  let outfitRaw = null, kwRaw = null;
  if (rest.length >= 2) { outfitRaw = rest.slice(0, -1).join("."); kwRaw = rest[rest.length - 1]; }
  else if (rest.length === 1) kwRaw = rest[0];
  const outfits = [...char.outfits.values()];
  let outfit = null;
  if (outfits.length === 1) outfit = outfits[0];
  else if (outfitRaw) { const o = pick(norm(outfitRaw), outfits.filter((x) => x.name).map((x) => ({ n: x.n, v: x }))); if (o) outfit = o; }
  else if (inherit?.outfit && char === inherit.char) outfit = inherit.outfit;
  const pool = (outfit ? outfit.entries : char.entries);
  const kwPool = pool.map((e) => ({ n: e.nk, v: e }));
  let entry = kwRaw ? pick(norm(kwRaw), kwPool) : null;
  let kind = "fuzzy", many = null;
  if (!entry && kwRaw) {
    const parts = splitKeywords(kwRaw, pool);
    if (parts.length) { many = parts.map((p) => pool.find((e) => e.nk === p)); kind = "merged"; }
  }
  if (many) {
    return { many: many.map((e) => ({ entry: e, kind: "merged" })), char, outfit: many[0].outfit };
  }
  if (!entry) {
    entry = pool.find((e) => e.nk === "default") ?? null;
    kind = "default";
    if (!entry && outfit === null) entry = null;
  }
  if (!entry) return { fail: true };
  if (!outfit) {   // 옷을 못 정했으면 키워드를 가진 첫 옷으로
    const o = outfits.find((x) => x.entries.some((e) => e.nk === entry.nk)) ?? outfits[0];
    entry = o.entries.find((e) => e.nk === entry.nk) ?? entry; outfit = o;
  }
  return { entry, kind, char, outfit };
}

const rarity = (idx, e) => (e.nk === "default" ? Infinity : idx.kwCount.get(e.nk) ?? Infinity);

// 태그 안쪽 글 → { name, kind } | { remove: kind }
function resolvePayload(idx, payload) {
  const raw = String(payload ?? "").trim();
  if (!raw || PLACEHOLDER.test(raw)) return { remove: "template" };
  const direct = resolveToken(idx, raw, null);
  if (direct?.entry && direct.kind !== "fuzzy" && direct.kind !== "default") return { name: direct.entry.name, kind: direct.kind };
  const pieces = raw.split(SPLIT).map((s) => s.trim()).filter(Boolean);
  const cands = [];
  let inherit = null, merged = pieces.length > 1;
  for (const piece of pieces) {
    if (PLACEHOLDER.test(piece)) continue;
    const r = resolveToken(idx, piece, inherit);
    if (!r || r.fail) continue;
    if (r.many) { merged = true; for (const m of r.many) cands.push(m.entry); } else cands.push(r.entry);
    if (r.char && !inherit) inherit = { char: r.char, outfit: r.outfit };
  }
  if (!cands.length) {
    if (direct?.many) { const best = direct.many.map((m) => m.entry).sort((a, b) => rarity(idx, a) - rarity(idx, b))[0]; return { name: best.name, kind: "merged" }; }
    return { remove: "unknown" };
  }
  const best = [...cands].sort((a, b) => rarity(idx, a) - rarity(idx, b))[0];
  const kind = merged && cands.length > 1 ? "merged" : (direct?.kind === "default" && cands.length === 1 ? "default" : cands.length === 1 && pieces.length === 1 ? (direct?.kind ?? "fuzzy") : "merged");
  return { name: best.name, kind };
}

const TAG = /<img\b([^<>]*)>/gi;
const INNER = /^(\s*=\s*|\s+src\s*=\s*)(["']?)([\s\S]*?)\2\s*(\/?)\s*$/i;

// 본문 속 이미지 태그를 교정한다. 돌려주는 값: { text, changed, fixes:[{ from, to, kind }] }
export function fixImgTags(text, idx, opts = {}) {
  const src = typeof text === "string" ? text : "";
  if (!src || !idx?.size || !/<img\b/i.test(src)) return { text: src, changed: false, fixes: [] };
  const keepUnknown = opts.unknown === "keep";
  const fixes = [];
  let out = "", last = 0, m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(src))) {
    const parts = INNER.exec(m[1]);
    if (!parts) continue;
    const payload = parts[3];
    if (/:\/\/|^\s*(data|blob):|^\s*[/.]|\{\{|=/i.test(payload)) continue;   // 일반 이미지·CBS·다른 속성이 붙은 태그는 건드리지 않는다
    if (idx.byName.get(norm(payload)) === payload.trim() && payload === payload.trim()) continue;   // 이미 정확함
    const r = resolvePayload(idx, payload);
    const from = m[0];
    if (r.name) {
      const to = `<img${parts[1]}${parts[2]}${r.name}${parts[2]}${parts[4] ? " /" : ""}>`;
      if (to === from) continue;
      out += src.slice(last, m.index) + to; last = m.index + from.length;
      fixes.push({ from, to, kind: r.kind });
      continue;
    }
    if (keepUnknown && r.remove === "unknown") continue;
    // 지움: 그 줄에 태그만 있으면 줄째 지우고, 빈 줄이 3개 겹치지 않게 한다
    const before = src.slice(0, m.index), after = src.slice(m.index + from.length);
    const alone = /(^|\n)[ \t]*$/.test(before) && /^[ \t]*(\n|$)/.test(after);
    let head = src.slice(last, m.index), next = m.index + from.length;
    if (alone) {
      head = head.replace(/[ \t]*$/, "");
      next += /^[ \t]*/.exec(after)[0].length;
      if (src[next] === "\n") next++;
      while ((out + head).endsWith("\n\n") && src[next] === "\n") next++;
    }
    out += head; last = next; TAG.lastIndex = next;
    fixes.push({ from, to: null, kind: r.remove });
  }
  if (!fixes.length) return { text: src, changed: false, fixes: [] };
  out += src.slice(last);
  return { text: out, changed: out !== src, fixes };
}
