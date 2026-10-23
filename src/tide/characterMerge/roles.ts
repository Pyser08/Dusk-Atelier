import { collectNames } from './names'
import type { MergeInput, Part, RoleGroup, RoleKind } from './types'

const status = /status|상태\s*창|statusbar|\[Status/i
const image = /img|image|asset|에셋|이미지/i
const display = (part: Part) => ['editdisplay', 'editprocess'].includes(String(node(part).type))
const node = (part: Part): Record<string, any> => part.value && typeof part.value === 'object' && !Array.isArray(part.value) ? part.value as Record<string, any> : {}
export const partField = (part: Part): string => part.key.slice(part.sourceId.length + 1).split(':')[0]

/** Importer defaults are not evidence that a card uses image generation. */
export function nonempty(value: unknown): boolean {
    if (typeof value === 'string') return !!value.trim()
    if (Array.isArray(value)) return value.some(nonempty)
    if (value && typeof value === 'object') return Object.values(value).some(nonempty)
    return value !== undefined && value !== null && value !== false && value !== 0
}
export function imageGenPart(part: Part): boolean {
    const field = partField(part)
    if (!['sdData', 'newGenData', 'prebuiltAssetCommand', 'prebuiltAssetStyle', 'prebuiltAssetExclude'].includes(field) && !field.startsWith('chatImageGen')) return false
    if (field === 'chatImageGenRefsVersion' && part.value === 1) return false
    if (field === 'sdData') {
        const defaults = [['always', 'solo, 1girl'], ['negative', ''], ["|character's appearance", ''], ['current situation', ''], ["$character's pose", ''], ["$character's emotion", ''], ['current location', '']]
        if (JSON.stringify(part.value) === JSON.stringify(defaults)) return false
    }
    return nonempty(part.value)
}

// Required top-level literal runs are cheap necessary conditions. In particular,
// a dialogue pattern cannot match without its pipe followed by a quoted value.
// This avoids quadratic failed searches on large minified output samples.
function requiredGroupEnding(pattern: string, start: number): string | undefined {
    if (pattern[start + 1] === '?' && pattern.slice(start + 1, start + 3) !== '?:') return
    let depth = 1, inClass = false, branch = start + (pattern[start + 1] === '?' ? 3 : 1)
    const branches: string[] = []
    for (let i = branch; i < pattern.length; i++) {
        const char = pattern[i]
        if (char === '\\') { i++; continue }
        if (inClass) { if (char === ']') inClass = false; continue }
        if (char === '[') { inClass = true; continue }
        if (char === '(') depth++
        if (char === '|' && depth === 1) { branches.push(pattern.slice(branch, i)); branch = i + 1 }
        if (char === ')' && --depth === 0) {
            branches.push(pattern.slice(branch, i))
            if (branches.length < 2 || /^(?:[?*]|\{0(?:,|\}))/.test(pattern.slice(i + 1))) return
            const endings = branches.map(body => {
                const escaped = /\\([^a-z0-9])$/i.exec(body)
                if (escaped) return escaped[1]
                // A bare ] is literal outside a character class. Avoid class endings.
                if (body === ']') return ']'
                return body.length === 1 && !/[\\[\]().*+?{}^$|]/.test(body) ? body : undefined
            })
            if (endings[0] && endings.every(end => end === endings[0])) return endings[0]
            return
        }
    }
}
function requiredRuns(pattern: string): string[] {
    const runs: string[] = []
    let depth = 0, inClass = false, run = '', mandatory = false
    const flush = () => { if (mandatory) runs.push(run); run = ''; mandatory = false }
    for (let i = 0; i < pattern.length;) {
        const start = i, char = pattern[i++]
        let literal = false, simple = false
        if (char === '\\') {
            const escaped = pattern[i++]
            if (inClass || depth) continue
            literal = !!escaped && !/[a-z0-9]/i.test(escaped)
            simple = literal || 'sSnrt'.includes(escaped)
            if (!simple) {
                if (escaped === 'x') i += 2
                else if (escaped === 'c') i++
                else if (escaped === 'u' && pattern[i] !== '{') i += 4
                else if (['u', 'p', 'P'].includes(escaped) && pattern[i] === '{') i = pattern.indexOf('}', i) + 1 || pattern.length
                else if (escaped === 'k' && pattern[i] === '<') i = pattern.indexOf('>', i) + 1 || pattern.length
                else if (/[0-9]/.test(escaped)) while (/[0-9]/.test(pattern[i] ?? '')) i++
            }
        } else if (inClass) { if (char === ']') inClass = false; continue }
        else if (char === '[') { if (!depth) flush(); inClass = true; continue }
        else if (char === '(') {
            if (!depth) {
                flush()
                // A mandatory literal choice and its trailing whitespace/header
                // decoration must occur even when an earlier capture is broad.
                const choice = /^\((?:\?:)?[\p{L}\p{N}_-]+(?:\|[\p{L}\p{N}_-]+)+\)/u.exec(pattern.slice(start))
                if (choice) {
                    const rest = pattern.slice(start + choice[0].length)
                    if (!/^(?:[?*]|\{0(?:,|\}))/.test(rest)) {
                        const ending = /^(?:(?:\\s|\[(?:\\s|\\\*|\*)+\])[*+?]?)?\$/.exec(rest)
                        runs.push(choice[0] + (ending?.[0] ?? ''))
                    }
                } else {
                    const ending = requiredGroupEnding(pattern, start)
                    if (ending) runs.push(ending.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                }
            }
            depth++; continue
        }
        else if (char === ')') {
            depth--
            if (!depth) {
                const quantifier = /^(?:[*+?]|\{\d+(?:,\d*)?\})\??/.exec(pattern.slice(i))
                if (quantifier) i += quantifier[0].length
            }
            continue
        }
        else if (char === '|' && depth === 0) return []
        else if (!depth) { literal = !'^$.*+?{}'.includes(char); simple = literal }
        if (depth || inClass) continue
        if (!simple) { flush(); continue }
        let optional = false
        if ('*+?'.includes(pattern[i] ?? '\0')) { optional = pattern[i] !== '+'; i++; if (pattern[i] === '?') i++ }
        else {
            const quantifier = /^\{(\d+)(?:,\d*)?\}\??/.exec(pattern.slice(i))
            if (quantifier) { optional = Number(quantifier[1]) === 0; i += quantifier[0].length }
        }
        if (!mandatory && literal && !optional) mandatory = true
        if (mandatory) run += pattern.slice(start, i)
    }
    flush()
    return runs
}
const patterns = new Map<string, { test: (text: string) => boolean }>()
/** Exact prefix filtering: a non-dotAll first field cannot span nonblank lines. */
function statusPipeCount(source: string): number {
    const prefix = '\\[\\s*(.*?)\\s*\\|', field = '\\s*(.*?):\\s*(.*?)\\s*'
    let rest = source.slice(prefix.length), count = 1
    while (rest.startsWith(field + '\\|')) { count++; rest = rest.slice(field.length + 2) }
    if (!rest.startsWith(field)) return 0
    rest = rest.slice(field.length)
    return rest.startsWith('\\]') || rest.startsWith(']') || rest.startsWith('(?:\\|#(.*?)\\]|])') ? count : 0
}
function statusStarts(text: string, minimumPipes: number): number[] {
    const pipes = [...text.matchAll(/\|/g)].map(m => m.index)
    const endings = pipes.map(index => { while (index > 0 && /\s/.test(text[index - 1])) index--; return index - 1 })
    const lines = [...text.matchAll(/[\n\r\u2028\u2029]/g)].map(m => m.index)
    const breaks: number[] = []
    if (minimumPipes) {
        let previous = '', end = 0
        for (const run of text.matchAll(/\S+/g)) {
            // In this recognized status grammar only whitespace next to a
            // bracket, pipe or colon can cross a line break; captures cannot.
            if (previous && /[\n\r\u2028\u2029]/.test(text.slice(end, run.index)) && !'[|:#'.includes(previous) && !'|:]'.includes(run[0][0])) breaks.push(run.index)
            previous = run[0].at(-1)!
            end = run.index + run[0].length
        }
    }
    const starts: number[] = []
    let pipe = 0, line = 0, block = 0
    for (let start = text.indexOf('['); start >= 0; start = text.indexOf('[', start + 1)) {
        while (pipes[pipe] !== undefined && pipes[pipe] <= start) pipe++
        if (pipes[pipe] === undefined) break
        while (breaks[block] !== undefined && breaks[block] <= start) block++
        if (minimumPipes && (pipes[pipe + minimumPipes - 1] === undefined || pipes[pipe + minimumPipes - 1] >= (breaks[block] ?? text.length))) continue
        let first = start + 1
        while (first < pipes[pipe] && /\s/.test(text[first])) first++
        while (lines[line] !== undefined && lines[line] < first) line++
        if (first > endings[pipe] || lines[line] === undefined || lines[line] > endings[pipe]) starts.push(start)
    }
    return starts
}
function pattern(part: Part): { test: (text: string) => boolean } | null {
    const r = node(part), flag = r.ableFlag ? String(r.flag || 'g') : 'g'
    if (flag.includes('<cbs>')) return null
    try {
        const flags = [...new Set(flag.replace(/<[^>]*>/g, '').replace(/[^dimsuvy]/g, ''))].join('')
        const key = JSON.stringify([r.in ?? '', flags])
        const cached = patterns.get(key)
        if (cached) return cached
        const regex = new RegExp(String(r.in ?? ''), flags)
        const required = regex.flags.includes('v') ? [] : requiredRuns(regex.source).map(run => new RegExp(run, regex.flags.replace('y', '') + 'g'))
        const statusPrefix = '\\[\\s*(.*?)\\s*\\|'
        const statusSearch = required.length && !/[sy]/.test(regex.flags) && regex.source.startsWith(statusPrefix) && !/^(?:[?*]|\{0(?:,|\}))/.test(regex.source.slice(statusPrefix.length)) ? new RegExp(regex.source, regex.flags + 'y') : null
        const minimumPipes = statusSearch ? statusPipeCount(regex.source) : 0
        // A leading all-character wildcard can absorb any earlier prefix. If
        // it fails at zero, retries at later offsets cannot succeed. Captured
        // backreferences are excluded because absorbing text changes their value.
        const allCharacters = ['([\\s\\S]*)', '([\\s\\S]*?)', '([\\s\\S]+)', '([\\s\\S]+?)', '[\\s\\S]*', '[\\s\\S]+', ...(regex.dotAll ? ['(.*)', '(.*?)', '(.+)', '(.+?)', '.*', '.+'] : [])]
        const leadingSearch = required.length && !regex.sticky && !/\\(?:[1-9]|k<)/.test(regex.source) && allCharacters.some(prefix => regex.source.startsWith(prefix) && !/^\{0(?:,0)?\}/.test(regex.source.slice(prefix.length))) ? new RegExp(regex.source, regex.flags + 'y') : null
        const matches = (text: string) => {
            if (leadingSearch) { leadingSearch.lastIndex = 0; return leadingSearch.test(text) }
            if (statusSearch && text.length > 4096) return statusStarts(text, minimumPipes).some(start => { statusSearch.lastIndex = start; return statusSearch.test(text) })
            return regex.test(text)
        }
        const hits = new Map<string, boolean>()
        const compiled = { test: (text: string) => {
            // Thousands of tiny Lua literals otherwise churn the bounded cache
            // and evict the expensive CSS/greeting samples on every traversal.
            const cache = text.length > 2048
            if (cache && hits.has(text)) return hits.get(text)!
            regex.lastIndex = 0
            // Required runs must occur in order, including repeated delimiters.
            // One pipe in a large CSS sample cannot satisfy five status fields.
            let offset = 0
            const hit = required.every(run => {
                run.lastIndex = offset
                const match = run.exec(text)
                if (!match) return false
                offset = run.lastIndex
                return true
            }) && matches(text)
            if (cache) {
                if (hits.size >= 512) hits.delete(hits.keys().next().value!)
                hits.set(text, hit)
            }
            return hit
        } }
        // Bound retained samples and patterns across repeated merge reviews.
        if (patterns.size >= 256) patterns.delete(patterns.keys().next().value!)
        patterns.set(key, compiled)
        return compiled
    }
    catch { return null }
}
function luaStrings(code: string): string[] {
    const result: string[] = []
    for (const token of code.matchAll(/--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[([\s\S]*?)\]\2\]|"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'/g)) {
        if (token[0].startsWith('--')) continue
        result.push(token[3] ?? (token[4] ?? token[5]).replace(/\\([nrt"'\\])/g, (_, c: string) => ({ n: '\n', r: '\r', t: '\t' }[c] ?? c)))
    }
    return result
}
function samples(input: MergeInput): string[] {
    return [...new Set(input.parts.flatMap(part => {
        if (part.kind === 'greeting' && typeof part.value === 'string') return [part.value]
        if (part.kind === 'lore') return [String(node(part).content ?? '')]
        if (part.kind === 'regex') return [String(node(part).out ?? '')]
        if (part.kind === 'luaTrigger') return luaStrings(typeof part.value === 'string' ? part.value : String(node(part).effect?.[0]?.code ?? ''))
        return []
    }).filter(Boolean))]
}

export function detectRoles(inputs: MergeInput[]): RoleGroup[] {
    const groups = new Map<RoleKind, Map<string, Set<string>>>()
    const add = (kind: RoleKind, part: Part) => {
        if (!groups.has(kind)) groups.set(kind, new Map())
        const members = groups.get(kind)!
        if (!members.has(part.sourceId)) members.set(part.sourceId, new Set())
        members.get(part.sourceId)!.add(part.key)
    }
    const classification = new Map<string, RoleKind>()
    const regexes = inputs.map(input => input.parts.filter(p => p.kind === 'regex').map(part => ({ part, regex: pattern(part) })))
    const texts = inputs.map(samples)
    const imageSamples = ['<img="sample">', '<auximg><img="sample"></auximg>', '<bg="sample">', '{{raw::sample}}', '{{image::sample}}', '<asset="sample">']
    for (const input of inputs) {
        const folders = new Map(input.parts.filter(p => p.kind === 'loreFolder').map(p => [node(p).key, node(p).comment]))
        for (const part of input.parts) {
            const value = node(part)
            if ((part.kind === 'regex' || part.kind === 'lore' && value.alwaysActive) && status.test(`${value.comment ?? ''} ${value.in ?? ''}`)) {
                classification.set(part.key, 'status'); add('status', part)
            } else if (part.kind === 'regex' && display(part) && (image.test(`${value.comment ?? ''} ${value.in ?? ''} ${value.out ?? ''}`) || imageSamples.some(s => pattern(part)?.test(s)))) {
                classification.set(part.key, 'imageDisplay'); add('imageDisplay', part)
            } else if (part.kind === 'lore' && value.alwaysActive && /이벤트|event/i.test(`${value.comment ?? ''} ${folders.get(value.folder) ?? ''}`)) add('events', part)
            if (partField(part) === 'firstMessage' && nonempty(part.value)) add('firstMessage', part)
            if (imageGenPart(part)) add('imageGen', part)
        }
    }
    const crossed = new Set<RoleKind>()
    const otherEdges: Part[][] = []
    const stages = regexes.map(entries => new Set(entries.map(e => node(e.part).type)))
    const matched = regexes.map((entries, i) => entries.map(entry => {
        const sharedStage = stages.some((stages, j) => j !== i && (stages.has(node(entry.part).type) || display(entry.part) && regexes[j].some(e => display(e.part))))
        return texts.map((samples, j) => {
            const indexes = new Set<number>()
            if (sharedStage && i !== j && entry.regex) for (let index = 0; index < samples.length; index++) {
                if (entry.regex.test(samples[index])) indexes.add(index)
            }
            return indexes
        })
    }))
    const ownMatches = regexes.map(entries => entries.map(() => new Map<number, boolean>()))
    const matchesOwn = (source: number, entry: number, indexes: Set<number>) => [...indexes].some(index => {
        const cache = ownMatches[source][entry]
        if (!cache.has(index)) cache.set(index, !!regexes[source][entry].regex?.test(texts[source][index]))
        return cache.get(index)
    })
    for (let i = 0; i < inputs.length; i++) for (let j = i + 1; j < inputs.length; j++) {
        for (const [xi, x] of regexes[i].entries()) for (const [yi, y] of regexes[j].entries()) {
            if (!x.regex || !y.regex || node(x.part).type !== node(y.part).type && !(display(x.part) && display(y.part))) continue
            const match = matchesOwn(i, xi, matched[j][yi][i]) || matchesOwn(j, yi, matched[i][xi][j])
                || !!node(y.part).out && x.regex.test(String(node(y.part).out)) || !!node(x.part).out && y.regex.test(String(node(x.part).out))
            if (!match) continue
            const kinds = [classification.get(x.part.key), classification.get(y.part.key)]
            const kind = kinds.includes('status') ? 'status' : display(x.part) ? 'imageDisplay' : 'other'
            if (kind === 'other') { if (kinds.every(k => !k)) otherEdges.push([x.part, y.part]); continue }
            // A status renderer must never become an image renderer through cross-matching.
            if (kind === 'status' && kinds.includes('imageDisplay')) continue
            add(kind, x.part); add(kind, y.part); crossed.add(kind)
            classification.set(x.part.key, kind); classification.set(y.part.key, kind)
        }
    }
    // Dedicated CSS and always-active image instructions follow their renderers.
    for (const input of inputs) {
        const keys = groups.get('imageDisplay')?.get(input.meta.id)
        if (!keys) continue
        const names = collectNames(input.parts.filter(p => keys.has(p.key)))
        const cssNames = new Set([...names.used.css, ...names.defined.css])
        for (const part of input.parts) {
            if (part.kind === 'css') {
                const defined = [...collectNames([part]).defined.css]
                if (defined.length && defined.every(name => cssNames.has(name))) add('imageDisplay', part)
            }
            if (part.kind === 'lore' && node(part).alwaysActive && image.test(String(node(part).comment ?? '')) && !status.test(String(node(part).comment ?? ''))) add('imageDisplay', part)
        }
    }
    const target = inputs[0]?.meta.id
    const result: RoleGroup[] = []
    for (const kind of ['status', 'imageDisplay', 'imageGen', 'events', 'firstMessage'] as const) {
        const members = groups.get(kind)
        if (!members || members.size < 2) continue
        result.push({ kind, members: Object.fromEntries([...members].map(([id, keys]) => [id, [...keys]])), default: kind === 'events' || kind === 'status' && !crossed.has(kind) || kind === 'imageDisplay' ? 'both' : target })
    }
    // Connected crossmatches form one choice, rather than overlapping choices.
    const components: Map<string, Part>[] = []
    for (const edge of otherEdges) {
        const touching = components.filter(c => edge.some(p => c.has(p.key)))
        const combined = new Map(edge.map(p => [p.key, p]))
        for (const c of touching) for (const [key, part] of c) combined.set(key, part)
        for (const c of touching) components.splice(components.indexOf(c), 1)
        components.push(combined)
    }
    for (const component of components) {
        const members: Record<string, string[]> = {}
        const parts = inputs.flatMap(i => i.parts).filter(p => component.has(p.key))
        for (const part of parts) (members[part.sourceId] ??= []).push(part.key)
        result.push({ kind: 'other', label: parts.map(p => String(node(p).comment ?? node(p).in ?? '')).join(' / '), members, default: 'both' })
    }
    return result
}
