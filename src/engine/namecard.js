// 장기기억 애드온(0.3.22): 응답 본문의 인물 이름 → 누르면 뜨는 상태창(순수). 스크립트 없이 <details>만 써서 RisuAI·Bard·Pocket 모두에서 열린다.
// 상태창 = 요약(위키를 간략히) · 스탯(기분·피로·감정·수치·상태이상·몸 흔적) · NSFW(성인 프로필이 있을 때)
import { extraOf, activeStatus, activeMarks, markAge, STATUS_LV, nk, OUTFIT_PARTS } from "./memextra.js";
import { lifeView } from "./nsfwlife.js";
import { EMO_TAGS, EMO_LABEL } from "./memoryemo.js";
import { partOf } from "./humanitems.js";
import { raceView } from "./races.js";
import { parseIso, isoOf } from "./weather.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cut = (s, n) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const C = { rose: "#e8578e", deep: "#d0457a", vio: "#8b6fe0", blue: "#5c8bd6", amber: "#e3a33a", orange: "#d9772b", teal: "#3aa597" };
const MUTE = "opacity:.6", HAIR = "rgba(127,127,127,.18)";
const pct = (v, max) => Math.max(0, Math.min(100, Math.round((v / max) * 100)));
const bar = (v, max, color, h = 4) => `<i style="display:block;height:${h}px;border-radius:${h}px;background:${HAIR};overflow:hidden"><i style="display:block;height:100%;width:${pct(v, max)}%;background:linear-gradient(90deg,${color}aa,${color});border-radius:${h}px"></i></i>`;
// 핵심 수치 칸
const stat = (label, big, v, max, color) => `<span style="display:flex;flex-direction:column;gap:5px;padding:10px 11px 11px;border-radius:14px;background:linear-gradient(155deg,${color}26,${color}08 70%);border:1px solid ${color}33;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);min-width:0"><span style="display:flex;justify-content:space-between;gap:6px;font-size:10.5px"><span style="${MUTE};white-space:nowrap">${esc(label)}</span><b style="color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(big)}</b></span>${bar(v, max, color)}</span>`;
const row = (label, v, max, color, right) => `<span style="display:grid;grid-template-columns:5em 1fr 2.2em;gap:8px;align-items:center;font-size:12px;margin:5px 0"><span style="${MUTE};white-space:nowrap">${esc(label)}</span>${bar(v, max, color)}<span style="font-size:11px;${MUTE};text-align:right;font-variant-numeric:tabular-nums">${esc(right)}</span></span>`;
const chip = (t, bg = "rgba(127,127,127,.12)", fg = "inherit") => `<span style="display:inline-block;margin:0 4px 4px 0;padding:2px 10px;border-radius:999px;background:${bg};color:${fg};font-size:11.5px;line-height:1.6;box-shadow:inset 0 0 0 1px rgba(127,127,127,.1)">${esc(t)}</span>`;
const sec = (t, body, { color = "inherit", right = "" } = {}) => body ? `<span style="display:block;margin-top:14px"><span style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><b style="font-size:10.5px;letter-spacing:.12em;color:${color};opacity:.85">${esc(t)}</b><i style="flex:1;height:1px;background:${HAIR}"></i>${right}</span>${body}</span>` : "";

