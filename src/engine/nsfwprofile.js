// addon-rebuild: 인물 NSFW 값(채팅별, 장기기억 폴더 folder.nsfw[문서 id]). Erosync 프로필(봇 단위)을 대신한다.
// 모양: { sexual:{eroticInterest,sexualSpontaneity,sexualOpenness,sexualMomentum}, axes:{8축}, pref:{f,m,x}|null,
//         positions:[{label, preference:'preferred'|'neutral'|'disliked', reason}], seduction:{frequency,directness,styles,situations}, humor:{…},
//         by:'ai'|'roll'|'user', at, log:[{at, text}] }  — 값은 0~100 정수.
export const SEX_LABEL = Object.freeze({ eroticInterest: "성적 관심", sexualSpontaneity: "성적 즉흥성", sexualOpenness: "성적 개방성", sexualMomentum: "성적 추진력" });
export const AXIS_LABEL = Object.freeze({ initiative: "주도성", spontaneity: "즉흥성", directness: "직접성", goalPersistence: "지속성", obsessiveness: "집착성", publicOpenness: "개방성", retaliation: "보복성", extremity: "극단성" });
export const SEX_KEYS = Object.keys(SEX_LABEL), AXIS_KEYS = Object.keys(AXIS_LABEL);
const LOG_MAX = 20;

const num = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null; };
const text = (v, n = 160) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (v, n = 6, len = 80) => (Array.isArray(v) ? v : []).map((x) => text(typeof x === "string" ? x : x?.label ?? x?.text ?? "", len)).filter(Boolean).slice(0, n);

// 체위·장소 이름 다듬기: 괄호 속 두 번째 이름·영어 음역을 흔히 쓰는 한국어로(“정면(미션어리)” → “정상위”)
const POS_KO = [[/리버스\s*카우걸|reverse\s*cowgirl|역\s*기승위/i, "역기승위"], [/미션어리|미셔너리|missionary|정면\s*체위|^정면$/i, "정상위"], [/카우걸|cowgirl|여성\s*상위/i, "기승위"], [/도기\s*스타일|도기|doggy|from\s*behind|뒤에서/i, "후배위"],
  // addon-rebuild: 플레이도 흔히 쓰는 말로(펠라티오·엉덩이 때리기처럼 어색한 직역 → 펠라치오·스팽킹). 이미 저장된 표현도 화면에서 이 표로 바로잡힌다
  [/펠라[티치]오|fellatio|blow\s*job/i, "펠라치오"], [/엉덩이\s*(?:를\s*)?(?:찰싹\s*)?(?:때리기|때림|치기|찰싹)|spank/i, "스팽킹"], [/^손가락(?:\s*(?:애무|삽입|넣기))?$|fingering/i, "핑거링"],
  [/더러운\s*말|음담패설|dirty\s*talk/i, "더티 토크"], [/질\s*내\s*사정|creampie/i, "질내사정"],
  [/스푸닝|spooning/i, "옆으로 누워서(스푼)"], [/식스티나인|69/i, "69"], [/스탠딩|standing/i, "선 채로"], [/샤워\s*룸|shower/i, "샤워실"], [/카섹스|in\s*a\s*car/i, "차 안"]];
