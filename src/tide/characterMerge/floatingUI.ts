import { cssBlocks } from './rewrite'
import { hashValue } from '../characterUpdateMerge'
import type { FloatingConflict, FloatingUI, MergeInput, Part } from './types'

type Rule = { selector: string; properties: Record<string, string> }
const rulesCache = new Map<string, Rule[]>()
// Descendant rules, pseudo-elements and images filling their cards are not floating controls.
function rootSelector(selector: string): string | undefined {
    return /^(?:[a-z][\w-]*)?([.#][\p{L}_-][\p{L}\p{N}_-]*)(?:\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?)*$/iu.exec(selector.trim())?.[1]
}
function rules(css: string): Rule[] {
    const cached = rulesCache.get(css)
    if (cached) return cached
    const result: Rule[] = []
    cssBlocks(css, (header, body) => {
        const selector = header.replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (!selector.startsWith('@')) {
            const declarations = body.replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\//g, token => token.startsWith('/*') ? '' : token)
            const properties = Object.fromEntries([...declarations.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*((?:"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[^;"'])*)/g)].map(m => [m[1].toLowerCase(), m[2].replace(/\s*!important\s*$/i, '').trim()]))
            for (const item of selector.split(',')) {
                const root = rootSelector(item)
                if (root && !item.includes(':')) result.push({ selector: root, properties })
            }
        }
        return { header, body }
    })
    if (rulesCache.size >= 128) rulesCache.delete(rulesCache.keys().next().value!)
    rulesCache.set(css, result)
    return result
}
function styles(value: unknown): string[] {
    if (typeof value === 'string') return [...value.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(m => m[1])
    return value && typeof value === 'object' ? Object.values(value).flatMap(styles) : []
}
const pixels = (value: string | undefined) => value && /^-?(?:\d*\.)?\d+(?:px)?$/.test(value) ? parseFloat(value) : undefined
function anchors(input: MergeInput): FloatingUI[] {
    const selectors = new Map<string, Record<string, string>>()
    const parents = new Map<string, Set<string>>()
    const scanParents = (value: unknown) => {
        if (typeof value !== 'string') {
            if (value && typeof value === 'object') Object.values(value).forEach(scanParents)
            return
        }
        const stack: { tag: string; names: string[] }[] = []
        for (const tag of value.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)) {
            const name = tag[2].toLowerCase()
            if (tag[1]) {
                const index = stack.findLastIndex(parent => parent.tag === name)
                if (index >= 0) stack.splice(index)
                continue
            }
            const names = [...tag[3].matchAll(/\b(class|id)\s*=\s*["']([^"']*)["']/gi)].flatMap(m => m[1].toLowerCase() === 'id' ? ['#' + m[2]] : m[2].split(/\s+/).filter(Boolean).map(c => '.' + c))
            for (const selector of names) {
                if (!parents.has(selector)) parents.set(selector, new Set())
                stack.forEach(parent => parent.names.forEach(n => parents.get(selector)!.add(n)))
            }
            if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name) && !tag[3].endsWith('/')) stack.push({ tag: name, names })
        }
    }
    for (const part of input.parts) {
        scanParents(part.value)
        const css = styles(part.value)
        if (part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value)) css.push(part.value)
        for (const text of css) for (const rule of rules(text)) {
            selectors.set(rule.selector, { ...selectors.get(rule.selector), ...rule.properties })
        }
    }
    const result: FloatingUI[] = []
    for (const [selector, p] of selectors) {
        if (!['fixed', 'sticky', 'absolute'].includes(p.position)) continue
        // Absolute controls contained by another positioned card are local UI.
        // A toolbar protruding above that card can still hit a viewport control.
        if (p.position === 'absolute' && (pixels(p.top) ?? 0) >= -10 && [...parents.get(selector) ?? []].some(parent => ['relative', 'fixed', 'sticky', 'absolute'].includes(selectors.get(parent)?.position ?? ''))) continue
        if (p.inset || p.top !== undefined && p.bottom !== undefined && p.left !== undefined && p.right !== undefined) continue
        if (/background|overlay|backdrop|particle|reflection|char-img|image-heart|icon|badge|close/i.test(selector)) continue
        if (/^(?:100|9\d|8\d)(?:%|vw)$/.test(p.width ?? '') && /^(?:100|9\d|8\d)(?:%|vh)$/.test(p.height ?? '')) continue
        const centered = p.left !== undefined && p.right !== undefined || /^(?:[4-5]\d)(?:\.\d+)?%$/.test(p.left ?? '') || /^(?:[4-5]\d)(?:\.\d+)?%$/.test(p.right ?? '')
        const horizontal = centered ? 'center' : p.right !== undefined && p.right !== 'auto' ? 'right' : p.left !== undefined && p.left !== 'auto' ? 'left' : 'center'
        const vertical = p.bottom !== undefined && p.bottom !== 'auto' ? 'bottom' : p.top !== undefined && p.top !== 'auto' && !/^(?:[4-7]\d)(?:\.\d+)?%$/.test(p.top) ? 'top' : 'middle'
        if (horizontal === 'center' && vertical === 'middle') continue
        const inset = pixels(p[horizontal === 'center' ? vertical : horizontal]) ?? 0
        if (Math.abs(inset) > 200) continue
        const row = p.display === 'flex' && p['flex-direction'] !== 'column'
        result.push({ sourceId: input.meta.id, selector, position: p.position, horizontal, vertical, inset, width: pixels(p.width) ?? (row ? 288 : 64), height: pixels(p.height) ?? 64 })
    }
    return result
}
export function floatingConflicts(inputs: MergeInput[]): FloatingConflict[] {
    const perSource = inputs.map(anchors), conflicts: FloatingConflict[] = []
    for (let i = 0; i < perSource.length; i++) for (let j = i + 1; j < perSource.length; j++) {
        for (const a of perSource[i]) for (const b of perSource[j]) {
            if (a.horizontal === b.horizontal && a.vertical === b.vertical) conflicts.push({ a, b })
        }
    }
    return conflicts
}

/** Move only the added sources' conflicting selectors, preserving sibling anchor spacing. */
export function moveFloatingUI(parts: Part[], conflicts: FloatingConflict[]): Part[] {
    const moves = new Map<string, Map<string, { anchor: FloatingUI; property: string; offset: number }>>()
    for (const { a, b } of conflicts) {
        // A card-relative absolute toolbar has a different horizontal anchor
        // in each host. Moving a viewport control sideways can move it INTO
        // that toolbar. Keep its edge and move below/above the toolbar instead.
        const relativeToolbar = a.position === 'absolute' && b.position !== 'absolute' && b.vertical !== 'middle'
        const property = relativeToolbar ? b.vertical : b.horizontal === 'center' ? b.vertical : b.horizontal
        const prior = moves.get(a.sourceId)?.get(a.selector)?.offset ?? 0
        const extent = property === 'top' || property === 'bottom' ? a.height : a.width
        const offset = relativeToolbar ? prior + extent + 24 : Math.max(0, a.inset + prior + extent + 24 - b.inset)
        if (!moves.has(b.sourceId)) moves.set(b.sourceId, new Map())
        const source = moves.get(b.sourceId)!
        source.set(b.selector, { anchor: b, property, offset: Math.max(offset, source.get(b.selector)?.offset ?? 0) })
    }
    for (const source of moves.values()) for (const move of source.values()) {
        move.offset = Math.max(...[...source.values()].filter(other => other.property === move.property && other.anchor.horizontal === move.anchor.horizontal && other.anchor.vertical === move.anchor.vertical).map(other => other.offset))
    }
    return parts.map(part => {
        const selected = moves.get(part.sourceId)
        if (!selected?.size) return part
        const rewrite = (css: string) => cssBlocks(css, (header, body) => {
            const selectors = header.replace(/\/\*[\s\S]*?\*\//g, '').trim().split(',')
            const moved = selectors.map(selector => selected.get(rootSelector(selector) ?? ''))
            // Mixed rules must be split so unrelated selectors retain their original CSS.
            if (moved.some(Boolean) && (moved.some(m => !m) || new Set(moved.map(m => m && `${m.property}:${m.offset}`)).size > 1)) {
                const untouched = selectors.filter((_, i) => !moved[i]).join(',')
                const shifted = selectors.filter((_, i) => moved[i]).map(selector => rewrite(`${selector}{${body}}`)).join('')
                if (!untouched) {
                    const first = selectors.findIndex((_, i) => moved[i])
                    const one = rewrite(`${selectors[first]}{${body}}`), opening = one.indexOf('{'), closing = one.lastIndexOf('}')
                    return { header: one.slice(0, opening), body: one.slice(opening + 1, closing), after: selectors.filter((_, i) => i !== first).map(selector => rewrite(`${selector}{${body}}`)).join('') }
                }
                return { header: untouched, body, after: shifted }
            }
            const move = moved.find(Boolean)
            if (!move) return { header, body }
            const property = move.property
            const pattern = new RegExp(`(^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'gi')
            const dimension = property === 'top' || property === 'bottom' ? '100vh' : '100vw'
            const size = property === 'top' || property === 'bottom' ? move.anchor.height : move.anchor.width
            const changed = body.replace(pattern, (whole, delimiter, value) => {
                const important = /!important\s*$/i.test(value) ? ' !important' : ''
                const original = value.replace(/\s*!important\s*$/i, '').trim()
                if (original === 'auto') return whole
                return `${delimiter}${property}:min(calc(${original} + ${move.offset}px), max(0px, calc(${dimension} - ${size + 12}px)))${important}`
            })
            return { header, body: changed }
        })
        const walk = (value: unknown): unknown => {
            if (typeof value === 'string') return value.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_, open, css, close) => open + rewrite(css) + close)
            if (Array.isArray(value)) return value.map(walk)
            if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
            return value
        }
        const value = part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value) ? rewrite(part.value) : walk(part.value)
        return { ...part, value, hash: hashValue(value) }
    })
}