// 인물 하나의 캐릭터 상태창 HTML(안쪽만). img = 얼굴 사진 데이터 URL(없으면 이름 첫 글자)
export function statusCardHtml(folder, doc, { turn = null, when = "", adult = true, status = true, img = null } = {}) {
  if (!doc) return "";
  const t = Number.isInteger(turn) ? turn : Number.isInteger(folder?.cursor?.at) ? folder.cursor.at : 0;
  const names = new Set([doc.title, ...(doc.aliases ?? [])].map(nk)), mine = (n) => names.has(nk(n));
  const prof = folder?.wiki?.people?.profiles?.[doc.id] ?? {}, e = extraOf(folder);
  let v = null; try { v = lifeView(folder, doc, t); } catch { v = null; }
  const person = Object.entries(folder?.people ?? {}).find(([k, p]) => mine(k) || mine(p?.name))?.[1];
  const emo = Object.values(folder?.emo ?? {}).find((x) => mine(x?.from) && /\{\{user\}\}/i.test(String(x?.to ?? "")))?.tags ?? {};
  const n = folder?.nsfw?.[doc.id], isAdult = adult && !!n && Object.keys(n.sexual ?? {}).length > 0;
  const st = !status ? [] : activeStatus(e.status, t, when).filter((x) => mine(x.name));
  const mk = activeMarks(e.marks, t, when).filter((x) => mine(x.name));
  const outfit = Object.values(e.outfit ?? {}).find((o) => mine(o.name));
  const pIso = parseIso(when), rv = raceView(folder, doc, { iso: pIso ? isoOf(pIso) : "", cal: e.climate?.mdays ? e.climate : null, hemi: e.climate?.hemi ?? "N" });
  const showRace = rv.known && rv.id !== "human";
  // 머리: 사진(없으면 첫 글자) · 이름 · 오늘 · 한 줄 소개
  const initial = [...String(doc.title ?? "?")][0] ?? "?";
  const face = img
    ? `<img data-face src="${esc(img)}" alt="" style="flex:none;width:64px;height:64px;border-radius:20px;object-fit:cover;box-shadow:0 0 0 2px rgba(255,255,255,.22),0 0 0 4px rgba(139,111,224,.35),0 8px 22px rgba(0,0,0,.3)">`
    : `<span data-face style="flex:none;display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(140deg,${C.vio},${C.rose});color:#fff;font-weight:800;font-size:25px;box-shadow:0 0 0 2px rgba(255,255,255,.18),0 8px 22px rgba(139,111,224,.4)">${esc(initial)}</span>`;
  const head = `<span style="display:block;margin:-14px -14px 0;padding:16px 14px 14px;border-radius:18px 18px 0 0;background:radial-gradient(120% 90% at 0% 0%,rgba(139,111,224,.32),transparent 60%),radial-gradient(90% 80% at 100% 0%,rgba(232,87,142,.2),transparent 60%);border-bottom:1px solid rgba(127,127,127,.12)">`
    + `<span style="display:flex;gap:12px;align-items:center">${face}<span style="display:block;min-width:0"><span style="display:block;font-size:10px;letter-spacing:.14em;${MUTE}">CHARACTER</span><b style="display:block;font-size:19px;letter-spacing:-.01em;line-height:1.2;margin-top:2px">${esc(doc.title)}</b>`
    + `${showRace ? `<span style="display:inline-block;margin:5px 4px 0 0;padding:2px 9px;border-radius:999px;background:linear-gradient(135deg,rgba(58,165,151,.28),rgba(92,139,214,.2));border:1px solid rgba(58,165,151,.45);font-size:11px;font-weight:700">🧬 ${esc(rv.custom || rv.label)}</span>` : ""}${v?.today ? `<span style="display:inline-block;margin-top:5px;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(139,111,224,.35);font-size:11px">${esc(v.today)}</span>` : ""}</span></span>`
    + (prof.summary ? `<span style="display:block;margin-top:11px;font-size:12.5px;line-height:1.6;opacity:.9">${esc(cut(prof.summary, 150))}</span>` : "") + `</span>`;
  // 핵심 수치(있는 것만)
  const moodTop = v?.moodTop;
  const stats = [
    Number.isFinite(emo.affection) ? stat("호감", `${emo.affection}/10`, emo.affection, 10, C.vio) : "",
    Number.isFinite(emo.trust) ? stat("신뢰", `${emo.trust}/10`, emo.trust, 10, C.teal) : "",
    moodTop ? stat("기분", moodTop.label, moodTop.v, 100, C.amber) : "",
    v ? stat("피로", v.fatStep, v.fat, 100, C.blue) : "",
  ].filter(Boolean).slice(0, 4);
  const nsStats = isAdult && v ? [stat("성욕", v.lustStep, v.lust, 100, C.rose), Number.isFinite(n.sexual?.eroticInterest) ? stat("성적 관심", String(n.sexual.eroticInterest), n.sexual.eroticInterest, 100, C.deep) : ""].filter(Boolean) : [];
  const nsGrid = nsStats.length ? `<span style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${nsStats.join("")}</span>` : "";
  const grid = stats.length ? `<span style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:${isAdult ? 0 : 12}px">${stats.join("")}</span>` : "";
  // 지금 상태
  const mkChips = mk.map((x) => chip(`${x.part} ${x.desc}`, "rgba(208,69,122,.12)", C.deep)).join("");
  const cond = [...st.map((x) => chip(`${x.effect} · ${STATUS_LV[x.lv ?? 1]}${x.days ? ` · ${Math.max(0, x.days - markAge(x, t, when))}일` : ""}`, "rgba(217,119,43,.15)", C.orange))].join("") + (isAdult ? "" : mkChips);
  // 옷차림: 간단히(보이는 대로) + › 삽화용 상세
  let wear = "";
  if (outfit) {
    const parts = OUTFIT_PARTS.filter(([k]) => k !== "acc" && outfit.parts?.[k]);
    const simple = parts.map(([k, l]) => `<span style="display:grid;grid-template-columns:4.6em 1fr;gap:8px;font-size:12px;margin:3px 0"><span style="${MUTE}">${esc(l)}</span><span>${esc(outfit.parts[k].s)}</span></span>`).join("")
      + (outfit.acc?.length ? `<span style="display:block;margin-top:5px">${outfit.acc.map((x) => chip(x.s)).join("")}</span>` : "");
    const detail = [...parts.map(([k, l]) => [l, outfit.parts[k].d]), ...(outfit.acc ?? []).map((x) => ["액세서리", x.d])].filter(([, d]) => d)
      .map(([l, d]) => `<span style="display:block;margin:6px 0;font-size:12px;line-height:1.55"><b style="font-size:11px;color:${C.vio}">${esc(l)}</b><br>${esc(d)}</span>`).join("");
    wear = simple + (detail ? `<details style="margin-top:6px"><summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;padding:3px 10px;border-radius:999px;border:1px solid rgba(139,111,224,.4);color:${C.vio}">삽화용 상세 ›</summary><span style="display:block;margin-top:6px;padding:8px 11px;border-radius:12px;background:rgba(139,111,224,.08)">${detail}</span></details>` : "");
  }
  // 요약(위키 간략)
  const traits = (prof.coreTraits ?? []).slice(0, 5).map((x) => chip(x)).join("");
  const rel = (doc.sections ?? []).find((s) => s?.provenance?.slotId === "core.relationship")?.body;
  const recs = (person?.records ?? []).filter((r) => !r.orphan && r.act).slice(-3).reverse().map((r) => `<span style="display:flex;gap:8px;margin:4px 0;font-size:12px;line-height:1.5"><i style="flex:none;width:4px;height:4px;margin-top:7px;border-radius:50%;background:${C.vio}"></i><span>${esc(cut(r.act, 70))}</span></span>`).join("");
  const goals = (e.goals[nk(doc.title)]?.list ?? []).filter((x) => x.status === "active").map((x) => row(cut(x.goal, 7), x.prog ?? 0, 100, C.vio, `${x.prog ?? 0}%`)).join("");
  const sum = [traits && `<span style="display:block">${traits}</span>`, rel && `<span style="display:block;font-size:12px;line-height:1.6;opacity:.9">${esc(cut(rel, 140))}</span>`, recs, goals].filter(Boolean).join("");
  // 나에게(감정, 호감·신뢰는 위 칸)
  const emoRows = EMO_TAGS.filter((k) => Number.isFinite(emo[k]) && emo[k] > 0 && k !== "affection" && k !== "trust").map((k) => row(EMO_LABEL[k], emo[k], 10, k === "hostility" || k === "fear" ? C.blue : k === "attraction" ? C.rose : C.vio, `${emo[k]}`)).join("");
  // NSFW
  let ns = "";
  if (isAdult) {
    const zs = [...(n.zones ?? [])].filter((z) => z.level > 0).sort((a, b) => b.level - a.level).slice(0, 5);
    const weak = zs.find((z) => z.level >= 3);
    const likes = [...(n.positions ?? []).filter((p) => p.preference === "preferred").map((p) => p.label), ...(n.tags?.likes ?? [])].slice(0, 6);
    ns = [weak ? `<span style="display:flex;gap:10px;align-items:center;padding:9px 11px;border-radius:12px;background:linear-gradient(90deg,rgba(208,69,122,.18),rgba(208,69,122,.05));margin-bottom:6px"><b style="flex:none;font-size:10.5px;letter-spacing:.08em;color:${C.deep}">약점</b><span style="min-width:0"><b style="font-size:13px">${esc(partOf(weak.part)?.label ?? weak.part)}${weak.spot ? ` · ${esc(weak.spot)}` : ""}</b>${weak.note ? `<span style="display:block;font-size:11.5px;${MUTE}">${esc(cut(weak.note, 60))}</span>` : ""}</span></span>` : "",
      zs.filter((z) => z !== weak).length ? `<span style="display:block;margin-top:6px">${zs.filter((z) => z !== weak).map((z) => chip(`${partOf(z.part)?.label ?? z.part} ${"♥".repeat(z.level)}`, "rgba(208,69,122,.1)", C.deep)).join("")}</span>` : "",
      (n.zones ?? []).some((z) => z.numb) ? `<span style="display:block">${(n.zones ?? []).filter((z) => z.numb).map((z) => chip(`불감 · ${partOf(z.part)?.label ?? z.part}`, "rgba(138,143,163,.16)", "#8a8fa3")).join("")}</span>` : "",
      likes.length ? `<span style="display:block;margin-top:2px">${likes.map((x) => chip(x)).join("")}</span>` : ""].filter(Boolean).join("");
  }
  const general = sec("지금 상태", cond && `<span style="display:block">${cond}</span>`, { color: C.orange })
    + sec("옷차림", wear) + sec("요약", sum) + sec("나에게", emoRows)
    + sec("종족", showRace && rv.gen && `<span style="display:block;font-size:12px;line-height:1.6;opacity:.9">${esc(cut(rv.gen, 160))}</span>`, { color: C.teal });
  if (!isAdult) return head + grid + general;
  // 일반 / NSFW 탭: 같은 name의 <details>는 하나만 열림(지원 안 하는 곳은 NSFW 판이 위에 겹쳐 보임). 스크립트 없음
  const g = `dkpc-${String(doc.id ?? "x").replace(/[^\w-]/g, "")}-${++tabSeq}`;
  const raceNs = showRace ? [rv.heat?.label ? chip(rv.heat.on ? `🔥 ${rv.heat.label}` : rv.heat.label, rv.heat.on ? "rgba(232,87,142,.18)" : "rgba(127,127,127,.12)", rv.heat.on ? C.rose : "inherit") : "", rv.nsfw ? `<span style="display:block;font-size:12px;line-height:1.6;opacity:.9">${esc(cut(rv.nsfw, 160))}</span>` : ""].join("") : "";
  const nsBody = sec(`종족 체질${showRace ? ` · ${esc(rv.custom || rv.label)}` : ""}`, raceNs, { color: C.teal }) + sec("몸 흔적", mkChips && `<span style="display:block">${mkChips}</span>`, { color: C.deep }) + sec("성적 상태", ns, { color: C.deep });
  return head + `<span data-tabbox style="display:block;position:relative;height:min(50vh,400px);margin-top:12px">`
    + `<span style="position:absolute;left:0;right:0;top:46px;text-align:center;font-size:11.5px;${MUTE}">위 탭을 눌러 보세요</span>`
    + tab(g, "g", "일반", grid + general, true) + tab(g, "n", "NSFW", nsGrid + nsBody, false) + `</span>`;
}
let tabSeq = 0;
const tab = (g, k, label, body, open) => `<details x-dusk="tab" data-dusk="tab" data-tab="${k}" name="${g}"${open ? " open" : ""} style="display:inline-block;margin:0 4px 0 0"><summary style="list-style:none;cursor:pointer;display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;border:1px solid ${k === "n" ? "rgba(232,87,142,.4)" : "rgba(139,111,224,.4)"};color:${k === "n" ? C.rose : C.vio}">${label}</summary><span style="display:block;position:absolute;left:0;right:0;top:38px;bottom:0;overflow:auto;padding:0 2px 6px;background:var(--risu-theme-bgcolor,#1b1a24);animation:dkTabIn .22s cubic-bezier(.22,1,.36,1)">${body}</span></details>`;
// 2.2.25: 응답 안 상태창(리스 화면 권한이 없을 때만)은 떠 있는 창 대신 이름 아래 펼침 칸 — 메시지 겹침 층에 갇혀 다른 UI가 뚫고 나왔다.
// 리스 화면 권한이 있으면 cardoverlay가 화면 맨 위에 띄운다(바깥 누르면 닫힘).
// 2.2.24: 이 CSS는 응답 안 <style>로 넣지 않고 리스 화면에 한 번만 넣는다(namelinks.ensureCss). 응답 안 <style>은 리스가 바꿔 해석하다 ‘CSS ERROR’를 띄웠다.
export const PC_OPEN_CSS = "details[data-dusk=pc]>summary::-webkit-details-marker{display:none}details[data-dusk=pc][open]>summary{background:rgba(138,99,210,.12);border-radius:4px}";
export const TAB_CSS = "details[data-dusk=tab]>summary::-webkit-details-marker{display:none}details[data-dusk=tab][open]>summary{color:#fff!important;border-color:transparent!important;background:linear-gradient(135deg,#8b6fe0,#a77bf0);box-shadow:0 4px 14px rgba(139,111,224,.35)}details[data-tab=n][open]>summary{background:linear-gradient(135deg,#e8578e,#f07aa4);box-shadow:0 4px 14px rgba(232,87,142,.35)}@keyframes dkTabIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}"
  // 2.2.22 휴대폰: 상태창이 화면을 다 덮던 문제 → 더 작게
  + "@media (max-width:600px){details[data-dusk=pc]>span{max-height:60vh!important;padding:10px 10px 8px!important;font-size:12px!important;border-radius:16px!important}details[data-dusk=pc] [data-tabbox]{height:min(36vh,300px)!important}details[data-dusk=pc] [data-face]{width:48px!important;height:48px!important;font-size:19px!important}}";

