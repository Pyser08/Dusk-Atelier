// 장기기억 애드온(0.3.22): 응답 본문의 인물 이름 → 누르면 뜨는 상태창(순수). 스크립트 없이 <details>만 써서 RisuAI·Bard·Pocket 모두에서 열린다.
// 상태창 = 요약(위키를 간략히) · 스탯(기분·피로·감정·수치·상태이상·몸 흔적) · NSFW(성인 프로필이 있을 때)
import { extraOf, activeStatus, activeMarks, markAge, STATUS_LV, nk } from "./memextra.js";
import { lifeView } from "./nsfwlife.js";
import { EMO_TAGS, EMO_LABEL } from "./memoryemo.js";
import { partOf } from "./humanitems.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cut = (s, n) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const C = { rose: "#ec4f86", deep: "#d0457a", vio: "#8a63d2", blue: "#5c8bd6", amber: "#e0a030", orange: "#d9772b" };
const MUTE = "opacity:.62", TILE = "background:rgba(127,127,127,.11);border-radius:12px";
const pct = (v, max) => Math.max(0, Math.min(100, Math.round((v / max) * 100)));
const meter = (v, max, color) => `<i style="display:block;height:5px;border-radius:3px;background:rgba(127,127,127,.2);overflow:hidden;margin-top:5px"><i style="display:block;height:100%;width:${pct(v, max)}%;background:${color};border-radius:3px"></i></i>`;
// 위쪽 핵심 수치 칸(큰 글자 + 막대)
const tile = (label, big, sub, v, max, color) => `<span style="display:block;padding:8px 10px;${TILE};min-width:0"><span style="display:block;font-size:10.5px;${MUTE};white-space:nowrap">${esc(label)}</span><b style="display:block;font-size:15px;line-height:1.25;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(big)}</b>${sub ? `<span style="display:block;font-size:10.5px;${MUTE};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sub)}</span>` : ""}${meter(v, max, color)}</span>`;
const row = (label, v, max, color, right) => `<span style="display:grid;grid-template-columns:4.6em 1fr 2.6em;gap:7px;align-items:center;font-size:12px;margin:4px 0"><span style="${MUTE};white-space:nowrap">${esc(label)}</span><i style="display:block;height:5px;border-radius:3px;background:rgba(127,127,127,.2);overflow:hidden"><i style="display:block;height:100%;width:${pct(v, max)}%;background:${color};border-radius:3px"></i></i><span style="font-size:11px;${MUTE};text-align:right">${esc(right)}</span></span>`;
const chip = (t, bg = "rgba(127,127,127,.15)", fg = "inherit") => `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 9px;border-radius:999px;background:${bg};color:${fg};font-size:11.5px;line-height:1.5">${esc(t)}</span>`;
const head = (icon, t, color = "inherit") => `<span style="display:flex;align-items:center;gap:6px;margin:12px 0 5px;font-size:11px;font-weight:800;letter-spacing:.06em;color:${color}"><span>${icon}</span>${esc(t)}<i style="flex:1;height:1px;background:rgba(127,127,127,.22)"></i></span>`;
const box = (inner, extra = "") => inner ? `<span style="display:block;padding:9px 11px;${TILE};${extra}">${inner}</span>` : "";

