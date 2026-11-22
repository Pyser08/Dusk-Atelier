// 장기기억 애드온(0.3.22): 새 기록 줄과 그 저장·주입(순수, 모델 호출 없음).
//   소문(told) · 인물 목표(goal) · 세계 문서(place·item·faction) · 몸 흔적(mark) · 화면 밖 근황 · @인물 고정 회상 · 궁합
// 저장: folder.extra = { rumors:[{from,to,info,at,when}], goals:{key:{name,list:[{goal,prog,status,at,first}]}},
//                       world:{place:{key:{name,desc,at,first,n}}, item:{…,owner}, faction:{…,members:[]}}, marks:[{name,part,desc,days,at,when}], diary:[…] }
import { filterIgnored } from "./memedit.js";
import { detach } from "./regress.js";
import { contraOf, addCum } from "./fertility.js";
import { createEmptyWikiScope } from "./pot/wiki-schema.js";
import { climateFrom, CLIMATE_STAGE1 } from "./weather.js";
import { CAL_STAGE1, calFrom, applyCal, CAL_KINDS } from "./storycal.js";
import { raceReport } from "./races.js";
import { tieReport, applyTie } from "./ties.js";
const text = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const isUser = (s) => /\{\{user\}\}|^user$|^유저$/i.test(String(s ?? "").trim());

export const EXTRA_STAGE1 = [
  "",
  "Also only when newest clearly shows it (usually none):",
  "told|Speaker|Listener|info passed on (short Korean)",
  "goal|Name|own ongoing aim (short Korean)|progress 0-100|active, done or dropped",
  "place|name|one Korean line      recurring location",
  "item|name|one Korean line|owner or none      notable object or gift",
  "faction|name|one Korean line|members      group or family",
].join("\n");
// 11-22: 체내 사정 줄은 성적인 낱말이 없는(완곡한) 응답에서도 묻도록 따로 뺀다(recorder NSFW_LITE_STAGE1)
export const CUM_STAGE1 = "\ncum|Receiver|Giver|inside, anal, mouth or outside|ml (number; one normal climax 3-5)|none, condom, pill, iud, afterpill, pullout or broke      each ejaculation in newest (also when only implied, e.g. a fade-out ending inside her)";
export const MARK_STAGE1 = "\nmark|Name|body part|trace (hickey, bite, bruise…) in Korean|days 1-14      a visible trace newly left on a body" + CUM_STAGE1;

