// ProtLink+ 순수 로직: 파일 종류 분류 · 연결 후보 순위 · 변경 비교. api·화면 없음.
import { normalizeName } from "./match.js";
export const KIND_LABEL = Object.freeze({ character: "캐릭터", module: "모듈", plugin: "플러그인" });
export const KINDS = Object.freeze(["character", "module", "plugin"]);
const ext = (name) => (/\.([a-z0-9]+)$/i.exec(String(name ?? "")) ?? [])[1]?.toLowerCase() ?? "";
// 파일 하나가 어느 종류일 수 있는지(.json은 캐릭터 카드일 수도 모듈일 수도 있어 둘 다)
export function fileKinds(name) {
  const n = String(name ?? "").toLowerCase();
  if (/\.module\.charx$/.test(n) || /\.risum$/.test(n)) return ["module"];
  if (/\.(charx|png|jpe?g)$/.test(n)) return ["character"];
  if (/\.json$/.test(n)) return ["character", "module"];
  if (/\.js$/.test(n)) return ["plugin"];
  return [];
}
export const fitsKind = (name, kind) => fileKinds(name).includes(kind);
// 링크 안 파일들로 종류 짐작: 확실한 종류(json 제외) 중 가장 많은 것. 없으면 null
export function guessKind(files) {
  const count = { character: 0, module: 0, plugin: 0 };
  for (const f of files ?? []) { const k = fileKinds(f?.name); if (k.length === 1) count[k[0]]++; }
  const best = KINDS.filter((k) => count[k] > 0).sort((a, b) => count[b] - count[a] || KINDS.indexOf(a) - KINDS.indexOf(b))[0];
  return best ?? null;
}
const stem = (name) => String(name ?? "").replace(/\.module\.charx$/i, "").replace(/\.[a-z0-9]{1,6}$/i, "");
// 연결 후보 순위: 링크 이름·파일 이름과 항목 이름을 견줘 점수를 매긴다(이름이 같음 100 · 한쪽이 다른 쪽을 품음 70 · 앞부분이 겹침 30~50). 점수 0도 뒤에 붙인다.
export function rankTargets(hints, items) {
  const hs = [...new Set((hints ?? []).map((x) => normalizeName(stem(x))).filter((x) => x.length >= 1))];
  const out = (items ?? []).map((it) => {
    const n = normalizeName(it?.name);
    let score = 0, reason = "";
    for (const h of hs) {
      let s = 0, r = "";
      if (n && h === n) { s = 100; r = "이름이 같아요"; }
      else if (n && h && Math.min(n.length, h.length) >= 2 && (n.includes(h) || h.includes(n))) { s = 70; r = "이름이 비슷해요"; }
      else if (n && h) { let i = 0; while (i < n.length && i < h.length && n[i] === h[i]) i++; if (i >= 2 && i / Math.max(n.length, h.length) >= 0.5) { s = 30 + Math.round(20 * i / Math.max(n.length, h.length)); r = "이름 앞부분이 같아요"; } }
      if (s > score) { score = s; reason = r; }
    }
    return { ...it, score, reason };
  });
  return out.sort((a, b) => b.score - a.score || String(a.name ?? "").localeCompare(String(b.name ?? ""), "ko"));
}
export const SNAP_MAX = 2000;
export function snapshotOf(files) {
  return (files ?? []).slice(0, SNAP_MAX).map((f) => ({ uid: String(f.uid ?? ""), name: String(f.name ?? ""), path: Array.isArray(f.path) ? f.path.map(String) : [],
    ...(typeof f.size === "number" ? { size: f.size } : {}), ...(typeof f.modifiedAt === "number" ? { modifiedAt: f.modifiedAt } : {}) }));
}
const pathKey = (f) => `${(f.path ?? []).join("/")}/${f.name}`;
// 이전 목록과 지금 목록 비교: 새 파일(added) · 바뀐 파일(changed: 같은 파일이 다시 올라옴) · 사라진 파일(removed)
export function diffSnapshots(oldSnap, nowSnap) {
  const olds = oldSnap ?? [], nows = nowSnap ?? [];
  const byUid = new Map(olds.map((f) => [f.uid, f])), byPath = new Map(olds.map((f) => [pathKey(f), f]));
  const added = [], changed = [], seen = new Set();
  for (const f of nows) {
    const same = byUid.get(f.uid);
    if (same) { seen.add(same); if (same.size !== f.size || same.modifiedAt !== f.modifiedAt || same.name !== f.name) changed.push(f); continue; }
    const p = byPath.get(pathKey(f));
    if (p && !seen.has(p)) { seen.add(p); changed.push(f); continue; }   // 같은 자리에 같은 이름으로 다시 올라옴(uid만 바뀜)
    added.push(f);
  }
  const removed = olds.filter((f) => !seen.has(f) && !nows.some((x) => x.uid === f.uid));
  return { added, changed, removed };
}
// 연결한 종류에 맞는 파일만 · 새 것 먼저
export function fitFiles(files, kind) {
  return (files ?? []).filter((f) => fitsKind(f.name, kind)).sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
}
export function pendingOf(diff, kind) {
  return fitFiles([...(diff?.changed ?? []), ...(diff?.added ?? [])], kind);
}
export const fmtBytes = (n) => (n == null ? "" : n < 1024 ? `${n}B` : n < 1048576 ? `${(n / 1024).toFixed(1)}KB` : `${(n / 1048576).toFixed(1)}MB`);
// 리스 화면 밖에 띄울 알림 문구: ‘캐릭터 시로코 · 모듈 A · 플러그인 B 외 2개’
export function updateMessage(rows, max = 3) {
  const list = (rows ?? []).filter((r) => r?.update);
  if (!list.length) return "";
  const parts = list.slice(0, max).map((r) => `${KIND_LABEL[r.kind] ?? ""} ${r.target?.name || r.name}`.trim());
  return `새 업데이트가 있어요: ${parts.join(" · ")}${list.length > max ? ` 외 ${list.length - max}개` : ""}`;
}
