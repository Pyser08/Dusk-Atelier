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
    addons.push({ id: a.id, name: String(a.name || a.id), version: a.version, minCore: a.minCore || "0.0.0", url: a.url, sha256: a.sha256, size: Number(a.size) || 0, desc: String(a.desc ?? ""), hooks: !!a.hooks, category: CAT_IDS.includes(a.category) && a.category !== "custom" ? a.category : "", requires: Array.isArray(a.requires) ? a.requires.filter((r) => ID.test(String(r)) && r !== a.id) : [] });
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

// ── 카테고리(2.1.0) ── 홈 애드온 상자에서 묶어 보여 줄 순서. 목록에 category가 없으면(예전 목록) id로 정한다.
export const ADDON_CATS = [
  { id: "memory", name: "기억" },
  { id: "make", name: "만들기" },
  { id: "manage", name: "관리" },
  { id: "look", name: "꾸미기" },
  { id: "lab", name: "실험" },
  { id: "etc", name: "기타" },
  { id: "custom", name: "커스텀 애드온" }
];
const CAT_IDS = ADDON_CATS.map((c) => c.id);
const CAT_OF = { memory: "memory", cards: "memory", erosync: "memory", aibuild: "make", chattheme: "make", manage: "manage", protlink: "manage", widgets: "look", stealth: "look", provider: "lab" };
export const categoryOf = (a) => (a?.custom ? "custom" : a?.category || CAT_OF[a?.id] || "etc");
// [{ cat, items }] — 빈 카테고리는 뺀다(커스텀은 keepCustom이면 비어도 남긴다: 불러오기 안내 자리)
export function groupByCategory(items, { keepCustom = false } = {}) {
  return ADDON_CATS.map((cat) => ({ cat, items: items.filter((a) => categoryOf(a) === cat.id) })).filter((g) => g.items.length || (keepCustom && g.cat.id === "custom"));
}

// ── 커스텀 애드온(2.1.0) ── 사용자가 파일로 불러온 애드온. 코드 맨 위 `export const meta = {...}`를 읽어 검사한다.
// meta: { id, name, version, desc?, author?, minCore?, requires? }   id는 영소문자·숫자·-(공식 애드온과 따로 저장)
export function parseCustomMeta(meta) {
  if (!meta || typeof meta !== "object") return { error: "meta가 없어요 — 파일 맨 위에 export const meta = { id, name, version }를 넣어 주세요" };
  const id = String(meta.id ?? "").trim();
  if (!ID.test(id)) return { error: "meta.id는 영어 소문자·숫자·-만 써요(예: my-addon)" };
  if (!VER.test(String(meta.version ?? ""))) return { error: "meta.version은 1.0.0 꼴이어야 해요" };
  if (meta.minCore && !VER.test(String(meta.minCore))) return { error: "meta.minCore는 2.1.0 꼴이어야 해요" };
  return { meta: {
    id, name: String(meta.name || id).slice(0, 60), version: String(meta.version), desc: String(meta.desc ?? "").slice(0, 300),
    author: String(meta.author ?? "").slice(0, 60), minCore: meta.minCore ? String(meta.minCore) : "0.0.0",
    requires: Array.isArray(meta.requires) ? meta.requires.filter((r) => ID.test(String(r))) : []
  } };
}
// AI 답이나 붙여 넣은 글에서 애드온 코드만 꺼낸다(```js 블록이 있으면 그 안, 없으면 글 전체)
export function extractAddonCode(text) {
  const t = String(text ?? "");
  const blocks = [...t.matchAll(/```(?:js|javascript|mjs)?[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const pick = blocks.find((b) => /export\s+(async\s+)?function\s+activate|export\s*\{[^}]*activate/.test(b)) ?? blocks[0] ?? t;
  return pick.trim() + "\n";
}
// 파일 이름: <id>-<버전>.dusk-addon.js
export const customFileName = (m) => `${m.id}-${m.version}.dusk-addon.js`;
