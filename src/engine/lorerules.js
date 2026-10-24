// Dusk 로어북 규칙 (DA Lore Rules v1)
// 규칙은 각 로어북 항목의 extentions에 들어간다. 카드(.charx·PNG)와 .risum으로 내보내도 그대로 따라간다.
//   extentions.da_rid  : 항목 식별자 (연쇄·조건이 서로를 가리킬 때 씀. 이름이 바뀌어도 유지)
//   extentions.da_rule : 규칙 객체 (아래 defaultRule 모양)
// 동작 방식 (리스 엔진을 그대로 쓴다):
//   관리 항목의 내용은 '@@activate' + 'CBS 문' 모양으로 맞춘다.
//     @@activate
//     @@unrecursive
//     {{#if {{getvar::da_xxxx}}}}
//     본문 (작성자의 CBS·변수·#if 그대로)
//     {{/if}}
//   사용자가 입력하면(프롬프트 조립 전) Dusk가 규칙을 평가해 채팅 변수 da_xxxx를 1/0으로 쓴다.
//   그러면 리스가 평소처럼 CBS를 파싱하고 배치·토큰 계산까지 한다. 꺼진 항목은 빈 내용이라 토큰을 안 먹는다.
//   플러그인이 없는 사용자에게는 변수가 비어 있어 이 항목들이 꺼진 것처럼 보일 뿐, 봇이 깨지지 않는다.

