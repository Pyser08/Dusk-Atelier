import { baseName } from '../characterUpdateTargets'
import { collectNames } from './names'
import { assetName, cssDefinitions } from './rewrite'
import type { NameSet, Part, Rename, SourceId } from './types'

/** Host event entry points are dispatched by the Lua bundle, not exported as manual buttons. */
const luaEvents = new Set(['onInput', 'onOutput', 'onStart', 'onButtonClick', 'callListenMain'])
const spaces: (keyof NameSet)[] = ['css', 'cssVars', 'keyframes', 'variables', 'buttons', 'loreNames', 'assets']
const analyses = new WeakMap<Part[], { signature: string; names: ReturnType<typeof collectNames>; css: ReturnType<typeof cssDefinitions> }>()
function analyze(parts: Part[]) {
    const signature = JSON.stringify(parts.map(p => [p.key, p.hash]))
    let cached = analyses.get(parts)
    if (!cached || cached.signature !== signature) {
        cached = { signature, names: collectNames(parts), css: cssDefinitions(parts) }
        analyses.set(parts, cached)
    }
    return cached
}

export function shortNames(names: string[]): { short: string; ascii: string }[] {
    const shorts = new Set<string>(), prefixes = new Set<string>()
    const unique = (base: string, used: Set<string>) => {
        let value = base, suffix = 2
        while (used.has(value.toLowerCase())) value = base + suffix++
        used.add(value.toLowerCase())
        return value
    }
    return names.map(name => {
        // baseName is normalized for matching. Keep the original spelling for the UI label.
        let label = name.normalize('NFKC').trim()
        const version = /\s*(?:[-–—:]\s*)?(?:[([]\s*)?(?:버전\s*\d+(?:\.\d+)*|(?:ver(?:sion)?\.?\s*|v\s*)\d+(?:\.\d+)*|\d+\.\d+(?:\.\d+)*)(?:\s*[)\]])?\s*$/iu
        while (version.test(label)) {
            const candidate = label.replace(version, '').trim()
            if (baseName(candidate) !== baseName(name)) break
            label = candidate
        }
        const short = unique(label.split(/[:：]/).at(-1)?.trim() || label || 'Bot', shorts)
        const latin = (label.split(/[:：]/).at(-1) ?? label).toLowerCase().replace(/[^a-z0-9]/g, '')
        const consonants = latin.replace(/[aeiou]/g, '')
        const ascii = unique((consonants.length >= 3 ? consonants : latin).slice(0, 3) || 'bot', prefixes)
        return { short, ascii }
    })
}

export function planRenames(sources: { id: SourceId; ascii: string; parts: Part[] }[]): Rename[] {
    const analyzed = sources.map(source => analyze(source.parts))
    const collected = analyzed.map(a => a.names)
    const definitions = analyzed.map(a => a.css)
    const names = collected.map(({ defined, used }) => Object.fromEntries(spaces.map(space => {
        let values = new Set([...defined[space], ...used[space]])
        if (['css', 'cssVars', 'keyframes'].includes(space)) values = new Set(defined[space])
        if (space === 'assets') {
            // Definition spelling is canonical; case/extension aliases name the same host asset.
            const assets = new Map<string, string>()
            for (const name of values) if (!assets.has(assetName(name))) assets.set(assetName(name), name)
            values = new Set(assets.values())
        }
        if (space === 'buttons') values = new Set([...values].filter(name => !luaEvents.has(name)))
        return [space, values]
    })) as unknown as NameSet)
    const normalize = (space: keyof NameSet, name: string) => space === 'assets' ? assetName(name) : name
    const reserved = new Map(spaces.map(space => [space, new Set(collected.flatMap(set => [...set.defined[space], ...set.used[space]].map(name => normalize(space, name))))]))
    const previous = new Map(spaces.map(space => [space, new Map<string, { signatures: string[]; referenced: boolean }[]>()]))
    const renames: Rename[] = []
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i]
        for (const space of spaces) for (const name of [...names[i][space]].sort()) {
            const normalized = normalize(space, name)
            const prior = previous.get(space)!.get(normalized) ?? []
            const signatures = definitions[i].get(`${space}:${name}`) ?? []
            const referenced = collected[i].used[space].has(name)
            let collides = prior.length > 0
            if (['css', 'cssVars', 'keyframes'].includes(space)) collides &&= prior.some(p => JSON.stringify(p.signatures) !== JSON.stringify(signatures))
            if (space === 'loreNames') collides &&= collected[i].defined.loreNames.has(name) && (referenced || prior.some(p => p.referenced))
            if (collides) {
                const base = ['css', 'cssVars', 'keyframes'].includes(space) ? `${name}-${source.ascii}` : `${source.ascii}_${name}`
                const extension = space === 'assets' ? /\.[^.\s/]+$/.exec(base)?.[0] ?? '' : ''
                const stem = extension ? base.slice(0, -extension.length) : base
                let to = base, suffix = 2
                // The suffix must survive asset normalization, which removes the extension.
                while (reserved.get(space)!.has(normalize(space, to))) to = stem + suffix++ + extension
                reserved.get(space)!.add(normalize(space, to))
                renames.push({ sourceId: source.id, space, from: name, to })
            }
            // Retain original names as well: every later source must be isolated from earlier source vocabularies.
            previous.get(space)!.set(normalized, [...prior, { signatures, referenced }])
        }
    }
    return renames
}
