// 호감도 HUD 프리셋(순수): 배경 HTML 조각·기본 변수 설치/제거, 리스폿 수치 읽기, 자체 보조모델(B) 프롬프트·결과 처리.
// 값 출처: A = 리스폿 affinity.score 동기화, B = 자체 보조모델. 둘 다 같은 채팅 변수($aff, $aff_d, $aff_min, $aff_max)에 쓴다.
import { parseVars, serializeVars } from "./vars.js";
import { DESIGN_RETRY, DESIGN_SYSTEM, DESIGN_USER, JUDGE_SYSTEM, JUDGE_USER, fill } from "./affprompts.js";

export const MARK_A = "<!--DAFX-AFF-->", MARK_B = "<!--/DAFX-AFF-->";
export const AFF_DEFAULTS = { min: -100, max: 300, start: 0, step: 5 };
export const AFF_KEYS = ["aff", "aff_d", "aff_min", "aff_max"];

export function hudHtml() {
  return `${MARK_A}<style>
.dafx-aff{position:fixed;top:12px;right:12px;z-index:50;font:13px/1.3 system-ui,sans-serif;color:#eee}
.dafx-aff>summary{list-style:none;cursor:pointer;width:34px;height:34px;border-radius:50%;margin-left:auto;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(18,16,28,.78);border:1px solid rgba(160,140,255,.35);backdrop-filter:blur(6px)}
.dafx-aff>summary::-webkit-details-marker{display:none}
.dafx-aff[open]>summary{border-color:rgba(180,124,255,.9)}
.dafx-aff-card{margin-top:8px;display:flex;gap:10px;align-items:center;min-width:190px;padding:8px 12px 8px 8px;border-radius:14px;background:rgba(18,16,28,.85);border:1px solid rgba(160,140,255,.25);backdrop-filter:blur(6px)}
.dafx-aff-av{width:44px;height:44px;border-radius:50%;flex-shrink:0;background-size:cover;background-position:center 20%;border:2px solid rgba(160,140,255,.6)}
.dafx-aff-body{flex:1;min-width:0}
.dafx-aff-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.dafx-aff-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dafx-aff-d{font-size:12px;font-weight:700}
.dafx-aff-up{color:#7ee0a8}.dafx-aff-down{color:#ff8a9a}
.dafx-aff-bar{height:6px;margin-top:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.dafx-aff-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#5b8cff,#b47cff);transition:width .4s}
.dafx-aff-val{margin-top:3px;font-size:11px;opacity:.65}
@media (max-width:600px){.dafx-aff-card{min-width:150px}.dafx-aff-av{width:36px;height:36px}}
</style>
<details class="dafx-aff"><summary title="호감도">♡</summary><div class="dafx-aff-card"><div class="dafx-aff-av" style="background-image:url('{{source::char}}')"></div><div class="dafx-aff-body"><div class="dafx-aff-top"><span class="dafx-aff-name">{{char}}</span>{{#if {{greater::{{getvar::aff_d}}::0}}}}<span class="dafx-aff-d dafx-aff-up">▲ +{{getvar::aff_d}}</span>{{/if}}{{#if {{less::{{getvar::aff_d}}::0}}}}<span class="dafx-aff-d dafx-aff-down">▼ {{getvar::aff_d}}</span>{{/if}}</div><div class="dafx-aff-bar"><div class="dafx-aff-fill" style="width:clamp(0%,{{calc::({{getvar::aff}}-{{getvar::aff_min}})*100/({{getvar::aff_max}}-{{getvar::aff_min}})}}%,100%)"></div></div><div class="dafx-aff-val">호감도 {{getvar::aff}}</div></div></div></details>${MARK_B}`;
}

const strip = (html) => {
  const s = String(html ?? ""), a = s.indexOf(MARK_A), b = s.indexOf(MARK_B);
  return a >= 0 && b > a ? (s.slice(0, a) + s.slice(b + MARK_B.length)).trim() : s;
};
export const hasHud = (html) => String(html ?? "").includes(MARK_A);