// 인물 하나의 상태창 HTML(안쪽만). 접고 펴기 없이 한 판에: 머리 → 핵심 수치 → 요약 → 나에게 → 상태 → NSFW
export function statusCardHtml(folder, doc, { turn = null, when = "", adult = true, status = true } = {}) {
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
  // 머리
  const initial = [...String(doc.title ?? "?")][0] ?? "?";
  const top = `<span style="display:flex;gap:11px;align-items:center"><span style="flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,${C.vio},${C.rose});color:#fff;font-weight:800;font-size:18px">${esc(initial)}</span>`
    + `<span style="display:block;min-width:0"><b style="display:block;font-size:16px;line-height:1.3">${esc(doc.title)}</b>${v?.today ? `<span style="display:inline-block;margin-top:2px;padding:1px 8px;border-radius:999px;background:rgba(138,99,210,.16);color:${C.vio};font-size:11px">${esc(v.today)}</span>` : ""}</span></span>`
    + (prof.summary ? `<span style="display:block;margin-top:9px;font-size:12.5px;line-height:1.55">${esc(cut(prof.summary, 150))}</span>` : "");
  // 핵심 수치(있는 것만, 최대 4칸)
  const moodTop = v?.moodTop;
  const tiles = [
    Number.isFinite(emo.affection) ? tile("나에게 호감", `${emo.affection}/10`, Number.isFinite(emo.trust) ? `신뢰 ${emo.trust}` : "", emo.affection, 10, C.vio) : "",
    moodTop ? tile("기분", moodTop.label, "", moodTop.v, 100, C.amber) : "",
    v ? tile("피로", v.fatStep, "", v.fat, 100, C.blue) : "",
    isAdult && v ? tile("성욕", v.lustStep, "", v.lust, 100, C.rose) : "",
  ].filter(Boolean);
  const grid = tiles.length ? `<span style="display:grid;grid-template-columns:repeat(${Math.min(tiles.length, 2)},minmax(0,1fr));gap:6px;margin-top:11px">${tiles.join("")}</span>` : "";
  // 상태(상태이상·몸 흔적) — 가장 눈에 띄어야 해서 수치 바로 밑
  const cond = [st.map((x) => chip(`🤒 ${x.effect} · ${STATUS_LV[x.lv ?? 1]}${x.days ? ` · ${Math.max(0, x.days - markAge(x, t, when))}일` : " · 나을 때까지"}`, "rgba(217,119,43,.16)", C.orange)).join(""),
    mk.map((x) => chip(`🩹 ${x.part} ${x.desc}`, "rgba(208,69,122,.13)", C.deep)).join("")].join("");
  // 요약(위키 간략)
  const traits = (prof.coreTraits ?? []).slice(0, 5).map((x) => chip(x)).join("");
  const rel = (doc.sections ?? []).find((s) => s?.provenance?.slotId === "core.relationship")?.body;
  const recs = (person?.records ?? []).filter((r) => !r.orphan && r.act).slice(-3).reverse().map((r) => `<span style="display:flex;gap:7px;margin:3px 0;font-size:12px;line-height:1.45"><i style="flex:none;width:5px;height:5px;margin-top:6px;border-radius:50%;background:${C.vio}"></i><span>${esc(cut(r.act, 70))}</span></span>`).join("");
  const goals = (e.goals[nk(doc.title)]?.list ?? []).filter((x) => x.status === "active").map((x) => row(cut(x.goal, 7), x.prog ?? 0, 100, C.vio, `${x.prog ?? 0}%`)).join("");
  const sum = [traits, rel && `<span style="display:block;font-size:12px;line-height:1.5;margin-top:${traits ? 5 : 0}px">${esc(cut(rel, 140))}</span>`, recs && `<span style="display:block;margin-top:6px">${recs}</span>`, goals && `<span style="display:block;margin-top:6px">${goals}</span>`].filter(Boolean).join("");
  // 나에게(감정)
  const emoRows = EMO_TAGS.filter((k) => Number.isFinite(emo[k]) && emo[k] > 0 && k !== "affection").map((k) => row(EMO_LABEL[k], emo[k], 10, k === "hostility" || k === "fear" ? C.blue : k === "attraction" ? C.rose : C.vio, `${emo[k]}`)).join("");
  // NSFW
  let ns = "";
  if (isAdult) {
    const zs = [...(n.zones ?? [])].filter((z) => z.level > 0).sort((a, b) => b.level - a.level).slice(0, 5);
    const weak = zs.find((z) => z.level >= 3);
    const likes = [...(n.positions ?? []).filter((p) => p.preference === "preferred").map((p) => p.label), ...(n.tags?.likes ?? [])].slice(0, 6);
    ns = [weak ? `<span style="display:block;padding:8px 10px;border-radius:10px;background:rgba(208,69,122,.14);margin-bottom:6px"><span style="display:block;font-size:10.5px;font-weight:800;color:${C.deep}">약점</span><b style="font-size:13px">${esc(partOf(weak.part)?.label ?? weak.part)}${weak.spot ? ` · ${esc(weak.spot)}` : ""}</b>${weak.note ? `<span style="display:block;font-size:11.5px;${MUTE};margin-top:1px">${esc(cut(weak.note, 60))}</span>` : ""}</span>` : "",
      Number.isFinite(n.sexual?.eroticInterest) ? row("성적 관심", n.sexual.eroticInterest, 100, C.rose, String(n.sexual.eroticInterest)) : "",
      zs.filter((z) => z !== weak).length ? `<span style="display:block;margin-top:4px">${zs.filter((z) => z !== weak).map((z) => chip(`${partOf(z.part)?.label ?? z.part} ${"♥".repeat(z.level)}`, "rgba(208,69,122,.12)", C.deep)).join("")}</span>` : "",
      likes.length ? `<span style="display:block;margin-top:4px">${likes.map((x) => chip(x)).join("")}</span>` : ""].filter(Boolean).join("");
  }
  return top + grid
    + (cond ? head("●", "지금 상태", C.orange) + `<span style="display:block">${cond}</span>` : "")
    + (sum ? head("◆", "요약") + box(sum) : "")
    + (emoRows ? head("♡", "나에게") + box(emoRows) : "")
    + (ns ? head("♥", "NSFW", C.deep) + box(ns, "background:rgba(208,69,122,.07)") : "");
}

