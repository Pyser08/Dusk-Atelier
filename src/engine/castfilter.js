// 로어북에 있는 인물만 위키에 새로 만들기 (장기기억 애드온 전용 — 코어가 import하지 않는다: 코어 2.0.7에서도 애드온이 켜지게).
// 판단은 프로그램이 한다(모델 호출 없음). 이미 위키에 있는 인물은 건드리지 않고, '새로 만들기'만 막는다.
// 출처: 봇 이름 + 캐릭터 설명 + 로어북(캐릭터·채팅·봇/채팅/전역 모듈)의 키워드·보조 키워드·이름(comment)·내용.
// 로어북 항목이 하나도 없는 봇은 막지 않는다(막으면 위키가 영영 비어 버림).

const norm = (s) => String(s ?? "").replace(/\{\{[^}]*\}\}/g, " ").toLowerCase().replace(/\s+/g, "");

// entries: 리스 로어북 항목 배열({ key, secondkey, comment, content, mode })
export function loreCast({ botName = "", description = "", entries = [] } = {}) {
  const list = (Array.isArray(entries) ? entries : []).filter((e) => e && typeof e === "object");
  const keys = new Set();
  for (const e of list) for (const raw of [e.key, e.secondkey]) for (const k of String(raw ?? "").split(",")) { const n = norm(k); if (n.length >= 2) keys.add(n); }
  const bot = norm(botName);
  if (bot.length >= 2) keys.add(bot);
  const text = [botName, description, ...list.flatMap((e) => [e.key, e.secondkey, e.comment, e.content])].map(norm).join("\n");
  return { keys: [...keys], text, empty: list.length === 0 };
}

// 이름(또는 별칭 하나라도)이 로어북에 나오면 true. cast가 없거나 로어북이 비었으면 항상 true.
export function inCast(cast, name, aliases = []) {
  if (!cast || cast.empty) return true;
  for (const n of [name, ...(aliases ?? [])]) {
    const k = norm(n); if (k.length < 2) continue;
    if (cast.text.includes(k)) return true;                     // 로어북 글에 이름이 있음 ("민지", "민지의 오빠 민준")
    if (cast.keys.some((key) => k.includes(key))) return true;  // 키워드가 이름 안에 있음 (키 "세라" → "세라 선배")
  }
  return false;
}

// 리수폿 Writer 응답(JSON 봉투)에서 로어북에 없는 인물의 '새로 만들기'와 그 인물을 가리키는 것들을 뺀다.
// keep(title, aliases) → bool. 반환 { env, dropped:[제목] } — 뺄 게 없으면 env 그대로.
export function dropCreates(env, keep) {
  if (!env || typeof env !== "object" || !Array.isArray(env.documents)) return { env, dropped: [] };
  const gone = new Map();
  for (const d of env.documents) {
    if (d?.operation !== "create" || String(d.type ?? "").toLowerCase() !== "character" || !d.title) continue;
    if (!keep(d.title, d.aliases_add ?? [])) gone.set(d.document_ref, d.title);
  }
  if (!gone.size) return { env, dropped: [] };
  const hit = (refs) => (Array.isArray(refs) ? refs : []).some((r) => gone.has(r));
  const documents = [];
  for (const d of env.documents) {
    if (gone.has(d.document_ref)) continue;
    const entries = (d.entries ?? []).filter((e) => !hit(e?.target_refs) && !hit(e?.links?.map?.((l) => l?.document_ref ?? l)));
    if (d.operation === "update" && (d.entries ?? []).length && !entries.length) continue;   // 그 인물 얘기만 있던 갱신은 통째로 뺀다
    documents.push(entries.length === (d.entries ?? []).length ? d : { ...d, entries });
  }
  const ops = (arr) => (Array.isArray(arr) ? arr.filter((m) => !gone.has(m?.document_ref) && !hit(m?.target_refs)) : arr);
  const out = { ...env, documents, metric_ops: ops(env.metric_ops), people_ops: ops(env.people_ops), issues: Array.isArray(env.issues) ? env.issues.filter((i) => !gone.has(i?.document_ref)) : env.issues };
  if (!out.documents.length && !(out.metric_ops ?? []).length && !(out.people_ops ?? []).length && !(out.issues ?? []).length)
    out.issues = [{ code: "no_canonical_change", document_ref: null, detail: "로어북에 없는 인물만 나와서 이번에는 바꾸지 않음" }];
  return { env: out, dropped: [...gone.values()] };
}
