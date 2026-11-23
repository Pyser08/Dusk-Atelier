// 쉬운 로어북(애드온 전용, 순수): 버튼 하나로 '이름 겹침'이 생기는 로어북 항목에만 Dusk 규칙(이름 경계)을 붙인다.
//   '마리' 키가 '히마리'에 걸리는 것처럼, 리스 순정 키는 글자 포함만 보면 켜진다.
//   Dusk 규칙의 이름 경계(lorerules.wholeRe)를 켜면 '마리가·마리야·마리 씨'에는 켜지고 '히마리'에는 안 켜진다.
//   흔한 낱말과 같은 이름('유리'·'하늘')은 흔한 이름 모드로 — 부르는 말·확인 단어·최근 등장 중 하나가 있을 때만 켜진다.
// 원래 내용·키는 extentions.da_easy.orig에 남겨 되돌리기(revertAll)로 그대로 돌아간다.
import { defaultRule, nativeContent, ruleOf, isFolder, isPlace, isAff, folderMap, ancestorsOf, affName } from "./lorerules.js";

export const EASY_VERSION = 1;
// 흔한 낱말과 같은 이름 (이름 경계만으로는 일반 문장에서도 켜진다)
export const COMMON_NAMES = new Set("유리 하늘 바다 별 봄 여름 가을 겨울 소라 나비 구름 노을 달 해 빛 이슬 비 눈 꽃 장미 하나 다솜 보라 새벽 아침 은 금 진주 사랑 소망 기쁨 한별 미소 가람 마루 누리 슬기 단비 초롱 보람 겨레 나라 우주 산 강 숲 솔 결 봄비 이브 엔젤 루나 스타 레인 스노우 로즈 릴리 아이 유키 하루 소라 히카리 미라이 아오이 사쿠라 나츠 아키 후유".split(" "));
// 확인 단어로 쓰면 안 되는 흔한 말
const STOP = new Set("그녀 그는 그 그녀는 그는 이름 나이 성별 여성 남성 여자 남자 성격 외모 특징 설명 배경 관계 좋아하는 싫어하는 학생 선생님 사람 캐릭터 인물 키 몸무게 머리 눈 피부 옷 말투 취미 직업 소속 학교 학년 반 the a an and or of to is are".split(" "));

const splitKeys = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const isHangul = (s) => /^[가-힣]+$/.test(s);

// 고칠 수 있는 항목: 폴더·항상 켜짐·정규식·이미 Dusk 규칙이 있는 항목·키 없음은 건드리지 않는다
export function eligible(e) {
  if (!e || typeof e !== "object" || isFolder(e) || e.mode === "folder") return false;
  if (e.alwaysActive || e.useRegex) return false;
  if (ruleOf(e)) return false;
  return splitKeys(e.key).length > 0;
}

// 이름 후보: 모든 항목의 키 + 항목 이름(comment)
function allNames(entries) {
  const out = new Set();
  for (const e of entries) {
    if (!e || isFolder(e)) continue;
    for (const k of [...splitKeys(e.key), ...splitKeys(e.secondkey)]) out.add(k.toLowerCase());
    const c = String(e.comment ?? "").replace(/^\[[^\]]*\]\s*/, "").trim();
    if (c && c.length <= 20) out.add(c.toLowerCase());
  }
  return out;
}

// 왜 위험한지: 다른 이름 안에 들어감('마리' ⊂ '히마리') / 한글 1~2글자 / 흔한 낱말 이름
export function riskOf(key, names) {
  const k = key.trim().toLowerCase();
  if (!k) return null;
  const inside = [...names].filter((n) => n !== k && n.includes(k) && !n.startsWith(k + " "));
  if (COMMON_NAMES.has(k)) return { why: "common", inside };
  if (inside.length) return { why: "inside", inside };
  if (isHangul(k) && k.length <= 2) return { why: "short", inside };
  return null;
}

