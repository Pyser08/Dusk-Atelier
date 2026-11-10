// 모듈 호환 — 모델 안내(순수). 모델이 모듈 이미지 이름을 '봇 자신의 태그 모양'으로 쓰게 요청 사본에 짧은 안내를 넣는다.
// 봇 글로벌 노트·로어북에 이름 목록이 닫혀 있어도(“이 이름만 허용”) 이 안내가 모듈 이름을 함께 허용한다.
import { findTags, keyOf, MEDIA_EXT, synthTemplate } from "./modcompat.js";
export { synthTemplate };

export const MARK = "[Dusk · module images]";
const UI_WORD = /(^|[\s_\-.])(icon|icons|bg|background|frame|button|btn|ui|bar|banner|logo|panel|badge|cursor|font|sound|bgm|deep)([\s_\-.\d]|$)|^\d+$/i;

// 봇이 실제로 쓰는 태그 예시를 글에서 찾아 '{name}' 자리를 만든다. 그리기 정규식 모양을 먼저 본다.
// texts: 요청 메시지 글들(글로벌 노트·설명·로어북이 들어 있음)
export function exampleTemplate(texts, ctx) {
  const all = ctx?.shapes ?? [];
  // 봇(·프리셋) 그리기 모양 → 모듈 그리기 모양 → 기본 모양(봇 에셋 이름일 때만) 순서로 찾는다
  // 1) 봇 에셋 이름을 쓴 예시(어느 그리기 모양이든) 2) 봇·프리셋 그리기 모양 3) 모듈 그리기 모양 4) 기본 모양의 봇 에셋 예시
  const isBot = (h) => ctx.reg?.bot?.has(keyOf(h.raw));
  const passes = [
    [all.filter((s) => s.renderer), isBot],
    [all.filter((s) => s.renderer && s.renderer.source?.kind !== "module"), () => true],
    [all.filter((s) => s.renderer?.source?.kind === "module"), () => true],
    [all.filter((s) => !s.renderer), isBot]
  ];
  for (const [shapes, okHit] of passes) {
    if (!shapes.length) continue;
    for (const t of texts ?? []) {
      const s = String(t ?? "");
      if (!s || s.length > 400000) continue;
      for (const h of findTags(s, shapes)) {
        if (!okHit(h)) continue;
        if (/\{\{|\{name\}/.test(h.raw)) continue;
        const g = /^\$(\d+)$/.exec(h.shape.tpl), cap = g ? h.m[+g[1]] : null;
        if (!cap) continue;
        const at = h.text.indexOf(cap);
        if (at < 0) continue;
        const ext = MEDIA_EXT.test(cap) ? cap.match(MEDIA_EXT)[0] : "";
        return h.text.slice(0, at) + "{name}" + ext + h.text.slice(at + cap.length);
      }
    }
  }
  return synthTemplate(ctx);
}
// 안내할 이미지 목록. 스스로 그리기 정규식을 가진 모듈(자기 태그를 직접 안내함)은 뺀다. off: 사용자가 끈 모듈 id
export function promptSubjects(ctx, { off = [] } = {}) {
  const selfRender = new Set((ctx?.scripts ?? []).filter((s) => s.source?.kind === "module" && s.type === "editdisplay" && /\$\d/.test(s.out) && /\{\{\s*(raw|path|img|image|asset)\s*::/i.test(s.out)).map((s) => s.source.id));
  const skip = new Set(off);
  const chars = [], singles = [];
  for (const sub of ctx?.reg?.subjects ?? []) {
    const full = sub.variants[0]?.full ?? sub.single;
    const mid = ctx.reg.mod.get(keyOf(full))?.moduleId ?? "";
    if (selfRender.has(mid) || skip.has(mid)) continue;
    if (sub.variants.length >= 2) chars.push(sub);
    else if (!UI_WORD.test(String(sub.name)) && !UI_WORD.test(String(full))) singles.push(sub.variants[0] ? String(sub.variants[0].full).replace(MEDIA_EXT, "") : String(sub.name));
  }
  return { chars, singles, selfRender: [...selfRender] };
}

// 안내 글. recent: 최근 대화 글(나온 인물을 먼저 넣는다), maxChars: 안내 길이 상한
export function buildBlock(ctx, { template = "<img src=\"{name}\">", recent = "", maxChars = 3500, off = [] } = {}) {
  const { chars, singles } = promptSubjects(ctx, { off });
  if (!chars.length && !singles.length) return "";
  const seps = chars.map((c) => c.sep);
  const sep = seps.filter((x) => x === "_").length > seps.length / 2 ? "_" : " ";
  const count = new Map();
  for (const c of chars) for (const v of new Set(c.variants.map((x) => x.variant))) count.set(v, (count.get(v) ?? 0) + 1);
  const common = [...count.entries()].filter(([, n]) => n >= Math.max(2, Math.ceil(chars.length * 0.6))).map(([v]) => v);
  const commonSet = new Set(common);
  const rec = keyOf(recent);
  const ordered = [...chars].sort((a, b) => (rec.includes(keyOf(b.name)) ? 1 : 0) - (rec.includes(keyOf(a.name)) ? 1 : 0));
  const lines = [
    MARK,
    "More images are available from add-on modules. These names are allowed in addition to any image name list given elsewhere.",
    `Show them exactly like this story's other images, with the same tag format: ${template}`
  ];
  if (chars.length) lines.push(`For a character, {name} is "<character>${sep}<variant>" (e.g. ${template.replace("{name}", `${ordered[0].name}${sep}${(common[0] ?? ordered[0].variants[0].variant)}`)}). Use only the names below, and only for characters who are in the scene.`);
  let body = "", more = 0;
  const push = (line) => { if ((lines.join("\n") + body + line).length > maxChars) { more++; return false; } body += line + "\n"; return true; };
  if (common.length) push(`- Variants for every character: ${common.join(", ")}`);
  const names = [];
  for (const c of ordered) {
    const extra = [...new Set(c.variants.map((x) => x.variant))].filter((v) => !commonSet.has(v));
    names.push(extra.length && extra.length <= 12 ? `${c.name} (also: ${extra.join(", ")})` : c.name);
  }
  if (names.length) {
    let line = "- Characters: ";
    for (const n of names) { if ((lines.join("\n") + body + line + n).length > maxChars) { more++; continue; } line += (line.endsWith(": ") ? "" : ", ") + n; }
    body += line + "\n";
  }
  if (singles.length) {
    let line = "- Single images: ";
    for (const n of singles) { if ((lines.join("\n") + body + line + n).length > maxChars) { more++; continue; } line += (line.endsWith(": ") ? "" : ", ") + n; }
    body += line + "\n";
  }
  if (more) body += `- (${more} more not listed)\n`;
  return (lines.join("\n") + "\n" + body).trim();
}

// 요청 사본에 안내 블록을 넣는다(대화 기록 앞, 예전 블록은 지움). 저장된 채팅·봇은 바꾸지 않는다.
export function injectBlock(messages, text) {
  const out = (messages ?? []).filter((m) => !(m && m.role === "system" && String(m.content ?? "").startsWith(MARK)));
  if (!text) return out;
  const at = out.findIndex((m) => m && typeof m.memo === "string" && m.memo && (m.role === "user" || m.role === "assistant"));
  out.splice(at < 0 ? Math.max(0, out.length - 1) : at, 0, { role: "system", content: text });
  return out;
}
