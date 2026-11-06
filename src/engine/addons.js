// 애드온 순수 로직(2.0.0 시험): 목록(manifest) 검사 · 버전 비교 · 업데이트 고르기. 브라우저·api 없이 테스트한다.
// manifest 모양: { format: 1, addons: [{ id, name, version, minCore, url, sha256, size, desc, hooks }] }
// 설치 기록(index): { [id]: { version, sha256, on, prev?: { version, sha256 }, at } }
export const ADDON_FORMAT = 1;
const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const VER = /^\d+\.\d+\.\d+$/;
const HEX = /^[a-f0-9]{64}$/;

export function cmpVer(a, b) {
  const x = String(a ?? "0.0.0").split(".").map(Number), y = String(b ?? "0.0.0").split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}

// 잘못된 항목은 버리고 이유를 모아 돌려준다. 주소는 https만.
export function parseManifest(raw) {
  let m = raw;
  if (typeof raw === "string") { try { m = JSON.parse(raw); } catch { return { addons: [], errors: ["목록을 읽을 수 없어요"] }; } }
  if (!m || m.format !== ADDON_FORMAT || !Array.isArray(m.addons)) return { addons: [], errors: ["목록 형식이 달라요"] };
  const addons = [], errors = [], ids = new Set();
  for (const a of m.addons) {
    const bad = !a || !ID.test(a.id ?? "") ? "id" : !VER.test(a.version ?? "") ? "version" : !HEX.test(a.sha256 ?? "") ? "sha256" : !/^https:\/\//.test(a.url ?? "") ? "url" : a.minCore && !VER.test(a.minCore) ? "minCore" : ids.has(a.id) ? "중복 id" : "";
    if (bad) { errors.push(`${a?.id ?? "?"}: ${bad}`); continue; }
    ids.add(a.id);
    addons.push({ id: a.id, name: String(a.name || a.id), version: a.version, minCore: a.minCore || "0.0.0", url: a.url, sha256: a.sha256, size: Number(a.size) || 0, desc: String(a.desc ?? ""), hooks: !!a.hooks, requires: Array.isArray(a.requires) ? a.requires.filter((r) => ID.test(String(r)) && r !== a.id) : [] });
  }
  return { addons, errors };
}

// 필요 애드온(requires)까지 포함해 받을 순서(먼저 받을 것부터). 목록에 없는 필요 애드온은 missing으로.
export function installOrder(id, addons) {
  const by = new Map(addons.map((a) => [a.id, a])), out = [], seen = new Set(), missing = [];
  const visit = (x, stack = new Set()) => {
    if (seen.has(x) || stack.has(x)) return;
    const a = by.get(x); if (!a) { missing.push(x); return; }
    stack.add(x); for (const r of a.requires ?? []) visit(r, stack); stack.delete(x);
    seen.add(x); out.push(x);
  };
  visit(id);
  return { order: out, missing };
}
// 켜 둔 애드온을 시작할 순서: 필요 애드온이 먼저. requiresOf(id) → 필요 id 목록(모르면 [])
export function bootOrder(ids, requiresOf = () => []) {
  const set = new Set(ids), out = [], seen = new Set();
  const visit = (x, stack = new Set()) => { if (seen.has(x) || stack.has(x) || !set.has(x)) return; stack.add(x); for (const r of requiresOf(x) ?? []) visit(r, stack); stack.delete(x); seen.add(x); out.push(x); };
  for (const x of ids) visit(x);
  return out;
}

// 코어 버전으로 쓸 수 있는가
export const fitsCore = (a, core) => cmpVer(core, a.minCore) >= 0;

// 설치된 것 중 새 버전이 있고 코어 조건을 맞는 것 → 받을 목록. 코어가 낮으면 held(미룸)로.
export function pickUpdates(index, addons, core) {
  const updates = [], held = [];
  for (const a of addons) {
    const cur = index?.[a.id];
    if (!cur || cmpVer(a.version, cur.version) <= 0) continue;
    (fitsCore(a, core) ? updates : held).push(a);
  }
  return { updates, held };
}

// 화면용 한 줄 상태
export function rowState(a, cur, core) {
  if (!cur) return fitsCore(a, core) ? "available" : "needs-core";
  if (cmpVer(a.version, cur.version) > 0) return fitsCore(a, core) ? "update" : "needs-core";
  return cur.on === false ? "off" : "installed";
}
