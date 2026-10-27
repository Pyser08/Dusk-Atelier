// 로어북 더스크화: 기존 로어북을 Dusk 폴더·소속·장소 구조로 바꾸는 계획을 만들고 적용한다 (순수 함수).
//   1) rulePlan  — `-- 이름 --` 구분선 항목을 규칙만으로 소속 폴더로 변환 (AI 불필요)
//   2) batchMessages / parseAnalysis / mergeAnalysis — AI가 소속·장소·이름 경계를 제안
//   3) applyPlan — 미리보기에서 체크한 것만 적용 (원본 배열은 건드리지 않고 새 배열을 돌려줌)
import { newId } from './util.js';
import { AFF_PREFIX, PLACE_PREFIX, defaultAff, defaultRule, folderIdOf, isAff, isFolder, isPlace, parentOf, ruleOf } from './lorerules.js';
import { parseLoose } from './card/prompt.js';

const DECO = "[-=─━═~*#_—–·•+<>]";
const DIVIDER = new RegExp(`^\\s*${DECO}{2,}\\s*(.+?)\\s*${DECO}{2,}\\s*$`);
const clean = (s) => String(s ?? "").trim();
const normName = (s) => clean(s).replace(/^\[(소속|장소)\]\s*/, "").replace(/\s+/g, "").toLowerCase();

// `-- 이름 --` 처럼 키·내용이 없는 구분선 항목이면 이름, 아니면 null
export function dividerName(e) {
  if (!e || isFolder(e) || isAff(e) || isPlace(e)) return null;
  if (clean(e.key) || clean(e.content) || e.alwaysActive) return null;
  const m = DIVIDER.exec(clean(e.comment));
  return m ? clean(m[1]) : null;
}

// 로어북이 바뀌었는지 확인하는 서명 (분석 뒤 편집하면 적용을 막는다)
export function sigOf(entries) {
  let h = 5381;
  const s = (entries ?? []).map((e) => `${e.comment}|${e.key}|${parentOf(e) ?? ""}|${folderIdOf(e) ?? ""}`).join("\n");
  for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
  return `${entries?.length ?? 0}:${h.toString(36)}`;
}

const emptyPlan = (entries) => ({ sig: sigOf(entries), affs: [], places: [], flags: [], notes: [] });
const isLeaf = (e) => e && !isFolder(e) && !isPlace(e) && !dividerName(e);

// ---------- 1) 규칙 기반: 구분선 → 소속 ----------
// 구분선 다음 항목들이 같은 폴더 안에서 다음 구분선 전까지 구성원이 된다.
export function rulePlan(entries) {
  const plan = emptyPlan(entries);
  const open = new Map();
  entries.forEach((e, i) => {
    const pk = parentOf(e) ?? "";
    const name = dividerName(e);
    if (name) {
      const g = { id: "d" + i, name, parent: null, members: [], dividerIdx: i, def: 100, max: "", prob: {}, src: "divider", checked: true };
      plan.affs.push(g);
      open.set(pk, g);
    } else if (isLeaf(e) && open.has(pk)) open.get(pk).members.push(i);
  });
  const empty = plan.affs.filter((a) => !a.members.length);
  if (empty.length) plan.notes.push(`구성원이 없는 구분선 ${empty.length}개는 건너뛰었어요: ${empty.slice(0, 5).map((a) => a.name).join(", ")}${empty.length > 5 ? " …" : ""}`);
  plan.affs = plan.affs.filter((a) => a.members.length);
  return plan;
}

