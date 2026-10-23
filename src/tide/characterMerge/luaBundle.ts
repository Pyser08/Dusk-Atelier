import { parseBlocks } from './composite'

type LuaBlock = { blockId: string; code: string }

/** The host checks guards and trigger modes outside the Lua dispatcher. */
export function canBundleLuaTrigger(value: unknown): boolean {
    if (typeof value === 'string') return true
    if (!value || typeof value !== 'object') return false
    const trigger = value as { conditions?: unknown[]; type?: string }
    return !trigger.conditions?.length && (!trigger.type || trigger.type === 'start')
}

// Based on T0's verified bundle-template.lua. The additions preserve nil edits
// and let one legacy block load in _G while retaining its own event snapshot.
const prefix = `-- RisuTide bundle v1
local __sources = {}
local __reserved = {
  onInput = true, onOutput = true, onStart = true, onButtonClick = true
}
for name in pairs(_G) do __reserved[name] = true end

local function __invoke(fn, ...)
  local result = fn(...)
  if result ~= nil and result == Promise.resolve(result) then
    result = result:await()
  end
  -- Wasmoon resolves an async nil as JS null userdata, not Lua nil.
  if type(result) == "userdata" and tostring(result) == "null" then return nil end
  return result
end

local __events = { "onInput", "onOutput", "onStart", "onButtonClick" }

local function __load_source(id, code, shared)
  local env = setmetatable({}, { __index = _G })
  local hostListenEdit = listenEdit
  env.listenEdit = function(t, f)
    hostListenEdit(t, function(key, value, meta)
      local ok, result = pcall(__invoke, f, key, value, meta)
      if not ok then
        print("[RisuTide] edit failed " .. id .. ": " .. tostring(result))
        return value
      end
      if result == nil then return value end
      return result
    end)
  end
  local fn, err = load(code, "=" .. id, "t", shared and _G or env)
  if not fn then
    print("[RisuTide] load failed " .. id .. ": " .. tostring(err))
    return
  end
  local saved = {}
  if shared then
    for _, name in ipairs(__events) do
      saved[name] = rawget(_G, name)
      _G[name] = nil
    end
    _G.listenEdit = env.listenEdit
  end
  local ok, e = pcall(fn)
  if shared then
    for _, name in ipairs(__events) do
      env[name] = rawget(_G, name)
      _G[name] = saved[name]
    end
    _G.listenEdit = hostListenEdit
  end
  if not ok then
    print("[RisuTide] run failed " .. id .. ": " .. tostring(e))
  end
  __sources[#__sources + 1] = { id = id, env = env }
end
`

const suffix = `
for _, source in ipairs(__sources) do
  for name, fn in pairs(source.env) do
    if type(fn) == "function" and not __reserved[name] then
      _G[name] = fn
    end
  end
end

local function __dispatch(name, firstNonNil)
  return async(function(...)
    local lastResult = nil
    local stopped = false
    for _, source in ipairs(__sources) do
      local fn = rawget(source.env, name)
      if type(fn) == "function" then
        local ok, result = pcall(__invoke, fn, ...)
        if not ok then
          print("[RisuTide] " .. name .. " failed " .. source.id .. ": " .. tostring(result))
        elseif result ~= nil then
          if firstNonNil then return result end
          if result == false then stopped = true end
          lastResult = result
        end
      end
    end
    if stopped then return false end
    return lastResult
  end)
end

onInput = __dispatch("onInput", false)
onOutput = __dispatch("onOutput", false)
onStart = __dispatch("onStart", false)
onButtonClick = __dispatch("onButtonClick", true)
`

