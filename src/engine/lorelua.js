// Dusk 로어북 규칙을 봇·모듈에 같이 넣는 Lua 엔진 (플러그인 없이 동작)
// 원본은 지금처럼 로어북 항목의 extentions.da_rule·da_rid·da_folder… 이고, Lua는 거기서 만든 결과물이다.
//   - 트리거 하나(effect triggerlua)로 넣는다. 맨 앞 줄의 표시(LUA_MARK + hash)로 Dusk가 찾아 다시 만들거나 뺀다.
//   - listenEdit('editInput'): 입력 직후·로어북 조립 전에 돈다(RisuBard·PocketRisu 확인). lorerules decide()와 같은 계산.
//   - onOutput: 응답이 끝난 뒤 다시 생성 대비(prepare()와 같은 계산). 설정이 '이전 결과 유지'면 하지 않는다.
//   - 발동 기록은 Dusk와 같은 채팅 변수 da_state 모양이라, Dusk가 있는 환경과 없는 환경을 오가도 이어진다.
// Lua로 못 하는 것: 정규식 키(useRegex)·정규식 조건 — 내보낼 때 unsupportedRules()로 알려 준다(그 조건은 안 맞는 것으로 본다).
import { collectManaged, setTargets, affOf, bodyOf, gateVar } from "./lorerules.js";

export const LUA_MARK = "-- DUSK-LORE";
export const LUA_VERSION = 1;
export const LUA_TRIGGER_NAME = "Dusk 로어북 규칙 (자동 생성)";

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const RULE_KEYS = ["mode", "cond", "prob", "once", "cool", "group", "scan", "hold", "set", "chain", "whole", "common", "commonKeys", "commonWords"];

function hasRandom(items) {
  return items.some((it) => {
    if (Number(it.rule.prob ?? 100) < 100 || (it.rule.chain ?? []).some((c) => Number(c.prob ?? 100) < 100)) return true;
    const a = affOf(it.entry);
    return !!a && (a.max !== "" || a.def < 100 || Object.values(a.prob).some((p) => p !== "" && Number(p) < 100));
  });
}

// Lua에 넣을 데이터 (평가에 필요한 것만)
export function loreLuaData(entries, { boundary = "short", reroll = "new" } = {}) {
  const items = collectManaged(entries);
  return {
    v: LUA_VERSION,
    boundary: boundary === "off" || boundary === "all" ? boundary : "short",
    reroll: reroll === "keep" ? "keep" : "new",
    random: hasRandom(items),
    targets: setTargets(items),
    items: items.map((it) => {
      const e = it.entry;
      const rule = {};
      for (const k of RULE_KEYS) if (it.rule[k] !== void 0) rule[k] = it.rule[k];
      const o = {
        rid: it.rid, gate: gateVar(it.rid), key: String(e.key ?? ""), sk: String(e.secondkey ?? ""), sel: !!e.selective, rx: !!e.useRegex,
        name: String(e.comment ?? ""), ord: Number(e.insertorder) || 0,
        dk: fnv(`${String(e.comment ?? "").trim()}\u0000${bodyOf(e.content)}`),
        rule, affs: it.affs ?? []
      };
      if (it.fid) o.fid = it.fid;
      if (it.aff) o.aff = { def: it.aff.def, max: it.aff.max, prob: it.aff.prob };
      if (it.place) o.place = it.place;
      return o;
    })
  };
}

// Lua로 그대로 옮길 수 없는 규칙 (정규식). [{ name, why }]
export function unsupportedRules(entries) {
  const out = [];
  for (const it of collectManaged(entries)) {
    const name = it.entry.comment || it.rid;
    if (it.entry.useRegex && (it.rule.cond ?? []).some((c) => c.t === "keys")) out.push({ name, why: "정규식 키" });
    for (const c of it.rule.cond ?? []) {
      if ((c.t === "text" || c.t === "notext" || c.t === "count") && c.regex) out.push({ name, why: "정규식 조건" });
    }
  }
  return out;
}

function longString(s) {
  let eq = "==";
  while (s.includes(`]${eq}]`)) eq += "=";
  return `[${eq}[${s}]${eq}]`;
}

export function loreLuaHash(entries, opts) {
  return fnv(JSON.stringify(loreLuaData(entries, opts)));
}

// 트리거에 넣을 Lua 코드. 관리 항목이 없으면 null
export function buildLoreLua(entries, opts = {}) {
  const data = loreLuaData(entries, opts);
  if (!data.items.length) return null;
  const json = JSON.stringify(data);
  return `${LUA_MARK} v${LUA_VERSION} hash=${fnv(json)}\n-- Dusk Atelier가 로어북 규칙으로 만든 코드예요. 직접 고치지 말고 Dusk에서 규칙을 고치면 다시 만들어져요.\nlocal DATA = json.decode(${longString(json)})\n${LUA_ENGINE}`;
}