// ---------- 2) AI 분석 ----------
const SYSTEM = [
  "You restructure a roleplay lorebook into affiliations (organizations / groups / schools / clubs), their members, and places.",
  "Each input line is `index | name | keys | snippet`. Reply with ONE JSON object and nothing else:",
  '{"affs":[{"name":"affiliation name","parent":"parent affiliation name or null","members":[index,...],"def":100,"max":null,"prob":{"index":percent}}],',
  ' "places":[{"i":index,"links":["affiliation name",...]}],',
  ' "newPlaces":[{"name":"place name","keys":"comma, separated, keys","links":["affiliation name"],"content":"one short line"}],',
  ' "whole":[index,...],',
  ' "common":[{"i":index,"keys":"the everyday-word key","words":"confirming words, comma separated"}]}',
  "Rules:",
  "- members are people/characters (never places or the affiliation's own info entry). An index may belong to only ONE affiliation; use `parent` to nest (e.g. a club inside a school).",
  "- def = default % chance a member is pulled in when the affiliation is active (key figures 100, minor 30-60). max = most members at once, or null for no limit. prob overrides def per member.",
  "- places = entries that are locations (classrooms, streets, buildings). links = affiliations that use them.",
  "- newPlaces = locations clearly implied by the text but missing as entries; keep few and concrete.",
  "- whole = entries whose name is a substring of another entry's name or a common syllable run (e.g. 히나 vs 히나타), so they must match as whole words.",
  "- common = entries whose key is an ordinary word (하늘, 유리, 보라) that appears in normal sentences.",
  "- Use only the given indices. Omit anything you are unsure about. Keep names in the lorebook's own language."
].join("\n");

const snip = (s, n) => clean(s).replace(/\s+/g, " ").slice(0, n);

// 한 번에 보낼 항목 번호 묶음 (기본 120개씩)
export function batches(entries, size = 120) {
  const idx = [];
  entries.forEach((e, i) => { if (isLeaf(e) || isPlace(e)) idx.push(i); });
  const out = [];
  for (let i = 0; i < idx.length; i += size) out.push(idx.slice(i, i + size));
  return out;
}

export function batchMessages(entries, plan, indices, { instruction = "" } = {}) {
  const lines = indices.map((i) => `${i} | ${snip(entries[i].comment, 40)} | ${snip(entries[i].key, 40)} | ${snip(entries[i].content, 60)}`);
  const known = plan.affs.map((a) => `${a.name}${a.parent ? ` (in ${plan.affs.find((x) => x.id === a.parent)?.name ?? "?"})` : ""}`);
  const user = [
    known.length ? `Affiliations already known (reuse these exact names; do not repeat their members):\n${known.join("\n")}` : "",
    instruction ? `Extra instruction from the user: ${instruction}` : "",
    "Entries:",
    lines.join("\n")
  ].filter(Boolean).join("\n\n");
  return [{ role: "system", content: SYSTEM }, { role: "user", content: user }];
}

const pct = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : d; };

// AI 답을 검증해서 정리된 형태로 (번호는 이번 묶음 안에서만 허용)
export function parseAnalysis(raw, entries, indices) {
  const o = parseLoose(raw);
  const ok = new Set(indices);
  const idx = (v) => { const n = Number(v); return Number.isInteger(n) && ok.has(n) ? n : null; };
  const list = (v) => (Array.isArray(v) ? v : []);
  return {
    affs: list(o.affs).map((a) => ({
      name: clean(a?.name),
      parent: clean(a?.parent) || null,
      members: [...new Set(list(a?.members).map(idx).filter((n) => n !== null))],
      def: pct(a?.def, 100),
      max: a?.max === null || a?.max === "" || a?.max === void 0 ? "" : Math.max(1, Math.round(Number(a.max)) || 1),
      prob: Object.fromEntries(Object.entries(a?.prob ?? {}).map(([k, v]) => [idx(k), pct(v, 100)]).filter(([k]) => k !== null))
    })).filter((a) => a.name && a.members.length),
    places: list(o.places).map((p) => ({ i: idx(p?.i), links: list(p?.links).map(clean).filter(Boolean) })).filter((p) => p.i !== null),
    newPlaces: list(o.newPlaces).map((p) => ({ name: clean(p?.name), keys: clean(p?.keys), links: list(p?.links).map(clean).filter(Boolean), content: clean(p?.content) })).filter((p) => p.name),
    whole: [...new Set(list(o.whole).map(idx).filter((n) => n !== null))],
    common: list(o.common).map((c) => ({ i: idx(c?.i), keys: clean(c?.keys), words: clean(c?.words) })).filter((c) => c.i !== null)
  };
}

