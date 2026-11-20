// 장기기억 애드온: 인물을 더 사람답게 — 모델이 판단해 채우는 글 항목(순수). folder.nsfw[문서 id] 안에 같이 둔다.
//   human: 일반(말버릇·습관·민감한 주제·꿈·비밀·사랑 표현·화날 때·슬플 때)
//   ext:   성인(처음 경험·판타지·신음과 말투·끝난 뒤·좋다는 신호·싫다는 신호·피임 태도)
//   zones: 성감대 [{part, level 1~3, note}] — part는 BODY_PARTS id(인체 모형에 찍는다)
const text = (v, n = 160) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const nk = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");

// [키, 이름, 여러 개?, 기록기 줄 이름]
export const HUMAN_FIELDS = Object.freeze([
  ["speech", "말버릇", true], ["habit", "습관·버릇", true], ["trigger", "민감한 주제·트라우마", true], ["dream", "꿈·목표", true],
  ["secret", "비밀", true], ["love", "사랑 표현 방식", false], ["anger", "화났을 때", false], ["sad", "슬플 때", false],
]);
export const EXT_FIELDS = Object.freeze([
  ["first", "처음 경험", false], ["fantasy", "판타지", true], ["voice", "신음·말투", false], ["after", "끝난 뒤", false],
  ["yes", "좋다는 신호", true], ["no", "싫다는 신호", true], ["contra", "피임 태도", false],
]);
const LIST_MAX = 6;
const FIELD_OF = new Map([...HUMAN_FIELDS.map((x) => [x[0], ["human", x]]), ...EXT_FIELDS.map((x) => [x[0], ["ext", x]])]);
export const isExtField = (k) => FIELD_OF.get(k)?.[0] === "ext";

// 인체 모형 부위: id, 이름, 앞/뒤, 모형 좌표(0~100 기준 viewBox 100×200), 찾을 말
export const BODY_PARTS = Object.freeze([
  { id: "lips", label: "입술", side: "f", x: 50, y: 24, re: /입술|입|lip/ },
  { id: "ears", label: "귀", side: "f", x: 40.6, y: 18, re: /귀|ear/ },
  { id: "neck", label: "목", side: "f", x: 50, y: 32, re: /^목$|목덜미|목선|neck/ },
  { id: "collar", label: "쇄골", side: "f", x: 57, y: 40, re: /쇄골|collar/ },
  { id: "chest", label: "가슴", side: "f", x: 43, y: 52, re: /가슴|유방|breast|chest/ },
  { id: "nipples", label: "유두", side: "f", x: 57, y: 54, re: /유두|젖꼭지|nipple/ },
  { id: "armpit", label: "겨드랑이", side: "f", x: 32.4, y: 50, re: /겨드랑|armpit/ },
  { id: "belly", label: "배·배꼽", side: "f", x: 50, y: 76, re: /배꼽|아랫배|배$|belly|navel/ },
  { id: "waist", label: "허리·옆구리", side: "f", x: 38, y: 80, re: /허리|옆구리|waist/ },
  // 0.3.22 여성 부위(sex:"f" — 여성 모형에만 찍힌다). 사타구니보다 먼저 찾게 앞에 둔다
  { id: "womb", label: "자궁", side: "f", sex: "f", x: 50, y: 90, re: /자궁|포르치오|womb|uterus|cervix/i },
  { id: "clit", label: "클리토리스", side: "f", sex: "f", x: 50, y: 102.4, re: /클리|음핵|clit/i },
  { id: "vagina", label: "질", side: "f", sex: "f", x: 50, y: 106.4, re: /^질|질\s*(입구|안|속|벽|내)|vagina/i },
  { id: "groin", label: "사타구니", side: "f", x: 44.6, y: 103, re: /사타구니|음부|성기|groin|genital/ },
  { id: "thighs", label: "허벅지 안쪽", side: "f", x: 44, y: 122, re: /허벅지|thigh/ },
  { id: "hands", label: "손·손가락", side: "f", x: 22, y: 94, re: /손|손가락|hand|finger/ },
  { id: "feet", label: "발", side: "f", x: 40, y: 188, re: /발|발가락|foot|feet|toe/ },
  { id: "nape", label: "뒷목", side: "b", x: 50, y: 31, re: /뒷목|nape/ },
  { id: "back", label: "등", side: "b", x: 50, y: 55, re: /^등|등줄기|척추|back|spine/ },
  { id: "lowback", label: "허리 뒤", side: "b", x: 50, y: 84, re: /허리 ?뒤|꼬리뼈|lower back/ },
  { id: "butt", label: "엉덩이", side: "b", x: 50, y: 100, re: /엉덩이|둔부|butt|ass/ },
  { id: "anus", label: "항문", side: "b", x: 50, y: 107, re: /항문|애널|anal|anus/ },
  { id: "knees", label: "무릎 뒤", side: "b", x: 43, y: 150, re: /무릎|오금|knee/ },
  // 0.3.22 종족 부위(race: 그 몸 특징이 있는 종족 모형에만 찍힌다). 허리 뒤(꼬리뼈)보다 뒤에 둬서 '꼬리뼈'는 허리 뒤로
  { id: "tail", label: "꼬리 뿌리", side: "b", race: "tail", x: 56, y: 93, re: /꼬리|tail/i },
  { id: "wings", label: "날개 뿌리", side: "b", race: "wings", x: 41, y: 44, re: /날개|wing/i },
  { id: "horns", label: "뿔·더듬이", side: "f", race: "horns", x: 44.6, y: 6.5, re: /뿔|더듬이|horn|antenna/i },
]);
export function partOf(s) {
  const t = String(s ?? "").trim(); if (!t) return null;
  // 여성 부위를 먼저 본다(‘질 입구’의 ‘입’이 입술로 잡히지 않게)
  return BODY_PARTS.find((p) => p.id === t.toLowerCase()) ?? BODY_PARTS.find((p) => p.sex && p.re.test(t)) ?? BODY_PARTS.find((p) => p.re.test(t)) ?? null;
}

