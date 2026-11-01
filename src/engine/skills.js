// 스킬 라이브러리 (v1.8.1, 순수): cocoA(gent!) 스킬 형식과 호환. 세트(폴더 묶음) 안의 '<폴더>/SKILL.md'가 스킬이고,
// frontmatter의 주입 슬롯 글을 AI 호출의 프롬프트 뒤에 덧붙인다. 추가 호출 없음 — 기존 호출의 글만 늘린다.
// 형식 규격만 따르고 코드는 새로 작성했다. 스킬이 0개면 결과는 원문과 바이트 동일.

export const SKILL_LIMITS = Object.freeze({
  sets: 24, filesPerSet: 64, fileChars: 24000, setChars: 200000, libraryChars: 600000,
  pathChars: 160, indexDesc: 400, zipEntries: 200, field: 50000, total: 150000, defaultOrder: 100,
});
export const SKILL_MD = "SKILL.md";
export const SKILL_OPEN = "[Skill Injection:";
export const SKILL_CLOSE = "[/Skill Injection]";
export const SKILL_SET_KIND = "cocoagent.skill-set";
export const SKILL_LIB_KIND = "cocoagent.skill-library";
const KIND_ALIAS = { "risu-agents.skill-set": SKILL_SET_KIND, "risu-agents.skill-library": SKILL_LIB_KIND };

// id=조립 슬롯, key=frontmatter 키(주입 마커에 찍힘), label=설명용
export const SKILL_SLOTS = [
  { id: "systemPrompt", key: "system_prompt", label: "System Rules" },
  { id: "outputInstruction", key: "output_instruction", label: "Agent Instruction" },
  { id: "outputFormat", key: "output_format", label: "Output Guideline" },
  { id: "checklist", key: "checklist", label: "Completion Checklist" },
  { id: "selfCheck", key: "self_check", label: "Self-Review" },
  { id: "memoryInstruction", key: "memory_instruction", label: "Memory Instruction" },
  { id: "memoryFormat", key: "memory_format", label: "Memory Structure" },
];

export function skillExportKind(raw) { const k = String(raw || ""); return KIND_ALIAS[k] || k; }

export function normalizeSkillPath(raw) {
  const path = String(raw || "").replace(/\\/g, "/").split("/").map((s) => s.trim()).filter((s) => s && s !== "." && s !== "..").join("/");
  return !path || path.length > SKILL_LIMITS.pathChars ? "" : path;
}

const FM = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function fold(lines) {
  let out = "";
  for (const l of lines) {
    if (!l.trim()) { out += "\n"; continue; }
    out += (out && !out.endsWith("\n") ? " " : "") + l.trim();
  }
  return out;
}

// '---' 블록의 key: value 와 블록 스칼라(| >)를 읽는다. 깨져도 본문 전체를 body로 돌려준다(실패 모드 없음).
export function parseSkillFrontmatter(text) {
  const src = String(text || "");
  const m = FM.exec(src);
  if (!m) return { meta: {}, body: src, hasFrontmatter: false };
  const meta = {}, lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let v = kv[2].trim();
    const blk = /^([|>])([-+]?)$/.exec(v);
    if (blk) {
      const got = []; let base = -1, j = i + 1;
      for (; j < lines.length; j++) {
        const raw = lines[j];
        if (!raw.trim()) { got.push(""); continue; }
        const ind = raw.length - raw.replace(/^[ \t]+/, "").length;
        if (ind === 0) break;
        if (base < 0) base = ind;
        if (ind < base) break;
        got.push(raw.slice(base));
      }
      while (got.length && !got[got.length - 1].trim()) got.pop();
      v = blk[1] === ">" ? fold(got) : got.join("\n");
      i = j - 1;
    } else if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    meta[kv[1].toLowerCase()] = v;
  }
  return { meta, body: src.slice(m[0].length), hasFrontmatter: true };
}

// 스킬 읽기 도구가 돌려줄 본문(주입 슬롯은 이미 프롬프트에 있으므로 걷어낸다).
export function skillReadBody(content) {
  const raw = String(content ?? ""), p = parseSkillFrontmatter(raw);
  if (!p.hasFrontmatter) return { text: raw, stripped: false, notice: "" };
  const inj = SKILL_SLOTS.filter((s) => String(p.meta[s.key] || "").trim());
  if (!inj.length) return { text: raw, stripped: false, notice: "" };
  return { text: p.body, stripped: true, notice: `[This skill also carries ${inj.length} instruction block(s) (${inj.map((s) => s.key).join(", ")}) that are already merged into your system prompt. They are omitted here so you do not read them twice.]` };
}
const readable = (c) => skillReadBody(c).text.length;