// 확인 단어 자동 추출: 이 항목 본문에만 나오는 고유한 낱말(성·별명·소속 등)
export function confirmWords(entry, entries, { max = 6 } = {}) {
  const keys = new Set(splitKeys(entry.key).map((k) => k.toLowerCase()));
  const words = (t) => String(t ?? "").replace(/\{\{[\s\S]*?\}\}/g, " ").replace(/^@@.*$/gm, " ").match(/[가-힣A-Za-z]{2,10}/g) ?? [];
  const strip = (w) => w.replace(/(에게서|한테서|으로|에게|한테|에서|까지|부터|처럼|이라|이다|이고|이며|은|는|이|가|을|를|의|에|와|과|도|로|만)$/, "");
  const freq = new Map();
  for (const w0 of words(entry.content)) {
    const w = strip(w0);
    if (w.length < 2 || STOP.has(w.toLowerCase()) || keys.has(w.toLowerCase())) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  // 다른 항목에도 나오는 낱말은 그 인물만의 단서가 아니다
  const others = entries.filter((x) => x !== entry && !isFolder(x)).map((x) => String(x.content ?? ""));
  const unique = [...freq.entries()].filter(([w]) => others.filter((t) => t.includes(w)).length === 0);
  // 성+이름처럼 키를 품은 말('강하늘')은 맨 앞에
  const withKey = unique.filter(([w]) => [...keys].some((k) => w.toLowerCase().includes(k) && w.toLowerCase() !== k));
  const rest = unique.filter((x) => !withKey.includes(x)).sort((a, b) => b[1] - a[1]);
  return [...withKey, ...rest].slice(0, max).map(([w]) => w);
}

// 순정 머리 장식(@@depth·@@role)을 규칙 배치로 옮긴다 (nativeContent가 이 줄들을 규칙에서 다시 만든다)
function placeOf(content) {
  const out = {};
  for (const line of String(content ?? "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (!/^@@/.test(t)) break;
    let m;
    if ((m = /^@@depth\s+(\d+)/.exec(t))) { out.at = "depth"; out.depth = Number(m[1]); }
    else if ((m = /^@@reverse_depth\s+(\d+)/.exec(t))) { out.at = "depth"; out.depth = Number(m[1]); }
    else if ((m = /^@@role\s+(\w+)/.exec(t))) out.role = m[1];
  }
  return out;
}


// ---------- 인물 판별 ----------
// 겹침 막기는 인물 항목에만. 점수: 내용의 프로필 신호(+) · 장소·물건·설정 신호(-) · 폴더 이름 · Dusk 장소/소속 표시 · 장기기억 인물 이름.
// 사용자가 칩으로 고친 값(override: 'p' 인물 / 'n' 아님)이 언제나 이긴다. |점수| < 2면 애매(AI 판별 대상).
const PERSON_RE = [
  [/\d{1,3}\s*(살|세)(?![가-힣])|나이\s*[:：]|\bage\s*[:：]/i, 3], [/성별\s*[:：]|\bgender\s*[:：]|(여성|남성)(?![가-힣])|\b(female|male)\b/i, 2],
  [/\d{3}\s*cm|키\s*[:：]|신장|\bheight\b/i, 2], [/외모|머리카락|눈동자|헤어|\bappearance\b|\bhair\b|\beyes?\b/i, 2],
  [/성격|말투|버릇|좋아하는|싫어하는|취미|\bpersonality\b|\blikes?\b|\bspeech\b/i, 2], [/학년|소속|직업|\boccupation\b|\baffiliation\b/i, 1],
  [/(^|[^가-힣])(그녀|그는|그의)|\b(she|he|her|his)\b/i, 1], [/생일|\bbirthday\b/i, 1], [/(이름|\bname)\s*[:：]/i, 1],
];
const THING_RE = [
  [/위치|장소|지역|건물|도시|마을|던전|층|구역|\blocation\b|\bplace\b|\bcity\b|\bbuilding\b/i, 2], [/아이템|무기|도구|효과|가격|\bitem\b|\bweapon\b/i, 2],
  [/규칙|시스템|설정|세계관|역사|조직 구조|제도|\brule\b|\bsystem\b|\bworld\b|\bhistory\b/i, 2], [/^\s*-\s*\S+\s*[:：]/m, 0],
];
const PERSON_FOLDER = /인물|캐릭터|npc|character|등장|멤버|학생|people|person/i;
const THING_FOLDER = /장소|지역|위치|아이템|설정|세계관|규칙|시스템|location|place|item|world|lore|setting/i;
export function personScore(e, entries = [], { memNames = [], fmap = null } = {}) {
  if (!e || isFolder(e)) return { score: -9, why: ["폴더"] };
  if (isPlace(e)) return { score: -9, why: ["Dusk 장소 항목"] };
  if (isAff(e)) return { score: -9, why: ["Dusk 소속 항목"] };
  const why = [];
  let sc = 0;
  const text = `${e.comment ?? ""}\n${String(e.content ?? "").slice(0, 3000)}`;
  for (const [re, w] of PERSON_RE) if (re.test(text)) { sc += w; why.push(`+${w} ${re.source.slice(0, 12)}`); }
  for (const [re, w] of THING_RE) if (w && re.test(text)) { sc -= w; why.push(`-${w} ${re.source.slice(0, 12)}`); }
  const fm = fmap ?? folderMap(entries);
  const folders = ancestorsOf(e, fm).map((f) => affName(f) || f.comment || "").concat(e.folder && !fm.get?.(e.folder) ? [] : []);
  for (const n of folders) { if (PERSON_FOLDER.test(n)) { sc += 2; why.push(`폴더 ${n}`); } else if (THING_FOLDER.test(n)) { sc -= 2; why.push(`폴더 ${n}`); } }
  const keys = splitKeys(e.key).map((k) => k.toLowerCase().replace(/\s+/g, ""));
  const mem = new Set(memNames.map((n) => String(n).toLowerCase().replace(/\s+/g, "")));
  if (keys.some((k) => mem.has(k))) { sc += 5; why.push("장기기억 인물"); }
  return { score: sc, why };
}
// → 'p' 인물 | 'n' 아님 | '?' 애매
export function personOf(e, entries, { memNames = [], override = null, ai = null, fmap = null } = {}) {
  if (override === "p" || override === "n") return override;
  const { score } = personScore(e, entries, { memNames, fmap });
  if (score >= 2) return "p";
  if (score <= -2) return "n";
  if (ai === "p" || ai === "n") return ai;
  return score > 0 ? "p" : "?";
}
// 항목을 가리키는 오래가는 열쇠 (Dusk rid가 없으니 이름+키)
export const entryKey = (e) => `${String(e?.comment ?? "").trim()}\u0001${splitKeys(e?.key).join(",")}`;

// 로어북 훑기: 고칠 항목 목록 (index·이름·위험 키·이유·확인 단어)
export function scan(entries, { memNames = [], overrides = {}, ai = {} } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const names = allNames(list);
  const fmap = folderMap(list);
  const out = [];
  list.forEach((e, i) => {
    if (!eligible(e)) return;
    const risks = splitKeys(e.key).map((k) => ({ key: k, ...(riskOf(k, names) ?? {}) })).filter((r) => r.why);
    if (!risks.length) return;
    const common = risks.filter((r) => r.why === "common").map((r) => r.key);
    const ek = entryKey(e);
    const person = personOf(e, list, { memNames, override: overrides[ek], ai: ai[ek], fmap });
    out.push({ index: i, ek, person, name: String(e.comment ?? "") || splitKeys(e.key)[0], risks, common, confirm: common.length ? confirmWords(e, list) : [] });
  });
  return out;
}

// ---------- 필요 없이 자주 켜지는 항목 ----------
// 리스 순정처럼(글자 포함) 최근 메시지마다 켜지는지 세어, 거의 매번 켜지는 항목을 찾는다.
//   rate = 켜진 메시지 / 본 메시지. 기본: 최근 40개 중 절반 넘게, 4번 이상.
export function busyEntries(entries, messages, { last = 40, min = 0.5, minHits = 4 } = {}) {
  const msgs = (messages ?? []).slice(-last).map((m) => String(m?.data ?? "").toLowerCase().replace(/\s+/g, ""));
  if (msgs.length < 6) return [];
  const out = [];
  (entries ?? []).forEach((e, i) => {
    if (!eligible(e) || e.selective) return;
    const keys = splitKeys(e.key).map((k) => k.toLowerCase().replace(/\s+/g, "")).filter(Boolean);
    if (!keys.length) return;
    const hits = msgs.filter((t) => keys.some((k) => t.includes(k))).length;
    const rate = hits / msgs.length;
    if (hits >= minHits && rate >= min) out.push({ index: i, ek: entryKey(e), name: String(e.comment ?? "") || keys[0], keys: splitKeys(e.key), hits, of: msgs.length, rate: Math.round(rate * 100) / 100 });
  });
  return out.sort((a, b) => b.rate - a.rate);
}
// '덜 켜지게': 이름 경계 + 방금 메시지(맨 마지막 한 개)에서만 찾기 → 지난 대화에 한 번 나온 말로 계속 켜지지 않는다
export function calmEntry(e, rid) {
  return convertEntry(e, { common: [], confirm: [] }, rid, { scan: 1, calm: true });
}

// 한 항목에 규칙 붙이기 (원본은 da_easy.orig에)
export function convertEntry(e, plan, rid, extra = {}) {
  const place = placeOf(e.content);
  const rule = { ...defaultRule(), whole: true, scan: Math.max(1, Number(e.scanDepth) || 4), ...place, ...(extra.scan ? { scan: extra.scan } : {}) };
  if (plan.common.length) Object.assign(rule, { common: true, commonKeys: plan.common.join(", "), commonWords: plan.confirm.join(", ") });
  const orig = { content: e.content ?? "" };
  return { ...e, content: nativeContent(e.content ?? "", rule, rid), extentions: { ...(e.extentions ?? {}), da_rid: rid, da_rule: rule, da_easy: { v: EASY_VERSION, orig, ...(extra.calm ? { calm: true } : {}) } } };
}

// 로어북 전체 적용 → { entries: 새 배열, changed: [이름…] }
export function applyAll(entries, { mkId, memNames, overrides, ai, persons = "p" } = {}) {
  // persons: "p" 인물만(애매는 뺌) · "p?" 인물+애매 · "all" 전부
  const plans = scan(entries, { memNames, overrides, ai }).filter((p) => persons === "all" || p.person === "p" || (persons === "p?" && p.person === "?"));
  const byIdx = new Map(plans.map((p) => [p.index, p]));
  const next = entries.map((e, i) => (byIdx.has(i) ? convertEntry(e, byIdx.get(i), mkId()) : e));
  return { entries: next, plans };
}

export const isEasy = (e) => !!e?.extentions?.da_easy;

// 되돌리기: 쉬운 로어북이 붙인 것만 원래대로 (사용자가 직접 만든 Dusk 규칙은 그대로)
export function revertEntry(e) {
  if (!isEasy(e)) return e;
  const { da_rid, da_rule, da_easy, ...rest } = e.extentions;
  return { ...e, content: da_easy.orig?.content ?? e.content, extentions: rest };
}
export function revertAll(entries) {
  let n = 0;
  const next = (entries ?? []).map((e) => (isEasy(e) ? (n++, revertEntry(e)) : e));
  return { entries: next, count: n };
}
