// 모듈 호환(순수, 애드온 modcompat 전용 — 코어가 import하지 않는다).
// 목표: 봇이 어떻게 만들어졌든(폐쇄형 정규식·화이트리스트·assetlist 검사·이미지 정규식 없음) 켜 둔 모듈의 이미지가
// 그 봇 자신의 이미지와 똑같이 그려지게 한다. 봇·모듈은 고치지 않고, 리스 플러그인 훅(output·display·process)에서
// 글 사본만 바꾼다.
//   output : 모듈 이미지 태그를 봇의 '응답 수정' 정규식이 지우지 못하게 살짝 감싼다(protect).
//   process: 감싼 것을 원래 태그로 되돌린다 → 봇의 '요청 수정' 정규식이 자기 태그처럼 다룬다.
//   display: 되돌린 뒤, 봇의 그리기 정규식이 그대로 그리게 두거나(가장 원본 같음),
//            그 정규식이 봇 에셋 목록({{assetlist}})만 확인하면 같은 정규식을 모듈 이름을 넣어 대신 적용하고,
//            그리는 정규식이 없으면 리스 기본 {{img::이름}}으로 그린다.
// 리스 동작 근거(RisuAI 소스): 플러그인 훅은 CBS·정규식보다 먼저 돈다(scripts.ts processScriptFull),
// {{raw::}}·{{img::}}·<img src="이름">은 모듈 에셋도 찾는다(parser.svelte.ts, ChatBody.svelte),
// {{assetlist}}는 봇 에셋만 준다(cbs.ts).

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
export const MEDIA_EXT = /\.(png|webp|jpe?g|gif|avif|bmp|svg|mp4|webm|m4v|mp3|ogg|wav)$/i;
// 이름 비교용 열쇠: 확장자·대소문자·공백/밑줄 차이를 무시한다.
export const keyOf = (s) => String(s ?? "").trim().replace(MEDIA_EXT, "").toLowerCase().replace(/[\s_]+/g, " ").trim();
const nameOfAsset = (a) => Array.isArray(a) ? a[0] : isObj(a) ? (a.name ?? a[0]) : a;
export const assetNames = (list) => (Array.isArray(list) ? list : []).map(nameOfAsset).filter((n) => typeof n === "string" && n.trim());

// 봇 에셋과 켜진 모듈 에셋으로 이름 등록부를 만든다. 봇이 이미 가진 이름은 모듈 쪽에서 뺀다(봇 것은 원래대로 그려짐).
export function buildRegistry({ botAssets = [], modules = [] } = {}) {
  const bot = new Map(), mod = new Map();
  for (const n of assetNames(botAssets)) { const k = keyOf(n); if (k && !bot.has(k)) bot.set(k, n); }
  for (const m of modules ?? []) {
    for (const n of assetNames(m?.assets)) {
      const k = keyOf(n);
      if (!k || bot.has(k) || mod.has(k)) continue;
      mod.set(k, { name: n, moduleId: m?.id ?? "", moduleName: m?.name ?? "" });
    }
  }
  return { bot, mod, subjects: groupSubjects([...mod.values()].map((v) => v.name)) };
}

// ---------- 정규식 스크립트 ----------
// 리스 customscript → {type, re, src, out, order, actions, source}. 리스와 같은 규칙으로 플래그·<order N>·<액션>을 읽는다.
export function parseScript(e, source = {}) {
  if (!isObj(e) || typeof e.in !== "string" || !e.in || typeof e.type !== "string" || e.type === "disabled") return null;
  let flag = "g", order = 0; const actions = [];
  if (e.ableFlag) {
    flag = String(e.flag || "g").replace(/<(.+?)>/g, (_, p) => {
      for (const m of p.split(",").map((v) => v.trim())) { if (m.startsWith("order ")) order = parseInt(m.slice(6)) || 0; else if (m) actions.push(m); }
      return "";
    });
  }
  const out = String(e.out ?? "").replaceAll("$n", "\n");
  if (out.startsWith("@@move_top") || out.startsWith("@@move_bottom") || actions.includes("move_top") || actions.includes("move_bottom")) flag = flag.replace("g", "");
  flag = [...new Set(flag.trim().replace(/[^dgimsuvy]/g, ""))].join("") || "u";
  let re = null;
  try { re = new RegExp(e.in, flag); } catch { return null; }
  return { type: e.type, re, src: e.in, out, order, actions, comment: String(e.comment ?? ""), source };
}
// 리스와 같은 실행 순서: 프리셋 → 봇 → 모듈, <order N>이 하나라도 있으면 큰 것부터(안정 정렬).
export function collectScripts({ preset = [], bot = [], modules = [] } = {}) {
  const list = [];
  for (const e of preset ?? []) { const s = parseScript(e, { kind: "preset" }); if (s) list.push(s); }
  for (const e of bot ?? []) { const s = parseScript(e, { kind: "bot" }); if (s) list.push(s); }
  for (const m of modules ?? []) for (const e of m?.regex ?? []) { const s = parseScript(e, { kind: "module", id: m?.id ?? "", name: m?.name ?? "" }); if (s) list.push(s); }
  if (list.some((s) => s.order)) list.sort((a, b) => b.order - a.order);
  return list;
}

