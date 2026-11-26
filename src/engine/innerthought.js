// 인물 속마음 보기 애드온(innerthought) 순수 함수. 메인 모델이 본문과 함께 <dusk-thought> 태그로 속마음을 쓰고,
// 화면(display)에서 반투명 생각 풍선 + 그 감정의 이미지로 바꾼다. 저장된 채팅 글은 태그 그대로(원본이 기준 — 리롤해도 안전).
export const TAG = "dusk-thought";
export const HINT_MARK = "[Dusk 속마음]";
export const DEFAULTS = Object.freeze({ on: false, min: 0, max: 1, image: true });
export const GENERIC_EMOS = Object.freeze(["기쁨", "슬픔", "화남", "놀람", "부끄러움", "불안", "평온", "설렘", "당황", "질투"]);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function normSettings(raw) {
  const s = { ...DEFAULTS, ...(raw && typeof raw === "object" ? raw : {}) };
  const min = clampInt(s.min, 0, 5, 0), max = Math.max(min, clampInt(s.max, 0, 5, 1));
  return { on: s.on === true, min, max, image: s.image !== false };
}
export const summary = (s) => (s.on ? `켜짐 · 인물당 ${s.min === s.max ? s.max : `${s.min}~${s.max}`}번` : "꺼짐");

// 모델에게 주는 안내(요청 사본에만, 응답마다). emos: 쓸 수 있는 감정 이름(봇 감정 이미지에서 뽑음)
// assets: [{ char, kws:[…], names:[…] }] — 이 봇·켜진 모듈의 실제 이미지(인물별). 있으면 모델이 img=에 그대로 골라 쓴다
export function assetList(idx, { maxPer = 40, maxAll = 2400 } = {}) {
  if (!idx?.chars?.size) return "";
  const lines = []; let len = 0;
  for (const c of idx.chars.values()) {
    const names = [...new Set(c.entries.map((e) => e.name))].slice(0, maxPer);
    if (!names.length) continue;
    const line = `- ${c.name || "(이름 없음)"}: ${names.join(", ")}`;
    if (len + line.length > maxAll) break;
    lines.push(line); len += line.length;
  }
  return lines.join("\n");
}
export function hintText(s, { emos = [], user = "", assets = "" } = {}) {
  if (!s.on || s.max < 1) return "";
  const list = (emos.length ? emos : GENERIC_EMOS).slice(0, 30).join(", ");
  const times = s.min === s.max ? `정확히 ${s.max}번` : s.min > 0 ? `${s.min}~${s.max}번` : `0~${s.max}번(어울릴 때만)`;
  const img = s.image && assets ? ` img="이미지 이름"` : "";
  return `${HINT_MARK} 이번 응답에서 장면에 나온 인물${user ? `(${user} 제외)` : "({{user}} 제외)"}의 속마음을 인물마다 ${times} 넣어요.\n`
    + `그 인물의 행동이나 대사 바로 뒤(같은 줄 끝)에 붙여요: <${TAG} name="인물 이름" emo="감정"${img}>겉으로 말하지 않은 솔직한 생각 1~2문장</${TAG}>\n`
    + `emo는 다음 중 하나: ${list}\n`
    + (img ? `img는 아래 목록에서 그 인물·그 감정에 맞는 이미지 이름을 글자 그대로 골라요(그 인물 이미지가 없으면 img를 빼요):\n${assets}\n` : "")
    + `이 태그 밖 본문은 평소대로 쓰고, 태그 안 글을 본문에 다시 쓰지 않아요.`;
}