// 캐릭터 객체에 HUD를 넣은 사본을 돌려준다. 이미 있으면 교체. 기본 변수는 없을 때만 채운다(사용자가 고친 값 보존).
export function installHud(ch, { min = AFF_DEFAULTS.min, max = AFF_DEFAULTS.max, start = AFF_DEFAULTS.start, html = "" } = {}) {
  const rows = parseVars(ch?.defaultVariables);
  const want = { aff: String(start), aff_d: "0", aff_min: String(min), aff_max: String(max) };
  for (const [k, v] of Object.entries(want)) {
    const r = rows.find((x) => x.k === k);
    if (!r) rows.push({ k, v });
    else if (k === "aff_min" || k === "aff_max") r.v = v;
  }
  const base = strip(ch?.backgroundHTML);
  return { ...ch, backgroundHTML: (base ? base + "\n" : "") + (html || hudHtml()), defaultVariables: serializeVars(rows) };
}
export function uninstallHud(ch) {
  const rows = parseVars(ch?.defaultVariables).filter((r) => !AFF_KEYS.includes(r.k));
  return { ...ch, backgroundHTML: strip(ch?.backgroundHTML), defaultVariables: serializeVars(rows) };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// 리스폿 위키에서 호감도 수치를 찾는다. 대상은 사용자에 대한 affinity.score. 캐릭터 이름과 맞는 문서를 먼저 고른다.
export function readPotAffinity(wiki, charName = "") {
  const docs = Array.isArray(wiki?.documents) ? wiki.documents : Object.values(wiki?.documents ?? wiki?.scope?.documents ?? {});
  const name = String(charName).trim().toLowerCase();
  const cands = [];
  for (const d of docs) for (const m of d?.metrics ?? []) {
    if (m?.slotId !== "affinity.score") continue;
    const toUser = !m.targetRefs?.length || m.targetRefs.includes("actor:user");
    const value = num(m.value);
    if (!toUser || value === null) continue;
    const names = [d.title, ...(d.aliases ?? [])].map((x) => String(x ?? "").toLowerCase());
    cands.push({ value, min: num(m.minimum), max: num(m.maximum), delta: num(m.lastDelta) ?? 0, match: !!name && names.includes(name), at: String(m.updatedAt ?? d.updatedAt ?? "") });
  }
  cands.sort((a, b) => Number(b.match) - Number(a.match) || b.at.localeCompare(a.at));
  return cands[0] ?? null;
}

// B: 자체 보조모델. 최근 대화와 현재 값을 주고 이번 응답의 변화량만 JSON으로 받는다.
export function buildAffMessages({ charName, userName = "사용자", recent, value, min, max, step, profile = "", note = "" }) {
  const chat = recent.map((m) => `${m.user ? userName : charName}: ${m.text}`).join("\n\n");
  const vars = { char: charName, user: userName, value, min, max, step, chat,
    profile: profile ? `\n[캐릭터 요약]\n${String(profile).slice(0, 600)}\n` : "",
    note: note ? `\n[이 봇의 호감 기준(작성자 지정, 우선 적용)]\n${String(note).slice(0, 400)}\n` : "" };
  return [{ role: "system", content: fill(JUDGE_SYSTEM, vars) }, { role: "user", content: fill(JUDGE_USER, vars) }];
}
export function parseDelta(text, step = AFF_DEFAULTS.step) {
  const m = String(text ?? "").match(/\{[\s\S]*?\}/);
  if (!m) return null;
  try {
    const n = num(JSON.parse(m[0]).delta);
    return n === null ? null : Math.max(-step, Math.min(step, Math.round(n)));
  } catch { return null; }
}
export const clampAff = (v, min, max) => Math.max(min, Math.min(max, v));

// ── AI 디자인 변경 ──
// 로직(변수·CBS 식·구조 태그)은 고정하고 CSS와 겉모습만 바꾸게 한다. 결과는 검사를 통과해야 쓸 수 있다.
export const REQUIRED = ["{{getvar::aff}}", "{{getvar::aff_d}}", "{{getvar::aff_min}}", "{{getvar::aff_max}}", "{{calc::", "{{source::char}}", "{{char}}", "<details", "<summary", ".dafx-aff"];
export const HTML_MAX = 12000;

export function designMessages({ request, current, charName = "캐릭터" }) {
  const macros = REQUIRED.filter((x) => x.startsWith("{{")).join(" ");
  return [
    { role: "system", content: fill(DESIGN_SYSTEM, { markA: MARK_A, markB: MARK_B, macros, max: HTML_MAX }) },
    { role: "user", content: fill(DESIGN_USER, { char: charName, request, current }) }
  ];
}
export const designRetry = (errors) => fill(DESIGN_RETRY, { errors: errors.join("\n- ") });
export function extractHud(text) {
  let t = String(text ?? "").trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "");
  const a = t.indexOf(MARK_A), b = t.lastIndexOf(MARK_B);
  return a >= 0 && b > a ? t.slice(a, b + MARK_B.length) : t;
}
export function validateHud(html) {
  const s = String(html ?? ""), errors = [];
  if (!s.startsWith(MARK_A) || !s.endsWith(MARK_B)) errors.push("시작·끝 표시가 없어요");
  for (const r of REQUIRED) if (!s.includes(r)) errors.push(`빠진 부분: ${r}`);
  if (!/\{\{#if \{\{greater::\{\{getvar::aff_d\}\}::0\}\}\}/.test(s) || !/\{\{#if \{\{less::\{\{getvar::aff_d\}\}::0\}\}\}/.test(s)) errors.push("증감(+/-) 표시 조건이 바뀌었어요");
  if (!/width:\s*clamp\(0%,\s*\{\{calc::/.test(s)) errors.push("게이지 폭 식이 바뀌었어요");
  if ((s.match(/\{\{#if /g) ?? []).length !== (s.match(/\{\{\/if\}\}/g) ?? []).length) errors.push("조건 짝이 맞지 않아요");
  if (/<\s*(script|iframe|object|embed|link|meta|form|input|base)\b/i.test(s)) errors.push("쓸 수 없는 태그가 있어요");
  if (/\son[a-z]+\s*=/i.test(s) || /javascript:/i.test(s)) errors.push("스크립트 속성이 있어요");
  if (/@import|url\(\s*['"]?\s*(https?:|\/\/|data:)|src\s*=\s*['"]?\s*(https?:|\/\/)/i.test(s)) errors.push("외부 주소를 쓸 수 없어요");
  if ((s.match(/<details\b/g) ?? []).length !== 1 || (s.match(/<\/details>/g) ?? []).length !== 1) errors.push("바깥 요소(details)는 하나여야 해요");
  if (s.length > HTML_MAX) errors.push(`너무 길어요 (${s.length}/${HTML_MAX}자)`);
  const bad = [...s.matchAll(/class\s*=\s*"([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c && !c.startsWith("dafx-"));
  if (bad.length) errors.push(`클래스는 dafx- 로 시작해야 해요: ${[...new Set(bad)].slice(0, 3).join(", ")}`);
  return { ok: !errors.length, errors };
}

// 미리보기용: CBS 식을 샘플 값으로 풀어 iframe에 넣을 문서를 만든다. (실제 리수 렌더링과 조금 다를 수 있다)
export function previewDoc(html, sample = {}) {
  const v = { char: "아루", aff: 148, aff_d: 3, aff_min: -100, aff_max: 300, ...sample };
  let s = String(html);
  s = s.replace(/\{\{source::char\}\}/g, "").replace(/\{\{char\}\}/g, v.char).replace(/\{\{getvar::(\w+)\}\}/g, (_, k) => v[k] ?? "null");
  for (let n = 0; n < 5; n++) s = s.replace(/\{\{calc::([^{}]*)\}\}/g, (_, e) => /^[\d\s+\-*/().]+$/.test(e) ? String(Math.round(Function(`return (${e.replace(/--/g, "+")})`)() * 100) / 100) : "0");
  s = s.replace(/\{\{#if \{\{(greater|less)::(-?[\d.]+)::(-?[\d.]+)\}\}\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, op, a, b, body) => (op === "greater" ? +a > +b : +a < +b) ? body : "");
  s = s.replace(/<summary/, "<summary").replace(/<details class="dafx-aff"/, '<details class="dafx-aff" open');
  return `<!doctype html><meta charset="utf-8"><body style="margin:0;height:140px;background:#0e0d16;color:#eee">${s}</body>`;
}