// 본문 글의 이름에 상태창 링크를 단다. people = [{names:[…], html}] (html = 상태창 안쪽). 태그 안·이미 단 링크·코드 안은 건드리지 않는다
export const LINK_MAX = 16;
export function linkNames(text, people, { max = LINK_MAX } = {}) {
  if (typeof text !== "string" || !text || !people?.length) return text;
  const map = new Map(); for (const p of people) for (const n of p.names ?? []) { const k = String(n ?? "").trim(); if (k.length >= 2 && !map.has(k)) map.set(k, p); }
  if (!map.size) return text;
  const keys = [...map.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${keys.join("|")})`, "g");
  // 건드리지 않을 구간: 태그, <details x-dusk…>…</details>, <style>/<script>/<code>/<pre>, ``` 코드, {{…}}
  const parts = text.split(/(<details[^>]*x-dusk[\s\S]*?<\/details>|<(style|script|code|pre)\b[\s\S]*?<\/\2>|```[\s\S]*?```|\{\{[\s\S]*?\}\}|<[^>]+>)/i);
  let count = 0, out = "";
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i]; if (seg == null) continue;
    if (i % 3 === 2) continue;   // split의 두 번째 캡처(태그 이름)
    if (i % 3 === 1) { out += seg; continue; }   // 보호 구간
    out += seg.replace(re, (name, _m, off, whole) => {
      const prev = whole[off - 1] ?? "", next = whole[off + name.length] ?? "";
      if (/[A-Za-z0-9_]/.test(prev) || (/^[A-Za-z]/.test(name) && /[A-Za-z0-9_]/.test(next))) return name;   // 영어 이름은 낱말 경계
      if (count >= max) return name;
      count++;
      return linkHtml(name, map.get(name).html);
    });
  }
  return count ? POP_CSS + out : out;
}
const POP_CSS = "<style>@keyframes dkPcIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}details[x-dusk=pc]>summary::-webkit-details-marker{display:none}details[x-dusk=pc][open]>summary{background:rgba(138,99,210,.12);border-radius:4px}</style>";
export function linkHtml(name, inner) {
  // 이름은 수수하게: 글자색·굵기는 그대로, 아주 옅은 밑줄만. 누르면 화면 가운데 상태창이 바로 뜬다(살짝 떠오르는 움직임)
  return `<details x-dusk="pc" style="display:inline-block;vertical-align:baseline;margin:0;padding:0"><summary style="display:inline;cursor:pointer;list-style:none;color:inherit;font:inherit;text-decoration:underline;text-decoration-color:rgba(127,127,127,.38);text-decoration-thickness:1px;text-underline-offset:3px">${esc(name)}</summary>`
    + `<span style="display:block;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);animation:dkPcIn .16s ease-out;z-index:60;width:min(340px,92vw);max-height:76vh;overflow:auto;padding:14px 14px 10px;border-radius:18px;background:var(--risu-theme-bgcolor,#1d1b26);color:var(--risu-theme-textcolor,#eee);border:1px solid rgba(138,99,210,.35);box-shadow:0 18px 50px rgba(0,0,0,.38);font-size:13px;line-height:1.5;text-align:left;font-style:normal;font-weight:400;white-space:normal;text-decoration:none">`
    + `${inner}<span style="display:block;margin-top:10px;font-size:10.5px;opacity:.5;text-align:right">이름을 다시 누르면 닫혀요 · Dusk</span></span></details>`;
}