// 묶음 결과를 계획에 합친다. 같은 이름의 소속은 합치고, 이미 다른 소속에 들어간 항목은 건드리지 않는다.
export function mergeAnalysis(plan, parsed, entries) {
  const owner = new Map();
  for (const a of plan.affs) for (const m of a.members) owner.set(m, a);
  const byName = new Map(plan.affs.map((a) => [normName(a.name), a]));
  const pending = [];
  let n = plan.affs.length;
  for (const pa of parsed.affs) {
    let aff = byName.get(normName(pa.name));
    if (!aff) {
      aff = { id: "a" + (n++), name: pa.name, parent: null, members: [], def: pa.def, max: pa.max, prob: {}, src: "ai", checked: true };
      plan.affs.push(aff);
      byName.set(normName(pa.name), aff);
    }
    if (pa.parent) pending.push([aff, pa.parent]);
    for (const m of pa.members) {
      const cur = owner.get(m);
      if (cur && cur !== aff) { plan.notes.push(`'${entries[m].comment}'은(는) 이미 '${cur.name}' 소속이라 '${aff.name}'에는 넣지 않았어요`); continue; }
      if (!cur) { aff.members.push(m); owner.set(m, aff); }
      if (pa.prob[m] !== void 0) aff.prob[m] = pa.prob[m];
    }
  }
  for (const [aff, pname] of pending) {
    const p = byName.get(normName(pname));
    if (p && p !== aff && !createsLoop(plan, aff, p)) aff.parent = p.id;
  }
  const linkIds = (names) => [...new Set(names.map((x) => byName.get(normName(x))?.id).filter(Boolean))];
  for (const p of parsed.places) {
    if (plan.places.some((x) => x.idx === p.i)) continue;
    plan.places.push({ id: "p" + plan.places.length, idx: p.i, links: linkIds(p.links), src: "ai", checked: true });
  }
  for (const p of parsed.newPlaces) {
    if (plan.places.some((x) => x.idx === void 0 && normName(x.name) === normName(p.name))) continue;
    if (entries.some((e) => normName(e.comment) === normName(p.name))) continue;
    plan.places.push({ id: "p" + plan.places.length, name: p.name, keys: p.keys || p.name, content: p.content, links: linkIds(p.links), src: "ai", checked: true });
  }
  const flag = (i) => plan.flags.find((f) => f.idx === i) ?? (plan.flags.push({ idx: i, checked: true }), plan.flags[plan.flags.length - 1]);
  for (const i of parsed.whole) flag(i).whole = true;
  for (const c of parsed.common) Object.assign(flag(c.i), { common: true, keys: c.keys, words: c.words });
  return plan;
}

function createsLoop(plan, aff, parent) {
  for (let p = parent, k = 0; p && k < 50; k++) {
    if (p === aff) return true;
    p = plan.affs.find((x) => x.id === p.parent);
  }
  return false;
}

// ---------- 3) 적용 ----------
const newAffEntry = (name, def) => {
  const rid = newId();
  return { key: "", secondkey: "", insertorder: 100, comment: AFF_PREFIX + name, content: "", mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { da_rid: rid, da_rule: { ...defaultRule(), on: true }, da_folder: { id: newId(), aff: { ...defaultAff(), def } } } };
};
const setParentId = (e, id) => {
  e.extentions = { ...(e.extentions ?? {}) };
  delete e.folder;
  if (id) e.extentions.da_parent = id; else delete e.extentions.da_parent;
};
const withRule = (e, patch) => {
  e.extentions = { ...(e.extentions ?? {}) };
  e.extentions.da_rid ||= newId();
  e.extentions.da_rule = { ...(ruleOf(e) ?? defaultRule()), on: true, ...patch };
};