const listOf = (v) => [...new Set((Array.isArray(v) ? v : String(v ?? "").split(/[,，\n]/)).map((x) => text(typeof x === "string" ? x : x?.text ?? "", 100)).filter(Boolean))].slice(0, LIST_MAX);
function normGroup(raw, fields) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [k, , many] of fields) { const v = many ? listOf(raw[k]) : text(raw[k], 200); if (many ? v.length : v) out[k] = v; }
  return Object.keys(out).length ? out : null;
}
export const normHuman = (raw) => normGroup(raw, HUMAN_FIELDS);
export const normExt = (raw) => normGroup(raw, EXT_FIELDS);
export function normZones(raw) {
  const seen = new Set(), out = [];
  for (const z of Array.isArray(raw) ? raw : []) {
    const p = partOf(z?.part ?? z?.label); if (!p || seen.has(p.id)) continue;
    seen.add(p.id); const dev = Number.isFinite(Number(z?.dev)) ? Math.max(0, Math.min(100, Math.round(Number(z.dev)))) : undefined; const numb = z?.numb === true; const lv = numb || (z?.level === 0 && dev != null) ? 0 : Math.max(1, Math.min(3, Math.round(Number(z?.level) || 2)));
    out.push({ part: p.id, level: lv, note: text(z?.note, 80), ...(dev != null ? { dev } : {}), ...(z?.spot ? { spot: text(z.spot, 40) } : {}), ...(z?.src === "random" ? { src: "random" } : {}), ...(numb ? { numb: true } : {}) });
  }
  return out.slice(0, BODY_PARTS.length);
}