export function cleanPosLabel(label) {
  let t = String(label ?? "").replace(/\s+/g, " ").trim();
  const main = t.replace(/\s*[(（][^)）]*[)）]\s*/g, " ").trim();   // 괄호 밖 이름으로만 판단(괄호 속 덧이름은 버린다)
  for (const [re, ko] of POS_KO) if (re.test(main)) return ko;
  t = t.replace(/\s*[(（][^)）]*[)）]\s*/g, " ").trim();   // 남은 괄호 속 덧이름은 뺀다
  return t || String(label ?? "").trim();
}
// 항목 갈래: 체위(position)·장소(place)·플레이(play). 모델이 안 주면 이름으로 짐작한다
export const POS_MAX = 30;
export const POS_KIND_LABEL = Object.freeze({ position: "체위", place: "장소", play: "플레이" });
export function posKind(k, label = "") {
  const t = String(k ?? "").toLowerCase();
  if (/^pos|체위|자세/.test(t)) return "position"; if (/^pla(ce)?$|^loc|장소/.test(t)) return "place"; if (/^play|^act|플레이|행위/.test(t)) return "play";
  const l = String(label);
  if (/(위|69|선 채로|누워|엎드려|무릎|앉아|들어\s*올려|체위|자세|스푼)/.test(l) && !/(침대 위|소파 위|책상 위)/.test(l)) return "position";
  if (/(실|방|안$|침대|소파|욕조|부엌|교실|사무실|옥상|공원|해변|야외|차 안|엘리베이터|화장실|숲|호텔|모텔|창가|벽|책상|계단|베란다|탈의실|사우나|온천|수영장|공공장소|밖)/.test(l)) return "place";
  return "play";
}
// 선호 값: 영어 enum이 아니어도 같은 뜻이면 받는다(한국어 출력 규칙 때문에 '선호'로 오는 경우)
export function prefValue(v) {
  const t = String(v ?? "").normalize("NFKC").trim().toLowerCase();
  if (["preferred", "neutral", "disliked"].includes(t)) return t;
  if (/^(prefer|like|love|enjoy|favou?r)|선호|좋아|즐김|좋음/.test(t) && !/비선호|안\s*좋|싫/.test(t)) return "preferred";
  if (/^(dislik|hate|avoid|refus)|비선호|싫|기피|거부|꺼림|안\s*좋/.test(t)) return "disliked";
  if (/^(neutral|indifferent|mixed|ok)|보통|중립|무난|상관/.test(t)) return "neutral";
  return "";
}
function normStyle(o) {
  if (!o || typeof o !== "object") return null;
  const r = { frequency: num(o.frequency), directness: num(o.directness), styles: list(o.styles, 4, 120), situations: list(o.situations ?? o.typicalSituations, 3, 120) };
  return r.styles.length || r.situations.length ? r : null;
}
// 선호·금기 태그(사용자가 직접 적은 글만). 금기는 장면 계획·RP에서 절대 넘지 않는 선
export function normTags(t) {
  const one = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(/[,，\n]/)).map((x) => text(x, 40)).filter(Boolean))].slice(0, 12);
  return { likes: one(t?.likes), limits: one(t?.limits) };
}
export function normalizeNsfw(raw, { by = "ai", at = new Date().toISOString(), log = [] } = {}) {
  if (!raw || typeof raw !== "object") return null;
  const sexual = Object.fromEntries(SEX_KEYS.map((k) => [k, num(raw.sexual?.[k] ?? raw[k])]).filter(([, v]) => v !== null));
  const axes = Object.fromEntries(AXIS_KEYS.map((k) => [k, num(raw.axes?.[k])]).filter(([, v]) => v !== null));
  const seen = new Set(), positions = [];
  for (const p of Array.isArray(raw.positions ?? raw.positionPreferences) ? (raw.positions ?? raw.positionPreferences) : []) {
    const label = cleanPosLabel(text(p?.label, 60)), preference = prefValue(p?.preference), key = label.toLowerCase();
    if (!label || !preference || seen.has(key)) continue;
    seen.add(key); positions.push({ label, preference, kind: posKind(p?.kind, label), reason: text(p?.reason, 160) });
    if (positions.length >= POS_MAX) break;
  }
  const pf = raw.pref ?? raw.targetGenderPreference, f = num(pf?.f ?? pf?.femalePercent), m = num(pf?.m ?? pf?.malePercent), x = num(pf?.x ?? pf?.genderlessPercent);
  const pref = f !== null && m !== null && f + m + (x ?? 0) > 0 ? (() => { const t = f + m + (x ?? 0); const F = Math.round(f / t * 100), M = Math.round(m / t * 100); return { f: F, m: M, x: 100 - F - M }; })() : null;
  const out = { sexual, axes, pref, positions, seduction: normStyle(raw.seduction), humor: normStyle(raw.humor ?? raw.sexualHumor), tags: normTags(raw.tags), by, at, log: Array.isArray(log) ? log.slice(-LOG_MAX) : [] };
  return Object.keys(sexual).length || Object.keys(axes).length || positions.length ? out : null;
}

