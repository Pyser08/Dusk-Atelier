// RisuTide plugins/risutide/src/merge.ts 에서 호스트와 상관없는 부분만 가져옴 (쓰기는 Dusk 쪽)
import { baseName, normalizeName } from '../characterUpdateTargets'
import { characterImportInput } from '../characterMerge/characters'
import type { ModuleSourceOptions } from '../characterMerge/moduleSource'
import { cardFieldsOf } from '../characterUpdate'
import { partField } from '../characterMerge/roles'
import { splitParts } from '../characterMerge/parts'
import { planMerge, untransferredModuleParts, MergeSelfCheckError, applyMerge } from '../characterMerge/plan'
import { planImport, applyImport, planImportUpdate, type ImportPicks, type ImportPlan } from '../characterMerge/importPlan'
import { planPartialUpdate } from '../characterMerge/partialUpdate'
import type { MergeChoices, MergeInput, MergePlan, Provenance, Part } from '../characterMerge/types'
type ParsedCard = { character: Record<string, any>; pendingAssets: Map<string, Uint8Array>; needsLowLevelAccess: boolean }

export { MergeSelfCheckError }
export function mergeInput(card: Record<string, any>, id: string): MergeInput {
    const fields = cardFieldsOf(card as any)
    return { card: fields, meta: { id, name: String(card.name ?? ''), short: '', ascii: '', chaId: card.chaId, realmId: card.realmId ?? card.extentions?.risuRealmImportId }, parts: splitParts(id, fields) }
}
/** Only bypass the question with different identity fields and little shared content. */
export function clearlyDifferentBot(target: Record<string, any>, source: Record<string, any>): boolean {
    const a = baseName(target.name), b = baseName(source.name)
    const authorA = normalizeName(target.creator), authorB = normalizeName(source.creator)
    if (!a || !b || a === b || !authorA || !authorB || authorA === authorB) return false
    const content = (card: Record<string, any>) => {
        const words = [card.desc, card.firstMessage, ...(card.globalLore ?? []).map((l: any) => `${l.comment ?? ''} ${l.content ?? ''}`)].filter(Boolean).join('\n').slice(0, 30000).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
        return new Set(words.slice(0, -2).map((_, i) => words.slice(i, i + 3).join(' ')))
    }
    const left = content(target), right = content(source)
    if (Math.min(left.size, right.size) < 10) return false
    const overlap = [...left].filter(value => right.has(value)).length
    return overlap / Math.min(left.size, right.size) < .2
}
/** Remove exactly the unchecked source parts before asking the planner to retry. */
export function omitMergeParts(parsed: ParsedCard, parts: Part[], excluded: Set<string>): ParsedCard {
    const character = structuredClone(parsed.character)
    for (const field of new Set(parts.filter(p => excluded.has(p.key)).map(partField))) {
        const members = parts.filter(p => partField(p) === field)
        if (Array.isArray(character[field])) character[field] = character[field].filter((_: unknown, i: number) => !excluded.has(members[i]?.key))
        else if (field === 'defaultVariables') character[field] = String(character[field]).split('\n').filter((_, i) => !excluded.has(members[i]?.key)).join('\n')
        else if (field === 'extentions') for (const part of members.filter(p => excluded.has(p.key))) { const key = part.key.slice(`${part.sourceId}:extentions:ext:`.length, part.key.lastIndexOf('#')); delete character.extentions[key] }
        else delete character[field]
    }
    return { ...parsed, character }
}

export interface ScopedSelection { plan: MergePlan; path: 'import' | 'merge'; importPlan?: ImportPlan; omitted?: Part[] }

