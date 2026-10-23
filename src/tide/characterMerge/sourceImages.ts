import { mediaLabelRenames } from './mediaLabels'
import type { CardFields } from '../characterUpdate'
import { assetContentId, fingerprintCard, hashValue, planCharacterUpdate, type UpdatePlan } from '../characterUpdateMerge'
import { splitParts } from './parts'
import { partField } from './roles'
import { applyRenames } from './rewrite'
import type { Provenance } from './types'

export interface ImageProtectionGroup {
    sourceId: string; name: string; module: boolean; total: number
    rowIds: string[]; ambiguous: string[]; ambiguousRowIds?: string[]; sync: boolean; canSync: boolean
}
export const imageFields = { asset: 'additionalAssets', emotion: 'emotionImages' } as const

/** Transient review evidence, derived only from the existing v1 part hashes. */
export function recordedImageOwners(current: CardFields, provenance: Provenance) {
    return provenance.sources.map(source => {
        const parts = splitParts(source.id, Object.fromEntries(Object.values(imageFields).filter(field => Array.isArray(current[field])).map(field => [field, current[field]])))
        const inverse = [...source.renames].reverse().map(r => ({ ...r, from: r.to, to: r.from }))
        let originals = parts
        for (const rename of inverse) originals = applyRenames(originals, [rename])
        // Re-splitting restores original labels and duplicate occurrences after collision renames.
        const fields: CardFields = {}
        for (const [unit, field] of Object.entries(imageFields)) fields[field] = originals.filter(p => p.kind === unit).map(p => p.value)
        const raw = splitParts(source.id, fields)
        const recorded = new Map<string, Set<string>>()
        for (const [key, hash] of Object.entries(source.partHashes)) if (!source.excluded.includes(key)) {
            const identity = key.replace(/#\d+$/, ''), hashes = recorded.get(identity) ?? new Set<string>()
            hashes.add(hash); recorded.set(identity, hashes)
        }
        const aliases = new Map<string, string>()
        for (const field of Object.values(imageFields)) {
            const prefix = `${source.id}:${field}:`
            const originalLabels = new Map<string, string>()
            const labels = provenance.sources.flatMap(owner => {
                const ownerPrefix = `${owner.id}:${field}:`
                return Object.keys(owner.partHashes).filter(key => key.startsWith(ownerPrefix) && !owner.excluded.includes(key)).flatMap(key => {
                    const original = key.slice(ownerPrefix.length).replace(/#\d+$/, '')
                    const names = new Set([original])
                    for (const rename of owner.renames) if (rename.space === 'assets' && names.has(rename.from)) names.add(rename.to)
                    if (owner.id === source.id) for (const name of names) originalLabels.set(name, original)
                    return [...names]
                })
            })
            const names = mediaLabelRenames(labels, raw.filter(p => partField(p) === field).map(p => String((p.value as string[])[0])))
            for (const [next, old] of names) {
                const original = originalLabels.get(old)
                if (original !== undefined) aliases.set(`${prefix}${next}`, `${prefix}${original}`)
            }
        }
        return { source, parts: parts.filter((_, i) => {
            const part = raw[i]; if (!part) return false
            const identity = part.key.replace(/#\d+$/, '')
            if (recorded.get(identity)?.has(part.hash)) return true
            const old = aliases.get(identity)
            if (!old) return false
            const prefix = `${source.id}:${partField(part)}:`
            const value = [...part.value as string[]]; value[0] = old.slice(prefix.length)
            return recorded.get(old)?.has(hashValue(value)) ?? false
        }) }
    })
}

export function protectSourceImages(plan: UpdatePlan, current: CardFields, incoming: CardFields, provenance: Provenance | null, selectedSource: string | null,
    fallback: { id: string; name: string; card: CardFields }[] = [], partial = false): UpdatePlan {
    if (partial) {
        const inventory = Object.fromEntries(Object.values(imageFields).filter(field => Array.isArray(current[field])).map(field => [field, current[field]]))
        const unchanged = planCharacterUpdate({ current, incomingFields: inventory, base: fingerprintCard(current) })
        plan.listIds ??= {}
        for (const unit of ['asset', 'emotion'] as const) if (!plan.listIds[unit] && unchanged.listIds?.[unit]) plan.listIds[unit] = unchanged.listIds[unit]
    }
    const catalogMatches = new Map(Object.values(imageFields).map(field => {
        const old = (current[field] as string[][] ?? []).map(row => row[0]), rows = incoming[field] as string[][] ?? []
        const aliases = mediaLabelRenames(old, rows.map(row => row[0]))
        const byOld = new Map<string, string[][]>()
        for (const row of rows) {
            const name = aliases.get(row[0]) ?? row[0], matches = byOld.get(name) ?? []
            matches.push(row); byOld.set(name, matches)
        }
        return [field, byOld] as const
    }))
    const groups: ImageProtectionGroup[] = []
    const owners = provenance ? recordedImageOwners(current, provenance) : []
    const protect = (id: string, name: string, module: boolean, indexes: Map<string, Set<number>>, ambiguous: string[] = []) => {
        const rowIds: string[] = [], ambiguousRowIds: string[] = []
        let total = 0, canSync = true
        for (const [unit, field] of Object.entries(imageFields)) {
            const slots = indexes.get(field) ?? new Set<number>(); total += slots.size
            if (slots.size && !Array.isArray(incoming[field])) canSync = false
            for (const index of slots) {
                const rowId = plan.listIds?.[unit as 'asset' | 'emotion']?.current[index]
                if (rowId) { rowIds.push(rowId); if (ambiguous.includes(String((current[field] as unknown[][])[index][0]))) ambiguousRowIds.push(rowId) }
            }
        }
        if (total) groups.push({ sourceId: id, name, module, total, rowIds, ambiguous, ambiguousRowIds, sync: false, canSync: canSync && (total > ambiguousRowIds.length || !ambiguous.length) })
    }
    const selected = provenance?.sources.find(s => s.id === selectedSource)
    const selectedNames = new Map(Object.values(imageFields).map(field => {
        const prefix = `${selected?.id}:${field}:`
        const labels = selected ? Object.keys(selected.partHashes).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length).replace(/#\d+$/, '')) : []
        const aliases = mediaLabelRenames(labels, (current[field] as string[][] ?? []).map(row => row[0]))
        return [field, new Set([...labels, ...aliases.keys()])] as const
    }))
    for (const { source, parts } of owners) {
        if (source.id === selectedSource) continue
        const indexes = new Map<string, Set<number>>()
        for (const field of Object.values(imageFields)) {
            const hashes = new Set(parts.filter(p => partField(p) === field).map(p => p.hash))
            const slots = new Set<number>()
            ;(current[field] as unknown[] ?? []).forEach((value, i) => { if (hashes.has(hashValue(value))) {
                const label = String((value as string[])[0])
                const shipped = catalogMatches.get(field)!.has(label)
                const neverOwned = selected && !selectedNames.get(field)!.has(label)
                if (!shipped || neverOwned) slots.add(i)
            } })
            indexes.set(field, slots)
        }
        protect(source.id, source.name, source.kind === 'module', indexes)
    }
    if (!provenance) for (const module of fallback) {
        const indexes = new Map<string, Set<number>>(), ambiguous: string[] = []
        for (const field of Object.values(imageFields)) {
            const moduleRows = module.card[field] as string[][] ?? [], slots = new Set<number>()
            const byName = new Map<string, string[][]>()
            for (const row of moduleRows) byName.set(row[0], [...(byName.get(row[0]) ?? []), row])
            const aliases = mediaLabelRenames(moduleRows.map(row => row[0]), (current[field] as string[][] ?? []).map(row => row[0]))
            ;(current[field] as string[][] ?? []).forEach((row, i) => {
                // A name shipped by the incoming bot belongs in its ordinary update review.
                if (catalogMatches.get(field)!.has(row[0])) return
                const matches = byName.get(aliases.get(row[0]) ?? row[0]); if (!matches?.length) return
                slots.add(i)
                if (!matches.some(other => assetContentId(other[1]) === assetContentId(row[1]))) ambiguous.push(row[0])
            })
            indexes.set(field, slots)
        }
        protect(module.id, module.name, true, indexes, ambiguous)
    }
    if (partial && groups.length) {
        // The partial candidate already preserves foreign rows. Expose a catalog-sync
        // alternative only for those rows, retaining every other partial decision.
        const candidate: CardFields = {}
        for (const [unit, field] of Object.entries(imageFields)) {
            const ids = plan.listIds?.[unit as 'asset' | 'emotion']
            if (!ids || !Array.isArray(incoming[field])) continue
            const items = new Map(plan.items.filter(i => i.unit === unit).map(i => [i.id, i]))
            const before = new Map(ids.current.map((id, i) => [id, (current[field] as unknown[])[i]]))
            const foreign = new Set(groups.flatMap(g => g.rowIds))
            candidate[field] = ids.incoming.flatMap(id => {
                const value = items.get(id)?.incoming ?? before.get(id)
                if (!foreign.has(id)) return [value]
                const old = before.get(id) as string[]
                const matches = catalogMatches.get(field as typeof imageFields[keyof typeof imageFields])!.get(old[0]) ?? []
                return matches.length === 1 ? [matches[0]] : matches.length ? [old] : []
            })
        }
        const imagePlan = planCharacterUpdate({ current, incomingFields: candidate, base: fingerprintCard(current) })
        const oldItems = new Map(plan.items.map(i => [i.id, i]))
        for (const item of imagePlan.items) {
            const previous = oldItems.get(item.id)
            if (previous) Object.assign(item, { kind: previous.kind, keepByDefault: previous.keepByDefault, applyByDefault: previous.applyByDefault })
        }
        plan.items = [...plan.items.filter(i => i.unit !== 'asset' && i.unit !== 'emotion'), ...imagePlan.items.filter(i => i.unit === 'asset' || i.unit === 'emotion')]
        for (const unit of ['asset', 'emotion'] as const) if (imagePlan.listIds?.[unit]) plan.listIds![unit] = imagePlan.listIds[unit]
    }
    plan.imageProtection = groups
    const byId = new Map(plan.items.map(item => [item.id, item]))
    for (const group of groups) for (const id of group.rowIds) {
        const item = byId.get(id)
        if (item) { item.kind = 'authorChanged'; item.keepByDefault = true; item.applyByDefault = false }
    }
    return plan
}

export function protectedImageIds(groups: readonly ImageProtectionGroup[] = []): Set<string> {
    return new Set(groups.flatMap(g => !g.sync || !g.canSync ? g.rowIds : g.ambiguousRowIds ?? []))
}