function needsSharedGlobals(code: string): boolean {
    // Ignore comments and literals, keeping token boundaries and member access.
    const tokens = code.match(/--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[A-Za-z_][A-Za-z_0-9]*|[^\s]/g) ?? []
    const executable = tokens.filter(token => !token.startsWith('--')).map(token => /^\[(=*)\[/.test(token) || token[0] === '"' || token[0] === "'" ? '' : token)
    return executable.some((token, i) => {
        if (executable[i - 1] === '.' || executable[i - 1] === ':') return false
        if (token === 'setfenv' || token === 'getfenv') return true
        if (token === 'debug' && executable[i + 1] === '.') return true
        return (token === 'rawset' || token === 'pairs') && executable[i + 1] === '(' && executable[i + 2] === '_G'
    })
}

/** Preserve ordinary IDs and reserve an injective UTF-8 encoding for unsafe IDs. */
export function luaSourceId(sourceId: string): string {
    return /^[A-Za-z0-9_.-]+$/.test(sourceId) && !sourceId.startsWith('rtid_') ? sourceId
        : `rtid_${Array.from(new TextEncoder().encode(sourceId), byte => byte.toString(16).padStart(2, '0')).join('')}`
}

export function unwrapLuaBlocks(code: string): LuaBlock[] | null {
    const parsed = bundleBlocks(code)
    return parsed && parsed.flatMap(block => unwrapLuaBlocks(block.code) ?? [block])
}
const hexId = (id: string) => Array.from(new TextEncoder().encode(id), byte => byte.toString(16).padStart(2, '0')).join('')
export function sourceLuaBlocks(sourceId: string, index: number, code: string): LuaBlock[] {
    const namespace = `${luaSourceId(sourceId)}#${index}`, blocks = unwrapLuaBlocks(code)
    return blocks ? blocks.map(b => ({ ...b, blockId: `${namespace}#${hexId(b.blockId)}` })) : [{ blockId: namespace, code }]
}
export function originalLuaBlockId(blockId: string): string | null {
    const encoded = /^[^#]+#\d+#([a-f0-9]+)$/.exec(blockId)?.[1]
    if (!encoded || encoded.length % 2) return null
    return new TextDecoder().decode(Uint8Array.from(encoded.match(/../g)!, byte => parseInt(byte, 16)))
}

function longBracket(code: string): string {
    let level = 0
    while (code.includes(`[${'='.repeat(level)}[`) || code.includes(`]${'='.repeat(level)}]`)) level++
    const eq = '='.repeat(level)
    // Lua drops the first newline; the trailing separator prevents delimiter overlap.
    return `[${eq}[\n${code}\n]${eq}]`
}

export function buildLuaBundle(blocks: LuaBlock[]): { code: string; unbundled: string[] } {
    const ids = new Set<string>()
    const unbundled: string[] = []
    const sources: string[] = []
    let sharedUsed = false
    for (const { blockId, code } of blocks) {
        if (!/^[A-Za-z0-9_.#-]+$/.test(blockId) || ids.has(blockId)) {
            throw new Error('Lua block IDs must be unique, safe single-line identifiers')
        }
        ids.add(blockId)
        const shared = needsSharedGlobals(code)
        if (shared && sharedUsed) {
            unbundled.push(blockId)
            continue
        }
        if (shared) sharedUsed = true
        sources.push(`-- >>> risutide:source ${blockId}\n__load_source("${blockId}", ${longBracket(code)}${shared ? ', true' : ''})\n-- <<< risutide:source ${blockId}\n`)
    }
    return { code: prefix + sources.join('') + suffix, unbundled }
}

export function bundleBlocks(code: string): LuaBlock[] | null {
    // Plain Lua has no framing to unmask. Large bot scripts hit this path
    // repeatedly during planning, warning generation and application.
    if (!code.startsWith('-- RisuTide bundle v1\n') && !code.includes('risutide:source')) return null
    const regions = parseBlocks(code, 'lua')
    if (!regions || (!regions.length && !code.startsWith('-- RisuTide bundle v1\n'))) return null
    const blocks: LuaBlock[] = []
    for (const { blockId, body } of regions) {
        const match = /^__load_source\("([A-Za-z0-9_.#-]+)", \[(=*)\[\n([\s\S]*)\n\]\2\](?:, true)?\)$/.exec(body)
        if (!match || match[1] !== blockId) return null
        // Remove exactly the two framing newlines, never trim original source bytes.
        if (match[3].includes(`]${match[2]}]`)) return null
        blocks.push({ blockId, code: match[3] })
    }
    return blocks
}