export const RULE_VERSION = 1;
export const DONT_ACTIVATE = "@@dont_activate";
export const STATE_VAR = "da_state";
export const SET_OPS = [["=", "로 정하기"], ["+", "더하기"], ["-", "빼기"], ["*", "곱하기"], ["/", "나누기"], ["expr", "수식"]];
export const MAX_HIST = 50;
export const gateVar = (rid) => "da_" + String(rid ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
const GATE_OPEN = /^\{\{#if \{\{getvar::da_[a-zA-Z0-9]+\}\}\}\}$/;
const GATE_CLOSE = "{{/if}}";
// Dusk가 관리하는 머리 장식 줄 (배치는 규칙에서 정한다)
const OWNED_DECO = /^@@(activate|dont_activate|unrecursive|depth|reverse_depth|role)(\s|$)/;

export const COND_TYPES = [
  ["keys", "이 항목의 키가 최근 대화에 있음"],
  ["text", "특정 단어가 최근 대화에 있음"],
  ["notext", "특정 단어가 최근 대화에 없음"],
  ["var", "채팅 변수 비교"],
  ["turn", "턴 범위"],
  ["count", "단어가 대화 전체에 N번 이상 나옴 (누적)"],
  ["times", "항목이 지금까지 N번 이상 켜짐 (누적)"],
  ["with", "다른 항목이 이번 턴에 켜짐"],
  ["without", "다른 항목이 이번 턴에 안 켜짐"]
];
export const VAR_OPS = ["=", "!=", ">", "<", ">=", "<=", "있음", "없음"];

export function defaultRule() {
  return { v: RULE_VERSION, on: true, mode: "all", cond: [{ t: "keys" }], prob: 100, once: "none", cool: 3, group: "", at: "top", depth: 4, role: "system", scan: 4, hold: 0, set: [], chain: [] };
}

export function ruleOf(entry) {
  const r = entry?.extentions?.da_rule;
  if (!r || typeof r !== "object") return null;
  return { ...defaultRule(), ...r, cond: Array.isArray(r.cond) ? r.cond : [], chain: Array.isArray(r.chain) ? r.chain : [], set: Array.isArray(r.set) ? r.set : [] };
}
export const ridOf = (entry) => entry?.extentions?.da_rid || null;
export const isManaged = (entry) => !!ruleOf(entry) && ruleOf(entry).on !== false;

// ---------- 내용의 @@dont_activate 다루기 ----------
const DECO_LINE = /^@@@?[a-z_]+(?:\s.*)?$/;
export function hasDontActivate(content) {
  for (const line of String(content ?? "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (!DECO_LINE.test(t)) return false;
    if (t === DONT_ACTIVATE) return true;
  }
  return false;
}
export function addDontActivate(content) {
  return hasDontActivate(content) ? content : `${DONT_ACTIVATE}\n${content ?? ""}`;
}
export function removeDontActivate(content) {
  const lines = String(content ?? "").split("\n");
  const i = lines.findIndex((l) => l.trim() === DONT_ACTIVATE);
  if (i < 0) return content;
  // 머리 장식 줄 안에 있을 때만 지운다
  if (lines.slice(0, i).some((l) => l.trim() && !DECO_LINE.test(l.trim()))) return content;
  lines.splice(i, 1);
  return lines.join("\n");
}
// 프롬프트에 넣을 본문: 머리의 @@ 장식 줄은 뺀다
function splitHead(content) {
  const lines = String(content ?? "").split("\n");
  let i = 0;
  while (i < lines.length && (!lines[i].trim() || DECO_LINE.test(lines[i].trim()))) i++;
  return { head: lines.slice(0, i).map((l) => l.trim()).filter(Boolean), rest: lines.slice(i) };
}
function unwrap(rest) {
  const r = [...rest];
  while (r.length && !r[r.length - 1].trim()) r.pop();
  if (r.length >= 2 && GATE_OPEN.test(r[0].trim()) && r[r.length - 1].trim() === GATE_CLOSE) return { gated: true, body: r.slice(1, -1).join("\n") };
  return { gated: false, body: r.join("\n") };
}
export function bodyOf(content) {
  return unwrap(splitHead(content).rest).body.trim();
}
// 규칙에 맞게 내용 머리와 CBS 문을 다시 만든다. 본문과 작성자의 다른 장식(@@probability 등)은 그대로 둔다.
export function nativeContent(content, rule, rid) {
  const { head, rest } = splitHead(content);
  const body = unwrap(rest).body;
  const keep = head.filter((l) => !OWNED_DECO.test(l));
  const place = [];
  if (rule.at === "depth") place.push(`@@depth ${Math.max(0, Number(rule.depth) || 0)}`);
  else if (rule.at === "bottom") place.push("@@depth 0");
  if (rule.role && rule.role !== "system") place.push(`@@role ${rule.role}`);
  return ["@@activate", "@@unrecursive", ...place, ...keep, `{{#if {{getvar::${gateVar(rid)}}}}}`, body, GATE_CLOSE].join("\n");
}
// 규칙을 끌 때: Dusk가 붙인 머리·CBS 문을 걷어 낸다
export function plainContent(content) {
  const { head, rest } = splitHead(content);
  const { gated, body } = unwrap(rest);
  if (!gated) return content;
  const keep = head.filter((l) => !/^@@(activate|unrecursive)(\s|$)/.test(l));
  return [...keep, body].join("\n");
}
export const isNativeSynced = (entry) => {
  const r = ruleOf(entry);
  return !r || entry.content === nativeContent(entry.content, r, ridOf(entry));
};
// 평가 결과 → 채팅 변수 (관리 항목 전부를 1/0으로)
export function gateValues(items, fired) {
  const on = new Set(fired.map((a) => a.rid));
  return Object.fromEntries(items.map((it) => [gateVar(it.rid), on.has(it.rid) ? "1" : "0"]));
}
// 간단한 CBS: {{char}}·{{bot}}·{{user}}·{{// 주석}}만 바꾼다
export function cbsLite(text, { char = "", user = "" } = {}) {
  return String(text ?? "")
    .replace(/\{\{\/\/[\s\S]*?\}\}/g, "")
    .replace(/\{\{comment:[\s\S]*?\}\}/gi, "")
    .replace(/\{\{(char|bot)\}\}/gi, char)
    .replace(/\{\{user\}\}/gi, user);
}

// ---------- 매칭 ----------
const norm = (s) => String(s ?? "").toLowerCase().replace(/\{\{\/\/[\s\S]*?\}\}/g, "");
function splitKeys(s) {
  return String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}
// 이름 경계: '김민'이 '김민수'에는 안 걸리고 '김민이·김민에게'에는 걸린다
const PARTICLE = "(?:으로|이랑|에게|한테|께서|에서|부터|까지|처럼|보다|은|는|이|가|을|를|의|에|와|과|도|로|만|께|랑|야|아|님|씨|서)";
const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function wholeRe(k) {
  return new RegExp(`(?<![가-힣A-Za-z0-9])${escRe(k)}(?=$|[^가-힣A-Za-z0-9]|${PARTICLE}{1,2}(?![가-힣]))`, "i");
}
function keyHit(keys, texts, { regex = false, all = false, whole = false } = {}) {
  if (!keys.length) return false;
  const test = (k) => {
    if (whole && !regex) {
      const re = wholeRe(k.trim());
      return texts.some((t) => re.test(String(t ?? "")));
    }
    if (regex) {
      const m = /^\/(.*)\/([a-z]*)$/s.exec(k);
      if (!m) return false;
      try {
        const re = new RegExp(m[1], m[2]);
        return texts.some((t) => {
          re.lastIndex = 0;
          return re.test(t);
        });
      } catch {
        return false;
      }
    }
    const kk = norm(k).replace(/ /g, "");
    return kk && texts.some((t) => norm(t).replace(/ /g, "").includes(kk));
  };
  return all ? keys.every(test) : keys.some(test);
}
function cmp(a, op, b) {
  if (op === "있음") return a !== void 0 && a !== null && String(a) !== "" && String(a) !== "null";
  if (op === "없음") return a === void 0 || a === null || String(a) === "" || String(a) === "null";
  const na = Number(a), nb = Number(b);
  const numeric = String(a ?? "").trim() !== "" && String(b ?? "").trim() !== "" && !isNaN(na) && !isNaN(nb);
  switch (op) {
    case "=": return numeric ? na === nb : String(a ?? "") === String(b ?? "");
    case "!=": return numeric ? na !== nb : String(a ?? "") !== String(b ?? "");
    case ">": return numeric && na > nb;
    case "<": return numeric && na < nb;
    case ">=": return numeric && na >= nb;
    case "<=": return numeric && na <= nb;
  }
  return false;
}

// ---------- 모으기 ----------
// 여러 출처(캐릭터·채팅·모듈)의 로어북에서 관리 항목만 모은다. 같은 rid가 여럿이면 먼저 나온 것을 쓴다.
export function collectManaged(entries) {
  const out = [];
  const seen = new Set();
  for (const e of entries ?? []) {
    if (!e || e.mode === "folder" || e.enabled === false) continue;
    const rule = ruleOf(e);
    if (!rule || rule.on === false) continue;
    const rid = ridOf(e) || `name:${e.comment ?? ""}`;
    if (seen.has(rid)) continue;
    seen.add(rid);
    out.push({ rid, entry: e, rule });
  }
  return out;
}

// ---------- 켜질 때 변수 ----------
// 규칙의 set: [{ name, op: '='|'+'|'-'|'*'|'/'|'expr', val }]. 새로 켜진 항목(지속으로 이어진 것은 제외)이 순서대로 채팅 변수를 바꾼다.
// expr(수식): 숫자·변수 이름·+ - * / % ^ ( )·min max abs floor ceil round clamp rand·turn(턴). eval은 쓰지 않고 직접 해석한다.
const IDENT = /[A-Za-z_가-힣][A-Za-z0-9_가-힣]*/y;
const NUM = /(?:\d+\.?\d*|\.\d+)/y;
function tokenize(src) {
  const out = [];
  let i = 0;
  const str = String(src ?? "");
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { i++; continue; }
    NUM.lastIndex = i;
    let m = NUM.exec(str);
    if (m) { out.push({ k: "n", v: Number(m[0]) }); i += m[0].length; continue; }
    IDENT.lastIndex = i;
    m = IDENT.exec(str);
    if (m) { out.push({ k: "id", v: m[0] }); i += m[0].length; continue; }
    if ("+-*/%^(),".includes(ch)) { out.push({ k: ch }); i++; continue; }
    throw new Error(`'${ch}'는 수식에서 쓸 수 없어요`);
  }
  return out;
}
const FUNCS = { min: (a) => Math.min(...a), max: (a) => Math.max(...a), abs: (a) => Math.abs(a[0]), floor: (a) => Math.floor(a[0]), ceil: (a) => Math.ceil(a[0]), round: (a) => Math.round(a[0]), clamp: (a) => Math.min(Math.max(a[0], a[1]), a[2]) };
const ARITY = { min: [1, 99], max: [1, 99], abs: [1, 1], floor: [1, 1], ceil: [1, 1], round: [1, 1], clamp: [3, 3], rand: [0, 2] };
// 수식 계산. ctx: { get(이름) → 값, turn, rng }. 오류면 Error
export function evalExpr(src, ctx = {}) {
  const t = tokenize(src);
  if (!t.length) throw new Error("수식이 비어 있어요");
  let p = 0;
  const peek = () => t[p]?.k;
  const eat = (k) => {
    if (t[p]?.k !== k) throw new Error(k === ")" ? "괄호가 닫히지 않았어요" : `'${k}'가 있어야 해요`);
    return t[p++];
  };
  const num = (v) => {
    const n = Number(v);
    return v === void 0 || v === null || v === "" || isNaN(n) ? 0 : n;
  };
  const expr = () => {
    let v = term();
    while (peek() === "+" || peek() === "-") v = t[p++].k === "+" ? v + term() : v - term();
    return v;
  };
  const term = () => {
    let v = power();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const k = t[p++].k, r = power();
      if ((k === "/" || k === "%") && r === 0) throw new Error("0으로 나눌 수 없어요");
      v = k === "*" ? v * r : k === "/" ? v / r : v % r;
    }
    return v;
  };
  const power = () => {
    const b = unary();
    return peek() === "^" ? (p++, Math.pow(b, power())) : b;
  };
  const unary = () => peek() === "-" ? (p++, -unary()) : peek() === "+" ? (p++, unary()) : primary();
  const primary = () => {
    const x = t[p];
    if (!x) throw new Error("수식이 중간에 끝났어요");
    if (x.k === "n") { p++; return x.v; }
    if (x.k === "(") { p++; const v = expr(); eat(")"); return v; }
    if (x.k === "id") {
      p++;
      if (peek() === "(") {
        const name = x.v.toLowerCase();
        if (!(name in ARITY)) throw new Error(`'${x.v}' 함수는 없어요`);
        p++;
        const args = [];
        if (peek() !== ")") {
          args.push(expr());
          while (peek() === ",") { p++; args.push(expr()); }
        }
        eat(")");
        const [lo, hi] = ARITY[name];
        if (args.length < lo || args.length > hi) throw new Error(`${x.v}()의 값 개수가 맞지 않아요`);
        if (name === "rand") {
          const r = (ctx.rng ?? Math.random)();
          if (!args.length) return r;
          const a = Math.min(args[0], args[1] ?? args[0]), b = Math.max(args[0], args[1] ?? args[0]);
          return a + Math.floor(r * (Math.floor(b) - Math.ceil(a) + 1));
        }
        return FUNCS[name](args);
      }
      if (x.v === "turn" || x.v === "턴") return Number(ctx.turn) || 0;
      return num(ctx.get?.(x.v));
    }
    throw new Error(`'${x.k}'가 여기 올 수 없어요`);
  };
  const v = expr();
  if (p < t.length) throw new Error(`'${t[p].k === "n" ? t[p].v : t[p].v ?? t[p].k}'를 해석할 수 없어요`);
  if (!isFinite(v)) throw new Error("계산 결과가 숫자가 아니에요");
  return v;
}
// 쓸 수 있는 수식인지 확인 (이름은 아무 값이나 넣어 본다). 오류 글 또는 null
export function checkExpr(src) {
  try {
    evalExpr(src, { get: () => 1, turn: 1, rng: () => 0.5 });
    return null;
  } catch (e) {
    return e.message;
  }
}
const fmtNum = (v) => String(Math.round(v * 1e6) / 1e6);
export const setTargets = (items) => [...new Set(items.flatMap((it) => (it.rule.set ?? []).map((x) => String(x.name ?? "").trim()).filter(Boolean)))];
// vars: scriptstate 모양({ '$이름': 값 }). 반환: { 이름: 새 값(문자열) } (바뀐 것만). 계산할 수 없는 항목(0으로 나누기·수식 오류)은 건너뛴다.
export function applySets(fired, vars, { turn = 0, rng = Math.random } = {}) {
  const out = {};
  const get = (n) => n in out ? out[n] : vars?.["$" + n];
  const asNum = (v) => {
    const n = Number(v);
    return v === void 0 || v === null || v === "" || isNaN(n) ? 0 : n;
  };
  for (const a of fired) {
    if (a.why === "지속") continue;
    for (const x of a.rule.set ?? []) {
      const n = String(x.name ?? "").trim();
      if (!n) continue;
      try {
        const cur = asNum(get(n)), d = asNum(x.val);
        switch (x.op) {
          case "+": out[n] = fmtNum(cur + d); break;
          case "-": out[n] = fmtNum(cur - d); break;
          case "*": out[n] = fmtNum(cur * d); break;
          case "/":
            if (d === 0) continue;
            out[n] = fmtNum(cur / d);
            break;
          case "expr": out[n] = fmtNum(evalExpr(x.val, { get, turn, rng })); break;
          default: out[n] = String(x.val ?? "");
        }
      } catch {
      }
    }
  }
  return out;
}

// ---------- 평가 ----------
// messages: [{ role: 'user'|'char', data }] (채팅 순서). turn: 사용자 메시지 수.
// state: { f: { rid: [turn, ...] } 켜진 턴 기록, t: { rid: [turn, ...] } 새로 켜진(지속 제외) 턴 기록 }. 현재 턴 이상 기록은 무시(다시 생성·되돌리기 대응).
// 반환: { fired: [{ rid, entry, rule, why }], state(새 기록), trace(항목별 왜 켜지고 안 켜졌는지) }
export function evaluate({ items, messages = [], turn = 0, state = {}, vars = {}, rng = Math.random, ignoreProb = false }) {
  const pick = (src) => {
    const o = {};
    for (const [rid, turns] of Object.entries(src ?? {})) {
      const t = (Array.isArray(turns) ? turns : []).filter((x) => typeof x === "number" && x < turn);
      if (t.length) o[rid] = t;
    }
    return o;
  };
  const hist = pick(state?.f);
  const trig = pick(state?.t);
  const byRid = new Map(items.map((x) => [x.rid, x]));
  const nameOf = (rid) => byRid.get(rid)?.entry.comment || rid || "?";
  const textsFor = (scan, who = "any") => {
    const n = Math.max(1, Number(scan) || 4);
    return messages.slice(-n).filter((m) => who === "any" || m.role === who).map((m) => m.data ?? "");
  };
  const holdOf = (it) => Math.max(0, Math.floor(Number(it.rule.hold) || 0));
  const blocked = (it) => {
    const h = hist[it.rid];
    if (!h?.length) return false;
    if (it.rule.once === "chat") return true;
    if (it.rule.once === "cooldown") return turn - Math.max(...h) <= Math.max(1, Number(it.rule.cool) || 1);
    return false;
  };
  const roll = (p) => ignoreProb || rng() * 100 < (p === void 0 || p === "" ? 100 : Number(p));
  const active = new Map();
  const rolled = new Map();
  // 지속: 새로 켜진 뒤 N턴 동안(켜진 턴 포함) 조건·확률 없이 계속 켜 둔다
  for (const it of items) {
    const n = holdOf(it);
    if (n > 1 && (trig[it.rid] ?? []).some((t) => turn - t < n)) active.set(it.rid, { ...it, why: "지속" });
  }
  const countHits = (it, c) => {
    const who = c.in || "any", keys = splitKeys(c.keys);
    return messages.filter((m) => who === "any" || m.role === who).filter((m) => keyHit(keys, [m.data ?? ""], { regex: !!c.regex, whole: !!it.rule.whole })).length;
  };
  const inRange = (n, c) => n >= (c.min === void 0 || c.min === "" ? 1 : Number(c.min)) && (c.max === void 0 || c.max === "" || n <= Number(c.max));
  const condOk = (it, c) => {
    switch (c.t) {
      case "keys": {
        const e = it.entry;
        const texts = textsFor(it.rule.scan);
        const o = { regex: !!e.useRegex, whole: !!it.rule.whole };
        if (!keyHit(splitKeys(e.key), texts, o)) return false;
        if (e.selective && splitKeys(e.secondkey).length) return keyHit(splitKeys(e.secondkey), texts, o);
        return true;
      }
      case "notext":
        return !keyHit(splitKeys(c.keys), textsFor(c.scan ?? it.rule.scan, c.in || "any"), { regex: !!c.regex, all: !!c.all, whole: !!it.rule.whole });
      case "text":
        return keyHit(splitKeys(c.keys), textsFor(c.scan ?? it.rule.scan, c.in || "any"), { regex: !!c.regex, all: !!c.all, whole: !!it.rule.whole });
      case "var":
        return cmp(vars[c.name] ?? vars["$" + c.name], c.op || "=", c.val);
      case "turn":
        return (c.min === void 0 || c.min === "" || turn >= Number(c.min)) && (c.max === void 0 || c.max === "" || turn <= Number(c.max));
      case "count":
        return splitKeys(c.keys).length > 0 && inRange(countHits(it, c), c);
      case "times":
        return inRange((hist[c.rid || it.rid] ?? []).length, c);
      case "with":
        return active.has(c.rid);
      case "without":
        return !active.has(c.rid);
    }
    return true;
  };
  const condsOk = (it) => {
    const cs = it.rule.cond ?? [];
    if (!cs.length) return true;
    return it.rule.mode === "any" ? cs.some((c) => condOk(it, c)) : cs.every((c) => condOk(it, c));
  };
  const add = (it, why) => {
    active.set(it.rid, { ...it, why });
    return true;
  };
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const it of items) {
      const cur = active.get(it.rid);
      if (cur && cur.why !== "지속") continue;
      if (blocked(it) || !condsOk(it)) continue;
      if (!rolled.has(it.rid)) rolled.set(it.rid, roll(it.rule.prob));
      if (rolled.get(it.rid)) changed = add(it, "조건") || changed;
    }
    for (const a of [...active.values()]) {
      for (const c of a.rule.chain ?? []) {
        const tgt = byRid.get(c.rid);
        if (!tgt || active.has(tgt.rid) || blocked(tgt)) continue;
        const key = `${a.rid}>${tgt.rid}`;
        if (rolled.has(key)) continue;
        rolled.set(key, roll(c.prob));
        if (rolled.get(key)) changed = add(tgt, `연쇄: ${a.entry.comment || a.rid}`) || changed;
      }
    }
    if (!changed) break;
  }
  // 'without' 조건은 최종 결과로 다시 확인 (나중에 켜진 항목 때문에 무효가 된 경우)
  for (const a of [...active.values()]) {
    if (a.why !== "조건") continue;
    if ((a.rule.cond ?? []).some((c) => c.t === "without") && !condsOk(a)) active.delete(a.rid);
  }
  // 그룹: 같은 그룹은 한 턴에 하나만 (삽입 순서가 큰 것, 같으면 먼저 나온 것)
  const groups = new Map();
  for (const a of active.values()) {
    const g = String(a.rule.group ?? "").trim();
    if (!g) continue;
    const cur = groups.get(g);
    if (!cur || (Number(a.entry.insertorder) || 0) > (Number(cur.entry.insertorder) || 0)) groups.set(g, a);
  }
  const fired = [...active.values()].filter((a) => {
    const g = String(a.rule.group ?? "").trim();
    return !g || groups.get(g) === a;
  });
  const f = { ...hist }, t = { ...trig };
  for (const a of fired) {
    f[a.rid] = [...(f[a.rid] ?? []), turn].slice(-MAX_HIST);
    if (a.why !== "지속") t[a.rid] = [...(t[a.rid] ?? []), turn].slice(-MAX_HIST);
  }
  // 시험·로그용: 항목마다 왜 켜졌고 왜 안 켜졌는지
  const label = (it, c) => {
    switch (c.t) {
      case "keys": return `키 일치(${String(it.entry.key ?? "").trim() || "키 없음"})`;
      case "text": return `'${c.keys ?? ""}' 있음`;
      case "notext": return `'${c.keys ?? ""}' 없음`;
      case "var": return `변수 ${c.name ?? "?"} ${c.op || "="} ${c.val ?? ""}`.trim() + ` (지금 ${vars[c.name] ?? vars["$" + c.name] ?? "없음"})`;
      case "turn": return `턴 ${c.min ?? ""}~${c.max ?? ""} (지금 ${turn}턴)`;
      case "count": return `'${c.keys ?? ""}' ${c.min || 1}번 이상 (지금 ${countHits(it, c)}번)`;
      case "times": return `'${c.rid ? nameOf(c.rid) : "이 항목"}' ${c.min || 1}번 이상 켜짐 (지금 ${(hist[c.rid || it.rid] ?? []).length}번)`;
      case "with": return `'${nameOf(c.rid)}' 켜짐`;
      case "without": return `'${nameOf(c.rid)}' 안 켜짐`;
    }
    return c.t;
  };
  const firedSet = new Set(fired.map((a) => a.rid));
  const trace = items.map((it) => {
    const name = it.entry.comment || it.rid;
    if (firedSet.has(it.rid)) return { rid: it.rid, name, on: true, why: active.get(it.rid).why };
    let why;
    if (active.has(it.rid)) why = `같은 그룹 '${String(it.rule.group).trim()}'의 다른 항목이 먼저 켜졌어요`;
    else if (blocked(it)) why = it.rule.once === "chat" ? "이미 켜져서 쉬는 중 (채팅에서 한 번만)" : `쿨다운 중 (${Math.max(1, Number(it.rule.cool) || 1)}턴 쉬기)`;
    else if (!condsOk(it)) {
      const bad = (it.rule.cond ?? []).filter((c) => !condOk(it, c)).map((c) => label(it, c));
      why = `${it.rule.mode === "any" ? "맞는 조건이 없어요" : "안 맞는 조건"}: ${bad.join(" / ")}`;
    } else if (rolled.get(it.rid) === false) why = `조건은 맞았지만 확률 ${it.rule.prob}%에서 안 켜졌어요`;
    else why = "다른 항목이 바뀌어 조건이 맞지 않게 됐어요";
    return { rid: it.rid, name, on: false, why };
  });
  return { fired, state: { f, t }, trace };
}