// 본문 글의 이름에 상태창 링크를 단다. people = [{names:[…], html}] (html = 상태창 안쪽). 태그 안·이미 단 링크·코드 안은 건드리지 않는다
export const LINK_MAX = 16;
// 2.2.22: 다른 플러그인·봇 정규식이 만든 HTML 안의 이름은 건드리지 않는다(구조가 꼬였다). 꾸밈 태그(b·i·em·p 등) 안은 괜찮다.
// 속성이 붙은 div·span·section 같은 상자, 링크·버튼·표·폼·details 안은 '남의 영역'으로 본다.
const FOREIGN = new Set(["a", "button", "select", "option", "textarea", "label", "summary", "details", "table", "thead", "tbody", "tr", "td", "th", "svg", "math", "iframe", "object", "video", "audio", "canvas", "form", "nav", "header", "footer", "aside", "figure", "ruby"]);
const BOXES = new Set(["div", "span", "section", "article", "main", "ul", "ol", "li", "font", "center", "blockquote", "p"]);
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "wbr", "source", "area", "col", "embed", "track", "param", "base"]);
// 본문 글의 이름에 상태창 링크를 단다. people = [{names:[…], html}] (html = 상태창 안쪽).
// 인물마다 첫 등장에만 단다(같은 상태창을 여러 벌 넣으면 메시지가 몇 배로 커지고 느려졌다)
export function linkNames(text, people, { max = LINK_MAX, overlay = false } = {}) {
  if (typeof text !== "string" || !text || !people?.length) return text;
  const map = new Map(); for (const p of people) for (const n of p.names ?? []) { const k = String(n ?? "").trim(); if (k.length >= 2 && !map.has(k)) map.set(k, p); }
  if (!map.size) return text;
  const keys = [...map.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${keys.join("|")})`, "g");
  // 건드리지 않을 구간: 태그, Dusk 상태창, <style>/<script>/<code>/<pre>, ``` 코드, {{…}}
  const parts = text.split(/(<span data-dusk="nm"[^>]*>[^<]*<\/span>|<details[^>]*x-dusk="pc"[\s\S]*?Dusk 캐릭터 상태창<\/span><\/span><\/details>|<details[^>]*x-dusk[\s\S]*?<\/details>|<(style|script|code|pre)\b[\s\S]*?<\/\2>|```[\s\S]*?```|\{\{[\s\S]*?\}\}|<[^>]+>)/i);
  let count = 0, out = "", foreign = 0;
  const stack = [], done = new Set();
  for (const m of text.matchAll(/<details[^>]*x-dusk="pc"[^>]*><summary[^>]*>([^<]+)<\/summary>|<span data-dusk="nm"[^>]*>([^<]+)<\/span>/g)) { const p = map.get((m[1] ?? m[2]).trim()); if (p) done.add(p); }   // 이미 단 상태창(두 번 처리해도 같게)
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]; if (seg == null) continue;
    if (i % 3 === 2) continue;   // split의 두 번째 캡처(태그 이름)
    if (i % 3 === 1) {   // 보호 구간. 여는/닫는 태그면 '남의 영역' 깊이를 센다
      out += seg;
      const m = /^<(\/)?([a-z][\w-]*)([^>]*)>$/i.exec(seg);
      if (m && !VOID.has(m[2].toLowerCase()) && !/\/\s*>$/.test(seg)) {
        const tag = m[2].toLowerCase();
        if (m[1]) { let j = stack.length - 1; while (j >= 0 && stack[j] !== tag && stack[j] !== "!" + tag) j--; if (j >= 0) { for (const t of stack.splice(j)) if (t.startsWith("!")) foreign--; } }
        else { const isF = FOREIGN.has(tag) || (BOXES.has(tag) && /\b(class|style|id|data-[\w-]+|x-[\w-]+)\s*=/i.test(m[3])) || (!BOXES.has(tag) && !/^(b|i|u|s|em|strong|small|big|sub|sup|mark|q|cite|h[1-6]|del|ins|abbr|dfn|kbd|var|time)$/.test(tag));
          stack.push(isF ? "!" + tag : tag); if (isF) foreign++; if (stack.length > 200) stack.shift(); }
      }
      continue;
    }
    if (foreign > 0) { out += seg; continue; }
    out += seg.replace(re, (name, _m, off, whole) => {
      const prev = whole[off - 1] ?? "", next = whole[off + name.length] ?? "";
      if (/[A-Za-z0-9_]/.test(prev) || (/^[A-Za-z]/.test(name) && /[A-Za-z0-9_]/.test(next))) return name;   // 영어 이름은 낱말 경계
      const p = map.get(name);
      if (count >= max || done.has(p)) return name;
      count++; done.add(p);
      return overlay && p.id ? nameSpan(name, p.id) : linkHtml(name, p.html);
    });
  }
  return out;
}
export const NAMECARD_CSS = TAB_CSS + "@keyframes dkPcIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}" + PC_OPEN_CSS;
// 2.2.24: 리스 화면 위에 상태창을 띄울 수 있을 때 — 응답 안엔 이름만(클릭은 cardoverlay가 단다)
export const nameSpan = (name, pid) => `<span data-dusk="nm" data-pid="${esc(pid)}" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(139,111,224,.55);text-decoration-thickness:1px;text-underline-offset:3px">${esc(name)}</span>`;
export function linkHtml(name, inner) {
  // 이름은 수수하게: 글자색·굵기는 그대로, 아주 옅은 밑줄만. 누르면 화면 가운데 상태창이 바로 뜬다(살짝 떠오르는 움직임)
  return `<details x-dusk="pc" data-dusk="pc" data-name="${esc(name)}" style="display:inline-block;vertical-align:baseline;margin:0;padding:0"><summary style="display:inline;cursor:pointer;list-style:none;color:inherit;font:inherit;text-decoration:underline;text-decoration-color:rgba(127,127,127,.38);text-decoration-thickness:1px;text-underline-offset:3px">${esc(name)}</summary>`
    + `<span style="display:block;position:relative;margin:6px 0 4px;width:min(360px,86vw);max-height:min(70vh,560px);overflow:auto;overscroll-behavior:contain;padding:14px 14px 10px;border-radius:20px;background:var(--risu-theme-bgcolor,#1b1a24);color:var(--risu-theme-textcolor,#eee);border:1px solid rgba(139,111,224,.32);box-shadow:0 24px 60px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06);font-size:13px;line-height:1.5;text-align:left;font-style:normal;font-weight:400;white-space:normal;text-decoration:none">`
    + `${inner}<span style="display:block;margin-top:10px;font-size:10.5px;opacity:.5;text-align:right">이름을 다시 누르면 닫혀요 · Dusk 캐릭터 상태창</span></span></details>`;
}