// 기록기 보고 반영: {kind:"trait", field, text} / {kind:"zone", part, level, note}. 반환 { nsfw, changed }
export function applyHumanReports(nsfw, reports) {
  if (!nsfw || !reports?.length) return { nsfw, changed: [] };
  const next = { ...nsfw, human: { ...(nsfw.human ?? {}) }, ext: { ...(nsfw.ext ?? {}) }, zones: [...(nsfw.zones ?? [])] }, changed = [];
  for (const r of reports) {
    if (r.kind === "trait") {
      const f = FIELD_OF.get(String(r.field ?? "").toLowerCase()); const t = text(r.text, 100); if (!f || !t) continue;
      const [grp, [k, label, many]] = f, box = next[grp];
      if (many) { const cur = box[k] ?? []; if (cur.some((x) => nk(x) === nk(t))) continue; box[k] = [...cur, t].slice(-LIST_MAX); }
      else { if (nk(box[k]) === nk(t)) continue; box[k] = t; }
      changed.push(`${label}: ${t}`);
    } else if (r.kind === "zone") {
      const p = partOf(r.part); if (!p) continue;
      const i = next.zones.findIndex((z) => z.part === p.id);
      if (Number(r.level) === 0) {   // 0.3.22 불감 부위
        const o = next.zones[i]; if (o?.numb) continue;
        const z = { part: p.id, level: 0, numb: true, note: text(r.note, 80) || o?.note || "" }; if (i >= 0) next.zones[i] = z; else next.zones.push(z);
        changed.push(`불감 ${p.label}`); continue;
      }
      const level = Math.max(1, Math.min(3, Math.round(Number(r.level) || 2)));
      const o = i >= 0 ? next.zones[i] : null, note = text(r.note, 80), spot = level >= 3 ? text(r.spot, 40) : "";
      if (o && o.level >= level && !(note && !o.note) && !(spot && spot !== o.spot)) continue;
      const z = { ...(o ?? {}), part: p.id, level: Math.max(level, o?.level ?? 0), note: note || o?.note || "", ...(spot || o?.spot ? { spot: spot || o.spot } : {}) };
      delete z.src;
      if (i >= 0) next.zones[i] = z; else next.zones.push(z);
      changed.push(`성감대 ${p.label}${"♥".repeat(level)}`);
    }
  }
  return changed.length ? { nsfw: next, changed } : { nsfw, changed };
}

// 주입 줄
export function humanLine(name, n) {
  const h = n?.human; if (!h) return "";
  // 토큰 절약: 목록은 2개까지, 한 줄 220자까지(비밀·민감한 주제·말버릇을 먼저)
  const order = ["speech", "trigger", "secret", "habit", "love", "anger", "sad", "dream"];
  const parts = order.map((k) => HUMAN_FIELDS.find((f) => f[0] === k)).filter(([k]) => h[k] && (!Array.isArray(h[k]) || h[k].length)).map(([k, l]) => `${l}: ${Array.isArray(h[k]) ? h[k].slice(0, 2).join(", ") : h[k]}`);
  return parts.length ? `- ${name}: ${parts.join(" / ")}`.slice(0, 220) : "";
}
export function extLine(n) {
  const e = n?.ext ?? {}, z = n?.zones ?? [];
  const parts = EXT_FIELDS.filter(([k]) => e[k] && (!Array.isArray(e[k]) || e[k].length)).map(([k, l]) => `${l}: ${Array.isArray(e[k]) ? e[k].slice(0, 2).join(", ") : e[k]}`);
  if (z.some((x) => x.numb)) parts.unshift(`불감(아무 느낌 없음): ${z.filter((x) => x.numb).map((x) => partOf(x.part)?.label).join(", ")}`);
  if (z.some((x) => x.level > 0)) parts.unshift(`성감대: ${[...z].filter((x) => x.level > 0).sort((a, b) => b.level - a.level).slice(0, 5).map((x) => `${partOf(x.part)?.label}${x.level >= 3 ? `(약점${x.spot ? `: ${x.spot}` : ""}${x.note ? ` — ${x.note}` : ""})` : ""}`).join(", ")}`);
  return parts.join(" / ").slice(0, 200);
}
export const HUMAN_INJECT_TITLE = "[Personal details — show through behaviour; secrets stay hidden unless the story reveals them]";

// 프로필 만들기 지시문에 붙일 모양·규칙(성인 프로필 호출이 같이 채운다)
export const HUMAN_SHAPE = Object.freeze({
  human: { speech: [], habit: [], trigger: [], dream: [], secret: [], love: "", anger: "", sad: "" },
  ext: { first: "", fantasy: [], voice: "", after: "", yes: [], no: [], contra: "" },
  zones: [{ part: "한국어 부위", level: 2, note: "한 줄 특징(어떻게 반응하는지)", spot: "약점(3)일 때만 정확한 자리" }],
});
export const HUMAN_RULES = "human (everyday): speech=verbal tics, habit, trigger=sensitive topics, dream=goals, secret, love/anger/sad=how they show love, anger, sadness. ext (bed): first=first time, fantasy, voice=moans and bed talk, after=aftercare, yes/no=signs of liking/refusing, contra=contraception attitude. zones: 3-6 erogenous spots, level 1-3 (3=weak spot). Short Korean phrases, at most 3 per list; omit fields with nothing to say.";