// 체크된 것만 적용. 결과 내용 머리(@@activate·{{#if}})는 에디터의 syncRuleContent가 맞춘다.
export function applyPlan(entries, plan) {
  if (plan.sig !== sigOf(entries)) throw new Error("분석한 뒤 로어북이 바뀌었어요. 다시 분석해 주세요.");
  const out = structuredClone(entries);
  const on = plan.affs.filter((a) => a.checked);
  const folders = new Map();
  const sum = { affs: 0, members: 0, places: 0, newPlaces: 0, flags: 0, dividers: 0 };
  for (const a of on) {
    const f = newAffEntry(a.name, a.def);
    if (a.max !== "" && a.max != null) f.extentions.da_folder.aff.max = a.max;
    folders.set(a.id, f);
  }
  const folderId = (a) => folderIdOf(folders.get(a));
  const gone = new Set();
  const inserts = new Map();
  for (const a of on) {
    const f = folders.get(a.id);
    const pf = a.parent && folders.has(a.parent) ? a.parent : null;
    const at = a.dividerIdx ?? Math.min(...a.members);
    if (a.dividerIdx !== void 0) {
      // 구분선이 있던 자리·폴더를 그대로 물려받는다
      const d = entries[a.dividerIdx];
      if (d.folder) f.folder = d.folder;
      if (d.extentions?.da_parent) f.extentions.da_parent = d.extentions.da_parent;
      gone.add(a.dividerIdx);
      sum.dividers++;
    } else {
      const m0 = entries[at];
      if (m0?.folder) f.folder = m0.folder;
      if (m0?.extentions?.da_parent) f.extentions.da_parent = m0.extentions.da_parent;
    }
    if (pf) setParentId(f, folderId(pf));
    (inserts.get(at) ?? inserts.set(at, []).get(at)).push(f);
    for (const m of a.members) {
      setParentId(out[m], folderId(a.id));
      sum.members++;
    }
    sum.affs++;
  }
  // prob 키는 항목 식별자(da_rid)여야 하므로 구성원에 식별자를 먼저 준다
  for (const a of on) {
    const f = folders.get(a.id);
    const prob = {};
    for (const [m, p] of Object.entries(a.prob)) { withRule(out[m], {}); prob[out[m].extentions.da_rid] = p; }
    f.extentions.da_folder.aff.prob = prob;
  }
  const extra = [];
  for (const p of plan.places.filter((x) => x.checked)) {
    const links = p.links.filter((l) => folders.has(l)).map(folderId);
    if (p.idx !== void 0) {
      const e = out[p.idx];
      e.extentions = { ...(e.extentions ?? {}), da_place: { links } };
      if (!clean(e.comment).startsWith(PLACE_PREFIX)) e.comment = PLACE_PREFIX + clean(e.comment).replace(/^\[장소\]\s*/, "");
      withRule(e, {});
      sum.places++;
    } else {
      const rid = newId();
      const e = { key: p.keys, secondkey: "", insertorder: 100, comment: PLACE_PREFIX + p.name, content: p.content, mode: "normal", alwaysActive: false, selective: false, useRegex: false, extentions: { da_rid: rid, da_rule: { ...defaultRule(), on: true }, da_place: { links } } };
      if (links.length) setParentId(e, links[0]);
      extra.push(e);
      sum.newPlaces++;
    }
  }
  for (const f of plan.flags.filter((x) => x.checked)) {
    if (!out[f.idx]) continue;
    const patch = {};
    if (f.whole) patch.whole = true;
    if (f.common) Object.assign(patch, { common: true, commonKeys: f.keys ?? "", commonWords: f.words ?? "" });
    if (Object.keys(patch).length) { withRule(out[f.idx], patch); sum.flags++; }
  }
  const result = [];
  out.forEach((e, i) => {
    for (const f of inserts.get(i) ?? []) result.push(f);
    if (!gone.has(i)) result.push(e);
  });
  result.push(...extra);
  return { entries: result, summary: sum };
}

export const summaryText = (s) => [
  s.affs && `소속 ${s.affs}개`, s.members && `구성원 ${s.members}명`, s.places && `장소 ${s.places}개`,
  s.newPlaces && `새 장소 ${s.newPlaces}개`, s.flags && `이름 설정 ${s.flags}건`, s.dividers && `구분선 ${s.dividers}개 정리`
].filter(Boolean).join(" · ") || "바뀐 것 없음";
