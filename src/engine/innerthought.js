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
export function hintText(s, { emos = [], user = "" } = {}) {
  if (!s.on || s.max < 1) return "";
  const list = (emos.length ? emos : GENERIC_EMOS).slice(0, 30).join(", ");
  const times = s.min === s.max ? `정확히 ${s.max}번` : s.min > 0 ? `${s.min}~${s.max}번` : `0~${s.max}번(어울릴 때만)`;
  return `${HINT_MARK} 이번 응답 본문 사이 알맞은 곳에, 장면에 나온 인물${user ? `(${user} 제외)` : "({{user}} 제외)"}의 속마음을 인물마다 ${times} 넣어요.\n`
    + `형식: <${TAG} name="인물 이름" emo="감정">겉으로 말하지 않은 솔직한 생각 1~2문장</${TAG}>\n`
    + `emo는 다음 중 하나: ${list}\n이 태그 밖 본문은 평소대로 쓰고, 태그 안 글을 본문에 다시 쓰지 않아요.`;
}

const RE = new RegExp(`<${TAG}\\b([^>]*)>([\\s\\S]*?)<\\/${TAG}\\s*>`, "gi");
const attrOf = (attrs, k) => (new RegExp(`\\b${k}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs) ?? []).slice(1).find((x) => x != null) ?? "";
export function parseThoughts(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(RE)) {
    const name = attrOf(m[1], "name").trim(), body = m[2].replace(/<[^>]+>/g, "").trim();
    if (name && body) out.push({ name: name.slice(0, 40), emo: attrOf(m[1], "emo").trim().slice(0, 30), text: body.slice(0, 400) });
  }
  return out;
}
// 요청 사본: 지난 응답의 속마음 태그는 빼서 보낸다(토큰 절약·횟수 흉내 방지)
export const stripThoughts = (text) => String(text ?? "").replace(RE, "").replace(/[ \t]+\n/g, "\n");

// 감정 이미지 고르기. emotions = 봇 감정 이미지 이름, assets = 추가 에셋 이름
const nz = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/[\s_\-.()\[\]]+/g, "");
const SYN = [["기쁨", "happy", "joy", "smile", "웃음", "행복"], ["슬픔", "sad", "cry", "울음"], ["화남", "angry", "anger", "mad", "분노"], ["놀람", "surprise", "surprised", "shock"],
  ["부끄러움", "shy", "blush", "embarrassed", "수줍"], ["불안", "anxious", "worry", "nervous", "걱정"], ["평온", "calm", "neutral", "normal", "default", "기본"], ["설렘", "excited", "love", "heart", "두근"],
  ["당황", "confused", "panic", "flustered"], ["질투", "jealous", "pout", "삐짐"]];
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
  return "img";
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
export function bubbleHtml(t, img = "") {
  return `<span x-dusk="thought" data-dusk="thought" style="${BUBBLE}">`
    + (img ? `<span style="flex:none;width:72px;max-height:96px;overflow:hidden;border-radius:16px;line-height:0;opacity:.95">${img}</span>` : "")
    + `<span style="display:block;min-width:0"><b style="display:block;font-size:11.5px;letter-spacing:.04em;opacity:.7;margin-bottom:2px">💭 ${esc(t.name)}${t.emo ? ` · ${esc(t.emo)}` : ""}</b>`
    + `<i style="display:block;font-size:13.5px;line-height:1.6;opacity:.92">${esc(t.text)}</i></span>`
    + DOT(26, -9, 10) + DOT(14, -18, 6) + `</span>`;
}
// 화면 글: 태그 → 풍선. 스트리밍 중 아직 안 닫힌 태그는 ‘생각 중’ 풍선으로(날글이 보이지 않게)
export function renderThoughts(text, imgFor = () => "") {
  if (typeof text !== "string" || !text.toLowerCase().includes(`<${TAG}`)) return text;
  let out = text.replace(RE, (all, attrs, body) => {
    const t = { name: attrOf(attrs, "name").trim(), emo: attrOf(attrs, "emo").trim(), text: body.replace(/<[^>]+>/g, "").trim() };
    if (!t.name || !t.text) return "";
    let img = ""; try { img = imgFor(t) || ""; } catch { img = ""; }
    return bubbleHtml(t, img);
  });
  out = out.replace(new RegExp(`<${TAG}\\b[^>]*>?[\\s\\S]*$`, "i"), (m) => bubbleHtml({ name: attrOf(m, "name") || "…", emo: "", text: "…" }));
  return out;
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
    k = k.replace(/^[\s_\-.]+|[\s_\-.]+$/g, "").replace(/[\s_\-.]+/g, " ").trim();
    if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
  }
  return out;
}
