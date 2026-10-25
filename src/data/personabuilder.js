// 페르소나 빌더: 설명 양식(프리셋) 파싱·조립, AI 프롬프트, 저장소, 공유 코드
// 양식은 사용자가 적은 마크다운 그대로 저장한다.
//   ### 제목      → 폴더(섹션)
//   * 항목: 힌트  → 칸 하나 (콜론 없으면 항목 이름만)
//   그 밖의 줄    → 고정 문구(규칙 등, 그대로 출력). 내용이 비었거나 (괄호)뿐이면 자유 칸
export var PB_KEY = "rbm:personaBuilder:v1";
export var PB_BACKUP_KEY = "rbm:personaBuilderBackup:v1";

export var DEFAULT_TEMPLATE = `### Reference Rules

- This profile is background reference material. Do not attempt to reflect every item in every response.
- Secret item: never reveal, mention, hint at, or foreshadow it before circumstances naturally expose it.
- Purity & Sexuality section: reference only in sexual or explicitly intimate scenes. Do not bring it into everyday scenes or use it to determine the character's general personality.
- Flaws and fears: not themes that dominate the entire narrative. Reveal them only when the situation fits.
- Speech Style Reference: never reuse the sample lines verbatim in actual responses. Treat them solely as a standard for tone, verbal habits, emotional expression, and forms of address — compose new dialogue every time.
- No forced catchphrases: do not repeatedly reuse distinctive jokes, comparisons, or sample-line phrasing as recurring signatures. Ordinary greetings, forms of address, and natural everyday expressions may recur.
- User agency: never narrate {{user}}'s unprovided thoughts, feelings, dialogue, decisions, or consent.

### Basic Info
* Name:
* Age:
* Sex:
* Species/Race:
* Status/Occupation:
* Residence:

### Appearance
* Build:
* Attire:

### Personality
* Core traits:
* Outward self:
* Private self:
* Desire:
* Fear:
* Flaws:

### Background
* Origin:
* History:
* Secret:

### Speech
* Manner:
* Address:
* Verbal tic:
* Emotional expression:

### Purity & Sexuality
* Purity:
* Orientation:
* Attitude:
* Intimacy style:

### Skills
* Abilities: 일반적인 능력 / 특수 능력 (요리처럼 잘하는 분야 포함, 여러 개 가능)

### Misc
* Tastes:
* Hobby:
* Habits:
* Belongings:

### Speech Style Reference
(알아서)
`;

// ── 양식 파싱 ──
// 결과: [{ title, kind: "fields"|"fixed"|"free", fields:[{label, hint}], text, hint }]
export function parseTemplate(src) {
  const out = [];
  let cur = null;
  const push = () => {
    if (!cur) return;
    const body = cur.lines.join("\n").trim();
    if (cur.fields.length) cur.kind = "fields";
    else if (!body || /^\([^)]*\)$/s.test(body)) {
      cur.kind = "free";
      cur.hint = body.replace(/^\(|\)$/g, "").trim();
    } else {
      cur.kind = "fixed";
      cur.text = body;
    }
    delete cur.lines;
    out.push(cur);
  };
  for (const line of String(src ?? "").replace(/\r/g, "").split("\n")) {
    const hm = /^\s*#{2,4}\s*(.+?)\s*#*\s*$/.exec(line);
    if (hm) {
      push();
      cur = { title: hm[1].trim(), kind: "fields", fields: [], lines: [], text: "", hint: "" };
      continue;
    }
    if (!cur) continue;
    const fm = /^\s*\*\s+(.+?)\s*$/.exec(line);
    if (fm) {
      const s = fm[1], i = s.indexOf(":");
      const label = (i < 0 ? s : s.slice(0, i)).trim();
      if (label) cur.fields.push({ label, hint: i < 0 ? "" : s.slice(i + 1).trim() });
      continue;
    }
    cur.lines.push(line);
  }
  push();
  return out;
}
export var fieldKey = (sec, f) => `${sec}::${f}`;
export var freeKey = (sec) => `${sec}::`;