const ASSET_CBS = /\{\{\s*(raw|path|img|image|asset|emotion|video|video-img|bg)\s*::/i;
const LIST_CBS = /\{\{\s*(assetlist|chardisplayasset)\s*\}\}/i;
// 그리기 정규식: 표시용이고, 바꾼 글에서 에셋을 부른다.
export const isRenderer = (s) => s?.type === "editdisplay" && ASSET_CBS.test(s.out) && /\$(\d|&)/.test(s.out);

// out에서 에셋 이름이 되는 캡처 틀("$1", "$1 $2" …)을 찾는다. 에셋 CBS 안의 $참조가 우선, 없으면 out 전체의 첫 $참조.
// out 안 에셋 CBS들 → [{start, end, type, arg}] (중첩 {{ }} 고려)
export function assetCalls(out) {
  const s = String(out ?? ""), res = [], re = new RegExp(ASSET_CBS.source, "gi");
  let m;
  while ((m = re.exec(s))) {
    let i = m.index + m[0].length, depth = 1, arg = "";
    while (i < s.length && depth > 0) {
      if (s.startsWith("{{", i)) { depth++; arg += "{{"; i += 2; continue; }
      if (s.startsWith("}}", i)) { depth--; if (depth) arg += "}}"; i += 2; continue; }
      arg += s[i++];
    }
    res.push({ start: m.index, end: i, type: m[1], arg });
    re.lastIndex = i;
  }
  return res;
}
// 에셋 CBS 인자가 캡처만으로 정해지면 그 틀("$1.png" 등), 다른 CBS가 끼면 null
const plainArg = (arg) => (/\$(\d|&)/.test(arg) && !/\{\{/.test(arg) ? arg.trim() : null);
export function nameTemplate(out) {
  const s = String(out ?? "");
  const c = assetCalls(s).find((x) => /\$(\d|&)/.test(x.arg));
  if (c) {
    const plain = c.arg.replace(/\{\{[^{}:]*::/g, "").replace(/\}\}/g, "");
    if (/\$(\d|&)/.test(plain) && !/\{\{/.test(plain)) return plain.replace(MEDIA_EXT, "").trim() || "$1";
  }
  const ref = /\$(\d+|&)/.exec(s);
  return ref ? `$${ref[1]}` : "$1";
}
const fill = (tpl, m) => tpl.replace(/\$(\d+|&)/g, (_, g) => (g === "&" ? m[0] : m[+g] ?? ""));

// 기본 태그 모양(그리기 정규식이 없거나 다른 모양으로 쓴 경우). native: 리스가 스스로 모듈 에셋을 그려 주는 꼴.
export const DEFAULT_SHAPES = Object.freeze([
  { src: String.raw`<img\s*=\s*"([^"<>]+)"\s*\/?>`, tpl: "$1" },
  { src: String.raw`<img\s+src\s*=\s*"([^"<>]+)"[^<>]*>`, tpl: "$1" },
  { src: String.raw`<img\s+src\s*=\s*'([^'<>]+)'[^<>]*>`, tpl: "$1" },
  { src: String.raw`<img\s+src\s*=\s*([^"'\s<>][^<>]*?)\s*\/?>`, tpl: "$1" },
  { src: String.raw`\{\{(?:img|image|asset|emotion)::([^{}]+?)\}\}`, tpl: "$1", native: true }
]);

// 이 봇에서 쓰는 태그 모양: 그리기 정규식의 in(봇·모듈·프리셋) + 기본 모양.
export function learnShapes(scripts) {
  const shapes = [], seen = new Set();
  for (const s of scripts ?? []) {
    if (!isRenderer(s) || seen.has(s.src)) continue;
    seen.add(s.src);
    shapes.push({ src: s.src, flags: s.re.flags.replace(/[gy]/g, ""), tpl: nameTemplate(s.out), renderer: s, usesList: LIST_CBS.test(s.out) });
  }
  for (const d of DEFAULT_SHAPES) if (!seen.has(d.src)) shapes.push({ src: d.src, flags: "i", tpl: d.tpl, native: !!d.native });
  for (const sh of shapes) { try { sh.re = new RegExp(sh.src, sh.flags + "g"); } catch { sh.re = null; } }
  return shapes.filter((s) => s.re);
}

// 글에서 태그를 찾는다(겹치면 앞선 모양이 이김). → [{start, end, text, raw, shape, m}]
export function findTags(text, shapes) {
  const s = String(text ?? ""), hits = [];
  for (const sh of shapes ?? []) {
    sh.re.lastIndex = 0;
    let m, guard = 0;
    while ((m = sh.re.exec(s)) && guard++ < 500) {
      if (!m[0]) { sh.re.lastIndex++; continue; }
      const start = m.index, end = start + m[0].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue;
      hits.push({ start, end, text: m[0], raw: fill(sh.tpl, m).trim(), shape: sh, m });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

// 이름 → 모듈 에셋. 정확히 맞지 않으면 같은 인물(주제)의 가장 가까운 변형으로(오타·없는 표정 대비).
export function resolveName(raw, reg) {
  const k = keyOf(raw);
  if (!k || reg.bot.has(k)) return null;
  const hit = reg.mod.get(k);
  if (hit) return { ...hit, exact: true };
  let best = null;
  for (const sub of reg.subjects ?? []) {
    const sk = keyOf(sub.name);
    if (!sub.variants.length || !(k === sk || k.startsWith(sk + " "))) continue;
    if (best && keyOf(best.name).length >= sk.length) continue;
    best = sub;
  }
  if (!best) return null;
  const want = k.slice(keyOf(best.name).length).trim();
  const fallback = () => { for (const w of ["default", "neutral", "normal", "smile", "smiling"]) { const v = best.variants.find((x) => x.variant.toLowerCase() === w); if (v) return v; } return best.variants[0]; };
  let pick = null, dist = Infinity;
  if (want) for (const v of best.variants) { const d = editDistance(want, keyOf(v.variant)); if (d < dist) { dist = d; pick = v; } }
  if (!want || dist > Math.max(3, Math.floor(want.length / 2))) pick = fallback();
  const h = pick && reg.mod.get(keyOf(pick.full));
  return h ? { ...h, exact: false } : null;
}
export function editDistance(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0; if (!a) return b.length; if (!b) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// ---------- 주제(인물)·변형(표정) 묶기 ----------
// "Kang Chae-ho angry", "hayeon_blushing shyly" 처럼 '주제 + 구분자 + 변형' 꼴을 여러 주제에서 반복되는 꼬리로 알아낸다.
export function groupSubjects(names) {
  const list = (names ?? []).map((n) => ({ full: n, base: String(n).replace(MEDIA_EXT, "").trim() })).filter((x) => x.base);
  const splits = (b) => { const out = []; for (let i = 1; i < b.length - 1; i++) if (b[i] === " " || b[i] === "_") out.push({ subject: b.slice(0, i).trim(), sep: b[i], variant: b.slice(i + 1).trim() }); return out.filter((x) => x.subject && x.variant); };
  const owners = new Map();
  for (const x of list) for (const sp of splits(x.base)) { const vk = sp.variant.toLowerCase(); if (!owners.has(vk)) owners.set(vk, new Set()); owners.get(vk).add(sp.subject.toLowerCase()); }
  const subj = new Map();
  for (const x of list) {
    let pick = null, freq = 1;
    for (const sp of splits(x.base)) { const f = owners.get(sp.variant.toLowerCase())?.size ?? 0; if (f > freq || (f === freq && pick && sp.variant.length > pick.variant.length)) { pick = sp; freq = f; } }
    const name = pick ? pick.subject : x.base, k = name.toLowerCase();
    if (!subj.has(k)) subj.set(k, { name, sep: pick?.sep ?? " ", variants: [] });
    if (pick) subj.get(k).variants.push({ variant: pick.variant, full: x.full });
    else subj.get(k).single = x.full;
  }
  return [...subj.values()];
}

// ---------- 보호(응답 저장 전) ----------
export const WJ = "⁠";
const B64S = "", B64E = "";
const b64e = (s) => { const u = new TextEncoder().encode(s); let bin = ""; for (const c of u) bin += String.fromCharCode(c); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const b64d = (s) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(t + "===".slice((t.length + 3) % 4)); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };
const softWrap = (tag) => tag[0] + WJ + tag.slice(1);
const hardWrap = (tag) => `${B64S}D${b64e(tag)}${B64E}`;
// 감싼 것을 되돌린다(어느 단계에서든 같은 함수).
export function unwrap(text) {
  let s = String(text ?? "");
  if (s.includes(B64S)) s = s.replace(/D([A-Za-z0-9_-]+)/g, (all, b) => { try { return b64d(b); } catch { return all; } });
  if (s.includes(WJ)) s = s.replace(/([<{])⁠/g, "$1");
  return s;
}

// 정규식 사슬을 리스처럼(순서대로) 돌린다. CBS·Lua는 돌리지 않는다(판단용 시뮬레이션).
export function runChain(text, scripts, type) {
  let s = String(text ?? "");
  for (const sc of scripts ?? []) {
    if (sc.type !== type) continue;
    sc.re.lastIndex = 0;
    try {
      if (sc.out.startsWith("@@") || sc.actions.some((a) => /move_|inject|repeat_back/.test(a))) {
        // 옮기기·빼내기 계열은 글을 지우지 않고 자리만 바꾸는 것으로 본다(본문에서 사라짐 = 지운 것과 같음은 아님).
        if (sc.actions.includes("inject")) s = s.replace(sc.re, "");
        continue;
      }
      s = s.replace(sc.re, sc.out);
    } catch { /* 건너뜀 */ }
  }
  return s;
}

// 응답 글에서 모듈 이미지 태그를 봇 정규식이 못 지우게 감싼다. 이름이 조금 틀렸으면 맞는 에셋 이름으로 고쳐 둔다.
// → { text, changed: [{from, to, how}] }
export function protectOutput(text, ctx) {
  const src = String(text ?? "");
  if (!src || !ctx?.reg?.mod?.size) return { text: src, changed: [] };
  const hits = findTags(unwrap(src), ctx.shapes);
  if (!hits.length) return { text: src, changed: [] };
  let s = unwrap(src); const changed = [];
  for (const h of hits.reverse()) {
    const hit = resolveName(h.raw, ctx.reg);
    if (!hit) continue;
    let tag = h.text;
    if (!hit.exact) tag = renameIn(h, hit.name);
    const how = guardFor(tag, ctx.scripts, ctx.shapes, hit.name);
    const next = how === "soft" ? softWrap(tag) : how === "hard" ? hardWrap(tag) : tag;
    if (next !== h.text) changed.push({ from: h.text, to: tag, how });
    s = s.slice(0, h.start) + next + s.slice(h.end);
  }
  return { text: s, changed: changed.reverse() };
}
// 태그 안의 이름 부분만 바꾼다(캡처 1개 틀일 때). 아니면 원래 태그.
function renameIn(h, name) {
  const g = /^\$(\d+)$/.exec(h.shape.tpl);
  if (!g) return h.text;
  const cap = h.m[+g[1]];
  if (!cap) return h.text;
  const at = h.text.indexOf(cap);
  const base = String(name).replace(MEDIA_EXT, "");
  const keepExt = MEDIA_EXT.test(cap) ? cap.match(MEDIA_EXT)[0] : "";
  return at < 0 ? h.text : h.text.slice(0, at) + base + keepExt + h.text.slice(at + cap.length);
}
// 감쌀 필요가 있나: 봇의 응답 수정 정규식이 태그를 바꾸거나 지우면 감싼다. 살짝 감싼 것도 건드리면 단단히 감싼다.
export function guardFor(tag, scripts, shapes = null, raw = "") {
  const probe = (t) => runChain(`\n${t}\n`, scripts, "editoutput").includes(t);
  if (probe(tag)) return "none";
  // 봇이 태그 모양만 바꾸는 경우(예: <img src=…> → <img="…">)는 그대로 둔다 — 같은 이름이 남아 있으면 봇 방식대로.
  if (shapes && raw) { const after = runChain(`\n${tag}\n`, scripts, "editoutput"); if (findTags(after, shapes).some((x) => keyOf(x.raw) === keyOf(raw))) return "none"; }
  if (probe(softWrap(tag))) return "soft";
  if (probe(hardWrap(tag))) return "hard";
  return "hard";
}

// ---------- 요청(process) ----------
export const restoreForRequest = (text) => unwrap(text);

// ---------- 표시(display) ----------
// 표시용 글(리스가 CBS·정규식을 돌리기 전)에서 모듈 이미지 태그가 봇 이미지처럼 그려지게 맞춘다.
export function prepareDisplay(text, ctx) {
  const src = String(text ?? "");
  if (!src || !ctx?.reg?.mod?.size) return src;
  const s0 = unwrap(src);
  if (!ctx.prefilter?.test?.(s0)) return s0;
  const hits = findTags(s0, ctx.shapes);
  if (!hits.length) return s0;
  let s = s0;
  for (const h of hits.reverse()) {
    const hit = resolveName(h.raw, ctx.reg);
    if (!hit) continue;
    const out = renderTag(h, hit, ctx);
    if (out !== h.text) s = s.slice(0, h.start) + out + s.slice(h.end);
  }
  return s;
}

// 태그 하나를 어떻게 그릴지. 'keep'이면 봇 정규식이 원래대로 그린다.
export function planRender(tag, ctx, hit = null) {
  const disp = (ctx.scripts ?? []).filter((x) => x.type === "editdisplay");
  let first = null;
  for (const sc of disp) { sc.re.lastIndex = 0; if (sc.re.test(tag)) { first = sc; break; } }
  if (first && isRenderer(first) && !LIST_CBS.test(first.out) && looksUp(first, tag, hit)) return { how: "keep", renderer: first };
  const renderer = first && isRenderer(first) ? first : disp.find((x) => { x.re.lastIndex = 0; return isRenderer(x) && x.re.test(tag); });
  if (renderer) return { how: "inline", renderer };
  return { how: "native" };
}
// 그리기 정규식이 이 태그로 찾을 에셋 이름이 실제 모듈 에셋 이름과 같은가(리스는 소문자 정확히 일치로 찾는다).
// 다른 CBS가 끼어 알 수 없으면 true(봇 방식을 믿는다).
function looksUp(renderer, tag, hit) {
  if (!hit) return true;
  const calls = assetCalls(renderer.out).filter((c) => /\$(\d|&)/.test(c.arg));
  if (!calls.length) return true;
  const re = new RegExp(renderer.re.source, renderer.re.flags.replace(/[gy]/g, ""));
  const m = re.exec(tag);
  if (!m) return false;
  return calls.every((c) => { const p = plainArg(c.arg); return p == null || fill(p, m).trim().toLowerCase() === String(hit.name).toLowerCase(); });
}
function renderTag(h, hit, ctx) {
  const tag = hit.exact ? h.text : renameIn(h, hit.name);
  if (h.shape.native && hit.exact) return tag;                      // {{img::}} 꼴은 리스가 모듈 에셋도 그린다
  const plan = planRender(tag, ctx, hit);
  if (plan.how === "keep") return tag;
  if (plan.how === "inline") {
    const html = inlineRender(tag, plan.renderer, hit, ctx);
    if (html != null) return html;
  }
  // 봇과 다른 모양으로 썼으면(예: 봇은 <img src=…>인데 <img="…">) 봇 모양으로 바꿔 봇 방식대로 그린다
  if (plan.how === "native" && ctx.template && !h.shape.renderer) {
    const retag = ctx.template.replace("{name}", String(hit.name).replace(MEDIA_EXT, ""));
    if (retag !== tag) {
      const p2 = planRender(retag, ctx, hit);
      if (p2.how === "keep") return retag;
      if (p2.how === "inline") { const html = inlineRender(retag, p2.renderer, hit, ctx); if (html != null) return html; }
    }
  }
  return `{{img::${String(hit.name)}}}`;
}
// 봇의 그리기 정규식 out을 이 태그에 직접 적용한다. {{assetlist}}는 이 모듈 에셋 이름을 담은 목록으로 바꾼다.
// 결과가 다시 표시 정규식에 걸려 두 번 그려지지 않게 <img 뒤에 표식 속성을 넣고, 그래도 걸리면 null(→ 기본 그리기).
export function inlineRender(tag, renderer, hit, ctx) {
  let out = renderer.out;
  if (out.startsWith("@@")) out = out.replace(/^@@\w+\s?/, "");
  // 캡처·임시 변수로 이름을 만드는 에셋 CBS는 정확한 모듈 에셋 이름으로 바꾼다(.png 붙이기 등 봇 규칙 차이 무시)
  const NAME = "\uE0D2";
  for (const c of assetCalls(out).reverse()) if (/\$(\d|&)|\{\{/.test(c.arg)) out = out.slice(0, c.start) + `{{${c.type}::${NAME}}}` + out.slice(c.end);
  if (out.endsWith(">") && !renderer.actions.includes("no_end_nl")) out += "\n";
  const base = String(hit.name).replace(MEDIA_EXT, "");
  const list = JSON.stringify([...new Set([hit.name, base, base + ".png", base + ".webp", base + ".jpg"])]);
  out = out.replace(/\{\{\s*(assetlist|chardisplayasset)\s*\}\}/gi, list);
  const re = new RegExp(renderer.re.source, renderer.re.flags.replace(/[gy]/g, ""));
  let html;
  try { html = tag.replace(re, out).split(NAME).join(String(hit.name)); } catch { return null; }
  html = html.replace(/<img(\s)/gi, `<img x-dusk-mc$1`);
  const disp = (ctx.scripts ?? []).filter((x) => x.type === "editdisplay");
  if (disp.some((x) => { x.re.lastIndex = 0; return x.re.test(html); })) return null;
  return html;
}

// 표시 훅을 빨리 넘기기 위한 대강 거르개(모양의 첫 글자들).
export function makePrefilter(shapes) {
  const heads = new Set();
  for (const sh of shapes ?? []) { const m = /^\\?([<{\[(])/.exec(sh.src); heads.add(m ? m[1] : ""); }
  if (heads.has("")) return { test: () => true };
  const chars = [...heads];
  return { test: (s) => chars.some((c) => s.includes(c)) };
}

// 예시가 없으면 봇 그리기 정규식 패턴에서 만든다(첫 캡처 → {name}). 그것도 없으면 리스 기본 꼴.
export function synthTemplate(ctx) {
  const r = (ctx?.shapes ?? []).find((s) => s.renderer && s.renderer.source?.kind !== "module") ?? (ctx?.shapes ?? []).find((s) => s.renderer);
  if (r) {
    let t = r.src.replace(/^\^|\$$/g, "");
    t = t.replace(/\((?!\?)(?:\\.|[^()\\])*\)/, "");                 // 첫 캡처
    t = t.replace(/\((?:\?[:=!<][^()]*)\)/g, "");                            // 둘러보기·비캡처
    t = t.replace(/\\s\*|\\s\+\?|\\s\*\?/g, "").replace(/\\s\+/g, " ").replace(/\\s/g, " ");
    t = t.replace(/(\\.|[^\\])[?*]/g, (all, c) => (c === ")" ? all : ""));      // 있어도 없어도 되는 글자는 뺀다
    t = t.replace(/\\(.)/g, "$1");
    if (!/[\[\]()|+*?]/.test(t) && t.includes("")) return t.replace("", "{name}");
  }
  return `<img src="{name}">`;
}

// 훅들이 함께 쓰는 문맥. scripts: collectScripts 결과, assets·modules: 리스 데이터.
export function buildContext({ botAssets = [], modules = [], preset = [], botScripts = [] } = {}) {
  const reg = buildRegistry({ botAssets, modules });
  const scripts = collectScripts({ preset, bot: botScripts, modules });
  const shapes = learnShapes(scripts);
  const ctx = { reg, scripts, shapes, prefilter: makePrefilter(shapes) };
  ctx.template = synthTemplate(ctx);
  return ctx;
}