// 신고 #18: 모델이 태그를 조금 다르게 써도 읽는다 — 값 안의 <img="…">·'>', 굽은 따옴표, &lt; &gt;, dusk_thought, 빠진 닫는 태그.
// fix: 여는 태그를 다듬고, 안 닫힌 태그는 그 줄 끝(또는 다음 속마음 앞)에서 닫는다. 멀쩡한 글은 그대로.
const ATTRS = `(?:"[^"]*"|'[^']*'|[^>"'])*`;
const RE = new RegExp(`<${TAG}\\b(${ATTRS})>([\\s\\S]*?)<\\/${TAG}\\s*>`, "gi");
const LOOSE = /dusk[-_]thought/i;
function fix(text) {
  let s = String(text ?? "");
  if (!LOOSE.test(s)) return s;
  s = s.replace(/&lt;(\/?\s*dusk[-_]thought\b)([\s\S]{0,400}?)&gt;/gi, (_, a, b) => `<${a}${b.replace(/&quot;/gi, '"').replace(/&#39;/g, "'")}>`)
    .replace(/<\s*(\/?)\s*dusk[-_]thought\b/gi, `<$1${TAG}`);
  // 여는 태그 안의 이미지 태그: img="<img="x">" · <img="x"> → img="x"
  s = s.replace(new RegExp(`(<${TAG}\\b[^<>\\n]*?)(?:\\bimg\\s*=\\s*["'“”]?\\s*)?<img\\s*(?:src\\s*)?=\\s*["'“”]?([^"'“”<>\\n]+)["'“”]?\\s*\\/?>["'“”]?`, "gi"), '$1 img="$2"');
  s = s.replace(new RegExp(`<${TAG}\\b[^<>\\n]*>`, "gi"), (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"));
  // 따옴표를 안 닫은 값(img="x>): 그 태그만 따옴표를 지운다
  s = s.replace(new RegExp(`<${TAG}\\b([^<>\\n]*)>`, "gi"), (t, a, at, all) => ((a.match(/"/g) ?? []).length % 2 && !new RegExp(`^<${TAG}\\b(?:"[^"\\n]*"|'[^'\\n]*'|[^>"'\\n])*>`, "i").test(all.slice(at, at + 400).split(`</${TAG}`)[0]) ? `<${TAG}${a.replace(/=\s*"([^"]*)$/, '="$1"')}>` : t));
  const open = new RegExp(`<${TAG}\\b${ATTRS}>`, "gi"), close = new RegExp(`<\\/${TAG}\\s*>`, "i");
  let out = "", i = 0, m;
  while ((m = open.exec(s))) {
    const end = open.lastIndex, rest = s.slice(end), c = close.exec(rest), n = new RegExp(`<${TAG}\\b`, "i").exec(rest);
    out += s.slice(i, end); i = end;
    if (c && (!n || c.index < n.index)) continue;
    const nl = rest.search(/\n|$/), cut = Math.min(nl < 0 ? rest.length : nl, n ? n.index : rest.length);
    if (!n && cut === rest.length) break;   // 글 끝까지 안 닫힘(스트리밍 중) → 화면에서 숨긴다
    out += `${rest.slice(0, cut)}</${TAG}>`; i = end + cut; open.lastIndex = i;
  }
  return out + s.slice(i);
}
const attrOf = (attrs, k) => (new RegExp(`(?:^|\\s)${k}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs) ?? []).slice(1).find((x) => x != null) ?? "";
export function parseThoughts(text) {
  const out = [];
  for (const m of fix(text).matchAll(RE)) {
    const name = attrOf(m[1], "name").trim(), body = m[2].replace(/<[^>]+>/g, "").trim();
    if (name && body) { const t = { name: name.slice(0, 40), emo: attrOf(m[1], "emo").trim().slice(0, 30), text: body.slice(0, 400) }; const img = attrOf(m[1], "img").trim(); if (img) t.img = img.slice(0, 120); out.push(t); }
  }
  return out;
}
// 요청 사본: 지난 응답의 속마음 태그는 빼서 보낸다(토큰 절약·횟수 흉내 방지)
export const stripThoughts = (text) => fix(text).replace(RE, "").replace(/[ \t]+\n/g, "\n");
export const hasThought = (text) => typeof text === "string" && LOOSE.test(text);

// 감정 이미지 고르기. emotions = 봇 감정 이미지 이름, assets = 추가 에셋 이름
const nz = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/[\s_\-.()\[\]]+/g, "");
const SYN = [["기쁨", "happy", "joy", "smile", "웃음", "행복"], ["슬픔", "sad", "cry", "울음"], ["화남", "angry", "anger", "mad", "분노"], ["놀람", "surprise", "surprised", "shock"],
  ["부끄러움", "shy", "blush", "embarrassed", "수줍"], ["불안", "anxious", "worry", "nervous", "걱정"], ["평온", "calm", "neutral", "normal", "default", "기본"], ["설렘", "excited", "love", "heart", "두근"],
  ["당황", "confused", "panic", "flustered"], ["질투", "jealous", "pout", "삐짐"]];