// 지시문용 모양(묶음 성격 호출과 따로 채우기 호출이 같이 쓴다)
export const NSFW_SHAPE = Object.freeze({
  sexual: { eroticInterest: 50, sexualSpontaneity: 50, sexualOpenness: 50, sexualMomentum: 50 },
  axes: { initiative: 50, spontaneity: 50, directness: 50, goalPersistence: 50, obsessiveness: 50, publicOpenness: 50, retaliation: 50, extremity: 50 },
  pref: { f: 0, m: 100, x: 0 },
  positions: [{ label: "체위·장소·플레이 이름(한국어)", kind: "position | place | play", preference: "preferred | neutral | disliked", reason: "짧은 근거(한국어)" }],
  seduction: { frequency: 50, directness: 50, styles: ["짧은 구(한국어)"], situations: ["짧은 구(한국어)"] },
  humor: { frequency: 50, directness: 50, styles: [], situations: [] },
});
export const NSFW_RULES = [
  "nsfw describes this character's sexual side for the roleplay. Derive it from the personality, the sexual desire and paraphilia text, the lewdness and the related data; when the data says nothing direct, make a coherent inference from those traits instead of leaving fields empty.",
  "sexual: four 0-100 integers — eroticInterest (how often and how strongly they want sex), sexualSpontaneity (how little time, commitment and conditions they need before sex), sexualOpenness (how open they are about kinds of sex and talking about it), sexualMomentum (how hard they keep going once started).",
  "axes: eight 0-100 integers for general behaviour — initiative (starts things), spontaneity (acts on the mood), directness (says what they mean), goalPersistence (keeps chasing a goal), obsessiveness (fixates on one person or thing), publicOpenness (shows it in front of others), retaliation (pays back what was done), extremity (how far the means escalate).",
  "pref: the percentage of sexual attraction to women (f), men (m) and others (x), summing to 100, inferred from the data when not stated.",
  "positions: 8 to 12 preferred and 4 to 6 disliked items in total, spread over three kinds — kind position (sex positions: 정상위, 후배위, 기승위, 역기승위, 69, 선 채로, 옆으로 누워서, 무릎 꿇고, 들어 올려서…), kind place (where to have sex: 침대, 샤워실, 욕조, 차 안, 교실, 사무실, 소파, 창가, 야외, 호텔…) and kind play (concrete acts and touches: 목 애무, 귓불 깨물기, 가슴 애무, 커닐링구스, 펠라치오, 핑거링, 스팽킹, 눈 가리기, 손목 묶기, 더티 토크, 거울 앞, 질내사정…). Give at least 3 preferred of each kind. Each must follow from this character's personality, sexual desire and paraphilia; the paraphilia must show up in the play items. Write each label as the one term Korean adult readers actually use: a native Korean word when that is what people say (정상위, not 미션어리), an established loanword when that is the common term (펠라치오, 스팽킹, 핑거링, 더티 토크), never English letters, never a literal translation nobody uses (not 엉덩이 때리기 for spanking), no parentheses or second name. Never an emotional condition or value such as mutual respect.",
  "seduction and humor: how they seduce and how they joke about sex — frequency and directness 0-100, styles as short phrases, situations as short phrases.",
  "Write labels, reasons, styles and situations in Korean, in blunt plain sexual words without euphemism or literary softening. Keep the enum values (preferred, neutral, disliked) in English.",
].join(" ");

// 무작위 출발값(기억 옵션 ‘처음 등장 때 성인 항목 무작위로’의 성적 수치)을 덮어쓴다 — 사용자가 고친 값은 그대로
export function withRolledSexual(nsfw, sexual) {
  if (!sexual) return nsfw;
  const base = nsfw ?? { sexual: {}, axes: {}, pref: null, positions: [], seduction: null, humor: null, by: "roll", at: new Date().toISOString(), log: [] };
  if (base.by === "user") return base;
  return { ...base, sexual: { ...base.sexual, ...Object.fromEntries(SEX_KEYS.filter((k) => Number.isFinite(sexual[k])).map((k) => [k, num(sexual[k])])) } };
}