/** Builds plans from the two cards already in memory; never copies another host bot. */
export function prepareScopedSelection(target: MergeInput, source: MergeInput, picks: ImportPicks, overrides = new Map<string, boolean>(), existing?: Provenance, options: ModuleSourceOptions = {}): ScopedSelection {
    source = characterImportInput(source)
    const imported = planImport(target, source, picks, existing, options)
    const importExcluded = new Set(imported.exclude), sourceKeys = new Set(source.parts.map(p => p.key))
    const selected = new Set(source.parts.filter(p => !importExcluded.has(p.key)).map(p => p.key))
    for (const [key, checked] of overrides) checked ? selected.add(key) : selected.delete(key)
    for (const part of source.parts) if (partField(part) === 'license') selected.delete(part.key)
    // Folder parents travel with their selected children.
    const folders = new Map<unknown, Part>()
    for (const part of source.parts) if (part.kind === 'loreFolder' && !folders.has((part.value as any).key)) folders.set((part.value as any).key, part)
    for (const part of source.parts.filter(p => selected.has(p.key))) {
        let folder = folders.get((part.value as any)?.folder)
        while (folder && !selected.has(folder.key)) { selected.add(folder.key); folder = folders.get((folder!.value as any).folder) }
    }
    const excluded = source.parts.filter(p => !selected.has(p.key))
    if (!source.parts.some(p => selected.has(p.key) && importExcluded.has(p.key))) {
        imported.exclude = excluded.map(p => p.key)
        if (imported.moduleMaterial && !imported.detachModuleExplicit) imported.detachModuleAfter = !!imported.moduleAttachments?.some(m => m.attachment === 'bot') && !untransferredModuleParts(imported, { roles: {}, composites: {}, edits: {}, lowLevel: false, name: imported.name, exclude: imported.exclude }).length
        return { plan: imported, path: 'import', importPlan: imported }
    }
    // Plan only checked parts, so unchecked code cannot fail the planner or cause renames.
    const filtered = omitMergeParts({ character: source.card, pendingAssets: new Map(), needsLowLevelAccess: false } as ParsedCard, source.parts, new Set(excluded.map(p => p.key))).character
    filtered.name = source.meta.name
    const selectedLore = source.parts.filter(p => selected.has(p.key) && ['lore', 'loreFolder'].includes(p.kind))
    const generated = imported.parts.filter(p => p.sourceId === source.meta.id && !sourceKeys.has(p.key))
    const importedParts = new Map<string, Part>()
    for (const part of imported.parts) if (!importedParts.has(part.key)) importedParts.set(part.key, part)
    const generatedLore = selected.size ? generated.filter(p => ['lore', 'loreFolder'].includes(p.kind)) : []
    if (selectedLore.length || generatedLore.length) filtered.globalLore = [...selectedLore.map(p => importedParts.get(p.key)?.value ?? p.value), ...generatedLore.map(p => p.value)]
    for (const [kind, field] of [['asset', 'additionalAssets'], ['emotion', 'emotionImages']] as const) {
        const images = source.parts.filter(p => selected.has(p.key) && p.kind === kind)
        if (images.length) filtered[field] = images.map(p => p.value)
    }
    if (source.parts.some(p => selected.has(p.key) && ['luaTrigger', 'trigger'].includes(p.kind))) filtered.lowLevelAccess = source.card.lowLevelAccess
    const plan = planMerge(target, [{ ...mergeInput(filtered, source.meta.id), meta: source.meta }], existing, options)
    // Filtering compacts duplicate-label occurrences. Restore source keys in every plan reference.
    const originals = [...source.parts.filter(p => selected.has(p.key)), ...generatedLore]
    const translations = new Map<string, string>()
    for (const field of new Set(originals.map(partField))) {
        const before = originals.filter(p => partField(p) === field), after = plan.parts.filter(p => p.sourceId === source.meta.id && partField(p) === field)
        after.forEach((part, i) => { if (before[i]) translations.set(part.key, before[i].key) })
    }
    for (const part of plan.parts) part.key = translations.get(part.key) ?? part.key
    for (const role of plan.roles) for (const id of Object.keys(role.members)) role.members[id] = role.members[id].map(key => translations.get(key) ?? key)
    // Character name choices belong to the same source and are carried into partial updates.
    plan.renames.push(...imported.renames.filter(r => r.space === 'loreNames' && !plan.renames.some(other => other.from === r.from && other.space === r.space)))
    plan.name = String(target.card.name ?? target.meta.name)
    plan.moduleMaterial = imported.moduleMaterial
    if (plan.moduleMaterial && !plan.detachModuleExplicit) plan.detachModuleAfter = !!plan.moduleAttachments?.some(m => m.attachment === 'bot') && !untransferredModuleParts(plan).length
    return { plan, path: 'merge', omitted: excluded }
}
export function applyScopedSelection(selection: ScopedSelection, choices: MergeChoices) {
    const result = selection.importPlan ? applyImport(selection.importPlan, choices) : applyMerge(selection.plan, choices)
    const exclusions = new Map(result.provenance.sources.map(source => [source.id, new Set(source.excluded)]))
    for (const part of selection.omitted ?? []) {
        const source = result.provenance.sources.find(s => s.id === part.sourceId)!
        source.partHashes[part.key] = part.hash
        if (!exclusions.get(source.id)!.has(part.key)) { source.excluded.push(part.key); exclusions.get(source.id)!.add(part.key) }
    }
    return result
}

/** 출처 하나만 새 버전으로 (가져오기로 들어온 출처는 가져오기 방식으로) */
export function planSourceUpdate(current: Record<string, any>, provenance: Provenance, sourceId: string, incoming: Record<string, any>) {
    const source = provenance.sources.find(s => s.id === sourceId)!
    const planner = source.kind === 'import' || source.importMode ? planImportUpdate : planPartialUpdate
    return planner({ current: cardFieldsOf(current as any), provenance, sourceId, incoming: cardFieldsOf(incoming as any) })
}