const isEmo = (w) => { const k = nz(w); return !!k && SYN.some((g) => g.some((x) => nz(x) === k)); };
const TOK = /[\s_\-.]+/;
// 신고 #25: 해시·UUID 조각(764ac8fb, f2b6)·번호는 감정 낱말이 아니다
const junk = (t) => /^\d+$/.test(t) || (/^[0-9a-f]{4,}$/i.test(t) && /\d/.test(t));
const synOf = (e) => { const k = nz(e); return SYN.find((g) => g.some((w) => nz(w) === k)) ?? [e]; };
export function pickImage({ emotions = [], assets = [] } = {}, name, emo, { botName = "" } = {}) {
  const words = synOf(emo).map(nz).filter(Boolean), who = nz(name), bot = nz(botName);
  const score = (n) => {
    const k = nz(n); let sc = 0;
    if (words.some((w) => k.includes(w))) sc += 4; else return -1;
    if (who && k.includes(who)) sc += 3;
    else if (who && who === bot) sc += 1;   // 봇 본인 감정 이미지는 이름 없이 감정만 있는 경우가 많다
    else if (/[a-z가-힣]/.test(k.replace(new RegExp(words.join("|"), "g"), ""))) sc -= 2;   // 다른 인물 이름이 붙은 이미지
    return sc;
  };
  let best = null;
  for (const [kind, list] of [["emotion", emotions], ["asset", assets]]) for (const n of list) { const sc = score(n); if (sc > 0 && (!best || sc > best.sc)) best = { kind, name: n, sc }; }
  return best ? { kind: best.kind, name: best.name } : null;
}
// 봇이 이미지를 내보내는 방식대로 태그를 만든다(최근 응답에서 본 방식). 감정 이미지는 {{emotion::}}
export function detectStyle(texts = []) {
  const all = texts.join("\n");
  if (/<img\s*=\s*["']?[^>]+>/i.test(all)) return "imgeq";
  if (/\{\{asset::/i.test(all)) return "asset";
  if (/\{\{image::/i.test(all)) return "image";
  if (/\{\{img::/i.test(all)) return "img";
  return "imgeq";   // 리스 기본 에셋 태그(모듈 이미지도 찾음)
}
export function imageTag(pick, style = "img") {
  if (!pick) return "";
  const n = String(pick.name).replace(/[{}<>"]/g, "");
  if (pick.kind === "emotion") return `{{emotion::${n}}}`;
  return style === "imgeq" ? `<img="${n}">` : style === "asset" ? `{{asset::${n}}}` : style === "image" ? `{{image::${n}}}` : `{{img::${n}}}`;
}

// 반투명 생각 풍선(스크립트 없음, 인라인 스타일만 — 리스 소독기를 지나도 모양 유지)
const BUBBLE = "display:flex;gap:12px;align-items:center;margin:10px 0 18px;padding:12px 16px;border-radius:24px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 24px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);position:relative;max-width:min(560px,100%);box-sizing:border-box";
const DOT = (l, b, s) => `<span style="position:absolute;left:${l}px;bottom:${b}px;width:${s}px;height:${s}px;border-radius:50%;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22)"></span>`;
// side=true: 본문 옆(같은 줄)에 붙는 풍선 — 꼬리가 왼쪽(본문 쪽)
// 신고 #20: 화면 이름표의 감정에서 에셋·인물 이름을 떼어 낸다(저장된 글은 그대로). 감정이 안 남으면 빈 글.
export function cleanEmo(emo, name = "", { idx = null, emos = [] } = {}) {
  const raw = String(emo ?? "").trim(); if (!raw) return "";
  if (emos.some((e) => nz(e) === nz(raw)) && !raw.split(TOK).some(junk)) return raw;
  if (raw.split(TOK).every((t) => !t || junk(t))) return "";
  const people = new Set([nz(name)].filter(Boolean));
  for (const c of idx?.chars?.values?.() ?? []) if (nz(c.name)) people.add(nz(c.name));
  const all = raw.split(TOK).filter((t) => t && !junk(t)), known = all.find(isEmo);
  if (known && all.length > 1 && (people.has(nz(all[0])) || people.has(nz(all.at(-1))))) return known;
  const rest = all.filter((t) => !people.has(nz(t)) || isEmo(t));
  if (rest.length === all.length && !people.has(nz(raw))) return raw.split(TOK).some(junk) ? rest.join(" ") : raw;
  return rest.every((t) => /^\d+$/.test(t)) || (people.has(nz(raw)) && !isEmo(raw)) ? "" : rest.join(" ");
}
export function bubbleHtml(t, img = "", side = false) {
  return `<span x-dusk="thought" data-dusk="thought" style="${side ? BUBBLE.replace("display:flex", "display:inline-flex").replace("margin:10px 0 18px", "margin:4px 0;text-align:left") : BUBBLE}">`
    + (img ? `<span style="flex:none;width:72px;max-height:96px;overflow:hidden;border-radius:16px;line-height:0;opacity:.95">${img}</span>` : "")
    + `<span style="display:block;min-width:0"><b style="display:block;font-size:11.5px;letter-spacing:.04em;opacity:.7;margin-bottom:2px">💭 ${esc(t.name)}${t.emo ? ` · ${esc(t.emo)}` : ""}</b>`
    + `<i style="display:block;font-size:13.5px;line-height:1.6;opacity:.92">${esc(t.text)}</i></span>`
    + (side ? DOT(-9, 10, 8) + DOT(-16, 4, 5) : DOT(26, -9, 10) + DOT(14, -18, 6)) + `</span>`;
}
// 화면 글: 본문의 속마음 태그는 빼고, 본문 옆에 생각풍선 모양 아이콘(💭+꼬리 점)을 붙인다. 누르면 속마음 풍선이 본문 옆(같은 줄)에 펼쳐진다
// (<details> — 스크립트 없이 리스 소독기를 지나도 열고 닫힘). 스트리밍 중 아직 안 닫힌 태그는 숨긴다(날글이 보이지 않게)
const ICON = "list-style:none;display:inline-block;position:relative;cursor:pointer;margin:0 2px 0 12px;padding:2px 9px;vertical-align:middle;border-radius:14px 14px 14px 14px/12px 12px 12px 12px;font-size:12px;line-height:1.3;letter-spacing:1px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);user-select:none";
// 생각풍선 꼬리(본문 쪽 왼쪽 아래로 작은 동그라미 둘)
const TAILDOT = (l, b, s) => `<span style="position:absolute;left:${l}px;bottom:${b}px;width:${s}px;height:${s}px;border-radius:50%;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28)"></span>`;
// 태그가 있던 자리(그 인물의 행동·대사 끝)에 💭 아이콘 하나. 누르면 그 속마음 풍선이 펼쳐진다
export function renderThoughts(text, imgFor = () => "", emoFor = (t) => t.emo) {
  if (!hasThought(text)) return text;
  let out = fix(text).replace(new RegExp(`[ \\t]*\\n?[ \\t]*<${TAG}\\b(${ATTRS})>([\\s\\S]*?)<\\/${TAG}\\s*>`, "gi"), (all, attrs, body) => {
    const t = { name: attrOf(attrs, "name").trim(), emo: attrOf(attrs, "emo").trim(), img: attrOf(attrs, "img").trim(), text: body.replace(/<[^>]+>/g, "").trim() };
    if (!t.text) return "";
    t.name ||= "속마음";   // 이름을 빠뜨려도 보여 준다
    return " " + thoughtIcon(t, imgFor, emoFor);
  });
  out = out.replace(new RegExp(`\\s*<${TAG}\\b[^>]*>?[\\s\\S]*$`, "i"), "");
  return out;
}
export function thoughtIcon(t, imgFor = () => "", emoFor = (x) => x.emo) {
  let img = ""; try { img = imgFor(t) || ""; } catch { img = ""; }
  try { t = { ...t, emo: emoFor(t) ?? "" }; } catch { /* 그대로 */ }
  return `<details x-dusk="thoughts" data-dusk="thoughts" style="display:inline-flex;align-items:center;flex-wrap:wrap;vertical-align:middle;max-width:100%;margin:0"><summary aria-label="${esc(t.name)} 속마음 보기" title="${esc(t.name)} 속마음" style="${ICON}">💭${TAILDOT(-6, 1, 6)}${TAILDOT(-11, -2, 3)}</summary>`
    + `<span style="display:inline-block;vertical-align:middle;margin-left:10px">${bubbleHtml(t, img, true)}</span></details>`;
}

// 상태창 ‘속마음’ 탭: 채팅 글 전체에서 그 인물의 속마음을 모은다(최근 것이 위)
export function collectFromMessages(messages = []) {
  const by = new Map();
  messages.forEach((m, i) => {
    if (m?.role === "user") return;
    for (const t of parseThoughts(m?.data ?? m?.content ?? "")) { const k = nz(t.name); if (!by.has(k)) by.set(k, []); by.get(k).push({ ...t, turn: i + 1 }); }
  });
  return by;
}
export function thoughtsFor(by, names = []) {
  for (const n of names) { const l = by?.get?.(nz(n)); if (l?.length) return l; }
  return [];
}
export function cardTabHtml(list, { limit = 30 } = {}) {
  if (!list?.length) return "";
  return [...list].reverse().slice(0, limit).map((t) => `<span style="display:block;margin:0 0 8px;padding:9px 12px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16)">`
    + `<b style="display:block;font-size:10.5px;opacity:.6;margin-bottom:2px">💭 ${t.turn ? `${t.turn}번째 메시지` : ""}${t.emo ? ` · ${esc(t.emo)}` : ""}</b><i style="font-size:12.5px;line-height:1.55">${esc(t.text)}</i></span>`).join("");
}
// 봇 감정 이미지 이름 → 모델에게 줄 감정 낱말(인물 이름 부분 빼고, 겹침 없이)
export function emotionWords(emotions = [], names = []) {
  const strip = names.map(nz).filter(Boolean), seen = new Set(), out = [];
  for (const e of emotions) {
    let k = String(e ?? "").trim(); for (const n of strip) k = k.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
    k = k.split(TOK).filter((t) => t && !junk(t)).join(" ").trim();
    if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
  }
  return out;
}
// 신고 #20: 추가 에셋(NPC 이름_감정)에서 감정 낱말만. 아는 감정이면 그 낱말, 아니면 인물 이름을 뗀 키워드. 이름뿐인 그림·번호는 뺀다
export function assetEmotions(idx, names = []) {
  const people = new Set([...(idx?.chars?.values?.() ?? [])].map((c) => nz(c.name)).concat(names.map(nz)).filter(Boolean)), out = [], seen = new Set();
  for (const e of idx?.entries ?? []) {
    const known = String(e.bare ?? e.name).replace(/\.(?:png|apng|jpe?g|webp|gif|avif)$/i, "").split(TOK).find(isEmo);
    const kw = known ?? String(e.kw ?? "").split(TOK).filter((t) => t && !junk(t) && !people.has(nz(t))).join(" ");
    const k = kw.toLowerCase(); if (kw && !seen.has(k)) { seen.add(k); out.push(kw); }
  }
  return out;
}
