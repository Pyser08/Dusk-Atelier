// 종족 찾기(순수, AI 호출 없음): 로어북·봇 설정·본문에서 인물의 종족을 근거와 함께 찾는다.
// 장기기억 기록기(AI)가 놓치거나 '인간'으로 흘려 보낸 것을 메운다. 확실한 표현만 쓰고, 애매하면 비워 둔다.
import { RACE_BY_ID, raceIdOf } from "./races.js";

const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const strip = (t) => String(t ?? "").normalize("NFKC").replace(/\{\{[^}]*\}\}/g, " ").replace(/<[^>]{1,200}>/g, " ").replace(/[*_`#>~]+/g, " ");
// 이 낱말 뒤에 오면 종족이 아니라 곁가지('엘프 마을', '드래곤 슬레이어', '악마와 계약')
const SIDE = /^\s*(?:들|의)?\s*(?:마을|숲|왕국|나라|제국|언어|말|문자|전설|신화|사냥꾼|사냥|슬레이어|퇴치|학살|토벌|친구|동료|스승|제자|주인|하인|노예|상인|병사|군대|무리|떼|습격|혐오|연구|학자|코스프레|분장|의상|가면|인형|장식|문신|무늬|검|창|활|갑옷|가죽|고기|알|둥지|이빨|뿔피리|술|차|음식|같은|처럼|만큼|보다)/;
const DENY = /(?:아니|아닌|아님|않|없|못|싫|혐오|미워|두려|무서|계약|빙의|저주|사냥|쫓|죽이|죽인|물리친|닮|척|흉내|변장|착각|오해|소문|믿지)/;
const FIELD = /(?:^|[\n|;{,(\[])\s*[-•·]?\s*["'“]?(?:종족|종|혈통|species|race|종류)["'”]?\s*(?:[:：=＝]|은|는|이|\t| - )\s*["'“\[(]?\s*([^\n|;"'”\])}]{1,40})/gi;
const bare = (t) => String(t ?? "").replace(/\([^)]*\)/g, (m) => " " + m.slice(1, -1) + " ");

/** 짧은 글 하나 → {id,label} 또는 null. '엘프가 아닌 인간'처럼 부정된 쪽은 버린다 */
export function raceOfText(t) {
  let s = bare(strip(t)).replace(/\s+/g, " ").trim(); if (!s) return null;
  s = s.replace(/(\S+?)(?:이|가|은|는)?\s*(?:아닌|아니라|아니고|않은)\s*/g, " ").replace(/\S+(?:와|과|하고)\s*계약한\s*/g, " ").replace(/\S+(?:에게|한테)\s*(?:길러진|키워진|자란|구해진)\s*/g, " ").replace(/비인간(?:\s*종족)?/g, " ").trim();
  const id = raceIdOf(s); return id ? { id, label: RACE_BY_ID[id].label } : null;
}
const sentences = (t) => strip(t).split(/(?<=[.!?。…])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 1 && x.length < 400);

// 이름을 주어로 하는 문장에서 종족을 읽는다. 점수: 5 '이름은 엘프다' · 3 '엘프인 이름'·'엘프 소녀 이름'
function sentenceRace(s, name) {
  const N = esc(name), J = "(?:은|는|이|가)?";
  let m = new RegExp(`(?:^|[\\s"'“(,])${N}${J}\\s+([^,.!?]{1,28}?)(?:이다|다|이며|이고|였다|이었다|입니다|예요|이에요|인데|로서|으로서|라서|이자)(?=$|[\\s,.!?…])`).exec(s);
  if (m && !DENY.test(s.slice(m.index, m.index + m[0].length + 12))) { const r = raceOfText(m[1]); if (r && tailOk(m[1])) return { ...r, score: 5 }; }
  m = new RegExp(`\\b${N}\\s+(?:is|was)\\s+(?:a|an|the)?\\s*([^,.!?]{1,40})`, "i").exec(s);
  if (m && !/\bnot\b|\bnever\b|hunter|slayer|friend/i.test(m[1])) { const r = raceOfText(m[1]); if (r) return { ...r, score: 5 }; }
  m = new RegExp(`(?:^|[\\s"'“(,])([^\\s,.]{2,10}(?:\\s[^\\s,.]{1,6})?)(?:인|이자|\\s(?:소녀|소년|여자|남자|여인|청년|처녀|아가씨|전사|궁수|마법사|공주|왕자|여왕|왕|기사|사제|무녀|아이|노인))\\s+${N}(?=$|[\\s은는이가을를의에와과,.!?])`).exec(s);
  if (m && !DENY.test(m[0])) { const r = raceOfText(m[1]); if (r && tailOk(m[1])) return { ...r, score: 3 }; }
  m = new RegExp(`(?:^|[\\s"'“])${N}\\s*[(（]([^)）]{1,30})[)）]`).exec(s);
  if (m && !DENY.test(m[1])) { const r = m[1].split(/[,·/]/).map(raceOfText).find(Boolean); if (r) return { ...r, score: 3 }; }
  return null;
}
// 잡은 구절에서 종족 낱말 바로 뒤가 곁가지면(‘엘프 마을 출신’) 버린다
function tailOk(p) { const t = bare(p).trim(), id = raceIdOf(t); if (!id) return false; const m = t.match(RACE_BY_ID[id].re); return !m || !SIDE.test(t.slice(m.index + m[0].length)); }
// 스스로 밝힌 말: “나는 엘프야”
function selfRace(text, name) {
  const re = new RegExp(`${esc(name)}[^"“”\\n]{0,40}["“]([^"”\\n]{2,160})["”]|["“]([^"”\\n]{2,160})["”][^"“\\n]{0,12}${esc(name)}`, "g"); let m;
  while ((m = re.exec(text))) { const q = m[1] ?? m[2], k = /(?:^|[\s,.])(?:나는|난|저는|전|내가|제가)\s+([^,.!?]{1,20}?)(?:이야|야|이에요|예요|입니다|이다|다|거든|라서|이라서)/.exec(q); if (k && !DENY.test(q)) { const r = raceOfText(k[1]); if (r && tailOk(k[1])) return { ...r, score: 4 }; } }
  return null;
}
const has = (t, n) => { const s = nk(t), k = nk(n); return k.length >= 2 && s.includes(k); };
/**
 * names: 이름·별칭. src: { entries:[{key,secondkey,comment,content}], description, botName, text(본문), others:[다른 인물 이름들] }
 * 반환 { id, label, score, src:"lore"|"card"|"text", why } 또는 null
 */
export function findRace(names, { entries = [], description = "", botName = "", text = "", others = [] } = {}) {
  const ns = [...new Set((Array.isArray(names) ? names : [names]).map((n) => String(n ?? "").normalize("NFKC").trim()).filter((n) => n.length >= 2))]; if (!ns.length) return null;
  const rest = others.filter((o) => nk(o).length >= 2 && !ns.some((n) => nk(n) === nk(o)));
  const found = new Map(), add = (r, src, bonus, why) => { if (!r) return; const s = r.score + bonus, o = found.get(r.id); if (!o) found.set(r.id, { id: r.id, label: r.label, score: s, top: s, src, why: String(why).slice(0, 120) }); else { o.score += Math.min(2, s / 3); if (s > o.top) Object.assign(o, { top: s, src, why: String(why).slice(0, 120) }); } };
  const fields = (t, src, bonus) => { const x = strip(t); FIELD.lastIndex = 0; let m; while ((m = FIELD.exec(x))) { if (/^\s*(?:없|미상|불명|\?|unknown|n\/a)/i.test(m[1])) continue; const r = raceOfText(m[1]); add(r && { ...r, score: 8 }, src, bonus, m[0].trim()); } };
  const prose = (t, src, bonus) => { for (const s of sentences(t)) for (const n of ns) { const r = sentenceRace(s, n); if (r) add(r, src, bonus, s); } };
  for (const e of entries) {
    if (!e || typeof e !== "object" || e.mode === "folder") continue; const body = String(e.content ?? ""); if (!body) continue;
    const title = [e.comment, e.key].join(","), own = ns.some((n) => String(title).split(/[,\n/|]/).some((k) => nk(k) === nk(n))) || (ns.some((n) => has(e.comment, n)) && !rest.some((o) => has(e.comment, o)));
    if (own) { fields(body, "lore", 2); // 이 인물의 항목: 주어가 생략된 첫 문장도 본다
      const first = sentences(body).slice(0, 3); for (const s of first) if (!rest.some((o) => has(s, o)) && !DENY.test(s)) { const m = /^(?:그는|그녀는|이\s?인물은)?\s*([^,.]{1,30}?)(?:이다|다|이며|이고|입니다|\.|$|,)/.exec(s), r = m && tailOk(m[1]) ? raceOfText(m[1]) : null; if (r) add({ ...r, score: 3 }, "lore", 0, s); } }
    else if (ns.some((n) => has(body, n))) { // 여러 인물이 든 항목: 이 이름의 덩어리만
      for (const block of strip(body).split(/\n\s*\n|(?=\n\s*(?:[-•■◆●#]|\d+[.)])\s)/)) if (ns.some((n) => has(block.slice(0, 60), n)) && !rest.some((o) => has(block, o))) fields(block, "lore", 1); }
    prose(body, "lore", 1);
  }
  if (ns.some((n) => nk(n) === nk(botName))) { if (!rest.some((o) => has(description.slice(0, 3000), o))) fields(description, "card", 1); }
  prose(description, "card", 1); prose(text, "text", 0); for (const n of ns) add(selfRace(strip(text), n), "text", 0, "본인이 말함");
  const l = [...found.values()].sort((a, b) => b.score - a.score || (a.id === "human") - (b.id === "human")); if (!l.length) return null;
  // 큰 갈래와 작은 갈래가 함께 잡히면 더 자세한 쪽(엘프 + 다크엘프)
  const best = l[0], finer = l.find((x) => x !== best && x.score >= best.score - 3 && RACE_BY_ID[x.id].frame === RACE_BY_ID[best.id].frame && x.label.includes(best.label)); const top = finer ?? best;
  const rival = l.find((x) => x !== top && x !== best); if (rival && rival.top >= top.top && rival.score >= top.score) return null; // 서로 맞서면 정하지 않는다
  return top.top >= 3 ? { id: top.id, label: top.label, score: top.top, src: top.src, why: top.why } : null;
}
/** 여러 인물을 한 번에 → 기록 줄(kind:"race") */
export function raceFinds(people, src, known = {}) {
  const all = people.flatMap((p) => p.names), out = [];
  for (const p of people) { const k = nk(p.names[0]), old = known[k]; if (old?.manual) continue; const r = findRace(p.names, { ...src, others: all }); if (r) out.push({ kind: "race", name: p.names[0], id: r.id, label: "", src: r.src, score: r.score, why: r.why }); }
  return out;
}