// 0.3.22 상태이상(취함·부상·감기·최음제·수면 부족·저주…): 설정 ‘상태이상’(기본 켜짐)
export const STATUS_STAGE1 = "\nstatus|Name|condition in Korean (drunk, injured, cold, aphrodisiac, sleepless, cursed…)|1-3 severity|days 1-14 or 0 = until cured      a condition newly starts or worsens\ncure|Name|condition      a condition ends";
// 0.3.22 옷차림·액세서리(부위별: 간단 = 사람이 볼 것, 상세 = 삽화용) · 날씨
export const OUTFIT_PARTS = Object.freeze([["head", "머리"], ["face", "얼굴"], ["outer", "겉옷"], ["top", "상의"], ["bra", "속옷(위)"], ["bottom", "하의"], ["panties", "속옷(아래)"], ["legs", "다리"], ["feet", "신발"], ["acc", "액세서리"]]);
export const OUTFIT_LABEL = Object.freeze(Object.fromEntries(OUTFIT_PARTS));
export const OUTFIT_STAGE1 = "\nwear|Name|head, face, outer, top, bra, bottom, panties, legs, feet or acc|short Korean (what people see)|detailed Korean for an illustrator (colour, material, cut, fit, pattern, current state like wet, torn, unbuttoned)      clothing or accessory newly shown or changed\nstrip|Name|part      that piece is taken off";
export const WEATHER_STAGE1 = "\nweather|맑음, 구름, 흐림, 비, 폭우, 눈, 안개, 천둥, 바람 or 실내      the weather in newest's scene when it is shown or changes (also when {{user}}'s input changes it)" + CLIMATE_STAGE1 + CAL_STAGE1;   // 달력(생일·기념일·약속·공휴일)도 상태창과 함께
export const WEATHER_KINDS = Object.freeze(["맑음", "구름", "흐림", "비", "폭우", "눈", "안개", "천둥", "바람", "실내"]);
export function weatherOf(s) {
  const t = String(s ?? "");
  if (/폭우|장대비|억수|storm(y)? rain|downpour/i.test(t)) return "폭우";
  if (/천둥|번개|뇌우|thunder|lightning/i.test(t)) return "천둥";
  if (/눈(이|발|보라)|함박눈|진눈깨비|snow/i.test(t)) return "눈";
  if (/비(가|를|에| 오| 내)|빗(줄기|방울|소리)|소나기|이슬비|rain/i.test(t)) return "비";
  if (/안개|fog|mist/i.test(t)) return "안개";
  if (/바람(이 세|이 거|이 불)|강풍|wind/i.test(t)) return "바람";
  if (/흐림|흐린|잿빛 하늘|먹구름|overcast|cloudy/i.test(t)) return "흐림";
  if (/구름/.test(t)) return "구름";
  if (/맑|햇살|햇빛|화창|sunny|clear sky/i.test(t)) return "맑음";
  if (/실내|indoor/i.test(t)) return "실내";
  return "";
}
export const EXTRA_KINDS = new Set(["told", "goal", "place", "item", "faction", "mark", "status", "cure", "cum", "hist", "wear", "strip", "weather", "climate", "cohabit", "race", "tie", "bday", "couple", "plan", "day", "country", "hol"]);
// 동거(월경 주기 동기화용): 같은 집에 사는 두 사람
export const COHABIT_STAGE1 = "\ncohabit|Name|Name      two characters shown or stated to live together (same home or room)";
// 기록기 답 → 보고 목록. canon(name) → 알려진 이름(없으면 "")
export const WORLD_KINDS = new Set(["told", "goal", "place", "item", "faction"]);
// world=false(설정 ‘세계 탭’ 꺼짐)면 소문·목표·세계 문서 줄은 버린다
export function extraFrom(raw, canon = (n) => n, { marks = false, world = true, status = true, outfit = true, weather = true, cohabit = false, race = false, tie = true } = {}) {
  const out = [];
  const who = (s) => (isUser(s) ? "{{user}}" : canon(String(s ?? "").trim()) || "");
  for (const line0 of String(raw ?? "").split(/\r?\n/)) {
    const f = line0.trim().replace(/^(?:[-*•>]+|\d+[.)])\s*/, "").split(/[|｜¦]/).map((x) => x.trim()), tag = (f[0] ?? "").toLowerCase();
    if (CAL_KINDS.has(tag)) { if (weather) out.push(...calFrom(line0, (n) => who(n))); continue; }
    if (tag === "climate") { if (!weather) continue; const c = climateFrom(f); if (c) out.push({ kind: "climate", ...c }); continue; }
    if (tag === "race") { if (!race) continue; const r = raceReport(f, (n) => who(n)); if (r) out.push(r); continue; }
    if (tag === "tie") { if (!tie) continue; const r = tieReport(f, who); if (r) out.push(r); if (out.length >= 16) break; continue; }
    if (tag === "cohabit") { if (!cohabit) continue; const a = who(f[1]), b = who(f[2]); if (a && b && a !== b && a !== "{{user}}" && b !== "{{user}}") out.push({ kind: "cohabit", a, b }); continue; }
    if (tag === "weather" && f[1] && weather) { const w = weatherOf(f[1]) || (WEATHER_KINDS.includes(String(f[1]).trim()) ? String(f[1]).trim() : ""); if (w) out.push({ kind: "weather", w }); continue; }
    if (!EXTRA_KINDS.has(tag) || !f[1] || !f[2] || (!world && WORLD_KINDS.has(tag)) || (!status && (tag === "status" || tag === "cure"))) continue;
    if (tag === "weather") { if (!weather) continue; const w = weatherOf(f[1]) || (WEATHER_KINDS.includes(String(f[1]).trim()) ? String(f[1]).trim() : ""); if (w) out.push({ kind: "weather", w }); continue; }
    if (tag === "wear" || tag === "strip") { if (!outfit) continue; const name = who(f[1]), part = partKey(f[2]); if (!name || !part) continue;
      out.push(tag === "strip" ? { kind: "strip", name, part } : { kind: "wear", name, part, s: text(f[3], 40), d: text(f[4] || f[3], 200) }); if (out.length >= 16) break; continue; }
    if (tag === "status" || tag === "cure") { const name = who(f[1]); if (!name) continue;
      out.push(tag === "cure" ? { kind: "cure", name, effect: text(f[2], 20) } : { kind: "status", name, effect: text(f[2], 20), lv: clamp(f[3], 1, 3) ?? 1, days: clamp(f[4], 0, 14) ?? 1 }); if (out.length >= 12) break; continue; }
    if (tag === "told") { const from = who(f[1]), to = who(f[2]); if (from && to && from !== to && f[3]) out.push({ kind: "told", from, to, info: text(f[3], 100) }); }
    else if (tag === "goal") { const name = who(f[1]); if (name && name !== "{{user}}") out.push({ kind: "goal", name, goal: text(f[2], 60), prog: clamp(f[3], 0, 100), status: statusOf(f[4]) }); }
    else if (tag === "cum") { if (!marks) continue; const name = who(f[1]); if (!name) continue; const where = /inside|질|안에|vagin/i.test(f[3] ?? "") ? "inside" : /anal|항문|뒤/i.test(f[3] ?? "") ? "anal" : /mouth|입/i.test(f[3] ?? "") ? "mouth" : "outside";
      out.push({ kind: "cum", name, partner: who(f[2]) || text(f[2], 30), where, ml: Math.max(0.5, Math.min(300, Number(String(f[4] ?? "").replace(/[^\d.]/g, "")) || 4)), contra: contraOf(f[5]) }); }
    else if (tag === "mark") { if (!marks) continue; const name = who(f[1]); if (name && f[3]) out.push({ kind: "mark", name, part: text(f[2], 20), desc: text(f[3], 60), days: clamp(f[4], 1, 14) ?? 3 }); }
    else { const name = text(f[1], 30); if (name.length < 2) continue;
      const r = { kind: tag, name, desc: text(f[2], 100) };
      if (tag === "item" && f[3] && !/^(none|없음|-)$/i.test(f[3])) r.owner = isUser(f[3]) ? "{{user}}" : text(f[3], 30);
      if (tag === "faction" && f[3]) r.members = f[3].split(/[,，]/).map((x) => text(x, 30)).filter(Boolean).slice(0, 12);
      out.push(r); }
    if (out.length >= 12) break;
  }
  return out;
}
export function partKey(s) {
  const t = String(s ?? "").trim().toLowerCase();
  if (OUTFIT_LABEL[t]) return t;
  const map = [["head", /머리|모자|헤어|hat|hair/], ["face", /얼굴|안경|마스크|화장|glasses|mask|make/], ["outer", /겉옷|코트|재킷|자켓|가디건|망토|coat|jacket|cardigan/], ["bra", /브라|속옷 ?\(?위|브래지어|bra/], ["panties", /팬티|속옷 ?\(?아래|속바지|panties|underwear/],
    ["top", /상의|셔츠|블라우스|티셔츠|니트|스웨터|원피스|드레스|top|shirt|blouse|dress/], ["bottom", /하의|치마|스커트|바지|반바지|skirt|pants|shorts/], ["legs", /스타킹|양말|타이츠|레깅스|다리|stocking|sock|tights/], ["feet", /신발|구두|운동화|부츠|힐|샌들|shoe|boot|heel/], ["acc", /액세서리|목걸이|귀걸이|반지|팔찌|시계|리본|초커|accessor|necklace|ring|earring/]];
  return map.find(([, re]) => re.test(t))?.[0] ?? "";
}
function clamp(v, lo, hi) { const n = Number(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.max(lo, Math.min(hi, Math.round(n))) : null; }
function statusOf(v) { const t = String(v ?? "").toLowerCase(); return /done|완료|이룸|성공/.test(t) ? "done" : /drop|포기|실패|abandon/.test(t) ? "dropped" : "active"; }

export const emptyExtra = () => ({ rumors: [], goals: {}, world: { place: {}, item: {}, faction: {} }, marks: [], diary: [], status: [], outfit: {}, weather: null, climate: null, cohabit: [], cycleSync: {}, race: {}, ties: {} });
export function extraOf(f) {
  const e = f?.extra && typeof f.extra === "object" ? f.extra : {};
  return { rumors: Array.isArray(e.rumors) ? e.rumors : [], goals: e.goals && typeof e.goals === "object" ? e.goals : {},
    world: { place: e.world?.place ?? {}, item: e.world?.item ?? {}, faction: e.world?.faction ?? {} }, marks: Array.isArray(e.marks) ? e.marks : [], diary: Array.isArray(e.diary) ? e.diary : [], status: Array.isArray(e.status) ? e.status : [], outfit: e.outfit && typeof e.outfit === "object" ? e.outfit : {}, weather: e.weather ?? null,
    climate: e.climate?.zone ? e.climate : null, cohabit: Array.isArray(e.cohabit) ? e.cohabit : [], cycleSync: e.cycleSync && typeof e.cycleSync === "object" ? e.cycleSync : {}, race: e.race && typeof e.race === "object" ? e.race : {}, ties: e.ties && typeof e.ties === "object" ? e.ties : {}, filled: e.filled && typeof e.filled === "object" ? e.filled : {}, cal: e.cal && typeof e.cal === "object" ? e.cal : null };
}
export const RUMOR_MAX = 60, MARK_MAX = 30, GOAL_MAX = 4;

// 보고 반영. ctx: {turn, when}. 반환: 바뀐 글 목록
export function applyExtra(f, reports, { turn = 0, when = "" } = {}) {
  const e = extraOf(f), changed = [];
  reports = filterIgnored(f, reports, turn);   // 사용자가 지운 항목은 다시 만들지 않음(engine/memedit.js)
  for (const r of reports) {
    if (r.kind === "told") {
      if (e.rumors.some((x) => nk(x.from) === nk(r.from) && nk(x.to) === nk(r.to) && nk(x.info) === nk(r.info))) continue;
      e.rumors.push({ from: r.from, to: r.to, info: r.info, at: turn, when: text(when, 40) }); changed.push(`소문 ${r.from}→${r.to}`);
    } else if (r.kind === "goal") {
      const k = nk(r.name), g = e.goals[k] ??= { name: r.name, list: [] };
      const i = g.list.findIndex((x) => nk(x.goal) === nk(r.goal) || nk(x.goal).includes(nk(r.goal)) || nk(r.goal).includes(nk(x.goal)));
      if (i >= 0) { const o = g.list[i]; g.list[i] = { ...o, prog: r.prog ?? o.prog, status: r.status, at: turn }; }
      else { g.list.push({ goal: r.goal, prog: r.prog ?? 0, status: r.status, at: turn, first: turn }); while (g.list.length > GOAL_MAX) { const j = g.list.findIndex((x) => x.status !== "active"); g.list.splice(j >= 0 ? j : 0, 1); } }
      changed.push(`목표 ${r.name}: ${r.goal}`);
    } else if (r.kind === "status") {
      const i = e.status.findIndex((x) => nk(x.name) === nk(r.name) && sameEffect(x.effect, r.effect));
      if (i >= 0) e.status[i] = { ...e.status[i], lv: Math.max(e.status[i].lv ?? 1, r.lv), days: r.days, at: turn, when: text(when, 40) };
      else e.status.push({ name: r.name, effect: r.effect, lv: r.lv, days: r.days, at: turn, when: text(when, 40) });
      changed.push(`상태이상 ${r.name} ${r.effect}`);
    } else if (r.kind === "cure") {
      const n0 = e.status.length; e.status = e.status.filter((x) => !(nk(x.name) === nk(r.name) && sameEffect(x.effect, r.effect)));
      if (e.status.length < n0) changed.push(`회복 ${r.name} ${r.effect}`);
    } else if (r.kind === "climate") {
      const { kind: _k, ...c } = r; if (e.climate?.zone !== c.zone || e.climate?.region !== c.region || e.climate?.mdays !== c.mdays) changed.push(`기후 ${c.region || c.zone}`); e.climate = { ...c, at: turn };
    } else if (r.kind === "race") {
      const k = nk(r.name), old = e.race[k]; if (old?.manual) continue;
      if (old?.id !== r.id || (old?.label ?? "") !== r.label) changed.push(`종족 ${r.name}: ${r.label || r.id}`); e.race[k] = { name: r.name, id: r.id, label: r.label, at: turn };
    } else if (r.kind === "tie") {
      const c = applyTie(e.ties, r, turn); if (c) changed.push(c);
    } else if (r.kind === "cohabit") {
      const key = [nk(r.a), nk(r.b)].sort().join("|"); if (!e.cohabit.some((x) => x.key === key)) { e.cohabit.push({ key, a: r.a, b: r.b, at: turn }); changed.push(`동거 ${r.a}·${r.b}`); }
    } else if (r.kind === "weather") {
      if (e.weather?.user) continue;   // 11-21: 유저가 정한 날씨(입력·직접 고침)는 기록기 보고가 덮지 않음(엔진 예보가 먼저라 기록 날씨는 참고용)
      if (e.weather?.w !== r.w) changed.push(`날씨 ${r.w}`); e.weather = { w: r.w, at: turn, when: text(when, 40) };
    } else if (r.kind === "wear" || r.kind === "strip") {
      const k = nk(r.name), o = (e.outfit[k] ??= { name: r.name, parts: {}, acc: [] });
      if (r.part === "acc") { if (r.kind === "strip") o.acc = []; else { o.acc = [...o.acc.filter((x) => nk(x.s) !== nk(r.s)), { s: r.s, d: r.d, at: turn }].slice(-6); } }
      else if (r.kind === "strip") delete o.parts[r.part];
      else o.parts[r.part] = { s: r.s, d: r.d, at: turn };
      changed.push(`${r.kind === "strip" ? "벗음" : "옷"} ${r.name} ${OUTFIT_LABEL[r.part]}`);
    } else if (r.kind === "cum" || r.kind === "hist") {
      const d = Object.values(f?.wiki?.documents ?? {}).find((x) => x?.type === "Character" && [x.title, ...(x.aliases ?? [])].some((n) => nk(n) === nk(r.name)));
      if (!d) continue;
      f.life ??= {}; f.life.p ??= {}; const L = (f.life.p[d.id] ??= {});
      if (r.kind === "cum") { if (r.where === "inside") { addCum(L, r, turn, when); changed.push(`체내 정액 ${d.title} +${r.ml}ml`); } }
      else { L.hist = [...(L.hist ?? []), { kind: r.ev, at: turn, when: text(when, 40) }].slice(-20); changed.push(`${r.ev === "birth" ? "출산" : "유산"} ${d.title}`); }
    } else if (r.kind === "mark") {
      e.marks.push({ name: r.name, part: r.part, desc: r.desc, days: r.days, at: turn, when: text(when, 40) }); changed.push(`흔적 ${r.name} ${r.part}`);
    } else if (r.kind === "place" || r.kind === "item" || r.kind === "faction") {
      const box = e.world[r.kind], k = nk(r.name), o = box[k];
      box[k] = { ...(o ?? { first: turn, n: 0 }), name: o?.name ?? r.name, desc: r.desc || o?.desc || "", at: turn, n: (o?.n ?? 0) + 1,
        ...(r.owner ? { owner: r.owner } : {}), ...(r.members?.length ? { members: [...new Set([...(o?.members ?? []), ...r.members])].slice(0, 16) } : {}) };
      if (!o) changed.push(`${WORLD_LABEL[r.kind]} ${r.name}`);
    }
  }
  if (e.rumors.length > RUMOR_MAX) e.rumors = e.rumors.slice(-RUMOR_MAX);
  e.marks = activeMarks(e.marks, turn, when).slice(-MARK_MAX);
  e.status = activeStatus(e.status, turn, when).slice(-STATUS_MAX);
  const cr = (reports ?? []).filter((r) => CAL_KINDS.has(r.kind)); if (cr.length) changed.push(...applyCal(e, cr, { when }));   // 이야기 달력
  f.extra = e;
  return changed;
}
export const WORLD_LABEL = Object.freeze({ place: "장소", item: "물건", faction: "세력" });

// 이야기 날짜(YYYY-MM-DD) 차이(일). 둘 다 없으면 null
export function dayGap(a, b) {
  const d = (s) => { const m = String(s ?? "").match(/(\d{3,4})-(\d{1,2})-(\d{1,2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  const x = d(a), y = d(b); return x == null || y == null ? null : Math.round((y - x) / 86400000);
}
export const TURNS_PER_DAY = 6;
// 아직 남은 흔적(날짜를 알면 날짜로, 모르면 턴으로)
export function activeMarks(marks, turn, when = "") {
  return (marks ?? []).filter((m) => markAge(m, turn, when) <= (m.days ?? 3)).map((m) => ({ ...m }));
}
export const STATUS_MAX = 30, STATUS_LONG = 30;   // 0일(나을 때까지)도 30일이 지나면 정리
const sameEffect = (a, b) => { const x = nk(a), y = nk(b); return x === y || (x.length >= 2 && y.includes(x)) || (y.length >= 2 && x.includes(y)); };
export function activeStatus(list, turn, when = "") { return (list ?? []).filter((x) => markAge(x, turn, when) <= (x.days ? x.days : STATUS_LONG)); }
export const STATUS_LV = Object.freeze(["", "가벼움", "보통", "심함"]);
export function markAge(m, turn, when = "") { const g = dayGap(m.when, when); return g != null ? g : Math.floor((turn - (m.at ?? 0)) / TURNS_PER_DAY); }

// 입력의 @이름 → 위키 인물 이름(대표 이름)
export function mentionsOf(userText, docs = []) {
  const out = [];
  for (const m of String(userText ?? "").matchAll(/@([^\s@,.!?·…"'“”‘’()]{1,20})/g)) {
    const t = nk(m[1]);
    const d = docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => nk(n) === t)) ?? docs.find((x) => [x.title, ...(x.aliases ?? [])].some((n) => nk(n).startsWith(t) && t.length >= 2));
    if (d && !out.includes(d.title)) out.push(d.title);
  }
  return out;
}

export const AWAY_AT = 20;
export const EXTRA_TITLE = "[Story threads — tracked by Dusk; use naturally, never list them]";
// 주입 글. present: 장면 인물 이름, recent: 최근 글, turn: 기록된 마지막 메시지 번호, when: 지금 이야기 날짜, pinned: @인물
export function extraSection(f, { present = [], recent = "", turn = 0, when = "", pinned = [], docs = null, lifeOf = null, world = true, status = true, outfit = true } = {}) {
  const e = extraOf(f), lines = [], P = new Set([...present, ...pinned].map(nk)), low = nk(recent);
  const here = (n) => P.has(nk(n)) || (String(n).length >= 2 && low.includes(nk(n)));
  for (const n of pinned) lines.push(`- {{user}} pointed at ${n}: bring up what ${n} and the others remember about them.`);
  // 화면 밖 근황: 오래 안 나오다 다시 나온 인물
  const D = docs ?? Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const pin = new Set(pinned.map(nk)), inRecent = (d) => [d.title, ...(d.aliases ?? [])].some((n) => pin.has(nk(n)) || (String(n ?? "").length >= 2 && low.includes(nk(n))));
  for (const d of D) {
    if (!inRecent(d)) continue;   // 기억 블록에만 든 인물은 '돌아온' 게 아니다 — 최근 글에 이름이 나온 인물만
    const L = lifeOf ? lifeOf(d) : f?.life?.p?.[d.id]; const seen = L?.seen;
    if (!Number.isInteger(seen) || turn - seen < AWAY_AT) continue;
    const g = !world ? "" : (e.goals[nk(d.title)]?.list ?? []).filter((x) => x.status === "active").map((x) => x.goal).join(", ");
    lines.push(`- ${d.title} is back after ${turn - seen} messages away. Let them carry a brief, consistent sense of what they were doing meanwhile${g ? ` (their aims: ${g})` : ""}; don't contradict memory.`);
    if (lines.length > 3) break;
  }
  // 목표·소문·세계 문서는 설정 ‘세계 탭’이 켜졌을 때만
  if (world) for (const g of Object.values(e.goals)) {
    if (!here(g.name)) continue;
    const act = g.list.filter((x) => x.status === "active").slice(-2);
    if (act.length) lines.push(`- ${g.name}'s aims: ${act.map((x) => `${x.goal} (${x.prog ?? 0}%)`).join("; ")}`);
  }
  // 소문: 장면 인물이 들은 것(다른 이는 모를 수 있음)
  const heard = !world ? [] : e.rumors.filter((r) => here(r.to) || here(r.from)).slice(-4);
  if (heard.length) lines.push(`- Who heard what (others may not know): ${heard.map((r) => `${r.to} heard from ${r.from} that ${r.info}`).join("; ")}`);
  // 옷차림(간단)
  if (outfit) for (const o of Object.values(e.outfit)) { if (!here(o.name)) continue; const ps = OUTFIT_PARTS.filter(([k]) => k !== "acc" && o.parts?.[k]).map(([k, l]) => `${l} ${o.parts[k].s}`); if (o.acc?.length) ps.push(`액세서리 ${o.acc.map((x) => x.s).join(", ")}`); if (ps.length) lines.push(`- ${o.name} is wearing: ${ps.join(" · ")}`.slice(0, 240)); }
  // 상태이상
  const st = !status ? [] : activeStatus(e.status, turn, when).filter((x) => here(x.name)).slice(-5);
  if (st.length) lines.push(`- Conditions (let them affect behaviour): ${st.map((x) => `${x.name} — ${x.effect} (${["", "mild", "moderate", "severe"][x.lv ?? 1]}, day ${markAge(x, turn, when) + 1}${x.days ? `/${x.days}` : ", until cured"})`).join("; ")}`);
  // 몸 흔적
  const mk = activeMarks(e.marks, turn, when).filter((m) => here(m.name)).slice(-4);
  if (mk.length) lines.push(`- Visible traces: ${mk.map((m) => `${m.name} — ${m.part} ${m.desc} (day ${markAge(m, turn, when) + 1})`).join("; ")}`);
  // 세계 문서: 최근 글에 이름이 나온 것만
  const ws = [];
  if (world) for (const kind of ["place", "item", "faction"]) for (const w of Object.values(e.world[kind])) if (w.desc && String(w.name).length >= 2 && low.includes(nk(w.name))) ws.push(`${w.name}(${WORLD_LABEL[kind]}): ${w.desc}${w.owner ? ` · owner ${w.owner}` : ""}${w.members?.length ? ` · members ${w.members.slice(0, 5).join(", ")}` : ""}`);
  if (ws.length) lines.push(`- World: ${ws.slice(0, 4).join("; ")}`);
  if (!lines.length) return "";
  const out = [EXTRA_TITLE, ...lines].join("\n");
  return out.length > 900 ? out.slice(0, 897) + "…" : out;
}

// 다른 봇으로 인물 옮기기: 원래 폴더에서 한 인물의 몫을 떼어 낸다(복사본)
export function personPack(f, docId) {
  const doc = f?.wiki?.documents?.[docId]; if (!doc) return null;
  const names = new Set([doc.title, ...(doc.aliases ?? [])].map(nk)), mine = (n) => names.has(nk(n));
  const person = Object.entries(f.people ?? {}).find(([k, p]) => mine(k) || mine(p?.name));
  const e = extraOf(f);
  return JSON.parse(JSON.stringify({
    name: doc.title, doc, profile: f?.wiki?.people?.profiles?.[docId] ?? null, nsfw: f?.nsfw?.[docId] ?? null, life: f?.life?.p?.[docId] ?? null,
    person: person ? { key: person[0], ...person[1] } : null,
    goals: e.goals[nk(doc.title)] ?? null,
  }));
}
// 옮겨 넣기(대상 폴더, 원본 관계는 대상 봇에 없으니 가져가지 않는다). 같은 이름 인물이 있으면 덮지 않고 이름에 (옮김)
export function insertPack(f, pack, { newId = `moved_${Date.now().toString(36)}`, scope = null } = {}) {
  if (!pack?.doc) return null;
  if (!f.wiki?.documents) f.wiki = scope ? createEmptyWikiScope(scope) : { ...(f.wiki ?? {}), documents: {} };   // 빈 채팅이면 위키 범위부터 만든다
  const clash = Object.values(f.wiki.documents).some((d) => nk(d?.title) === nk(pack.name));
  const title = clash ? `${pack.name}(옮김)` : pack.name;
  f.wiki.documents[newId] = { ...detach(pack.doc), id: newId, title, relations: [], links: [] };
  if (pack.profile) { f.wiki.people ??= {}; f.wiki.people.profiles ??= {}; f.wiki.people.profiles[newId] = detach(pack.profile); }
  if (pack.nsfw) { f.nsfw ??= {}; f.nsfw[newId] = pack.nsfw; }
  if (pack.life) { f.life ??= {}; f.life.p ??= {}; f.life.p[newId] = { ...pack.life, seen: null, seenPrev: null, temp: {}, lover: {}, met: {} }; }
  // 기억 기록: 원래 채팅의 메시지 위치(at·mid·출처)를 떼고 carried로 — 대상 채팅 대조에서 고아가 되지 않게(회귀와 같은 방식)
  if (pack.person) { f.people ??= {}; const { key, rels, ...p } = pack.person;
    f.people[title] = { ...detach(p), name: title, records: (p.records ?? []).filter((r) => !r.orphan).map((r) => ({ ...detach(r), at: null, mid: null, carried: true, orphan: false })) }; }
  if (pack.goals) { const e = extraOf(f); e.goals[nk(title)] = { ...pack.goals, name: title }; f.extra = e; }
  return { id: newId, title };
}

// ── 궁합(호출 없음) ──
const likesOf = (n) => [...(n?.positions ?? []).filter((p) => p.preference === "preferred").map((p) => p.label), ...(n?.tags?.likes ?? []), ...(n?.ext?.fantasy ?? [])];
const dislikesOf = (n) => [...(n?.positions ?? []).filter((p) => p.preference === "disliked").map((p) => p.label), ...(n?.tags?.limits ?? [])];
const near = (a, b) => { const x = nk(a), y = nk(b); return x && y && (x === y || (x.length >= 2 && y.includes(x)) || (y.length >= 2 && x.includes(y))); };
export function compatOf(a, b, { usesA = {}, usesB = {} } = {}) {
  if (!a || !b) return null;
  const la = likesOf(a), lb = likesOf(b), da = dislikesOf(a), db = dislikesOf(b);
  const shared = la.filter((x) => lb.some((y) => near(x, y)));
  const clash = [...la.filter((x) => db.some((y) => near(x, y))).map((x) => ({ who: "a", item: x })), ...lb.filter((x) => da.some((y) => near(x, y))).map((x) => ({ who: "b", item: x }))];
  const tried = new Set([...Object.keys(usesA), ...Object.keys(usesB)].map(nk));
  const untried = [...new Set(shared)].filter((x) => ![...tried].some((t) => near(t, x)));
  const ia = a.sexual?.eroticInterest ?? 50, ib = b.sexual?.eroticInterest ?? 50;
  const ina = a.axes?.initiative ?? null, inb = b.axes?.initiative ?? null;
  const lead = ina != null && inb != null ? Math.abs(ina - inb) : null;   // 주도성 차이가 클수록 맞물림
  let score = 50 + Math.min(30, shared.length * 8) - Math.min(36, clash.length * 12) - Math.round(Math.abs(ia - ib) / 5);
  if (lead != null) score += lead >= 30 ? 10 : lead <= 10 && (ina + inb) / 2 >= 60 ? -6 : 0;
  const za = (a.zones ?? []).filter((z) => z.level >= 2).length, zb = (b.zones ?? []).filter((z) => z.level >= 2).length;
  score += Math.min(6, za + zb);
  score = Math.max(0, Math.min(100, score));
  const label = score >= 80 ? "아주 잘 맞음" : score >= 62 ? "잘 맞음" : score >= 45 ? "무난함" : score >= 30 ? "엇갈림" : "많이 엇갈림";
  return { score, label, shared: [...new Set(shared)].slice(0, 8), clash: clash.slice(0, 6), untried: untried.slice(0, 6), lead: lead == null ? null : lead >= 30 ? "주도·수용이 맞물려요" : lead <= 10 ? "둘 다 비슷하게 이끌어요" : "주도성이 조금 달라요" };
}