// ---------- 배치 ----------
// formated: 리스가 보내려는 메시지 배열(OpenAIChat[]). fired의 내용을 규칙의 위치에 넣는다.
export function inject(formated, fired, { char = "", user = "" } = {}) {
  const out = [...formated];
  if (!fired.length) return out;
  const firstChat = (() => {
    const i = out.findIndex((m) => m.role !== "system");
    return i < 0 ? out.length : i;
  })();
  let end = out.length;
  if (end > firstChat && out[end - 1].role === "assistant" && end - 1 > firstChat) {
    // 마지막이 미리 채우기(prefill)면 그 앞까지를 대화 끝으로 본다
    const prev = out[end - 2];
    if (prev?.role === "user") end -= 1;
  }
  const slots = new Map();
  for (const a of fired) {
    const r = a.rule;
    let idx;
    if (r.at === "bottom") idx = end;
    else if (r.at === "depth") idx = Math.max(firstChat, end - Math.max(0, Number(r.depth) || 0));
    else idx = firstChat;
    const role = ["system", "user", "assistant"].includes(r.role) ? r.role : "system";
    const k = `${idx}|${role}`;
    if (!slots.has(k)) slots.set(k, { idx, role, parts: [] });
    slots.get(k).parts.push({ order: Number(a.entry.insertorder) || 0, text: cbsLite(bodyOf(a.entry.content), { char, user }) });
  }
  const list = [...slots.values()].sort((a, b) => b.idx - a.idx);
  for (const s of list) {
    const content = s.parts.sort((a, b) => b.order - a.order).map((p) => p.text).filter(Boolean).join("\n\n");
    if (!content) continue;
    out.splice(s.idx, 0, { role: s.role, content, memo: "dusk-lore" });
  }
  return out;
}