function truncBody(content) {
  const raw = String(content ?? ""), p = parseSkillFrontmatter(raw);
  if (!p.hasFrontmatter) return raw.slice(0, SKILL_LIMITS.fileChars);
  return p.body.length <= SKILL_LIMITS.fileChars ? raw : raw.slice(0, raw.length - p.body.length) + p.body.slice(0, SKILL_LIMITS.fileChars);
}

let seq = 0;
const newId = () => `skill-${Date.now().toString(36)}-${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function normalizeSkillSet(raw, index = 0, now = new Date().toISOString()) {
  const seen = new Set(), files = []; let total = 0;
  for (const f of Array.isArray(raw?.files) ? raw.files : []) {
    if (files.length >= SKILL_LIMITS.filesPerSet) break;
    const path = normalizeSkillPath(f?.path);
    if (!path || seen.has(path.toLowerCase())) continue;
    const content = truncBody(String(f?.content ?? ""));
    const n = readable(content);
    if (total + n > SKILL_LIMITS.setChars) continue;
    seen.add(path.toLowerCase()); total += n; files.push({ path, content });
  }
  const fb = `스킬 세트 ${index + 1}`;
  return {
    id: String(raw?.id || newId()),
    name: String(raw?.name || fb).trim().slice(0, 80) || fb,
    description: String(raw?.description || "").slice(0, 400),
    files, createdAt: String(raw?.createdAt || now), updatedAt: String(raw?.updatedAt || now),
  };
}

export function normalizeSkillLibrary(raw) {
  const sets = (Array.isArray(raw?.sets) ? raw.sets : []).slice(0, SKILL_LIMITS.sets).map((s, i) => normalizeSkillSet(s, i));
  const used = new Set();
  for (const s of sets) { // 이름은 참조 키라 중복 불가
    let name = s.name, n = 2;
    while (used.has(name.toLowerCase())) name = `${s.name} (${n++})`;
    s.name = name; used.add(name.toLowerCase());
  }
  return { version: 1, sets };
}

export function skillLibraryChars(lib) {
  return (lib?.sets || []).reduce((a, s) => a + (s.files || []).reduce((b, f) => b + f.path.length + readable(f.content), 0), 0);
}

// 세트 안에서 '<폴더>/SKILL.md'를 가진 최상위 폴더만 스킬. 모델이 보는 경로는 '<세트명>/<폴더>'.
export function buildSkillIndex(sets) {
  const out = [];
  for (const set of sets || []) {
    const folders = new Map();
    for (const f of set.files || []) {
      const i = f.path.indexOf("/");
      if (i <= 0) continue;
      const folder = f.path.slice(0, i);
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder).push(f);
    }
    folders.forEach((files, folder) => {
      const entry = files.find((f) => f.path === `${folder}/${SKILL_MD}`);
      if (!entry) return;
      const { meta, body } = parseSkillFrontmatter(entry.content);
      const fb = body.split(/\r?\n/).map((l) => l.replace(/^#+\s*/, "").trim()).find(Boolean) || "(no description)";
      out.push({
        setId: set.id, setName: set.name, folder, ref: `${set.name}/${folder}`,
        name: String(meta.name || folder).trim() || folder,
        description: String(meta.description || fb).slice(0, SKILL_LIMITS.indexDesc),
        hasFrontmatter: Boolean(meta.name || meta.description), meta,
        entryPath: `${set.name}/${folder}/${SKILL_MD}`, files: files.map((f) => `${set.name}/${f.path}`).sort(),
      });
    });
  }
  return out;
}

// 호출 대상(agent = {skillSets:[{id,name}|문자열]})이 가리키는 세트. id 우선, 이름 보조.
export function normalizeSkillRefs(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : []).map((r) => ({ id: String(r?.id || ""), name: String(typeof r === "string" ? r : r?.name || "").trim() }))
    .filter((r) => { const k = `${r.id}|${r.name.toLowerCase()}`; if ((!r.id && !r.name) || seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, SKILL_LIMITS.sets);
}
export function resolveSkillSets(refs, lib) {
  const sets = lib?.sets || [], resolved = [], missing = [];
  for (const r of normalizeSkillRefs(refs)) {
    const hit = (r.id && sets.find((s) => s.id === r.id)) || (r.name && sets.find((s) => s.name.toLowerCase() === r.name.toLowerCase())) || null;
    if (hit && !resolved.includes(hit)) resolved.push(hit); else if (!hit) missing.push(r.name || r.id);
  }
  return { sets: resolved, missing };
}

function injectedText(set, skill, slot, warnings) {
  const file = String(skill.meta?.[`${slot.key}_file`] || "").trim();
  if (file) {
    const rel = normalizeSkillPath(`${skill.folder}/${file}`);
    const hit = (set?.files || []).find((f) => f.path === rel) || (set?.files || []).find((f) => f.path.toLowerCase() === rel.toLowerCase());
    if (!hit) { warnings.push(`${skill.ref}: ${slot.key}_file이 가리키는 ${file}를 찾지 못해 주입을 건너뜁니다`); return ""; }
    return hit.content;
  }
  return String(skill.meta?.[slot.key] || "");
}

export function emptyInjections() {
  const r = { chars: 0, skills: [], warnings: [] };
  for (const s of SKILL_SLOTS) r[s.id] = [];
  return r;
}

// 슬롯별 주입 목록(실행당 1회 계산). 순서: inject_order 오름차순 → ref 사전순. 상한 초과는 자르지 않고 통째로 건너뛴다.
export function resolveSkillInjections(refs, lib) {
  const res = emptyInjections();
  const { sets, missing } = resolveSkillSets(refs, lib);
  for (const n of missing) res.warnings.push(`할당된 스킬 세트를 찾지 못했습니다: ${n}`);
  if (!sets.length) return res;
  const byId = new Map(sets.map((s) => [s.id, s]));
  const entries = buildSkillIndex(sets).map((skill) => {
    const raw = String(skill.meta?.inject_order ?? "").trim();
    const order = raw && Number.isFinite(Number(raw)) ? Number(raw) : SKILL_LIMITS.defaultOrder;
    const items = []; let chars = 0;
    for (const slot of SKILL_SLOTS) {
      const text = injectedText(byId.get(skill.setId), skill, slot, res.warnings).trim();
      if (!text) continue;
      if (text.length > SKILL_LIMITS.field) { res.warnings.push(`${skill.ref}: ${slot.key}가 슬롯 상한 ${SKILL_LIMITS.field}자를 넘어(${text.length}자) 주입하지 않습니다`); continue; }
      items.push({ slotId: slot.id, field: slot.key, text }); chars += text.length;
    }
    return { skill, order, items, chars };
  }).filter((e) => e.items.length);
  entries.sort((a, b) => a.order - b.order || (a.skill.ref < b.skill.ref ? -1 : a.skill.ref > b.skill.ref ? 1 : 0));
  for (const e of entries) {
    if (res.chars + e.chars > SKILL_LIMITS.total) { res.warnings.push(`${e.skill.ref}: 주입 총량 ${SKILL_LIMITS.total}자를 넘어 이 스킬 전체를 건너뜁니다`); continue; }
    res.chars += e.chars;
    res.skills.push({ ref: e.skill.ref, name: e.skill.name, order: e.order, chars: e.chars });
    for (const it of e.items) res[it.slotId].push({ ref: e.skill.ref, skillName: e.skill.name, order: e.order, field: it.field, text: it.text });
  }
  return res;
}

function lastNum(text) {
  let last = 0;
  for (const l of String(text || "").split(/\r?\n/)) { const m = /^\s*(\d+)[.)]\s+/.exec(l); if (m) last = parseInt(m[1], 10) || last; }
  return last;
}
function renumber(text, start) {
  let n = Number(start) || 0;
  const out = String(text || "").split(/\r?\n/).map((l) => { const m = /^(\s*)(\d+)([.)]\s+)/.exec(l); if (!m) return l; n++; return `${m[1]}${n}${m[3]}${l.slice(m[0].length)}`; }).join("\n");
  return { text: out, next: n };
}

// base 글 + 스킬 주입. base는 절대 바꾸지 않고(append-only), 주입이 없으면 base 그대로.
export function composeSlot(slotId, baseText, inj) {
  const base = String(baseText ?? ""), items = Array.isArray(inj?.[slotId]) ? inj[slotId] : [];
  if (!items.length) return base;
  const field = SKILL_SLOTS.find((s) => s.id === slotId)?.key || slotId;
  let c = slotId === "checklist" ? lastNum(base) : 0;
  const blocks = items.map((it) => {
    let t = it.text;
    if (slotId === "checklist") { const r = renumber(t, c); t = r.text; c = r.next; }
    return `${SKILL_OPEN} ${it.ref} · ${field}]\n${t}\n${SKILL_CLOSE}`;
  });
  return base ? `${base}\n\n${blocks.join("\n\n")}` : blocks.join("\n\n");
}

// 주입 '내용' 지문 — 재사용 캐시 키에 섞어 스킬을 고치면 캐시가 무효화되게 한다.
export function skillInjectionSignature(inj) {
  if (!inj) return "";
  let a = 0x811c9dc5, b = 0x9e3779b1;
  const feed = (s) => { s = String(s); for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ c, 0x85ebca6b) >>> 0; b ^= b >>> 13; } a = Math.imul(a ^ 0xff, 0x01000193) >>> 0; };
  feed("skillInject");
  for (const s of SKILL_SLOTS) for (const it of inj[s.id] || []) { feed(s.key); feed(it.ref); feed(it.order); feed(it.text); }
  return a.toString(36) + b.toString(36);
}

// zip을 폴더째 압축해 래퍼 폴더가 하나 더 생긴 경우 벗긴다(그 폴더 자체가 스킬이면 유지).
export function unwrapSkillZipRoot(files) {
  if (!files.length) return files;
  const s = files[0].path.indexOf("/");
  if (s <= 0) return files;
  const root = files[0].path.slice(0, s + 1);
  if (!files.every((f) => f.path.startsWith(root))) return files;
  if (files.some((f) => f.path === `${root}${SKILL_MD}`)) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(root.length) })).filter((f) => f.path);
}

// zip 파일명이 곧 세트 이름: 끝의 버전 표기는 뗀다(nsfw_guide-v1.4.zip → nsfw_guide). skills2처럼 이름 자체의 숫자는 둔다.
export function skillSetNameFromFileName(fileName) {
  const base = String(fileName || "imported-skills").replace(/\.zip$/i, "").trim();
  const s = base.replace(/[ ._-]*[([]?\s*v\d+(?:\.\d+)*\s*[)\]]?$/i, "").replace(/[ ._-]\d+\.\d+(?:\.\d+)*$/, "").replace(/[ ._-]+$/, "").trim();
  return s || base;
}

// 읽어 온 zip 항목({path,bytes}) → 세트. 바이너리는 건너뛴다.
export function skillSetFromEntries(fileName, entries) {
  const warnings = [], dec = new TextDecoder("utf-8"), texts = [];
  for (const { path, bytes } of entries) {
    if (bytes.some((b) => b === 0)) { warnings.push(`${path}: 바이너리 파일이라 건너뜀`); continue; }
    const content = dec.decode(bytes);
    if (readable(content) > SKILL_LIMITS.fileChars) warnings.push(`${path}: 본문이 ${SKILL_LIMITS.fileChars}자로 잘림`);
    texts.push({ path: normalizeSkillPath(path), content });
  }
  const ok = texts.filter((t) => t.path);
  if (ok.length > SKILL_LIMITS.filesPerSet) warnings.push(`파일이 ${ok.length}개라 상한(${SKILL_LIMITS.filesPerSet}개)까지만 가져왔습니다.`);
  return { set: normalizeSkillSet({ name: skillSetNameFromFileName(fileName), files: unwrapSkillZipRoot(ok) }), warnings };
}

// 가져오기 적용: mode = new | overwrite | cancel
export function applySkillSetImport(lib, imported, mode) {
  const next = normalizeSkillLibrary(lib), set = normalizeSkillSet(imported, next.sets.length);
  if (mode === "cancel") return { library: next, setId: "", changed: false, mode };
  const hit = next.sets.find((s) => s.name.toLowerCase() === set.name.toLowerCase());
  if (mode === "overwrite" && hit) {
    hit.description = set.description || hit.description; hit.files = set.files; hit.updatedAt = new Date().toISOString();
    return { library: normalizeSkillLibrary(next), setId: hit.id, changed: true, mode };
  }
  if (next.sets.length >= SKILL_LIMITS.sets) return { library: next, setId: "", changed: false, mode: "new", error: `세트는 최대 ${SKILL_LIMITS.sets}개까지 만들 수 있습니다.` };
  next.sets.push(set);
  return { library: normalizeSkillLibrary(next), setId: set.id, changed: true, mode: "new" };
}

// 내보내기·가져오기(JSON). kind 별칭(risu-agents.*)도 받는다.
export function exportSkillSet(set) { return { kind: SKILL_SET_KIND, version: 1, set: normalizeSkillSet(set) }; }
export function exportSkillLibrary(lib) { return { kind: SKILL_LIB_KIND, version: 1, library: normalizeSkillLibrary(lib) }; }
export function parseSkillExport(raw) {
  let o = raw;
  if (typeof raw === "string") { try { o = JSON.parse(raw); } catch { return { error: "JSON이 아니에요." }; } }
  const kind = skillExportKind(o?.kind);
  if (kind === SKILL_SET_KIND && o.set) return { kind, set: normalizeSkillSet(o.set) };
  if (kind === SKILL_LIB_KIND && o.library) return { kind, library: normalizeSkillLibrary(o.library) };
  return { error: "스킬 세트/라이브러리 파일이 아니에요." };
}

// 진단: 스킬 폴더에 SKILL.md가 없거나, 주입 키가 있는데 skill_format: 2가 없거나, *_file이 깨진 경우.
export function diagnoseSkillSet(set) {
  const issues = [], idx = buildSkillIndex([set]), ok = new Set(idx.map((s) => s.folder));
  const folders = new Set((set.files || []).map((f) => f.path.indexOf("/") > 0 ? f.path.slice(0, f.path.indexOf("/")) : "").filter(Boolean));
  for (const f of folders) if (!ok.has(f)) issues.push({ level: "warn", folder: f, text: `${f}/에 ${SKILL_MD}가 없어 목록에서 빠져요` });
  for (const f of set.files || []) if (!f.path.includes("/")) issues.push({ level: "info", folder: "", text: `${f.path}: 세트 루트의 파일은 스킬로 잡히지 않아요` });
  for (const sk of idx) {
    const warnings = [];
    const hasInj = SKILL_SLOTS.some((s) => String(sk.meta[s.key] || "").trim() || String(sk.meta[`${s.key}_file`] || "").trim());
    if (hasInj && String(sk.meta.skill_format || "").trim() !== "2") issues.push({ level: "warn", folder: sk.folder, text: `${sk.ref}: skill_format: 2가 없어 주입이 무시될 수 있어요` });
    resolveSkillInjections([{ id: set.id }], { sets: [set] }).warnings.forEach((w) => { if (w.startsWith(sk.ref) && !warnings.includes(w)) warnings.push(w); });
    warnings.forEach((w) => issues.push({ level: "warn", folder: sk.folder, text: w }));
  }
  return issues;
}

// 폴더 이름 바꾸기: 하위 경로를 전부 다시 쓴다(한 파일이라도 빠지면 폴더가 쪼개진다). 충돌이면 null.
export function renameSkillFolder(set, from, to) {
  const f = normalizeSkillPath(from), t = normalizeSkillPath(to);
  if (!f || !t || t.includes("/") || f === t) return null;
  if ((set.files || []).some((x) => x.path.toLowerCase().startsWith(`${t.toLowerCase()}/`))) return null;
  return { ...set, files: set.files.map((x) => x.path.startsWith(`${f}/`) ? { ...x, path: `${t}/${x.path.slice(f.length + 1)}` } : x), updatedAt: new Date().toISOString() };
}

// 프리앰블에 실을 [Skills] 색인(에이전트가 보는 글). 도구를 쓰는 호출에서만 쓴다.
export function skillIndexText(sets) {
  const idx = buildSkillIndex(sets);
  if (!idx.length) return "";
  const lines = ["[Skills]", "The skills below are available. Each description says when to use it. When the current task matches one, read its SKILL.md with skill_read and follow its instructions before writing your output."];
  for (const s of idx) lines.push(`- ${s.name} (${s.entryPath}): ${s.description}`);
  return lines.join("\n");
}
