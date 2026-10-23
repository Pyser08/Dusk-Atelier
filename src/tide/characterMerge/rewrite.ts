import { hashValue } from '../characterUpdateMerge'
import type { Part, Rename } from './types'

const assetStem = (name: string) => name.replace(/\.[^.\s/]+$/, '')
export const assetName = (name: string) => assetStem(name).toLowerCase()
const luaProtected = new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' '))

type Maps = Map<Rename['space'], Map<string, string>>
function mapsFor(renames: Rename[]): Maps {
    const maps: Maps = new Map()
    for (const r of renames) {
        if (!r.from.trim() || (r.space === 'assets' && !assetStem(r.from))) continue
        if (!maps.has(r.space)) maps.set(r.space, new Map())
        maps.get(r.space)!.set(r.from, r.to)
    }
    return maps
}
function exact(text: string, map?: Map<string, string>): string {
    const trimmed = text.trim(), replacement = map?.get(trimmed)
    return replacement === undefined ? text : text.replace(trimmed, () => replacement)
}
type AssetTrie = { children: Map<string, AssetTrie>; to?: string }
const assetMaps = new WeakMap<Map<string, string>, { lookup: Map<string, string>; trie: AssetTrie }>()
function assetsFor(map: Map<string, string>) {
    let assets = assetMaps.get(map)
    if (!assets) {
        const entries = [...map].sort((a, b) => b[0].length - a[0].length)
        const trie: AssetTrie = { children: new Map() }
        for (const [from, to] of entries) {
            let node = trie
            for (const char of assetStem(from)) {
                const key = char.toLowerCase()
                if (!node.children.has(key)) node.children.set(key, { children: new Map() })
                node = node.children.get(key)!
            }
            node.to = to
        }
        assets = {
            lookup: new Map(entries.map(([from, to]) => [assetName(from), to])),
            trie,
        }
        assetMaps.set(map, assets)
    }
    return assets
}
function rewriteAssetList(text: string, map: Map<string, string>): string {
    const { trie } = assetsFor(map)
    const protectedChar = (char: string) => /[\p{L}\p{N}_./-]/u.test(char)
    let output = '', copied = 0, previous = ''
    for (let i = 0; i < text.length;) {
        const char = String.fromCodePoint(text.codePointAt(i)!)
        let node = !protectedChar(previous) ? trie.children.get(char.toLowerCase()) : undefined
        let end = i + char.length, match: { end: number; replacement: string } | undefined
        while (node) {
            if (node.to !== undefined) {
                const extension = /^\.[a-z0-9]+/i.exec(text.slice(end))?.[0] ?? ''
                const after = end + extension.length
                const next = after < text.length ? String.fromCodePoint(text.codePointAt(after)!) : ''
                if (!protectedChar(next)) match = { end: after, replacement: assetStem(node.to) + extension }
            }
            if (end >= text.length) break
            const next = String.fromCodePoint(text.codePointAt(end)!)
            node = node.children.get(next.toLowerCase())
            end += next.length
        }
        if (match) {
            output += text.slice(copied, i) + match.replacement
            copied = match.end
            previous = [...text.slice(i, match.end)].at(-1) ?? ''
            i = match.end
        } else { previous = char; i += char.length }
    }
    return output + text.slice(copied)
}
function assetExact(text: string, map?: Map<string, string>): string {
    const to = map && assetsFor(map).lookup.get(assetName(text.trim()))
    if (to !== undefined) {
        const extension = /\.[^.\s/]+$/.exec(text.trim())?.[0] ?? ''
        const replacement = assetStem(to) + extension
        return text.replace(text.trim(), () => replacement)
    }
    return text
}

/** A scanner must advance even when a future token pattern accepts an empty match. */
export function* progressingMatches(text: string, pattern: RegExp): Generator<RegExpExecArray> {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    while (regex.lastIndex <= text.length) {
        const start = regex.lastIndex
        const match = regex.exec(text)
        if (!match) return
        const advance = regex.unicode && (text.codePointAt(match.index) ?? 0) > 0xffff ? 2 : 1
        regex.lastIndex = Math.max(start + 1, regex.lastIndex, match.index + advance)
        yield match
    }
}