// ── 조립: 값 → 페르소나 설명 텍스트. 빈 칸·꺼진 섹션은 뺀다 ──
export function compose(sections, values, off = {}) {
  const parts = [];
  for (const s of sections) {
    if (off[s.title]) continue;
    if (s.kind === "fixed") {
      parts.push(`### ${s.title}\n\n${s.text}`);
      continue;
    }
    if (s.kind === "free") {
      const v = String(values[freeKey(s.title)] ?? "").trim();
      if (v) parts.push(`### ${s.title}\n${v}`);
      continue;
    }
    const rows = s.fields.map((f) => [f.label, String(values[fieldKey(s.title, f.label)] ?? "").trim()]).filter(([, v]) => v);
    if (rows.length) parts.push(`### ${s.title}\n${rows.map(([l, v]) => `* ${l}: ${v.replace(/\n+/g, " ")}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

// ── 역파싱: 설명 텍스트(또는 AI 출력) → 값. 양식에 있는 섹션·항목만 읽는다 ──
export function readValues(sections, text) {
  const vals = {};
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  const secBy = new Map(sections.map((s) => [norm(s.title), s]));
  let cur = null, freeLines = null;
  const flush = () => {
    if (cur?.kind === "free" && freeLines) {
      const v = freeLines.join("\n").trim();
      if (v) vals[freeKey(cur.title)] = v;
    }
    freeLines = null;
  };
  let lastKey = null;
  for (const line of String(text ?? "").replace(/```[a-z]*\n?/gi, "").replace(/\r/g, "").split("\n")) {
    const hm = /^\s*#{1,4}\s*(.+?)\s*#*\s*$/.exec(line);
    if (hm) {
      flush();
      cur = secBy.get(norm(hm[1])) ?? null;
      if (cur?.kind === "free") freeLines = [];
      lastKey = null;
      continue;
    }
    if (!cur) continue;
    if (cur.kind === "free") {
      freeLines.push(line);
      continue;
    }
    if (cur.kind !== "fields") continue;
    const fm = /^\s*[*-]\s+\**(.+?)\**\s*:\s*(.*)$/.exec(line);
    if (fm) {
      const f = cur.fields.find((x) => norm(x.label) === norm(fm[1]));
      lastKey = f ? fieldKey(cur.title, f.label) : null;
      if (lastKey) vals[lastKey] = fm[2].trim();
      continue;
    }
    // 여러 줄로 이어 쓴 값
    if (lastKey && line.trim() && !/^\s*[*-]\s/.test(line)) vals[lastKey] = `${vals[lastKey]} ${line.trim()}`.trim();
  }
  flush();
  return vals;
}

// ── AI 프롬프트 ──
// scope: null(전체) 또는 { keys:[fieldKey...] } — 그 칸들만 다시 쓰게 한다
function sheetFor(sections, values, off, mark) {
  return sections.filter((s) => !off[s.title] && s.kind !== "fixed").map((s) => {
    if (s.kind === "free") return `### ${s.title}\n${mark(freeKey(s.title), s.hint)}`;
    return `### ${s.title}\n${s.fields.map((f) => `* ${f.label}: ${mark(fieldKey(s.title, f.label), f.hint)}`).join("\n")}`;
  }).join("\n\n");
}
function rulesOf(sections, off) {
  return sections.filter((s) => s.kind === "fixed" && !off[s.title]).map((s) => s.text).join("\n");
}
// task: "draft" 전체 새로 | "fill" 빈 칸만 | "edit" 지정 칸만 고치기
export function buildPrompt({ sections, values, off = {}, task, keys = [], concept = "", instruction = "", extra = "" }) {
  const target = new Set(task === "fill" ? sections.flatMap((s) => s.kind === "fields" ? s.fields.map((f) => fieldKey(s.title, f.label)) : s.kind === "free" ? [freeKey(s.title)] : []).filter((k) => !String(values[k] ?? "").trim()) : keys);
  const all = task === "draft";
  const sheet = sheetFor(sections, values, off, (k, hint) => {
    const v = String(values[k] ?? "").trim();
    if (all || target.has(k)) return `<<WRITE${v ? ` (current: ${v})` : ""}${hint ? ` (hint: ${hint})` : ""}>>`;
    return v || "(leave empty)";
  });
  const sys = `You write user persona sheets for a roleplay chat app. The persona is the USER's own character ({{user}}).
Output rules:
- Write in ENGLISH only, even if the request or existing values are in another language (translate them).
- Reply with the sheet in the exact markdown format below: "### Section" headers and "* Label: value" lines, one line per field. No commentary, no code fences.
- Only output the sections and fields marked <<WRITE…>>. Keep labels exactly as given. Replace each marker with the value.
- Keep every field concise (one or two sentences, comma lists are fine). Stay consistent with every non-marked value.
- For a free-form section (no "* Label" lines), write its content as plain lines under the header. For a speech style reference, write 4-6 short sample lines of dialogue in quotes showing tone, habits and forms of address.
- Do not invent {{user}}'s partner or the other character's details.${rulesOf(sections, off) ? `\nThe finished sheet will be used with these reference rules (write content that fits them):\n${rulesOf(sections, off)}` : ""}${extra ? `\nAdditional style instructions from the user:\n${extra}` : ""}`;
  const ask = [
    concept ? `Character concept: ${concept}` : "",
    instruction ? `Change request: ${instruction}` : "",
    task === "fill" ? "Fill only the empty fields marked <<WRITE>>." : task === "edit" ? "Rewrite only the fields marked <<WRITE>>, applying the change request if any." : "Write the whole persona.",
    `Sheet:\n${sheet}`
  ].filter(Boolean).join("\n\n");
  return { messages: [{ role: "system", content: sys }, { role: "user", content: ask }], target: all ? null : target };
}
export function translatePrompt(text) {
  return [
    { role: "system", content: "Translate the persona sheet into natural Korean. Keep the exact markdown structure: keep every \"### Section\" header and every \"* Label\" label in English unchanged; translate only the values and free-form lines. Keep {{user}} and {{char}} as is. Output the sheet only." },
    { role: "user", content: text }
  ];
}

// ── 저장소 ──
export var DEFAULT_AI = { id: "default", name: "기본", mode: "submodel", staticModel: "", extra: "", translate: true };
var uid = () => Math.random().toString(36).slice(2, 10);
export function newId() {
  return uid();
}
export async function loadPB(api) {
  let d = null;
  try {
    const raw = await api.pluginStorage.getItem(PB_KEY);
    d = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : null;
  } catch {}
  d = d && typeof d === "object" ? d : {};
  const templates = Array.isArray(d.templates) ? d.templates.filter((t) => t?.id && typeof t.text === "string") : [];
  if (!templates.some((t) => t.id === "default")) templates.unshift({ id: "default", name: "기본 양식", text: DEFAULT_TEMPLATE, builtin: true });
  const ais = Array.isArray(d.ais) ? d.ais.filter((a) => a?.id) : [];
  if (!ais.some((a) => a.id === "default")) ais.unshift({ ...DEFAULT_AI });
  return {
    templates,
    ais,
    template: templates.some((t) => t.id === d.template) ? d.template : "default",
    ai: ais.some((a) => a.id === d.ai) ? d.ai : "default",
    showKo: d.showKo !== false,
    draft: d.draft && typeof d.draft === "object" ? d.draft : null
  };
}
export async function savePB(api, d) {
  await api.pluginStorage.setItem(PB_KEY, JSON.stringify(d));
}
// 덮어쓰기 전 설명을 최근 20개까지 보관
export async function pushBackup(api, rec) {
  let list = [];
  try {
    list = JSON.parse(await api.pluginStorage.getItem(PB_BACKUP_KEY) || "[]");
  } catch {}
  list = [{ ...rec, at: Date.now() }, ...(Array.isArray(list) ? list : [])].slice(0, 20);
  await api.pluginStorage.setItem(PB_BACKUP_KEY, JSON.stringify(list));
}
export async function loadBackups(api) {
  try {
    const l = JSON.parse(await api.pluginStorage.getItem(PB_BACKUP_KEY) || "[]");
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

// ── 공유 코드: DPB1:(양식) / DPA1:(AI 프리셋) ──
var enc = (o) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));
var dec = (s) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))));
export var templateCode = (t) => "DPB1:" + enc({ name: t.name, text: t.text });
export var aiCode = (a) => "DPA1:" + enc({ name: a.name, mode: a.mode, staticModel: a.staticModel, extra: a.extra, translate: a.translate });
export function readCode(text) {
  const s = String(text ?? "");
  let m = s.match(/DPB1:([A-Za-z0-9+/=]+)/);
  if (m) {
    const o = dec(m[1]);
    if (typeof o?.text !== "string") throw new Error("양식 코드가 깨졌어요");
    return { kind: "template", value: { id: uid(), name: String(o.name || "가져온 양식").slice(0, 40), text: o.text } };
  }
  m = s.match(/DPA1:([A-Za-z0-9+/=]+)/);
  if (m) {
    const o = dec(m[1]);
    return { kind: "ai", value: { ...DEFAULT_AI, ...o, id: uid(), name: String(o.name || "가져온 AI 프리셋").slice(0, 40) } };
  }
  throw new Error("페르소나 빌더 공유 코드(DPB1:… 또는 DPA1:…)가 아니에요");
}