export const hashOfCode = (code) => /^-- DUSK-LORE v\d+ hash=([0-9a-f]+)/.exec(String(code ?? ""))?.[1] ?? null;
const codeOf = (t) => t?.effect?.[0]?.type === "triggerlua" ? String(t.effect[0].code ?? "") : "";
export const isLoreTrigger = (t) => codeOf(t).startsWith(LUA_MARK);
export const findLoreTrigger = (triggers) => (Array.isArray(triggers) ? triggers : []).find(isLoreTrigger) ?? null;
export function makeLoreTrigger(code) {
  return { comment: LUA_TRIGGER_NAME, type: "start", conditions: [], effect: [{ type: "triggerlua", code }], lowLevelAccess: false };
}
// 지금 로어북에 맞는 Lua 트리거로 맞춘다. { triggers, changed, state: 'added'|'updated'|'removed'|'same'|'none' }
export function syncLoreTrigger(triggers, entries, opts = {}) {
  const list = Array.isArray(triggers) ? triggers : [];
  const code = buildLoreLua(entries, opts);
  const cur = findLoreTrigger(list);
  if (!code) {
    if (!cur) return { triggers: list, changed: false, state: "none" };
    return { triggers: list.filter((t) => !isLoreTrigger(t)), changed: true, state: "removed" };
  }
  if (cur && codeOf(cur) === code) return { triggers: list, changed: false, state: "same" };
  const next = list.filter((t) => !isLoreTrigger(t));
  next.push(makeLoreTrigger(code));
  return { triggers: next, changed: true, state: cur ? "updated" : "added" };
}
// 켜진 Lua 트리거들이 맡은 항목 rid (Dusk 플러그인은 이 항목을 다시 계산하지 않는다 — 변수 더하기가 두 번 되지 않게)
export function luaCoveredRids(triggers) {
  const out = new Set();
  for (const t of Array.isArray(triggers) ? triggers : []) {
    if (!isLoreTrigger(t)) continue;
    const m = /json\.decode\(\[(=+)\[([\s\S]*?)\]\1\]\)/.exec(codeOf(t));
    if (!m) continue;
    try {
      for (const it of JSON.parse(m[2]).items ?? []) if (it?.rid) out.add(it.rid);
    } catch { /* 깨진 코드는 무시 */ }
  }
  return out;
}
// 트리거의 Lua가 지금 규칙과 다른지 (Dusk 밖에서 손댄 것 포함)
export function loreTriggerStale(triggers, entries, opts = {}) {
  const cur = findLoreTrigger(triggers);
  if (!cur) return false;
  return codeOf(cur) !== buildLoreLua(entries, opts);
}