// 매 턴 기록기 보고 반영: taste(체위·장소 좋아함/싫어함), sexval(성적 수치 ±). 반환: 바뀐 nsfw(없으면 원래 것)와 바뀐 글
export function applyNsfwReports(nsfw, reports, at = new Date().toISOString()) {
  if (!nsfw || !reports?.length) return { nsfw, changed: [] };
  const next = { ...nsfw, sexual: { ...nsfw.sexual }, positions: [...nsfw.positions], log: [...(nsfw.log ?? [])] }, changed = [];
  for (const r of reports) {
    if (r.kind === "taste") {
      const label = cleanPosLabel(text(r.label, 60)), preference = prefValue(r.preference); if (!label || !preference) continue;
      const i = next.positions.findIndex((p) => p.label.toLowerCase() === label.toLowerCase());
      if (i >= 0 && next.positions[i].preference === preference) continue;
      const item = { label, preference, kind: posKind(r.posKind, label), reason: text(r.quote, 160) };
      if (i >= 0) next.positions[i] = item; else next.positions.push(item);
      if (next.positions.length > POS_MAX) next.positions.shift();
      changed.push(`${label} ${preference === "preferred" ? "좋아함" : preference === "disliked" ? "싫어함" : "보통"}`);
    } else if (r.kind === "sexval" && SEX_KEYS.includes(r.key)) {
      const d = Math.max(-10, Math.min(10, Math.round(Number(r.delta) || 0))); if (!d) continue;
      const before = next.sexual[r.key] ?? 50, after = Math.max(0, Math.min(100, before + d));
      if (after === before) continue;
      next.sexual[r.key] = after; changed.push(`${SEX_LABEL[r.key]} ${before}→${after}`);
    }
  }
  if (!changed.length) return { nsfw, changed };
  next.log.push({ at, text: changed.join(" · ") }); next.log = next.log.slice(-LOG_MAX); next.at = at;
  return { nsfw: next, changed };
}

// RP 요청에 넣을 짧은 줄(장면에 나온 인물만)
export function nsfwInjectLine(name, n) {
  if (!n) return "";
  const s = SEX_KEYS.filter((k) => Number.isFinite(n.sexual?.[k])).map((k) => `${SEX_LABEL[k]} ${n.sexual[k]}`);
  const like = n.positions.filter((p) => p.preference === "preferred").map((p) => cleanPosLabel(p.label)).slice(0, 10), hate = n.positions.filter((p) => p.preference === "disliked").map((p) => cleanPosLabel(p.label)).slice(0, 6);
  const parts = [s.length && s.join(", "), like.length && `좋아함: ${like.join(", ")}`, hate.length && `싫어함: ${hate.join(", ")}`, n.seduction?.styles?.length && `유혹: ${n.seduction.styles.slice(0, 2).join(", ")}`,
    n.tags?.likes?.length && `사용자가 정한 선호: ${n.tags.likes.join(", ")}`, n.tags?.limits?.length && `금기(절대 넘지 않음): ${n.tags.limits.join(", ")}`].filter(Boolean);
  return parts.length ? `- ${name}: ${parts.join(" / ")}` : "";
}
export const NSFW_INJECT_TITLE = "[Sexual profile — use only when the scene turns sexual; never force it]";

// 폴더 → 최근 글에 이름이 나온 인물의 성인 프로필 줄(최대 max명). 없으면 ""
export function nsfwSection(folder, recentText, max = 4) {
  const map = folder?.nsfw; if (!map || !recentText) return "";
  const t = String(recentText).normalize("NFKC").toLowerCase(), lines = [];
  for (const [id, n] of Object.entries(map)) {
    const d = folder?.wiki?.documents?.[id]; if (!d) continue;
    const names = [d.title, ...(d.aliases ?? [])].map((x) => String(x ?? "").normalize("NFKC").toLowerCase().trim()).filter((x) => x.length >= 2);
    if (!names.some((x) => t.includes(x))) continue;
    const pr = folder?.wiki?.people?.profiles?.[id], short = (t) => String(t ?? "").replace(/<추정>|미확인/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    const extra = [pr?.sexualDesire?.text && short(pr.sexualDesire.text) && `성적 욕망: ${short(pr.sexualDesire.text)}`, pr?.paraphilia?.text && short(pr.paraphilia.text) && `이상성향: ${short(pr.paraphilia.text)}`].filter(Boolean);
    const line = nsfwInjectLine(d.title, n); if (line) lines.push(line + (extra.length ? ` / ${extra.join(" / ")}` : ""));
    if (lines.length >= max) break;
  }
  return lines.length ? [NSFW_INJECT_TITLE, ...lines].join("\n") : "";
}
