// 모듈 호환 — 인물 감지 변수(순수). 모듈 로어북이 {{getvar::인물}}로 인물 소개를 숨기고 보이는데, 봇 Lua의 인물 목록에
// 그 인물이 없어 변수가 비어 있는 경우(예: '최근 대화에 나오면 0, 안 나오면 1' 규칙의 봇)를 채운다.
// 쓰는 길: 보내는 입력 끝에 {{setvar::인물::값}}을 붙인다 → 리스 runVar 패스가 프롬프트를 만들기 전에 실행하고 지운다(채팅 구조는 안 건드림).
// 응답(output) 훅에는 붙이지 않는다 — 스트리밍 중 조각마다 불려 {{setvar}}가 화면에 잠깐 글자로 보인다.
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const lower = (s) => String(s ?? "").toLowerCase();
const splitKeys = (k) => String(k ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const SAFE = (n) => n && n.length <= 80 && !/::|\{\{|\}\}|[\n\r]/.test(n);

// 로어북 글에서 {{getvar::이름}} 이름들
export function getvarNames(text) {
  const out = new Set(), re = /\{\{\s*getvar\s*::\s*([^:{}]+?)\s*\}\}/gi;
  let m;
  while ((m = re.exec(String(text ?? "")))) out.add(m[1]);
  return [...out];
}

// 이 봇에서 Dusk가 채울 인물 변수 → [{name, keywords, moduleId}]
// 모듈 로어북이 getvar로 부르고, 그 이름이 모듈의 인물(로어북 키·이름표·이미지 주제)이며, 봇이 스스로 다루지 않는 것만.
export function managedNames({ modules = [], bot = {}, subjects = [] } = {}) {
  // 봇·모듈 Lua(그리고 봇 기본 변수)가 직접 다루는 이름은 건드리지 않는다
  const codes = (list) => (list ?? []).flatMap((t) => (t?.effect ?? []).map((e) => e?.code ?? ""));
  const botText = [bot.defaultVariables, ...codes(bot.triggerscript), ...(modules ?? []).flatMap((m) => codes(m?.trigger))].join("\n");
  const botEntries = [...(bot.globalLore ?? [])];
  const subj = new Set((subjects ?? []).map((s) => lower(s.name ?? s)));
  const res = new Map();
  for (const m of modules ?? []) {
    const lore = (m?.lorebook ?? []).filter(isObj);
    const keyOwner = new Map();
    for (const e of lore) for (const k of [...splitKeys(e.key), ...splitKeys(e.secondkey), String(e.comment ?? "").trim()]) if (k && !keyOwner.has(lower(k))) keyOwner.set(lower(k), e);
    for (const e of lore) for (const name of getvarNames(e.content)) {
      const n = name.trim(), ln = lower(n);
      if (!SAFE(n) || res.has(ln)) continue;
      const owner = keyOwner.get(ln);
      if (!owner && !subj.has(ln)) continue;                       // 인물이 아닌 설정 변수(lang 등)는 건드리지 않는다
      if (botText.includes(`"${n}"`) || botText.includes(`'${n}'`) || new RegExp(`(^|\\n)\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`).test(botText)) continue;   // 봇 Lua·기본 변수가 다룸
      if (botEntries.some((b) => splitKeys(b?.key).some((k) => lower(k) === ln))) continue;   // 봇 자신의 인물
      const keywords = owner ? [...new Set([...splitKeys(owner.key), ...splitKeys(owner.secondkey), n])] : [n];
      res.set(ln, { name: n, keywords: keywords.filter((k) => k.length >= 2), moduleId: m?.id ?? "" });
    }
  }
  return [...res.values()];
}

// 지금 채팅 변수에서 '나오면 몇'인지 읽는다. 봇이 이미 0/1로 채우는 인물 변수와 최근 대화를 맞춰 본다.
// botEntries: 봇 로어북(키에서 다른 이름 찾기). → "0" | "1" | null(알 수 없음)
export function inferFoundValue({ scriptstate = {}, botEntries = [], recentText = "", managed = [] } = {}) {
  const text = lower(recentText), skip = new Set(managed.map((x) => lower(x.name)));
  let same = 0, diff = 0;   // same: 나왔고 0 / 안 나왔고 1, diff: 그 반대
  for (const [k, v] of Object.entries(scriptstate ?? {})) {
    if (!k.startsWith("$") || (v !== "0" && v !== "1" && v !== 0 && v !== 1)) continue;
    const name = k.slice(1), ln = lower(name);
    if (skip.has(ln) || name.length < 2 || !/[a-z가-힣]/i.test(name) || /^(lang|stats|sysmsg|clock|fold|lore|event|economy|scenario|faction)$/i.test(name)) continue;
    const entry = botEntries.find((b) => splitKeys(b?.key).some((x) => lower(x) === ln));
    if (!entry && !/\s|-/.test(name)) continue;   // 이름처럼 생긴 것(띄어쓰기·하이픈) 또는 봇 로어북에 있는 것만
    const keys = entry ? splitKeys(entry.key) : [name];
    const seen = keys.some((x) => x.length >= 2 && text.includes(lower(x)));
    const val = String(v);
    if ((seen && val === "0") || (!seen && val === "1")) same++; else diff++;
  }
  if (same + diff < 3) return null;
  if (same >= diff * 2) return "0";
  if (diff >= same * 2) return "1";
  return null;
}

// 바꿀 값만 → {이름: 값}. found: 나왔을 때 값("0"|"1")
export function varUpdates({ managed = [], text = "", found = "0", scriptstate = {} } = {}) {
  const t = lower(text), notFound = found === "0" ? "1" : "0", out = {};
  for (const m of managed) {
    const seen = m.keywords.some((k) => t.includes(lower(k)));
    const v = seen ? found : notFound;
    const cur = scriptstate?.[`$${m.name}`];
    if (cur == null || String(cur) !== v) out[m.name] = v;
  }
  return out;
}
export const setvarText = (updates) => Object.entries(updates ?? {}).filter(([n]) => SAFE(n)).map(([n, v]) => `{{setvar::${n}::${v}}}`).join("");
// 최근 메시지 글(창 크기 n, 마지막에 더할 글 포함)
export function windowText(messages, extra = "", n = 9) {
  const list = (messages ?? []).map((m) => String(m?.data ?? ""));
  return [...list.slice(Math.max(0, list.length - (n - (extra ? 1 : 0)))), extra].join("\n");
}