// ---------- Lua 본체 (lorerules.js evaluate·applySets, data/lorerules.js decide·prepare를 그대로 옮김) ----------
export const LUA_ENGINE = String.raw`
local ITEMS = DATA.items or {}
local BOUNDARY = DATA.boundary or "short"
local MAX_HIST = 50
local STATE = "da_state"
local function rng() return (DUSK_RNG or math.random)() end

-- 값 → 글자 (자바스크립트 String()과 맞춤)
local function jsstr(v)
  if v == nil then return "" end
  if type(v) == "boolean" then return v and "true" or "false" end
  if type(v) == "number" then
    if v ~= v then return "NaN" end
    if v == math.floor(v) and math.abs(v) < 1e15 then return string.format("%d", v) end
    local s = string.format("%.15g", v)
    return s
  end
  return tostring(v)
end
local function trim(s) return (tostring(s or ""):gsub("^%s+", ""):gsub("%s+$", "")) end
local function jsnum(v)
  if v == nil then return nil end
  if type(v) == "number" then return v + 0.0 end
  if type(v) == "boolean" then return v and 1.0 or 0.0 end
  local t = trim(v)
  if t == "" then return 0.0 end
  local n = tonumber(t)
  if n == nil then return nil end
  return n + 0.0
end
local function asNum(v)
  if v == nil or v == "" then return 0 end
  local n = jsnum(v)
  if n == nil or n ~= n then return 0 end
  return n
end
local function fmtNum(v)
  local r = math.floor(v * 1e6 + 0.5) / 1e6
  if r == math.floor(r) and math.abs(r) < 1e15 then return string.format("%d", r) end
  local s = string.format("%.6f", r):gsub("0+$", ""):gsub("%.$", "")
  return s
end
local function splitKeys(s)
  local out = {}
  for part in (jsstr(s) .. ","):gmatch("([^,]*),") do
    local t = trim(part)
    if t ~= "" then out[#out + 1] = t end
  end
  return out
end
local function norm(s) return (string.lower(jsstr(s)):gsub("{{//.-}}", "")) end
local function nospace(s) return (s:gsub(" ", "")) end

-- 글자 단위 (UTF-8 → 코드 포인트)
local function cps(s)
  local t = {}
  local ok = pcall(function() for _, c in utf8.codes(s) do t[#t + 1] = c end end)
  if not ok then t = {} for i = 1, #s do t[i] = s:byte(i) end end
  return t
end
local function isHangul(c) return c ~= nil and c >= 0xAC00 and c <= 0xD7A3 end
local function isWord(c)
  return c ~= nil and (isHangul(c) or (c >= 48 and c <= 57) or (c >= 65 and c <= 90) or (c >= 97 and c <= 122))
end
local function isSpace(c) return c == 32 or (c >= 9 and c <= 13) or c == 160 or c == 0x3000 or c == 0xFEFF or (c >= 0x2000 and c <= 0x200A) or c == 0x2028 or c == 0x2029 or c == 0x202F or c == 0x205F or c == 0x1680 end
local function list(words) local o = {} for _, w in ipairs(words) do o[#o + 1] = cps(w) end return o end
local PARTICLE = list({"에게서","한테서","으로서","으로써","이라고","이라는","이라면","이었다","이었어","이었고","였다","였어","였고","이에요","이예요","예요","이야","이다","이고","이며","이나","이든","이랑","이란","이라","으로","에게","한테","께서","에서","부터","까지","처럼","보다","하고","마저","조차","밖에","라고","라는","라면","네","쪽","군","양","님","씨","은","는","이","가","을","를","의","에","와","과","도","로","만","께","랑","야","아","여","서","나","든","며","고","란","라","다","요"})
local COPULA = list({"이었","였","이에","이어","이예","예요","이야","이라","이랑","이지","이죠","이니","이네","이면","이므","이라서","이어서"})
local TITLES = list({"씨","님","양","군","선배","후배","언니","오빠","누나","형"})
local VOC2 = list({"아","야","이여","여"})
local function at(t, pos, w)
  for i = 1, #w do if t[pos + i - 1] ~= w[i] then return false end end
  return true
end
-- PARTICLE{1,3}(?![가-힣])
local function particles(t, j, depth)
  for _, p in ipairs(PARTICLE) do
    if at(t, j, p) then
      local e = j + #p
      if e > #t or not isHangul(t[e]) then return true end
      if depth < 3 and particles(t, e, depth + 1) then return true end
    end
  end
  return false
end
local function particles0(t, j)
  if j > #t or not isHangul(t[j]) then return true end
  return particles(t, j, 1)
end
-- 이름 경계로 k가 나온 자리마다 fn(t, 끝 다음 자리)
local function eachWhole(k, text, fn)
  local lk, lt = string.lower(k), string.lower(text)
  if not string.find(lt, lk, 1, true) then return false end
  local t, kc = cps(lt), cps(lk)
  local n = #kc
  if n == 0 then return false end
  for i = 1, #t - n + 1 do
    if at(t, i, kc) and not isWord(t[i - 1]) then
      if fn(t, i + n) then return true end
    end
  end
  return false
end
local function wholeAfter(t, j)
  if j > #t or not isWord(t[j]) then return true end
  if particles(t, j, 1) then return true end
  for _, c in ipairs(COPULA) do if at(t, j, c) then return true end end
  return false
end
local function wholeHit(k, text) return eachWhole(k, text, wholeAfter) end
local function vocAfter(t, j)
  for _, w in ipairs(TITLES) do
    if at(t, j, w) and particles0(t, j + #w) then return true end
    if isSpace(t[j] or -1) and at(t, j + 1, w) and particles0(t, j + 1 + #w) then return true end
  end
  for _, w in ipairs(VOC2) do
    if at(t, j, w) and particles0(t, j + #w) then return true end
  end
  return false
end
local function autoWhole(k)
  if BOUNDARY == "all" then return true end
  if BOUNDARY ~= "short" then return false end
  local c = cps(k)
  if #c < 1 or #c > 2 then return false end
  for _, x in ipairs(c) do if not isHangul(x) then return false end end
  return true
end
local function anyText(texts, fn) for _, t in ipairs(texts) do if fn(t) then return true end end return false end
local function commonHit(k, texts, common)
  if not anyText(texts, function(t) return wholeHit(k, t) end) then return false end
  if common.recent then return true end
  if anyText(texts, function(t) return eachWhole(k, t, vocAfter) end) then return true end
  for _, w in ipairs(common.confirm) do
    local ww = nospace(norm(w))
    if anyText(texts, function(t) return string.find(nospace(norm(t)), ww, 1, true) ~= nil end) then return true end
  end
  return false
end
local function keyHit(keys, texts, o)
  if #keys == 0 then return false end
  local function test(k)
    local tk = trim(k)
    if o.regex then return false end -- 정규식은 Lua에서 못 씀
    if o.common and o.common.keys[tk] then return commonHit(tk, texts, o.common) end
    if o.whole or autoWhole(tk) then return anyText(texts, function(t) return wholeHit(tk, t) end) end
    local kk = nospace(norm(k))
    if kk == "" then return false end
    return anyText(texts, function(t) return string.find(nospace(norm(t)), kk, 1, true) ~= nil end)
  end
  if o.all then
    for _, k in ipairs(keys) do if not test(k) then return false end end
    return true
  end
  for _, k in ipairs(keys) do if test(k) then return true end end
  return false
end
local function isNullish(a) return a == nil or jsstr(a) == "" or jsstr(a) == "null" end
local function cmp(a, op, b)
  if op == "있음" then return not isNullish(a) end
  if op == "없음" then return isNullish(a) end
  if op == "포함" then return jsstr(b) ~= "" and string.find(jsstr(a), jsstr(b), 1, true) ~= nil end
  if op == "미포함" then return string.find(jsstr(a), jsstr(b), 1, true) == nil end
  local na, nb = jsnum(a), jsnum(b)
  local numeric = trim(jsstr(a)) ~= "" and trim(jsstr(b)) ~= "" and na ~= nil and nb ~= nil
  if op == "=" then if numeric then return na == nb end return jsstr(a) == jsstr(b) end
  if op == "!=" then if numeric then return na ~= nb end return jsstr(a) ~= jsstr(b) end
  if op == ">" then return numeric and na > nb end
  if op == "<" then return numeric and na < nb end
  if op == ">=" then return numeric and na >= nb end
  if op == "<=" then return numeric and na <= nb end
  return false
end
local function empty(v) return v == nil or v == "" end
local function startsWith(s, p) return string.sub(jsstr(s), 1, #p) == p end

-- 순서를 지키는 맵 (자바스크립트 Map처럼 이미 있는 키는 자리를 그대로 둔다)
local function omap()
  local m = { keys = {}, val = {} }
  function m:set(k, v) if self.val[k] == nil then self.keys[#self.keys + 1] = k end self.val[k] = v end
  function m:get(k) return self.val[k] end
  function m:has(k) return self.val[k] ~= nil end
  function m:delete(k)
    if self.val[k] == nil then return end
    self.val[k] = nil
    for i, x in ipairs(self.keys) do if x == k then table.remove(self.keys, i) break end end
  end
  function m:values() local o = {} for _, k in ipairs(self.keys) do o[#o + 1] = self.val[k] end return o end
  function m:entries() local o = {} for _, k in ipairs(self.keys) do o[#o + 1] = { k, self.val[k] } end return o end
  return m
end
local function copy(t) local o = {} for k, v in pairs(t) do o[k] = v end return o end
local function maxOf(a) local m = -math.huge for _, x in ipairs(a) do if x > m then m = x end end return m end
local function slice50(a) local o = {} for i = math.max(1, #a - MAX_HIST + 1), #a do o[#o + 1] = a[i] end return o end
local function append(a, x) local o = {} for i, v in ipairs(a or {}) do o[i] = v end o[#o + 1] = x return slice50(o) end
local function contains(a, x) for _, v in ipairs(a or {}) do if v == x then return true end end return false end

-- 수식 (evalExpr)
local FUNCS = {
  min = function(a) local m = math.huge for _, x in ipairs(a) do if x < m then m = x end end return m end,
  max = function(a) local m = -math.huge for _, x in ipairs(a) do if x > m then m = x end end return m end,
  abs = function(a) return math.abs(a[1]) end, floor = function(a) return math.floor(a[1]) end, ceil = function(a) return math.ceil(a[1]) end,
  round = function(a) return math.floor(a[1] + 0.5) end, clamp = function(a) return math.min(math.max(a[1], a[2]), a[3]) end
}
local ARITY = { min = {1, 99}, max = {1, 99}, abs = {1, 1}, floor = {1, 1}, ceil = {1, 1}, round = {1, 1}, clamp = {3, 3}, rand = {0, 2} }
local function tokenize(src)
  local out, s = {}, jsstr(src)
  local c = cps(s)
  local i = 1
  local function ch(j) return c[j] end
  local function isDigit(x) return x and x >= 48 and x <= 57 end
  local function isIdStart(x) return x and ((x >= 65 and x <= 90) or (x >= 97 and x <= 122) or x == 95 or isHangul(x)) end
  while i <= #c do
    local x = ch(i)
    if isSpace(x) then i = i + 1
    elseif isDigit(x) or (x == 46 and isDigit(ch(i + 1))) then
      local j = i
      if x == 46 then j = j + 1 while isDigit(ch(j)) do j = j + 1 end
      else
        while isDigit(ch(j)) do j = j + 1 end
        if ch(j) == 46 then j = j + 1 while isDigit(ch(j)) do j = j + 1 end end
      end
      local buf = {} for k = i, j - 1 do buf[#buf + 1] = utf8.char(c[k]) end
      out[#out + 1] = { k = "n", v = (tonumber(table.concat(buf)) or 0) + 0.0 }
      i = j
    elseif isIdStart(x) then
      local j = i
      while ch(j) and (isIdStart(ch(j)) or isDigit(ch(j))) do j = j + 1 end
      local buf = {} for k = i, j - 1 do buf[#buf + 1] = utf8.char(c[k]) end
      out[#out + 1] = { k = "id", v = table.concat(buf) }
      i = j
    else
      local s1 = utf8.char(x)
      if string.find("+-*/%^(),", s1, 1, true) then out[#out + 1] = { k = s1 } i = i + 1
      else error("bad char") end
    end
  end
  return out
end
local function evalExpr(src, ctx)
  local t = tokenize(src)
  if #t == 0 then error("empty") end
  local p = 1
  local function peek() return t[p] and t[p].k end
  local expr, term, power, unary, primary
  expr = function()
    local v = term()
    while peek() == "+" or peek() == "-" do
      local k = t[p].k p = p + 1
      if k == "+" then v = v + term() else v = v - term() end
    end
    return v
  end
  term = function()
    local v = power()
    while peek() == "*" or peek() == "/" or peek() == "%" do
      local k = t[p].k p = p + 1
      local r = power()
      if (k == "/" or k == "%") and r == 0 then error("div0") end
      if k == "*" then v = v * r elseif k == "/" then v = v / r else v = math.fmod(v, r) end
    end
    return v
  end
  power = function()
    local b = unary()
    if peek() == "^" then p = p + 1 return b ^ power() end
    return b
  end
  unary = function()
    if peek() == "-" then p = p + 1 return -unary() end
    if peek() == "+" then p = p + 1 return unary() end
    return primary()
  end
  primary = function()
    local x = t[p]
    if not x then error("end") end
    if x.k == "n" then p = p + 1 return x.v end
    if x.k == "(" then
      p = p + 1
      local v = expr()
      if peek() ~= ")" then error("paren") end
      p = p + 1
      return v
    end
    if x.k == "id" then
      p = p + 1
      if peek() == "(" then
        local name = string.lower(x.v)
        if not ARITY[name] then error("func") end
        p = p + 1
        local args = {}
        if peek() ~= ")" then
          args[#args + 1] = expr()
          while peek() == "," do p = p + 1 args[#args + 1] = expr() end
        end
        if peek() ~= ")" then error("paren") end
        p = p + 1
        local lo, hi = ARITY[name][1], ARITY[name][2]
        if #args < lo or #args > hi then error("arity") end
        if name == "rand" then
          local r = rng()
          if #args == 0 then return r end
          local a1, b1 = args[1], args[2] or args[1]
          local a, b = math.min(a1, b1), math.max(a1, b1)
          return a + math.floor(r * (math.floor(b) - math.ceil(a) + 1))
        end
        return FUNCS[name](args)
      end
      if x.v == "turn" or x.v == "턴" then return (tonumber(ctx.turn) or 0) + 0.0 end
      return asNum(ctx.get(x.v))
    end
    error("unexpected")
  end
  local v = expr()
  if p <= #t then error("trailing") end
  if v ~= v or v == math.huge or v == -math.huge then error("nan") end
  return v
end

local function applySets(fired, get0, turn)
  local out, order = {}, {}
  local function get(n) if out[n] ~= nil then return out[n] end return get0(n) end
  local function put(n, v) if out[n] == nil then order[#order + 1] = n end out[n] = v end
  for _, a in ipairs(fired) do
    if a.why ~= "지속" then
      for _, x in ipairs(a.it.rule.set or {}) do
        local n = trim(jsstr(x.name))
        if n ~= "" then
          pcall(function()
            local cur, d = asNum(get(n)), asNum(x.val)
            if x.op == "+" then put(n, fmtNum(cur + d))
            elseif x.op == "-" then put(n, fmtNum(cur - d))
            elseif x.op == "*" then put(n, fmtNum(cur * d))
            elseif x.op == "/" then if d ~= 0 then put(n, fmtNum(cur / d)) end
            elseif x.op == "expr" then put(n, fmtNum(evalExpr(x.val, { get = get, turn = turn })))
            else put(n, jsstr(x.val)) end
          end)
        end
      end
    end
  end
  return out
end

-- evaluate: messages = {{role, data}}, state = {f, t}, getv(이름) → 값
local function evaluate(messages, turn, state, getv)
  local function pick(src)
    local o = {}
    for rid, turns in pairs(src or {}) do
      local tt = {}
      if type(turns) == "table" then for _, x in ipairs(turns) do if type(x) == "number" and x < turn then tt[#tt + 1] = x end end end
      if #tt > 0 then o[rid] = tt end
    end
    return o
  end
  local hist, trig = pick(state.f), pick(state.t)
  local byRid = {}
  for _, it in ipairs(ITEMS) do byRid[it.rid] = it end
  local function textsFor(scan, who)
    who = who or "any"
    local out = {}
    if who == "input" then
      for i = #messages, 1, -1 do if messages[i].role == "user" then return { messages[i].data or "" } end end
      return out
    end
    local n = math.max(1, math.floor(tonumber(scan) or 4))
    if not tonumber(scan) or tonumber(scan) == 0 then n = 4 end
    for i = math.max(1, #messages - n + 1), #messages do
      local m = messages[i]
      if who == "any" or m.role == who then out[#out + 1] = m.data or "" end
    end
    return out
  end
  local function commonOf(it)
    if not it.rule.common then return nil end
    local ks = splitKeys(it.rule.commonKeys)
    if #ks == 0 then local all = splitKeys(it.key) ks = { all[1] } end
    local keys = {}
    for _, k in ipairs(ks) do keys[k] = true end
    local recent = false
    for _, t in ipairs(hist[it.rid] or {}) do if turn - t <= 3 then recent = true end end
    return { keys = keys, confirm = splitKeys(it.rule.commonWords), recent = recent }
  end
  local function holdOf(it) return math.max(0, math.floor(tonumber(it.rule.hold) or 0)) end
  local function blocked(it)
    local h = hist[it.rid]
    if not h or #h == 0 then return false end
    if it.rule.once == "chat" then return true end
    if it.rule.once == "cooldown" then
      local cool = tonumber(it.rule.cool) or 1
      if cool ~= cool or cool == 0 then cool = 1 end
      return turn - maxOf(h) <= math.max(1, cool)
    end
    return false
  end
  local function roll(p)
    local pv = 100
    if not empty(p) then pv = jsnum(p) or (0/0) end
    return rng() * 100 < pv
  end
  local active, rolled = omap(), {}
  for _, it in ipairs(ITEMS) do
    local n = holdOf(it)
    if n > 1 then
      for _, t in ipairs(trig[it.rid] or {}) do if turn - t < n then active:set(it.rid, { it = it, rid = it.rid, why = "지속" }) break end end
    end
  end
  local function countHits(it, c)
    local who, keys, n = c["in"] or "any", splitKeys(c.keys), 0
    for _, m in ipairs(messages) do
      if (who == "any" or m.role == who) and keyHit(keys, { m.data or "" }, { regex = not not c.regex, whole = not not it.rule.whole }) then n = n + 1 end
    end
    return n
  end
  local function inRange(n, c)
    local lo = 1
    if not empty(c.min) then lo = jsnum(c.min) or (0/0) end
    if not (n >= lo) then return false end
    if empty(c.max) then return true end
    return n <= (jsnum(c.max) or (0/0))
  end
  local function condOk(it, c)
    local t = c.t
    if t == "keys" then
      local texts = textsFor(it.rule.scan)
      local o = { regex = it.rx, whole = not not it.rule.whole, common = commonOf(it) }
      if not keyHit(splitKeys(it.key), texts, o) then return false end
      if it.sel and #splitKeys(it.sk) > 0 then return keyHit(splitKeys(it.sk), texts, o) end
      return true
    elseif t == "notext" or t == "text" then
      local scan = c.scan
      if scan == nil then scan = it.rule.scan end
      local hit = keyHit(splitKeys(c.keys), textsFor(scan, c["in"] or "any"), { regex = not not c.regex, all = not not c.all, whole = not not it.rule.whole })
      if t == "notext" then return not hit end
      return hit
    elseif t == "var" then
      local v = getv(c.name)
      return cmp(v, c.op or "=", c.val)
    elseif t == "turn" then
      return (empty(c.min) or turn >= (jsnum(c.min) or (0/0))) and (empty(c.max) or turn <= (jsnum(c.max) or (0/0)))
    elseif t == "count" then
      return #splitKeys(c.keys) > 0 and inRange(countHits(it, c), c)
    elseif t == "times" then
      local rid = c.rid
      if empty(rid) then rid = it.rid end
      return inRange(#(hist[rid] or {}), c)
    elseif t == "with" then return active:has(c.rid)
    elseif t == "without" then return not active:has(c.rid)
    end
    return true
  end
  local function condsOk(it)
    local cs = it.rule.cond or {}
    if #cs == 0 then return true end
    if it.rule.mode == "any" then
      for _, c in ipairs(cs) do if condOk(it, c) then return true end end
      return false
    end
    for _, c in ipairs(cs) do if not condOk(it, c) then return false end end
    return true
  end
  local function add(it, why) active:set(it.rid, { it = it, rid = it.rid, why = why }) return true end
  local affItems = {}
  for _, it in ipairs(ITEMS) do if it.aff then affItems[#affItems + 1] = it end end
  local function inAff(x, fid) return contains(x.affs, fid) end
  local function affTrig(it)
    if not it.aff then return nil end
    for _, kv in ipairs(active:entries()) do
      local rid = kv[1]
      local x = byRid[rid]
      if x and rid ~= it.rid and x.place and ((x.affs or {})[1] == it.fid or contains(x.place, it.fid)) then return "장소" end
    end
    for _, kv in ipairs(active:entries()) do
      local rid, a = kv[1], kv[2]
      local x = byRid[rid]
      if x and not x.place and rid ~= it.rid and inAff(x, it.fid) then
        if not startsWith(a.why, "소속") then return "구성원" end
      end
    end
    return nil
  end
  local expanded = {}
  for pass = 1, 12 do
    local changed = false
    for _, it in ipairs(ITEMS) do
      local cur = active:get(it.rid)
      if not (cur and cur.why ~= "지속") and not blocked(it) then
        local why
        if condsOk(it) then why = "조건" else why = affTrig(it) end
        if why then
          if rolled[it.rid] == nil then rolled[it.rid] = roll(it.rule.prob) end
          if rolled[it.rid] then
            if why == "조건" then add(it, "조건") else add(it, "소속 켜짐: " .. why) end
            changed = true
          end
        end
      end
    end
    for _, g in ipairs(affItems) do
      local ga = active:get(g.rid)
      if ga and not expanded[g.rid] then
        expanded[g.rid] = true
        if not startsWith(ga.why, "소속 켜짐: 구성원") then
          local a = g.aff
          local pass2 = {}
          for _, tgt in ipairs(ITEMS) do
            if not (tgt.place or tgt.aff or not inAff(tgt, g.fid) or active:has(tgt.rid) or blocked(tgt)) then
              local pr = a.prob and a.prob[tgt.rid]
              local p
              if empty(pr) then p = a.def else p = jsnum(pr) or (0/0) end
              if roll(p) then pass2[#pass2 + 1] = tgt end
            end
          end
          local max = jsnum(a.max)
          if not empty(a.max) and max and max >= 0 and #pass2 > max then
            for i = #pass2, 2, -1 do
              local j = math.floor(rng() * i) + 1
              pass2[i], pass2[j] = pass2[j], pass2[i]
            end
            local keep = {}
            for i = 1, max do keep[i] = pass2[i] end
            pass2 = keep
          end
          for _, tgt in ipairs(pass2) do add(tgt, "소속: " .. jsstr(g.name)) changed = true end
        end
      end
    end
    for _, a in ipairs(active:values()) do
      if not startsWith(a.why, "소속 켜짐: 구성원") then
        for _, c in ipairs(a.it.rule.chain or {}) do
          local tgt = byRid[c.rid]
          if tgt and not active:has(tgt.rid) and not blocked(tgt) then
            local key = a.rid .. ">" .. tgt.rid
            if rolled[key] == nil then
              rolled[key] = roll(c.prob)
              if rolled[key] then add(tgt, "연쇄") changed = true end
            end
          end
        end
      end
    end
    if not changed then break end
  end
  for _, a in ipairs(active:values()) do
    if a.why == "조건" then
      local hasWithout = false
      for _, c in ipairs(a.it.rule.cond or {}) do if c.t == "without" then hasWithout = true end end
      if hasWithout and not condsOk(a.it) then active:delete(a.rid) end
    end
  end
  local groups = {}
  for _, a in ipairs(active:values()) do
    local g = trim(jsstr(a.it.rule.group))
    if g ~= "" then
      local cur = groups[g]
      if not cur or (a.it.ord or 0) > (cur.it.ord or 0) then groups[g] = a end
    end
  end
  local seen, fired = {}, {}
  for _, a in ipairs(active:values()) do
    local g = trim(jsstr(a.it.rule.group))
    if not (g ~= "" and groups[g] ~= a) then
      if not seen[a.it.dk] then
        seen[a.it.dk] = true
        fired[#fired + 1] = a
      end
    end
  end
  local f, t = copy(hist), copy(trig)
  for _, a in ipairs(fired) do
    f[a.rid] = append(f[a.rid], turn)
    if a.why ~= "지속" then t[a.rid] = append(t[a.rid], turn) end
  end
  return fired, { f = f, t = t }
end

-- ---------- 채팅과 연결 ----------
local function toMsgs(chat)
  local out = {}
  for _, m in ipairs(chat or {}) do
    out[#out + 1] = { role = (m.role == "user") and "user" or "char", data = jsstr(m.data), time = m.time }
  end
  return out
end
local function turnOf(msgs) local n = 0 for _, m in ipairs(msgs) do if m.role == "user" then n = n + 1 end end return n end
local function readVar(id, n)
  local v = getChatVar(id, n)
  if v == nil or v == "null" then return nil end
  return v
end
local function readState(id)
  local raw = readVar(id, STATE)
  if not raw or raw == "" then return {} end
  local ok, s = pcall(json.decode, raw)
  if ok and type(s) == "table" then return s end
  return {}
end
local NIL = {}
local function overlay(id)
  local ov = {}
  return ov, function(n)
    local v = ov[n]
    if v == NIL then return nil end
    if v ~= nil then return v end
    return readVar(id, n)
  end
end
local function gatePatch(patch, fired)
  local on = {}
  for _, a in ipairs(fired) do on[a.rid] = true end
  for _, it in ipairs(ITEMS) do patch[#patch + 1] = { it.gate, on[it.rid] and "1" or "0" } end
end
local function ridList(fired, skipHold)
  local o = {}
  for _, a in ipairs(fired) do if not (skipHold and a.why == "지속") then o[#o + 1] = a.rid end end
  return o
end
local function writePatch(id, patch)
  for _, kv in ipairs(patch) do setChatVar(id, kv[1], kv[2]) end
end

-- 입력 때 (decide)
local function decide(id, input)
  local msgs = toMsgs(getFullChat(id))
  local last = msgs[#msgs]
  local inp = jsstr(input)
  if trim(inp) ~= "" and not (last and last.role == "user" and trim(last.data) == trim(inp)) then
    msgs[#msgs + 1] = { role = "user", data = inp }
  end
  local turn = turnOf(msgs)
  local st = readState(id)
  local f, t = copy(st.f or {}), copy(st.t or {})
  local ov, getv = overlay(id)
  local p = st.p
  local lastChar
  for i = #msgs, 1, -1 do if msgs[i].role ~= "user" and msgs[i].time ~= nil then lastChar = msgs[i] break elseif msgs[i].role ~= "user" then lastChar = msgs[i] break end end
  if type(p) == "table" and p.turn == turn - 1 then
    if lastChar and type(lastChar.time) == "number" and lastChar.time > (tonumber(p.at) or 0) then
      for k, arr in pairs(f) do local o = {} for _, x in ipairs(arr) do if x ~= p.turn then o[#o + 1] = x end end f[k] = o end
      for k, arr in pairs(t) do local o = {} for _, x in ipairs(arr) do if x ~= p.turn then o[#o + 1] = x end end t[k] = o end
      for _, rid in ipairs(p.fired or {}) do f[rid] = append(f[rid], p.turn) end
      for _, rid in ipairs(p.trig or {}) do t[rid] = append(t[rid], p.turn) end
    elseif type(p.vars) == "table" and type(st.b) == "table" and st.b.turn == p.turn then
      for n, v in pairs(p.vars) do
        local bo = type(st.b.out) == "table" and st.b.out or {}
        if bo[n] ~= nil and jsstr(getv(n)) == jsstr(v) then ov[n] = bo[n] end
      end
    end
  end
  local fired, ns = evaluate(msgs, turn, { f = f, t = t }, getv)
  local out = applySets(fired, getv, turn)
  local patch = {}
  gatePatch(patch, fired)
  local base, outv = {}, {}
  for _, n in ipairs(DATA.targets or {}) do
    local after = out[n]
    if after == nil then after = getv(n) end
    local orig = readVar(id, n)
    if after ~= nil and jsstr(after) ~= jsstr(orig) then patch[#patch + 1] = { n, jsstr(after) } end
    base[n] = getv(n)
    outv[n] = jsstr(after)
  end
  local own = {}
  for _, it in ipairs(ITEMS) do own[it.rid] = true end
  local function merge(orig, nx)
    local o = {}
    for rid, v in pairs(orig or {}) do if not own[rid] then o[rid] = v end end
    for rid, v in pairs(nx or {}) do if own[rid] then o[rid] = v end end
    return o
  end
  local state = { f = merge(st.f, ns.f), t = merge(st.t, ns.t) }
  if #(DATA.targets or {}) > 0 then state.b = { turn = turn, base = base, out = outv } end
  patch[#patch + 1] = { STATE, json.encode(state) }
  writePatch(id, patch)
end

-- 응답 뒤 (prepare): 다시 생성 대비
local function prepare(id)
  if DATA.reroll == "keep" then return end
  local all = toMsgs(getFullChat(id))
  local e = #all
  while e > 0 and all[e].role ~= "user" do e = e - 1 end
  if e == 0 or e == #all then return end
  local msgs = {}
  for i = 1, e do msgs[i] = all[i] end
  local turn = turnOf(msgs)
  local st = readState(id)
  local ov, getv = overlay(id)
  if type(st.b) == "table" and st.b.turn == turn then
    for _, n in ipairs(DATA.targets or {}) do
      local v = type(st.b.base) == "table" and st.b.base[n] or nil
      if v == nil then ov[n] = NIL else ov[n] = v end
    end
  end
  local fired, _ = evaluate(msgs, turn, { f = st.f or {}, t = st.t or {} }, getv)
  local out = applySets(fired, getv, turn)
  local pv = {}
  for _, n in ipairs(DATA.targets or {}) do
    local after = out[n]
    if after == nil then after = getv(n) end
    pv[n] = jsstr(after)
  end
  local at = tonumber(all[#all].time) or 0
  local p = { turn = turn, fired = ridList(fired, false), trig = ridList(fired, true), at = at }
  if #(DATA.targets or {}) > 0 then p.vars = pv end
  local state = { f = st.f or {}, t = st.t or {}, p = p }
  if st.b ~= nil then state.b = st.b end
  local patch = {}
  gatePatch(patch, fired)
  for _, n in ipairs(DATA.targets or {}) do patch[#patch + 1] = { n, pv[n] } end
  local same = true
  for _, kv in ipairs(patch) do if jsstr(readVar(id, kv[1])) ~= kv[2] then same = false break end end
  if not DATA.random and same then return end
  patch[#patch + 1] = { STATE, json.encode(state) }
  writePatch(id, patch)
end

listenEdit("editInput", function(id, value)
  pcall(decide, id, value)
  return value
end)
function onOutput(id)
  pcall(prepare, id)
end
`;
