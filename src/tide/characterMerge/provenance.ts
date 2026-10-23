import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate'
import { cardFieldsOf, sanitizeCardValue } from '../characterUpdate'
import { hashValue } from '../characterUpdateMerge'
import { matchSameBot, type MatchableCharacter } from '../characterUpdateTargets'
import { splitParts } from './parts'
import { partField } from './roles'
import type { RisuModule } from '../process/modules'
import type { Provenance, SourceId, SourceMeta } from './types'

const prefix = 'rtm1:'
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === 'string')
const stringMap = (v: unknown) => record(v) && Object.values(v).every(s => typeof s === 'string')
function valid(value: unknown): value is Provenance {
    if (!record(value) || value.version !== 1 || !Array.isArray(value.sources) || !value.sources.length || !record(value.composites)) return false
    const ids = new Set<string>()
    for (const source of value.sources) {
        if (!record(source) || ['id', 'shortName', 'ascii', 'name', 'cardHash'].some(k => typeof source[k] !== 'string') || !source.id || ids.has(String(source.id))) return false
        ids.add(String(source.id))
        if (source.kind !== undefined && !['import', 'module'].includes(String(source.kind)) || source.moduleId !== undefined && typeof source.moduleId !== 'string' || source.kind === 'module' && !source.moduleId || source.importMode !== undefined && typeof source.importMode !== 'boolean') return false
        if (source.realmId !== undefined && typeof source.realmId !== 'string' || !stringMap(source.partHashes) || !strings(source.excluded) || !stringMap(source.roleChoices) || !Array.isArray(source.renames)) return false
        if (Object.keys(source.partHashes as object).some(key => !key.startsWith(`${source.id}:`))) return false
        if (!source.renames.every(r => record(r) && r.sourceId === source.id && ['css', 'cssVars', 'keyframes', 'variables', 'buttons', 'loreNames', 'assets'].includes(String(r.space)) && typeof r.from === 'string' && typeof r.to === 'string')) return false
    }
    return Object.values(value.composites).every(c => record(c) && strings(c.order) && (c.jsonValues === undefined || record(c.jsonValues)))
}

/** A portable gzip/base64 copy for extentions.risutide.merge; no original card bodies. */
export function encodeCardProvenance(p: Provenance): string {
    if (!valid(p)) throw new Error('Invalid merge provenance')
    const bytes = gzipSync(strToU8(JSON.stringify(sanitizeCardValue(p))), { mtime: 0 })
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return prefix + btoa(binary)
}
export function decodeCardProvenance(s: string): Provenance | null {
    try {
        if (typeof s !== 'string' || !s.startsWith(prefix)) return null
        const bytes = Uint8Array.from(atob(s.slice(prefix.length)), char => char.charCodeAt(0))
        const p: unknown = JSON.parse(strFromU8(gunzipSync(bytes)))
        return valid(p) ? sanitizeCardValue(p) : null
    } catch { return null }
}

/** Match realm or name/author identity first; original content hashes are a fallback. */
export function matchSource(incoming: MatchableCharacter | RisuModule | SourceMeta, p: Provenance): SourceId | null {
    if ('id' in incoming && (!('chaId' in incoming) || 'kind' in incoming && incoming.kind === 'module')) {
        const moduleId = 'moduleId' in incoming ? incoming.moduleId : incoming.id
        return p.sources.find(s => s.kind === 'module' && s.moduleId === moduleId)?.id ?? null
    }
    const character = incoming as MatchableCharacter
    if (character.type === 'group') return null
    const exact = p.sources.find(s => s.kind !== 'module' && s.id === character.chaId)
    if (exact) return exact.id
    const fields = cardFieldsOf(character as Parameters<typeof cardFieldsOf>[0])
    const meaningful = new Set(['globalLore', 'customscript', 'triggerscript', 'firstMessage', 'desc', 'personality', 'scenario', 'exampleMessage', 'systemPrompt', 'replaceGlobalNote', 'backgroundHTML', 'defaultVariables'])
    const scored: { id: string; rank: number; score: number }[] = []
    for (const source of p.sources) {
        if (source.kind === 'module') continue
        const parts = splitParts(source.id, fields).filter(part => meaningful.has(partField(part)) && part.kind !== 'loreFolder' && part.value !== '')
        const baseline = Object.keys(source.partHashes).filter(key => meaningful.has(key.slice(source.id.length + 1).split(':')[0]))
        const overlap = parts.filter(part => source.partHashes[part.key] === part.hash).length
        const content = overlap >= 3 && overlap / Math.max(1, Math.min(parts.length, baseline.length)) >= 0.5
        const labels = (field: string) => Object.keys(source.partHashes).filter(key => key.startsWith(`${source.id}:${field}:`)).map(key => ({ comment: key.slice(`${source.id}:${field}:`.length).replace(/#\d+$/, '') }))
        const candidate: MatchableCharacter = { chaId: source.id, name: source.name, realmId: source.realmId, globalLore: labels('globalLore'), customscript: labels('customscript') }
        if (character.creator && source.partHashes[`${source.id}:creator:creator#0`] === hashValue(character.creator)) candidate.creator = character.creator
        const match = matchSameBot(character, [candidate])
        const realm = match?.reason === 'realm'
        // Name plus author identity survives revisions in either version direction.
        const revised = match?.reason === 'name' && !!candidate.creator
        if (!realm && !content && !revised) continue
        scored.push({ id: source.id, rank: realm ? 3 : revised ? 2 : 1, score: overlap / Math.max(1, parts.length) })
    }
    scored.sort((a, b) => b.rank - a.rank || b.score - a.score)
    if (!scored.length || scored[1] && scored[0].rank === scored[1].rank && scored[0].score === scored[1].score) return null
    return scored[0].id
}
