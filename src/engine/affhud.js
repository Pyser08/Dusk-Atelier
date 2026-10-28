// 호감도 HUD 프리셋(순수): 배경 HTML 조각·기본 변수 설치/제거, 리스폿 수치 읽기, 자체 보조모델(B) 프롬프트·결과 처리.
// 값 출처: A = 리스폿 affinity.score 동기화, B = 자체 보조모델. 둘 다 같은 채팅 변수($aff, $aff_d, $aff_min, $aff_max)에 쓴다.
import { parseVars, serializeVars } from "./vars.js";

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
export function installHud(ch, { min = AFF_DEFAULTS.min, max = AFF_DEFAULTS.max, start = AFF_DEFAULTS.start } = {}) {
  const rows = parseVars(ch?.defaultVariables);
  const want = { aff: String(start), aff_d: "0", aff_min: String(min), aff_max: String(max) };
  for (const [k, v] of Object.entries(want)) {
    const r = rows.find((x) => x.k === k);
    if (!r) rows.push({ k, v });
    else if (k === "aff_min" || k === "aff_max") r.v = v;
  }
  const base = strip(ch?.backgroundHTML);
  return { ...ch, backgroundHTML: (base ? base + "\n" : "") + hudHtml(), defaultVariables: serializeVars(rows) };
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
export function buildAffMessages({ charName, userName = "사용자", recent, value, min, max, step }) {
  const chat = recent.map((m) => `${m.user ? userName : charName}: ${m.text}`).join("\n\n");
  return [
    { role: "system", content: `너는 롤플레이 호감도 기록자다. ${charName}가 ${userName}에게 느끼는 호감이 마지막 ${charName} 응답에서 얼마나 바뀌었는지만 판정한다.\n- 현재 호감도 ${value} (범위 ${min}~${max}).\n- 변화량은 -${step}~+${step} 정수. 특별한 일이 없으면 0. 한 번에 크게 바꾸지 않는다.\n- 대사보다 행동과 관계 변화를 근거로 한다.\n- 출력은 JSON 하나만: {"delta": 정수, "reason": "15자 이내"}` },
    { role: "user", content: `[최근 대화]\n${chat}\n\n위 마지막 응답 기준으로 판정해줘.` }
  ];
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
