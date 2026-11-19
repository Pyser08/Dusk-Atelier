// 갈래 보기(장기기억 애드온 전용, 순수): 같은 봇의 채팅 기억 폴더들을 분기 관계로 이어 나무로 만들고, 갈래마다 인물 호감을 비교한다.
// 분기 원본은 기억 폴더의 adoptedFrom(분기 이어받기·키 옮기기)과 위키 scope.forkedFrom(리수폿 복사)에서 읽는다.
// 둘 다 없는 채팅(이어받기 전·끈 채팅)은 뿌리로 둔다. 리롤·되감기 갈래는 아직 없다(채팅 안에서 바뀌어 기록이 없음).
import { buildRelMap, relmapTurns } from "./relmap.js";

const str = (v) => (v == null ? "" : String(v));

// forkedFrom은 원래 채팅 키 그대로이거나 wikiScopeStorageKey(봇, 채팅) 모양이다 → 아는 채팅 id로 맞춘다.
export function parentIdOf(folder, ids) {
  const own = str(folder?.chatId);
  const a = str(folder?.adoptedFrom);
  if (a && a !== own && ids.has(a)) return a;
  const w = str(folder?.wiki?.scope?.forkedFrom);
  if (!w) return "";
  if (w !== own && ids.has(w)) return w;
  let best = "";
  for (const id of ids) if (id && id !== own && w.endsWith(id) && id.length > best.length) best = id;   // 저장 키 끝이 채팅 id
  return best;
}

const liveRecs = (f) => Object.values(f?.people ?? {}).flatMap((p) => (p?.records ?? []).filter((r) => r && !r.orphan && Number.isInteger(r.at)));

// 갈라진 지점(메시지 번호, 0부터): 부모와 같은 기록(id·위치·내용)이 남아 있는 마지막 위치. 못 찾으면 -1.
export function forkPointOf(child, parent) {
  const sig = (r) => `${r.id ?? ""}|${r.at}|${r.act ?? ""}`;
  const mine = new Set(liveRecs(parent).map(sig));
  let at = -1;
  for (const r of liveRecs(child)) if (mine.has(sig(r)) && r.at > at) at = r.at;
  return at;
}

// folders: 읽어 온 기억 폴더들(같은 봇). 돌려줌: { roots: [node], byId, branched } — node = { id, name, parent, children, forkAt, turns, updatedAt, people }
export function buildBranchTree(folders, { names = {}, current = "" } = {}) {
  const list = (folders ?? []).filter((f) => f && f.chatId != null);
  const ids = new Set(list.map((f) => str(f.chatId)));
  const byId = {};
  for (const f of list) {
    const id = str(f.chatId);
    const map = buildRelMap(f);
    byId[id] = {
      id, name: str(names[id] || f.chatName) || "이름 없는 채팅", parent: "", children: [], forkAt: -1,
      turns: relmapTurns(f).length, updatedAt: Number(f.updatedAt) || 0, current: id === str(current),
      people: (map.nodes ?? []).map((n) => ({ id: n.id, name: n.name, aff: n.aff, records: n.records })),
      folder: f
    };
  }
  for (const f of list) {
    const n = byId[str(f.chatId)], p = parentIdOf(f, ids);
    if (!p) continue;
    // 고리(A→B→A)는 끊는다
    let up = p, loop = false; const seen = new Set([n.id]);
    while (up) { if (seen.has(up)) { loop = true; break; } seen.add(up); up = byId[up]?.parent ?? ""; }
    if (loop) continue;
    n.parent = p; n.forkAt = forkPointOf(f, byId[p].folder);
  }
  for (const n of Object.values(byId)) if (n.parent) byId[n.parent].children.push(n);
  const order = (a, b) => (a.forkAt - b.forkAt) || (a.updatedAt - b.updatedAt) || a.name.localeCompare(b.name, "ko");
  for (const n of Object.values(byId)) n.children.sort(order);
  for (const n of Object.values(byId)) delete n.folder;
  const roots = Object.values(byId).filter((n) => !n.parent).sort((a, b) => (b.children.length - a.children.length) || (b.updatedAt - a.updatedAt));
  return { roots, byId, branched: Object.values(byId).some((n) => n.parent) };
}

// 나무를 줄 목록으로 편다(화면용). depth = 들여쓰기, last = 같은 부모의 마지막 자식인지, rails = 위쪽 조상 세로줄 여부.
export function flattenTree(roots) {
  const out = [];
  const walk = (n, depth, rails, last) => {
    out.push({ node: n, depth, rails, last });
    n.children.forEach((c, i) => walk(c, depth + 1, [...rails, depth > 0 && !last], i === n.children.length - 1));
  };
  roots.forEach((r) => walk(r, 0, [], true));
  return out;
}

// 두 갈래 비교: 양쪽 인물을 이름으로 맞춰 호감 차이를 낸다. 차이가 큰 순.
export function compareBranches(a, b) {
  const map = new Map();
  for (const p of a?.people ?? []) map.set(p.id, { id: p.id, name: p.name, a: p.aff, b: null });
  for (const p of b?.people ?? []) { const x = map.get(p.id) ?? { id: p.id, name: p.name, a: null, b: null }; x.b = p.aff; map.set(p.id, x); }
  return [...map.values()].map((x) => ({ ...x, diff: x.a != null && x.b != null ? x.b - x.a : null }))
    .sort((x, y) => ((y.diff == null ? -1 : Math.abs(y.diff)) - (x.diff == null ? -1 : Math.abs(x.diff))) || x.name.localeCompare(y.name, "ko"));
}