// ---------- 검증 ----------
// lorebook 배열을 보고 문제 목록을 돌려준다: [{ level: 'err'|'warn', index, msg }]
export function validateRules(lorebook) {
  const out = [];
  const list = lorebook ?? [];
  const rids = new Map();
  list.forEach((l, i) => {
    const rid = ridOf(l);
    if (!rid) return;
    if (rids.has(rid)) out.push({ level: "err", index: i, msg: `로어북 '${l.comment || i + 1}': 규칙 식별자가 '${list[rids.get(rid)].comment || rids.get(rid) + 1}'와 같아요 (복제한 항목이면 규칙을 껐다 켜 주세요)` });
    else rids.set(rid, i);
  });
  const name = (l, i) => `로어북 '${l.comment || i + 1}'`;
  list.forEach((l, i) => {
    const r = ruleOf(l);
    if (!r || r.on === false || l.mode === "folder") return;
    const n = name(l, i);
    if (!isNativeSynced(l)) out.push({ level: "warn", index: i, msg: `${n}: 내용 머리(@@activate·{{#if}})가 규칙과 달라요. 저장하면 자동으로 맞춰져요` });
    if (!bodyOf(l.content)) out.push({ level: "warn", index: i, msg: `${n}: 넣을 내용이 비어 있어요` });
    const p = Number(r.prob);
    if (isNaN(p) || p < 0 || p > 100) out.push({ level: "err", index: i, msg: `${n}: 확률은 0~100이어야 해요` });
    if (r.once === "cooldown" && !(Number(r.cool) >= 1)) out.push({ level: "err", index: i, msg: `${n}: 쿨다운 턴 수는 1 이상이어야 해요` });
    if (r.at === "depth" && !(Number(r.depth) >= 0)) out.push({ level: "err", index: i, msg: `${n}: 깊이는 0 이상이어야 해요` });
    if (!(r.cond ?? []).length && !(r.chain ?? []).length && p >= 100 && r.once === "none") out.push({ level: "warn", index: i, msg: `${n}: 조건이 없어 매 턴 켜져요` });
    for (const c of r.cond ?? []) {
      if (c.t === "keys" && !splitKeys(l.key).length) out.push({ level: "warn", index: i, msg: `${n}: '키' 조건이 있지만 활성화 키가 비어 있어요` });
      if ((c.t === "text" || c.t === "notext") && !splitKeys(c.keys).length) out.push({ level: "warn", index: i, msg: `${n}: 단어 조건에 단어가 없어요` });
      if (c.t === "var" && !String(c.name ?? "").trim()) out.push({ level: "err", index: i, msg: `${n}: 변수 조건에 변수 이름이 없어요` });
      if (c.t === "count" && !splitKeys(c.keys).length) out.push({ level: "warn", index: i, msg: `${n}: 누적 단어 조건에 단어가 없어요` });
      if (c.t === "times" && c.rid && !rids.has(c.rid)) out.push({ level: "err", index: i, msg: `${n}: '켜진 횟수' 조건이 가리키는 항목이 없어요` });
      if ((c.t === "count" || c.t === "times") && c.min !== void 0 && c.min !== "" && !(Number(c.min) >= 0)) out.push({ level: "err", index: i, msg: `${n}: 횟수는 0 이상이어야 해요` });
      if ((c.t === "with" || c.t === "without") && !rids.has(c.rid)) out.push({ level: "err", index: i, msg: `${n}: 조건이 가리키는 항목이 없어요 (규칙이 꺼졌거나 지워짐)` });
      if ((c.t === "with" || c.t === "without") && c.rid === ridOf(l)) out.push({ level: "err", index: i, msg: `${n}: 조건이 자기 자신을 가리켜요` });
      if (((c.t === "text" || c.t === "notext") && c.regex) || (c.t === "keys" && l.useRegex)) {
        for (const k of splitKeys(c.t === "keys" ? l.key : c.keys)) {
          const m = /^\/(.*)\/([a-z]*)$/s.exec(k);
          try {
            if (!m) throw new Error("/패턴/플래그 모양이어야 해요");
            new RegExp(m[1], m[2]);
          } catch (e) {
            out.push({ level: "err", index: i, msg: `${n}: 정규식 '${k}' 오류 — ${e.message}` });
          }
        }
      }
    }
    if (r.hold !== void 0 && r.hold !== "" && !(Number(r.hold) >= 0)) out.push({ level: "err", index: i, msg: `${n}: 유지 턴 수는 0 이상이어야 해요` });
    for (const x of r.set ?? []) {
      if (!String(x.name ?? "").trim()) out.push({ level: "err", index: i, msg: `${n}: '켜질 때' 변수 이름이 비어 있어요` });
      if (["+", "-", "*", "/"].includes(x.op) && (String(x.val ?? "").trim() === "" || isNaN(Number(x.val)))) out.push({ level: "err", index: i, msg: `${n}: '${x.name}'의 값은 숫자여야 해요 (변수를 쓰려면 '수식'을 고르세요)` });
      if (x.op === "/" && Number(x.val) === 0) out.push({ level: "err", index: i, msg: `${n}: '${x.name}'를 0으로 나눌 수 없어요` });
      if (x.op === "expr") {
        const er = checkExpr(x.val);
        if (er) out.push({ level: "err", index: i, msg: `${n}: '${x.name}' 수식 오류 — ${er}` });
      }
      if (String(x.name ?? "").startsWith("da_")) out.push({ level: "warn", index: i, msg: `${n}: 변수 '${x.name}'는 Dusk가 쓰는 이름(da_)이에요. 다른 이름을 쓰세요` });
    }
    for (const c of r.chain ?? []) {
      const ti = rids.get(c.rid);
      if (ti === undefined) out.push({ level: "err", index: i, msg: `${n}: 연쇄 대상 항목이 없어요` });
      else if (!isManaged(list[ti])) out.push({ level: "warn", index: i, msg: `${n}: 연쇄 대상 '${list[ti].comment || ti + 1}'은 규칙이 꺼져 있어 켜지지 않아요` });
      if (c.rid === ridOf(l)) out.push({ level: "err", index: i, msg: `${n}: 연쇄가 자기 자신을 가리켜요` });
      const cp = Number(c.prob);
      if (isNaN(cp) || cp < 0 || cp > 100) out.push({ level: "err", index: i, msg: `${n}: 연쇄 확률은 0~100이어야 해요` });
    }
  });
  // 키 중복: 관리 항목끼리 같은 키
  const keyOwner = new Map();
  list.forEach((l, i) => {
    if (!isManaged(l)) return;
    for (const k of splitKeys(l.key).map((x) => x.toLowerCase())) {
      if (keyOwner.has(k) && keyOwner.get(k) !== i) out.push({ level: "warn", index: i, msg: `${name(l, i)}: 키 '${k}'를 '${list[keyOwner.get(k)].comment || keyOwner.get(k) + 1}'도 써요 (그룹으로 묶으면 하나만 켜져요)` });
      else keyOwner.set(k, i);
    }
  });
  return out;
}
