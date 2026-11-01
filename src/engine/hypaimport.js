// v1.8.1 HypaPlus 가져오기(순수): HypaPlus의 요약 노드(event/facts)를 Dusk 폴더의 장면·인물 기록으로 바꾼다.
// 앵커(메시지 연결)가 없는 legacy 항목으로 넣어서 reconcile이 건드리지 않는다. 같은 노드는 두 번 넣지 않는다(imp 표시).
export const HYPA_STATE_PREFIX = "hypaplus_state_";
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const key = (n) => String(n ?? "").toLowerCase().replace(/\s+/g, "");
const oneLine = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const rid = (p, i) => `${p}_hp${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const MAX_ACT = 220, MAX_SUM = 400, MAX_CHARS_PER_NODE = 4;

// 저장소 키 hypaplus_state_<charId>_<chatId> → {chaId, chatId}. 아이디에 밑줄이 있어 못 나누면 null.
export function parseHypaKey(k) {
  if (typeof k !== "string" || !k.startsWith(HYPA_STATE_PREFIX)) return null;
  const parts = k.slice(HYPA_STATE_PREFIX.length).split("_");
  return parts.length === 2 && parts[0] && parts[1] ? { chaId: parts[0], chatId: parts[1] } : null;
}

// 저장 상태({chunks}) 또는 백업 파일({chunks}) → 노드 목록. 모양이 다르면 null.
export function readHypaNodes(raw) {
  let v = raw;
  if (typeof raw === "string") { try { v = JSON.parse(raw); } catch { return null; } }
  if (!isObj(v) || !Array.isArray(v.chunks)) return null;
  const nodes = [];
  for (const c of v.chunks) for (const n of Array.isArray(c?.nodes) ? c.nodes : []) {
    if (!isObj(n) || (n.type !== "event" && n.type !== "facts") || !oneLine(n.content)) continue;
    nodes.push({ id: String(n.id ?? ""), chunk: String(c.id ?? ""), type: n.type, time: String(n.time ?? ""), location: n.location ? String(n.location) : "", characters: (Array.isArray(n.characters) ? n.characters : []).map((x) => oneLine(x)).filter(Boolean),
      content: oneLine(n.content), dialogues: (Array.isArray(n.dialogues) ? n.dialogues : []).filter((d) => d?.text).map((d) => ({ speaker: oneLine(d.speaker), text: oneLine(d.text) })), favorite: !!n.favorite, createdAt: Number(n.createdAt) || 0 });
  }
  return nodes;
}

export function cut(text, n) {
  const s = oneLine(text); if (s.length <= n) return s;
  const head = s.slice(0, n), at = Math.max(head.lastIndexOf(". "), head.lastIndexOf("다. "), head.lastIndexOf("요. "));
  return (at > n * 0.5 ? head.slice(0, at + 1) : head.slice(0, n - 1)).trimEnd() + (at > n * 0.5 ? "" : "…");
}
// "2025-03-02 21:30 → 22:10" → "2025-03-02", 날짜가 없으면 ""
const isoOf = (t) => (String(t).match(/^(\d{4})-(\d{2})-(\d{2})/) ? String(t).slice(0, 10) : "");
const nodeTime = (n) => (isoOf(n.time) ? Date.parse(String(n.time).slice(0, 16).replace(" ", "T")) : NaN);
const order = (a, b) => (Number.isNaN(nodeTime(a)) || Number.isNaN(nodeTime(b)) ? 0 : nodeTime(a) - nodeTime(b)) || a.createdAt - b.createdAt || a.id.localeCompare(b.id, undefined, { numeric: true });

// 노드를 폴더에 합친다. 반환: {scenes, records, people, already, skipped}
// - event → 장면 1개(+ 나온 인물마다 기록 1개). facts → 나온 인물마다 기록 1개(인물이 없으면 건너뜀).
// - 즐겨찾기 → 고정(pin)·등급 A, 나머지 B. 이미 넣은 노드(imp)는 건너뜀. 장면은 기존 장면보다 앞에 둔다.
export function mergeHypaNodes(folder, nodes, { now = Date.now() } = {}) {
  const out = { scenes: 0, records: 0, people: 0, already: 0, skipped: 0 };
  const have = new Set();
  for (const s of folder.scenes ?? []) if (s.imp) have.add(s.imp);
  for (const p of Object.values(folder.people ?? {})) for (const r of p.records ?? []) if (r.imp) have.add(r.imp);
  const sorted = [...nodes].sort(order), newScenes = [];
  sorted.forEach((n, i) => {
    const tag = `hypaplus:${n.chunk}:${n.id}`;
    if (have.has(tag)) { out.already++; return; }
    if (n.type === "facts" && !n.characters.length) { out.skipped++; return; }
    const g = n.favorite ? "A" : "B", sc = n.favorite ? 7 : 6;
    if (n.type === "event") {
      const facts = n.dialogues.slice(0, 3).map((d) => cut(`${d.speaker}: "${d.text}"`, 120));
      newScenes.push({ id: rid("s", i), at: null, h: null, sum: cut(n.content, MAX_SUM), facts, place: n.location, when: n.time, ...(isoOf(n.time) ? { iso: isoOf(n.time) } : {}), who: n.characters.slice(0, 12), at_ms: n.createdAt || now, orphan: false, legacy: true, imp: tag });
      out.scenes++;
    }
    n.characters.slice(0, MAX_CHARS_PER_NODE).forEach((name, j) => {
      const k = key(name); if (!k) return;
      let p = folder.people[k];
      if (!p) { p = folder.people[k] = { name, aliases: [], pinned: false, records: [] }; out.people++; }
      p.records.push({ id: rid("r", i * 8 + j), at: null, h: null, act: cut(n.content, MAX_ACT), g, score: sc, p: null, s: null, r: null, sit: null, user: false, pin: n.favorite, at_ms: n.createdAt || now, orphan: false, legacy: true, imp: tag, ...(n.time ? { when: n.time } : {}) });
      out.records++;
    });
  });
  if (newScenes.length) folder.scenes = [...newScenes, ...(folder.scenes ?? [])];
  folder.imports = { ...(folder.imports ?? {}), hypaplus: { at: now, nodes: nodes.length } };
  return out;
}
