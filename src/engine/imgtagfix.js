// v1.8.2 AI 이미지 태그 교정 (순수 로직, 모델 호출 없음).
// AI 응답의 `<img="…">` / `<img src=…>` 태그가 실제 에셋 이름과 안 맞을 때(대소문자·오타·줄임말·활용형·없는 키워드·지침 원문 복사·여러 키워드를 한 태그에 합침)
// 이 봇(과 켜진 모듈)의 에셋 목록을 기준으로 가장 가까운 실제 이름으로 고친다. 이미 맞는 태그·URL·CBS 이미지는 한 글자도 바꾸지 않는다.
// 동작이 우선: 그 옷에 없는 동작이면 그 동작이 있는 다른 옷으로 바꾼다(어느 옷에도 없으면 그 옷의 default). 상황에 안 맞는 키워드 고르기(의미 판단)는 하지 않는다.

const PLACEHOLDER = /\[\s*(character|char|outfit|keyword|yaoi\s*keyword|charname|name|tag|emotion|skinship|action|form|state|image\s*command)[^\]]*\]|character'?s\s*name|^(character|charname|keyword|outfit)$/i;
const SPLIT = /[,;|+/"`]|\s+and\s+/i;   // 이름 속 ' 와 & 는 자르지 않는다(Sigrid de L'Azur, freda&georgia)
const NESTED = /<img\b\s*(?:src\s*)?=\s*["']?(?:[^<>"']*<[^<>]*>)+[^<>"']*["']?\s*\/?>/gi;   // <img="<Character Command>_<State Command>">
const EXT = /\.(png|jpe?g|webp|gif|avif)$/i;
const FALLBACK = ["default", "neutral", "idle", "normal"];

export const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/[\s_\-.\[\]"'`]+/g, "");
const toks = (s) => String(s ?? "").normalize("NFKC").toLowerCase().split(/[\s_\-.]+/).filter(Boolean);
// 아주 단순한 영어 어간: smiling/smile → smil, hugging/hug → hug, tears → tear
export function stem(w) {
  let s = String(w).toLowerCase();
  if (s.length > 4 && /(ing|ed)$/.test(s)) s = s.replace(/(ing|ed)$/, "");
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (/([b-df-hj-np-tv-z])\1$/.test(s)) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}
const stems = (s) => toks(s).map(stem);

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
  if (candNorm.length >= 4) {   // 앞부분 일치(예: fujiwara → fujiwarachika)
    const pre = pool.filter((p) => p.n.length > candNorm.length && p.n.startsWith(candNorm));
    if (pre.length === 1) return pre[0].v;
  }
  return null;
}

const contiguous = (needle, hay) => {
  for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((t, j) => hay[i + j] === t)) return true;
  return false;
};
// 키워드 맞추기: 정확 → 어간(활용형) → 오타 → 낱말 포함(줄임말·접두어 빠짐, 덧붙은 낱말이 가장 적은 것 하나)
function pickKeyword(raw, pool) {
  if (!raw || !pool.length) return null;
  const n = norm(raw);
  const exact = pool.find((e) => e.nk === n);
  if (exact) return exact;
  const ck = stems(raw).join("|");
  const byStem = pool.filter((e) => stems(e.kw).join("|") === ck);
  if (byStem.length === 1) return byStem[0];
  const sk = stems(raw).sort().join("|");   // 낱말 순서만 바뀐 경우(kiss_deep → deep kiss)
  const bySet = pool.filter((e) => stems(e.kw).sort().join("|") === sk);
  if (bySet.length === 1) return bySet[0];
  const typo = pick(n, pool.map((e) => ({ n: e.nk, v: e })));
  if (typo) return typo;
  const ct = stems(raw);
  if (!ct.length) return null;
  let best = Infinity, hit = [];
  for (const e of pool) {
    const et = stems(e.kw);
    if (et.length <= ct.length || !contiguous(ct, et)) continue;
    const extra = et.length - ct.length;
    if (extra < best) { best = extra; hit = [e]; } else if (extra === best) hit.push(e);
  }
  if (hit.length === 1) return hit[0];
  if (hit.length > 1) {   // 동률(missionary → missionary_sex / missionary_fingering …): 이 목록에서 가장 흔한 끝말을 고른다(뚜렷할 때만)
    const freq = new Map();
    for (const e of pool) { const l = stems(e.kw).at(-1); freq.set(l, (freq.get(l) ?? 0) + 1); }
    const scored = hit.map((e) => ({ e, f: freq.get(stems(e.kw).at(-1)) ?? 0 })).sort((a, b) => b.f - a.f);
    if (scored[0].f > scored[1].f) return scored[0].e;
  }
  return null;
}
// 대신 넣을 그림: 그림이 하나뿐이면 그것 → 이름만 있는 그림 → default·neutral… → 끝 낱말이 default인 것(emotion_default)
function fallbackOf(pool) {
  if (pool.length === 1) return pool[0];
  const bare = pool.find((e) => e.nk === "");
  if (bare) return bare;
  for (const f of FALLBACK) { const e = pool.find((x) => x.nk === f); if (e) return e; }
  for (const f of FALLBACK) { const hit = pool.filter((x) => toks(x.kw).at(-1) === f); if (hit.length === 1) return hit[0]; }
  return null;
}

// 에셋 이름 목록 → 검색용 색인. 구분자는 목록에서 추정한다(점이 많으면 `캐릭터.옷.키워드`, 아니면 첫 밑줄 `캐릭터_키워드`).
// names: 이름 배열 하나, 또는 묶음 배열([봇 에셋, 모듈1 에셋, 모듈2 에셋…]) — 묶음마다 이름 규칙을 따로 판단한다(모듈마다 규칙이 다를 수 있음).
export function buildAssetIndex(names) {
  const input = Array.isArray(names) ? names : [];
  const groups = input.some((g) => Array.isArray(g)) ? input.filter(Array.isArray) : [input];
  const seen = new Set(), raw = [], modes = new Set();
  for (const g of groups) {
    // 이름 자체에 확장자가 든 에셋(`Gyeongja_smile.webp`)은 확장자를 떼고 읽되, 고칠 때는 실제 이름(확장자째)을 쓴다.
    const real = new Map();
    for (const n0 of g) { const n = String(n0 ?? ""), b = n.replace(EXT, ""); if (b && !real.has(b)) real.set(b, n); }
    const list = [...real.keys()].filter((n) => !seen.has(n));
    if (!list.length) continue;
    list.forEach((n) => seen.add(n));
    const r = parseGroup(list);
    modes.add(r.dotted);
    for (const x of r.raw) { x.bare = x.name; x.name = real.get(x.name) ?? x.name; }
    raw.push(...r.raw);
  }
  const dotted = modes.size === 1 && modes.has(true);
  return indexOf(raw, dotted, modes);
}

function parseGroup(list) {
  // 점 구분(`캐릭터.옷.키워드`)은 점이 두 개인 이름이 절반 이상이거나 거의 모든 이름에 점이 있을 때만. `karina_missionary.sex`처럼 키워드 안의 점은 구분자가 아니다.
  const two = list.filter((n) => (n.match(/\./g) ?? []).length >= 2).length, one = list.filter((n) => n.includes(".")).length;
  const dotted = list.length > 0 && (two * 2 >= list.length || one >= list.length * 0.9);
  const raw = [];
  for (const name of list) {
    if (dotted) {
      const seg = name.split(".").filter((s) => s !== "");
      if (seg.length < 2) { raw.push({ name, char: name, outfit: null, kw: "" }); continue; }
      raw.push({ name, char: seg[0], kw: seg[seg.length - 1], outfit: seg.length > 2 ? seg.slice(1, -1).join(".") : null });
    } else {
      const i = name.indexOf("_");
      if (i <= 0 || i === name.length - 1) raw.push({ name, char: name, outfit: null, kw: "" });   // 이름만 있는 그림(스탠딩)
      else raw.push({ name, char: name.slice(0, i), outfit: null, kw: name.slice(i + 1) });
    }
  }
  if (!dotted) {   // 밑줄 형식의 형태 구분(iroha_real_…, iroha_virtual_…): 모든 키워드가 2~6가지 앞말로 나뉘고 각각 3개 이상이면 옷처럼 다룬다
    const groups = new Map();
    for (const r of raw) if (r.kw) (groups.get(r.char) ?? groups.set(r.char, []).get(r.char)).push(r);
    for (const g of groups.values()) {
      const pre = g.map((r) => { const i = r.kw.indexOf("_"); return i > 0 ? r.kw.slice(0, i) : null; });
      if (pre.some((p) => p === null)) continue;
      const count = new Map(); for (const p of pre) count.set(p, (count.get(p) ?? 0) + 1);
      if (count.size < 2 || count.size > 6 || [...count.values()].some((n) => n < 3)) continue;
      g.forEach((r, i) => { r.outfit = pre[i]; r.kw = r.kw.slice(pre[i].length + 1); });
    }
  }
  for (const r of raw) r.dotted = dotted;
  return { dotted, raw };
}

function indexOf(raw, dotted, modes) {
  const entries = [], byName = new Map(), chars = new Map(), kwCount = new Map();
  for (const { name, bare, char, outfit, kw } of raw) {
    const e = { name, char, outfit, kw, nk: norm(kw) };
    entries.push(e);
    byName.set(norm(name), name);
    if (bare && bare !== name && !byName.has(norm(bare))) byName.set(norm(bare), name);
    let c = chars.get(char);
    if (!c) chars.set(char, c = { name: char, n: norm(char), t: toks(char), outfits: new Map(), entries: [] });
    c.entries.push(e);
    const key = outfit ?? "";
    if (!c.outfits.has(key)) c.outfits.set(key, { name: outfit, n: norm(outfit), entries: [] });
    c.outfits.get(key).entries.push(e);
  }
  for (const c of chars.values()) for (const o of c.outfits.values()) for (const e of o.entries) kwCount.set(e.nk, (kwCount.get(e.nk) ?? 0) + 1);
  const byEntryName = new Map(entries.map((e) => [e.name, e]));
  return { dotted, modes, entries, byName, byEntryName, chars, kwCount, size: entries.length };
}

const clean = (s) => String(s ?? "").replace(/[\[\]"'`]/g, "").trim();
const sortedParts = (s) => toks(s).map(norm).sort().join("|");

function resolveChar(idx, raw) {
  const all = [...idx.chars.values()];
  const hit = pick(norm(raw), all.map((c) => ({ n: c.n, v: c })));
  if (hit) return hit;
  const parts = sortedParts(raw);   // 성·이름 순서가 바뀐 경우(Hachiman_Hikigaya)
  const swapped = all.filter((c) => sortedParts(c.name) === parts);
  if (swapped.length === 1) return swapped[0];
  const rt = toks(raw);   // 이름 한쪽만 쓴 경우(Chika) — 그 낱말을 가진 캐릭터가 하나뿐일 때만
  if (rt.length && rt.every((t) => t.length >= 2)) {
    const part = all.filter((c) => rt.every((t) => c.t.includes(t)));
    if (part.length === 1) return part[0];
  }
  return null;
}

function splitKeywords(rawKw, entries) {   // smiling_hug → [smiling, hug] (각 조각이 풀에 정확히 있을 때만)
  const ts = String(rawKw).split(/[_\s]+/).filter(Boolean);
  if (ts.length < 2 || ts.length > 7) return [];
  const have = new Set(entries.map((e) => e.nk));
  const found = [];
  const walk = (start, acc) => {
    if (start === ts.length) { if (acc.length >= 2) found.push(acc); return; }
    for (let end = start + 1; end <= ts.length; end++) {
      const piece = norm(ts.slice(start, end).join(""));
      if (have.has(piece)) walk(end, [...acc, piece]);
    }
  };
  walk(0, []);
  return found.sort((a, b) => a.length - b.length)[0] ?? [];
}

// 토큰 하나(`캐릭터.옷.키워드` 꼴) → { entry, kind, char, outfit } | { many } | { keep } | { fail }
function resolveToken(idx, token, inherit, state) {
  const t = clean(token).replace(EXT, "");
  if (!t) return null;
  const whole = idx.byName.get(norm(t));
  if (whole) {
    const e = idx.byEntryName.get(whole), c = idx.chars.get(e.char);
    return { entry: e, kind: whole === t ? "exact" : "case", char: c, outfit: c.outfits.get(e.outfit ?? "") };
  }
  // 모듈마다 이름 규칙이 다르면 두 규칙으로 다 읽어 본다(점이 있으면 점 규칙 먼저). 대체 그림보다 실제로 맞춘 결과를 우선.
  const modes = idx.modes?.size > 1 ? (t.includes(".") ? [true, false] : [false, true]) : [idx.dotted];
  let fallback = null;
  for (const dm of modes) {
    const r = resolveIn(idx, t, inherit, state, dm);
    if (!r || r.fail) continue;
    if (r.kind === "default" || r.keep) { fallback ??= r; continue; }
    return r;
  }
  return fallback ?? { fail: true };
}

function resolveIn(idx, t, inherit, state, dotted) {
  const split = (x) => (dotted ? x.split(".").map((s) => s.trim()).filter(Boolean) : (() => { const i = x.indexOf("_"); return i > 0 ? [x.slice(0, i), x.slice(i + 1)] : [x]; })());
  const seg = split(t);
  let char = null, rest;
  const first = seg.length ? resolveChar(idx, seg[0]) : null;
  if (first) { char = first; rest = seg.slice(1); }
  else if (inherit?.char && seg.length) { char = inherit.char; rest = seg; }   // 합친 두 번째 조각: 앞 조각의 캐릭터를 잇는다
  else {   // 밑줄 대신 띄어 쓴 경우(Amiya smiling): 앞 낱말부터 캐릭터 이름을 찾는다
    const words = t.split(/\s+/);
    for (let k = words.length - 1; k >= 1 && !char; k--) {
      const c = resolveChar(idx, words.slice(0, k).join(" "));
      if (c) { char = c; const r = words.slice(k).join(" "); rest = dotted ? r.split(".").filter(Boolean) : [r]; }
    }
  }
  if (!char) return { fail: true };
  let outfitRaw = null, kwRaw = null;
  if (rest.length >= 2) { outfitRaw = rest.slice(0, -1).join("."); kwRaw = rest[rest.length - 1]; }
  else if (rest.length === 1) kwRaw = rest[0];
  const outfits = [...char.outfits.values()];
  if (!dotted && kwRaw && outfits.some((o) => o.name)) {   // 밑줄 형식의 형태: virtual_blushing shyly → 형태 virtual + 키워드
    const i = kwRaw.indexOf("_");
    if (i > 0 && pick(norm(kwRaw.slice(0, i)), outfits.filter((o) => o.name).map((o) => ({ n: o.n, v: o })))) { outfitRaw = kwRaw.slice(0, i); kwRaw = kwRaw.slice(i + 1); }
  }
  const worn = state?.[char.name]?.outfit;   // 직전 응답에서 입고 있던 옷
  const wornOutfit = worn != null ? outfits.find((o) => o.name === worn) ?? null : null;
  let outfit = null;
  if (outfits.length === 1) outfit = outfits[0];
  else if (outfitRaw) outfit = pick(norm(outfitRaw), outfits.filter((x) => x.name).map((x) => ({ n: x.n, v: x }))) ?? wornOutfit;
  else if (inherit?.outfit && char === inherit.char) outfit = inherit.outfit;
  else outfit = wornOutfit;
  const pool = outfit ? outfit.entries : char.entries;
  let entry = pickKeyword(kwRaw, pool);
  let kind = "fuzzy";
  if (!entry && kwRaw && outfit && outfits.length > 1) {   // 동작 우선(사용자 결정): 이 옷에 없는 키워드면 그 키워드가 있는 다른 옷으로
    const other = pickKeyword(kwRaw, char.entries);
    if (other && !FALLBACK.includes(other.nk)) { entry = other; outfit = char.outfits.get(other.outfit ?? ""); kind = "outfit"; }
  }
  if (!entry && kwRaw) {
    const parts = splitKeywords(kwRaw, pool);
    if (parts.length) return { many: parts.map((p) => pool.find((e) => e.nk === p)), char, outfit };
  }
  if (!entry) {
    entry = fallbackOf(outfit ? outfit.entries : char.entries);
    kind = "default";
    if (!entry) return { keep: true, char };   // 대신 넣을 기본 표정이 없으면 건드리지 않는다
    if (!outfit) outfit = outfits.find((o) => o.entries.includes(entry));
  }
  if (!outfit) {   // 옷을 못 정했으면 키워드를 가진 첫 옷으로
    const o = outfits.find((x) => x.entries.some((e) => e.nk === entry.nk)) ?? outfits[0];
    entry = o.entries.find((e) => e.nk === entry.nk) ?? entry; outfit = o;
  }
  return { entry, kind, char, outfit };
}

const rarity = (idx, e) => (FALLBACK.includes(e.nk) ? Infinity : idx.kwCount.get(e.nk) ?? Infinity);

// 태그 안쪽 글 → { name, kind, entry } | { remove: kind } | { keep: true }
function resolvePayload(idx, payload, state) {
  const raw = String(payload ?? "").trim().replace(EXT, "");
  if (!raw || PLACEHOLDER.test(raw)) return { remove: "template" };
  const direct = resolveToken(idx, raw, null, state);
  if (direct?.entry && direct.kind !== "fuzzy" && direct.kind !== "default") return { name: direct.entry.name, kind: direct.kind, entry: direct.entry };
  const pieces = raw.split(SPLIT).map((s) => s.trim()).filter(Boolean);
  const cands = [];
  let inherit = null, merged = pieces.length > 1, kept = direct?.keep ? direct.char ?? true : null;
  for (const piece of pieces) {
    if (PLACEHOLDER.test(piece)) continue;
    const r = resolveToken(idx, piece, inherit, state);
    if (!r || r.fail) continue;
    if (r.keep) { kept = r.char ?? kept ?? true; continue; }
    if (r.many) { merged = true; cands.push(...r.many); } else cands.push(r.entry);
    if (r.char && !inherit) inherit = { char: r.char, outfit: r.outfit };
  }
  if (!cands.length) {
    if (direct?.entry) return { name: direct.entry.name, kind: direct.kind, entry: direct.entry };
    return kept ? { keep: true, char: kept?.name } : { remove: "unknown" };
  }
  // 가장 드문(구체적인) 키워드, 같으면 뒤에 쓴 것(보통 '감정 + 동작' 순서로 붙여 씀)
  const best = cands.map((e, i) => ({ e, i })).sort((a, b) => rarity(idx, a.e) - rarity(idx, b.e) || b.i - a.i)[0].e;
  const kind = merged && cands.length > 1 ? "merged" : (direct?.kind === "default" && cands.length === 1 ? "default" : cands.length === 1 && pieces.length === 1 ? (direct?.kind ?? "fuzzy") : "merged");
  return { name: best.name, kind, entry: best };
}

const TAG = /<img\b([^<>]*)>/gi;
const INNER = /^(\s*=\s*|\s+src\s*=\s*)(["']?)([\s\S]*?)\2\s*(\/?)\s*$/i;
const skipPayload = (p) => /:\/\/|^\s*(data|blob):|^\s*[/.]|\{\{|=/i.test(p);   // 일반 이미지·CBS·다른 속성이 붙은 태그

// 본문 속 이미지 태그를 교정한다. opts.state = { 캐릭터 이름: { outfit } } (직전에 입던 옷), opts.unknown = "keep"이면 없는 캐릭터 태그를 지우지 않는다.
// 돌려주는 값: { text, changed, fixes:[{ from, to, kind }] }
export function fixImgTags(text, idx, opts = {}) {
  const orig = typeof text === "string" ? text : "";
  if (!orig || !idx?.size || !/<img\b/i.test(orig)) return { text: orig, changed: false, fixes: [] };
  const src = orig.replace(NESTED, '<img="[Character]">');   // 꺾쇠가 든 지침 원문 → 아래에서 원문 복사로 지움
  const keepUnknown = opts.unknown === "keep";
  const fixes = [];
  let out = "", last = 0, m;
  const re = new RegExp(TAG.source, "gi");
  while ((m = re.exec(src))) {
    const parts = INNER.exec(m[1]);
    if (!parts) continue;
    const payload = parts[3];
    if (skipPayload(payload)) continue;
    if (idx.byName.get(norm(payload)) === payload.trim() && payload === payload.trim()) continue;   // 이미 정확함
    const r = resolvePayload(idx, payload, opts.state);
    if (r.keep) continue;
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
    out += head; last = next; re.lastIndex = next;
    fixes.push({ from, to: null, kind: r.remove });
  }
  if (!fixes.length) return { text: orig, changed: false, fixes: [] };
  out += src.slice(last);
  for (const f of fixes) if (f.from === '<img="[Character]">' && src !== orig) f.from = "(지침 원문)";
  return { text: out, changed: out !== orig, fixes };
}

// 글 속 이미지 태그를 실제 에셋으로 읽는다(교정 규칙과 같게). → [{ raw, entry }]
export function readTags(text, idx) {
  const res = [];
  if (typeof text !== "string" || !idx?.size || !/<img\b/i.test(text)) return res;
  const re = new RegExp(TAG.source, "gi");
  let m;
  while ((m = re.exec(text))) {
    const parts = INNER.exec(m[1]);
    if (!parts || skipPayload(parts[3])) continue;
    const r = resolvePayload(idx, parts[3]);
    // raw는 실제 에셋 이름으로 고친 꼴(2.2.0): AI가 붙인 .webp 같은 확장자·오타를 알림의 '직전 태그'로 되돌려 주지 않게
    if (r.entry) res.push({ raw: `<img${parts[1]}${parts[2]}${r.entry.name}${parts[2]}${parts[4] ? " /" : ""}>`, entry: r.entry });
  }
  return res;
}

// 직전 상황: 오래된 글부터 읽어 캐릭터마다 마지막 옷·태그를 남긴다. → { 캐릭터: { outfit, kw, name, raw, turn, streak } }
// streak = 같은 태그를 연달아 쓴 글 수(바로 앞 글에서도 마지막 태그가 같았을 때만 늘어남). 태그 고정 감지용.
export function sceneState(texts, idx) {
  const state = {};
  (texts ?? []).forEach((t, turn) => {
    const lastHere = new Map();
    for (const { raw, entry } of readTags(t, idx)) lastHere.set(entry.char, { raw, entry });
    for (const [char, { raw, entry }] of lastHere) {
      const prev = state[char];
      const streak = prev && prev.name === entry.name && prev.turn === turn - 1 ? prev.streak + 1 : 1;
      state[char] = { outfit: entry.outfit, kw: entry.kw, name: entry.name, raw, turn, streak };
    }
  });
  return state;
}

// ── 수동 교정(도구 탭)용 ──
// 글 속 이미지 태그 위치. 꺾쇠가 든 지침 원문은 template:true. URL·CBS·다른 속성이 붙은 태그는 뺀다.
export function tagSpans(text) {
  const src = String(text ?? ""), out = [];
  let m;
  const nested = new RegExp(NESTED.source, "gi");
  while ((m = nested.exec(src))) out.push({ start: m.index, end: m.index + m[0].length, raw: m[0], template: true });
  const re = new RegExp(TAG.source, "gi");
  while ((m = re.exec(src))) {
    const s = m.index, e = s + m[0].length;
    if (out.some((o) => o.template && s < o.end && e > o.start)) continue;
    const parts = INNER.exec(m[1]);
    if (!parts || skipPayload(parts[3])) continue;
    out.push({ start: s, end: e, raw: m[0], prefix: parts[1], quote: parts[2], payload: parts[3], slash: !!parts[4] });
  }
  return out.sort((a, b) => a.start - b.start);
}
export const renderTag = (span, name) => `<img${span.prefix ?? "="}${span.quote ?? ""}${name}${span.quote ?? ""}${span.slash ? " /" : ""}>`;
// 태그 하나 해석: 이미 정확하면 exact. → { name, kind, entry } | { remove } | { keep, char }
export function resolveTag(idx, payload, state) {
  const p = String(payload ?? "");
  if (idx.byName.get(norm(p)) === p.trim() && p === p.trim()) return { name: p, kind: "exact", entry: idx.byEntryName.get(p) };
  return resolvePayload(idx, p, state);
}