// CSS tokens retain offsets by passing comments and quoted text through untouched.
function cssTokens(text: string, map?: Map<string, string>, selectors = false): string {
    return text.replace(/\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[.#]?[\p{L}_-][\p{L}\p{N}_-]*/gu, token => {
        if (token.startsWith('/*') || token.startsWith('"') || token.startsWith("'")) return token
        if (selectors && token[0] !== '.' && token[0] !== '#') return token
        return map?.get(token) ?? token
    })
}
function declarations(css: string, maps: Maps): string {
    // Match complete declarations, so a color/hash, URL or generated prose is never a selector.
    return css.replace(/(^|;)\s*(--[\w-]+|[\w-]+)\s*:\s*((?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\/|[^;"'])*)/g,
        (whole, _separator: string, property: string, body: string) => {
            const newProperty = maps.get('cssVars')?.get(property) ?? property
            let newBody = body.replace(/\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|var\(\s*(--[\w-]+)/g,
                (match, name?: string) => name ? match.replace(name, () => maps.get('cssVars')?.get(name) ?? name) : match)
            if (/^(?:-webkit-)?animation(?:-name)?$/.test(property)) newBody = cssTokens(newBody, maps.get('keyframes'))
            const offset = whole.length - body.length
            return whole.slice(0, offset).replace(property, () => newProperty) + newBody
        })
}

/** Visit balanced CSS blocks, including nested media/supports rules, without parsing declaration strings as blocks. */
export function cssBlocks(css: string, visit: (header: string, body: string, context: string[]) => { header: string; body: string; after?: string }, context: string[] = []): string {
    const token = /\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[{};]/g
    let start = 0, open = -1, depth = 0, header = '', result = ''
    for (const match of progressingMatches(css, token)) {
        if (match[0] === '{') {
            if (depth++ === 0) { open = match.index; header = css.slice(start, open) }
        } else if (match[0] === '}' && depth > 0 && --depth === 0) {
            const body = css.slice(open + 1, match.index)
            const cleanHeader = header.replace(/\/\*[\s\S]*?\*\//g, '').trim()
            const nested = /^@(media|supports|container|layer|document|scope)\b/i.test(cleanHeader)
            const changed = visit(header, body, context)
            result += changed.header + '{' + (nested ? cssBlocks(body, visit, [...context, cleanHeader]) : changed.body) + '}' + (changed.after ?? '')
            start = match.index + 1
        } else if (match[0] === ';' && depth === 0) {
            result += css.slice(start, match.index + 1)
            start = match.index + 1
        }
    }
    return result + css.slice(start)
}
function rewriteCss(css: string, maps: Maps): string {
    return cssBlocks(css, (header, body) => {
        const keyframe = /(@(?:-webkit-)?keyframes\s+)([\w-]+)/.exec(header)
        if (keyframe) return { header: header.replace(keyframe[0], () => keyframe[1] + (maps.get('keyframes')?.get(keyframe[2]) ?? keyframe[2])), body }
        const atRule = header.replace(/\/\*[\s\S]*?\*\//g, '').trim().startsWith('@')
        return { header: atRule ? header : cssTokens(header, maps.get('css'), true), body: declarations(body, maps) }
    })
}

/** Exact rule signatures are shared by collision planning; no normalization of CSS definitions. */
export function cssDefinitions(parts: Part[]): Map<string, string[]> {
    const definitions = new Map<string, string[]>()
    const add = (space: string, name: string, signature: string) => {
        const key = `${space}:${name}`
        if (!definitions.has(key)) definitions.set(key, [])
        definitions.get(key)!.push(signature)
    }
    const scan = (css: string) => {
        cssBlocks(css, (header, body, context) => {
            const clean = header.replace(/\/\*[\s\S]*?\*\//g, '').trim()
            const signature = JSON.stringify([context, header, body])
            const keyframe = /^@(?:-webkit-)?keyframes\s+([\w-]+)/.exec(clean)
            if (keyframe) add('keyframes', keyframe[1], signature)
            else if (!clean.startsWith('@')) {
                const selector = clean.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"|'[^']*'/g, '')
                for (const match of selector.matchAll(/[.#][\p{L}_-][\p{L}\p{N}_-]*/gu)) add('css', match[0], signature)
                for (const match of body.matchAll(/(?:^|;)\s*(--[\w-]+)\s*:\s*([^;]+)/g)) add('cssVars', match[1], JSON.stringify([context, match[2]]))
            }
            return { header, body }
        })
    }
    const walk = (value: unknown) => {
        if (typeof value === 'string') {
            for (const match of value.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) scan(match[1])
        } else if (value && typeof value === 'object') Object.values(value).forEach(walk)
    }
    for (const part of parts) {
        walk(part.value)
        if (part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value)) scan(part.value)
    }
    for (const [key, rules] of definitions) definitions.set(key, [...new Set(rules)].sort())
    return definitions
}

function rewriteText(text: string, maps: Maps, assetList = false): string {
    if (!text.includes('{{') && !text.includes('<') && !text.includes('@@inject_lore') && !(assetList && maps.get('assets')?.size)) return text
    text = text.replace(/\{\{\s*(getvar|setvar|addvar|raw|image|img|emotion|audio|video|asset)\s*::\s*([^{}:]+)(?=::|\}\})/gi,
        (whole, command: string, name: string) => whole.slice(0, whole.length - name.length) + (['getvar', 'setvar', 'addvar'].includes(command.toLowerCase()) ? exact(name, maps.get('variables')) : assetExact(name, maps.get('assets'))))
    text = text.replace(/(\{\{button::[^{}]*?::)([^{}:]+)(\}\})/gi, (_whole, head, name, end) => head + exact(name, maps.get('buttons')) + end)
    text = text.replace(/(@@inject_lore[ \t]+)([^\r\n]+)/g, (_whole, head, name) => head + exact(name, maps.get('loreNames')))
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>/gi, tag => {
        if (/^<style\b/i.test(tag)) return tag.replace(/(>)([\s\S]*?)(<\/style)/i, (_whole, head, css, tail) => head + rewriteCss(css, maps) + tail)
        return tag.replace(/(\b([\w-]+)\s*=\s*)("([^"]*)"|'([^']*)')/g, (_whole, head, attribute: string, quoted: string, double: string, single: string) => {
            const name = attribute.toLowerCase(), original = double ?? single
            let value = original
            if (name === 'class') value = value.replace(/\S+/g, token => maps.get('css')?.get(`.${token}`)?.slice(1) ?? token)
            else if (name === 'id') value = maps.get('css')?.get(`#${value}`)?.slice(1) ?? value
            else if (name === 'risu-trigger' || name === 'risu-btn') value = exact(value, maps.get('buttons'))
            else if (name === 'style') value = declarations(value, maps)
            else for (const space of ['variables', 'loreNames'] as const) value = exact(original, maps.get(space)) === original ? value : exact(original, maps.get(space))
            return head + quoted[0] + value + quoted[0]
        })
    })
    if (assetList && maps.get('assets')?.size) {
        // Names may contain spaces; Unicode boundaries protect Korean particles and longer identifiers.
        text = rewriteAssetList(text, maps.get('assets')!)
    }
    return text
}

function decodeLua(text: string): string {
    return text.replace(/\\(?:z\s*|x[\da-fA-F]{2}|\d{1,3}|\r?\n|[\s\S])/g, escaped => {
        const code = escaped.slice(1)
        if (code[0] === 'z') return ''
        if (code[0] === 'x') return String.fromCharCode(parseInt(code.slice(1), 16))
        if (/^\d/.test(code)) return String.fromCharCode(Number(code))
        return ({ a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' } as Record<string, string>)[code] ?? code
    })
}
function rewriteLua(code: string, maps: Maps): string {
    const tokens = /--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[a-zA-Z_][a-zA-Z_0-9]*|\.\.|[^\s]/g
    let previous = ''
    const frames: { opener: string; callee: string; argument: number }[] = []
    return code.replace(tokens, token => {
        if (token.startsWith('--')) return token
        const long = /^\[(=*)\[/.exec(token)
        if (long || token[0] === '"' || token[0] === "'") {
            const raw = long ? token.slice(long[0].length, -(long[1].length + 2)) : token.slice(1, -1)
            const decoded = long ? raw : decodeLua(raw)
            previous = 'string'
            if (frames.some(frame => frame.callee === 'getGlobalVar' && frame.argument === 1) && !maps.get('buttons')?.has(decoded)) return token
            let changed = rewriteText(decoded, maps)
            const asset = assetExact(decoded, maps.get('assets'))
            if (asset !== decoded) changed = asset
            for (const space of ['variables', 'loreNames', 'cssVars', 'keyframes'] as const) {
                if (decoded.trim() === decoded && maps.get(space)?.has(decoded)) { changed = maps.get(space)!.get(decoded)!; break }
            }
            for (const [from, to] of maps.get('css') ?? []) {
                if (decoded === from) changed = to
                else if (decoded === from.slice(1)) changed = to.slice(1)
            }
            // Lua selector strings may contain multiple selectors, but ordinary prose stays unchanged.
            if (/^[.#][\p{L}_-]/u.test(decoded)) changed = cssTokens(decoded, maps.get('css'), true)
            if (maps.get('buttons')?.has(decoded)) changed = maps.get('buttons')!.get(decoded)!
            previous = 'string'
            if (changed === decoded) return token
            if (long) {
                let equals = long[1]
                while (changed.includes(`]${equals}]`)) equals += '='
                return `[${equals}[${changed}]${equals}]`
            }
            const quote = token[0]
            return quote + changed.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote).replace(/\n/g, '\\n').replace(/\r/g, '\\r') + quote
        }
        if (['(', '[', '{'].includes(token)) frames.push({ opener: token, callee: token === '(' ? previous : '', argument: 0 })
        else if ([')', ']', '}'].includes(token)) frames.pop()
        else if (token === ',' && frames.at(-1)?.opener === '(') frames[frames.length - 1].argument++
        previous = token
        if (luaProtected.has(token) || !/^[a-zA-Z_]\w*$/.test(token)) return token
        // Button names are source-local symbols, including table keys and members.
        // Host variable/asset/etc. names are references only inside string literals.
        return maps.get('buttons')?.get(token) ?? token
    })
}

/** Rewrites values only; part identity remains stable for provenance and partial updates. */
export function applyRenames(parts: Part[], renames: Rename[]): Part[] {
    const bySource = new Map<string, Maps>()
    for (const sourceId of new Set(renames.map(r => r.sourceId))) bySource.set(sourceId, mapsFor(renames.filter(r => r.sourceId === sourceId)))
    return parts.map(part => {
        const maps = bySource.get(part.sourceId)
        if (!maps) return part
        if ((part.kind === 'asset' || part.kind === 'emotion') && !maps.has('assets') && Array.isArray(part.value)
            && part.value.every(value => typeof value !== 'string' || !value.includes('{{') && !value.includes('<'))) return part
        const walk = (value: unknown): unknown => {
            if (typeof value === 'string') return rewriteText(value, maps, part.kind === 'lore')
            if (Array.isArray(value)) return value.map(walk)
            if (!value || typeof value !== 'object') return value
            const node = value as Record<string, unknown>
            const result: Record<string, unknown> = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, key === 'code' && node.type === 'triggerlua' && typeof child === 'string' ? rewriteLua(child, maps) : walk(child)]))
            for (const field of ['var', 'target', 'value'] as const) {
                if (typeof node[field] !== 'string') continue
                if ((field === 'var' && ['var', 'setvar', 'v2SetVar'].includes(String(node.type)))
                    || (field === 'target' && node.targetType === 'var') || (field === 'value' && node.valueType === 'var')) result[field] = exact(node[field], maps.get('variables'))
                if ((field === 'value' && node.type === 'runtrigger') || (field === 'target' && node.type === 'v2RunTrigger')) result[field] = exact(node[field], maps.get('buttons'))
            }
            return result
        }
        let value = walk(part.value)
        if (part.kind === 'luaTrigger' && typeof part.value === 'string') value = rewriteLua(part.value, maps)
        if (part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value)) value = rewriteCss(part.value, maps)
        if (part.kind === 'variable' && typeof value === 'string') value = value.replace(/^(\s*)([^#=\s][^=]*)(=)/, (_whole, head, name, end) => head + exact(name, maps.get('variables')) + end)
        if ((part.kind === 'asset' || part.kind === 'emotion') && Array.isArray(value)) value[0] = assetExact(String((part.value as unknown[])[0]), maps.get('assets'))
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const node = value as Record<string, unknown>
            if (part.kind === 'lore' && typeof node.comment === 'string') node.comment = exact(node.comment, maps.get('loreNames'))
            if ((part.kind === 'trigger' || part.kind === 'luaTrigger') && node.type === 'manual' && typeof node.comment === 'string') node.comment = exact(node.comment, maps.get('buttons'))
        }
        return { ...part, value, hash: hashValue(value) }
    })
}
