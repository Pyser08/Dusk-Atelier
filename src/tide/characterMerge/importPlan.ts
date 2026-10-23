import { sanitizeCardValue } from '../characterUpdate'
import type { CardFields } from '../characterUpdate'
import { fingerprintCard, hashValue, planCharacterUpdate } from '../characterUpdateMerge'
import { characterImportInput, detectCharacters, isSystemLore, suggestWorld, nameSuffix } from './characters'
import { detectImageSystem, imageRegistrationText } from './imageSystem'
import type { ImageSystem } from './imageSystem'
import { planMerge, applyMerge, untransferredModuleParts } from './plan'
import { splitParts } from './parts'
import { isModuleMaterial, type ModuleSourceOptions } from './moduleSource'
import { partialUpdateFields, planPartialUpdate } from './partialUpdate'
import { applyRenames } from './rewrite'
import type { MergeChoices, MergeInput, MergePlan, Part, Provenance } from './types'

export interface ImportPicks {
    characters: string[]
    world: string[]
    bridge: 'visitor' | 'native'
    renames?: Record<string, string>
}
export interface ImportPlan extends MergePlan {
    exclude: string[]
    imageRegistrationKey?: string
}
type ImportContext = { target: CardFields; source: MergeInput; selected: Set<string>; generated: Set<string>; imageSystem: ImageSystem; existing?: Provenance }
const contexts = new WeakMap<ImportPlan, ImportContext>()
const clone = sanitizeCardValue
const loreOf = (part: Part) => part.value as { comment?: string; key?: string; content?: string; folder?: string; mode?: string }
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function renameText(text: string, renames: Map<string, string>, prose = false): string {
    if (!renames.size) return text
    const lookup = new Map([...renames].map(([from, to]) => [from.toLocaleLowerCase(), to]))
    const pattern = [...renames.keys()].sort((a, b) => b.length - a.length).map(name => `${escape(name)}${nameSuffix(name)}`).join('|')
    // Case folding ordinary prose turns the modal "will" or flower "rose"
    // into person references. Definitions can still match their key spelling.
    return text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})`, prose ? 'gu' : 'giu'), name => lookup.get(name.toLocaleLowerCase())!)
}

/** Plan only imported material for collision analysis; retain every original key for exclusions. */
export function planImport(target: MergeInput, source: MergeInput, picks: ImportPicks, existing?: Provenance, options: ModuleSourceOptions = {}): ImportPlan {
    source = characterImportInput(source)
    const assetOnly = source.meta.kind === 'module' && !detectCharacters(source).length
    const characters = detectCharacters(source).filter(c => picks.characters.includes(c.key))
    const allCharacters = new Set(detectCharacters(source).flatMap(c => c.loreKeys))
    const selected = new Set(characters.flatMap(c => c.loreKeys))
    for (const part of source.parts) if (part.kind === 'lore' && picks.world.includes(part.key) && !allCharacters.has(part.key) && !isSystemLore(loreOf(part), source.meta.kind === 'module')) selected.add(part.key)
    const assets = new Set(characters.flatMap(c => c.assetNames)), emotions = new Set(characters.flatMap(c => c.emotionNames))
    for (const part of source.parts) if ((part.kind === 'asset' && (assetOnly || assets.has(String((part.value as unknown[])[0])))) || (part.kind === 'emotion' && emotions.has(String((part.value as unknown[])[0])))) selected.add(part.key)
    const folders = new Map(source.parts.filter(p => p.kind === 'loreFolder').map(p => [loreOf(p).key, p]))
    for (const part of source.parts.filter(p => selected.has(p.key))) {
        let folder = folders.get(loreOf(part).folder)
        while (folder && !selected.has(folder.key)) { selected.add(folder.key); folder = folders.get(loreOf(folder).folder) }
    }
    const names = new Map<string, string>()
    const aliasOwners = new Map<string, Set<string>>()
    for (const c of detectCharacters(source)) for (const alias of c.aliases) {
        const key = alias.toLocaleLowerCase(), owners = aliasOwners.get(key) ?? new Set<string>()
        owners.add(c.key); aliasOwners.set(key, owners)
    }
    for (const c of characters) {
        const replacement = picks.renames?.[c.key] ?? picks.renames?.[c.name]
        if (replacement?.trim() && replacement !== c.name) {
            names.set(c.name, replacement.trim())
            for (const alias of c.aliases) if (aliasOwners.get(alias.toLocaleLowerCase())?.size === 1) names.set(alias, replacement.trim())
        }
    }
    const parts = clone(source.parts).map(part => {
        if (part.kind !== 'lore' || !selected.has(part.key) || !names.size) return part
        const lore = loreOf(part)
        for (const field of ['comment', 'key', 'content'] as const) if (typeof lore[field] === 'string') lore[field] = renameText(lore[field]!, names, field === 'content')
        return part
    })
    const card: CardFields = { name: source.card.name ?? source.meta.name }
    for (const [kind, field] of [['lore', 'globalLore'], ['asset', 'additionalAssets'], ['emotion', 'emotionImages']] as const) {
        const entries = parts.filter(p => selected.has(p.key) && (p.kind === kind || kind === 'lore' && p.kind === 'loreFolder')).map(p => clone(p.value))
        if (entries.length) card[field] = entries
    }
    const plan = planMerge(target, [{ ...source, card, parts: splitParts(source.meta.id, card) }], existing, options) as ImportPlan
    plan.name = String(target.card.name ?? target.meta.name)
    // Resolve manual names against target collisions, then apply each mapping once.
    const manualTargets = new Set(names.values())
    for (const [from, to] of names) names.set(from, plan.renames.find(r => r.space === 'loreNames' && r.from === to)?.to ?? to)
    plan.renames = plan.renames.filter(r => r.space !== 'loreNames' || !manualTargets.has(r.from))
    plan.renames.push(...[...names].map(([from, to]) => ({ sourceId: source.meta.id, space: 'loreNames' as const, from, to })))
    // The import API owns defaults; the merge engine still records exact per-part omissions.
    plan.parts = [...plan.parts.filter(p => p.sourceId === target.meta.id), ...clone(source.parts).map(part => {
        if (part.kind === 'lore' && selected.has(part.key)) {
            const lore = loreOf(part)
            for (const field of ['key', 'content'] as const) if (typeof lore[field] === 'string') lore[field] = renameText(lore[field]!, names, field === 'content')
        }
        return part
    })]
    if (source.meta.kind === 'module') plan.moduleMaterial = clone(source.parts.filter(isModuleMaterial))
    plan.exclude = source.parts.filter(p => !selected.has(p.key)).map(p => p.key)
    plan.roles = []
    plan.composites = []
    plan.needsLowLevel = false
    const generated = new Set<string>(), short = plan.sources[1].short
    const addLore = (value: unknown) => {
        const part = splitParts(source.meta.id, { globalLore: [value] })[0]
        let occurrence = 0
        const base = part.key.replace(/#0$/, '')
        while (plan.parts.some(p => p.key === `${base}#${occurrence}`)) occurrence++
        part.key = `${base}#${occurrence}`
        plan.parts.push(part); generated.add(part.key)
        return part.key
    }
    const imageSystem = detectImageSystem(target)
    if (selected.size) {
        const folder = `folder:risutide-import-${hashValue([source.meta.id, 'bridge'])}`
        addLore({ mode: 'folder', key: folder, comment: '연결', content: '', alwaysActive: false })
        const importedNames = characters.map(c => names.get(c.name) ?? c.name).join(', ')
        if (!assetOnly || characters.length || source.parts.some(p => selected.has(p.key) && p.kind === 'lore')) addLore({ mode: 'normal', key: '', folder, comment: `[${short}] 연결`, alwaysActive: true,
            content: picks.bridge === 'visitor'
                ? `${importedNames || source.meta.name} — 다른 세계에서 왔어요. 원래 세계는 ${source.meta.name}이며, 지금은 ${target.meta.name}의 세계에 머물러요. 성격·외모·말투와 가져온 설정을 유지하고 이 세계의 사람들과 자연스럽게 연결해 주세요.`
                : `${importedNames || source.meta.name} — 원래 이 세계 사람이에요. ${target.meta.name}의 세계에서 살아온 인물로 다루되, 성격·외모·말투와 가져온 설정을 유지해 주세요.` })
        const importedAssets = applyRenames(plan.parts.filter(p => selected.has(p.key) && p.kind === 'asset'), plan.renames).map(p => String((p.value as unknown[])[0]))
        if (importedAssets.length && imageSystem.kind !== 'unknown') {
            plan.imageRegistrationKey = addLore({ mode: 'normal', key: '', folder, comment: `[${short}] 이미지`, alwaysActive: true, content: imageRegistrationText(imageSystem, importedAssets) })
        } else if (importedAssets.length) plan.warnings.push({ kind: 'assetFuzzy', detail: '이미지 선택 방식을 판별하지 못했어요. 파일은 가져오며, 이미지 이름은 직접 등록해 주세요.' })
    }
    if (plan.moduleMaterial && !plan.detachModuleExplicit) plan.detachModuleAfter = !!plan.moduleAttachments?.some(m => m.attachment === 'bot') && !untransferredModuleParts(plan, { roles: {}, composites: {}, edits: {}, lowLevel: false, name: plan.name, exclude: plan.exclude }).length
    contexts.set(plan, { target: clone(target.card), source: clone(source), selected, generated, imageSystem, existing: clone(existing) })
    return plan
}

/** Apply import defaults through applyMerge, preserving every non-importable target field. */
export function applyImport(plan: ImportPlan, choices: Partial<Pick<MergeChoices, 'edits' | 'exclude'>> = {}): { card: CardFields; provenance: Provenance } {
    const context = contexts.get(plan)
    if (!context) throw new Error('Import plan must be created by planImport')
    const { target, source, selected, generated, imageSystem } = context
    const excluded = new Set([...source.parts.filter(p => !selected.has(p.key)).map(p => p.key), ...plan.exclude, ...choices.exclude ?? []])
    const hasMaterial = [...selected].some(key => !excluded.has(key) && plan.parts.some(p => p.key === key && p.kind !== 'loreFolder'))
    if (!hasMaterial) {
        for (const key of generated) excluded.add(key)
        for (const part of plan.parts) if (part.sourceId === source.meta.id && part.kind === 'loreFolder') excluded.add(part.key)
    }
    // Only imported lore/assets are editable; target fields remain byte-for-byte intact.
    const edits = Object.fromEntries(Object.entries(choices.edits ?? {}).filter(([key]) => selected.has(key) || generated.has(key)))
    if (plan.imageRegistrationKey && !excluded.has(plan.imageRegistrationKey)) {
        const assets = applyRenames(plan.parts.filter(p => selected.has(p.key) && p.kind === 'asset' && !excluded.has(p.key)), plan.renames).map(p => String((p.value as unknown[])[0]))
        if (!assets.length) excluded.add(plan.imageRegistrationKey)
        else if (edits[plan.imageRegistrationKey] === undefined) edits[plan.imageRegistrationKey] = imageRegistrationText(imageSystem, assets)
    }
    const itemEdits = Object.fromEntries(Object.entries(choices.itemEdits ?? {}).filter(([key]) => selected.has(key) || generated.has(key)))
    const result = applyMerge(plan, { roles: {}, composites: {}, edits, itemEdits, exclude: [...excluded], lowLevel: false, name: plan.name })
    const card = clone(target)
    for (const field of ['globalLore', 'additionalAssets', 'emotionImages', ...(plan.detachModuleAfter ? ['modules'] : [])]) if (Object.hasOwn(result.card, field)) card[field] = result.card[field]
    // Named image lists must retain their identity; global-note instructions stay intact.
    if (imageSystem.kind !== 'unknown' && plan.imageRegistrationKey && !excluded.has(plan.imageRegistrationKey)) {
        const registration = plan.parts.find(p => p.key === plan.imageRegistrationKey)!
        const label = loreOf(registration).comment
        const rows = card.globalLore as ReturnType<typeof loreOf>[]
        const registrationRow = [...rows].reverse().find(l => l.comment === label)
        const targetPart = plan.parts.find(p => p.key === imageSystem.loreKey)
        const index = targetPart ? plan.parts.filter(p => p.sourceId === plan.sources[0].id && (p.kind === 'lore' || p.kind === 'loreFolder')).findIndex(p => p.key === targetPart.key) : -1
        if (registrationRow && index >= 0) {
            rows[index].content = `${rows[index].content ?? ''}\n\n${registrationRow.content}`
            rows.splice(rows.indexOf(registrationRow), 1)
        }
    }
    const recorded = result.provenance.sources.find(s => s.id === source.meta.id)!
    recorded.kind = source.meta.kind === 'module' ? 'module' : 'import'
    if (source.meta.kind === 'module') recorded.importMode = true
    recorded.cardHash = hashValue(source.card)
    // Generated connection/image instructions are local edits, not deletions in B's next version.
    recorded.partHashes = Object.fromEntries(source.parts.map(p => [p.key, p.hash]))
    recorded.excluded = source.parts.filter(p => excluded.has(p.key)).map(p => p.key)
    result.provenance.composites = clone(context.existing?.composites ?? {})
    return { card, provenance: result.provenance }
}

/** Source revisions can update the imported people and their images, never introduce B's code. */
export function planImportUpdate(args: Parameters<typeof planPartialUpdate>[0]): ReturnType<typeof planPartialUpdate> {
    const originalSource = args.provenance.sources.find(s => s.id === args.sourceId)
    const provenance = clone(args.provenance)
    const source = provenance.sources.find(s => s.id === args.sourceId)
    if (!source || source.kind !== 'import' && !(source.kind === 'module' && source.importMode)) throw new Error(`Unknown import source: ${args.sourceId}`)
    if (hashValue(args.incoming) === source.cardHash) return planPartialUpdate(args)
    const input: MergeInput = characterImportInput({ card: args.incoming, meta: { kind: source.kind === 'module' ? 'module' : undefined, moduleId: source.moduleId, id: source.id, name: source.name, short: source.shortName, ascii: source.ascii }, parts: splitParts(source.id, args.incoming) })
    const assetOnly = source.kind === 'module' && !detectCharacters(input).length
    const selectedCharacters = detectCharacters(input).filter(c => Object.hasOwn(source.partHashes, c.key) && !source.excluded.includes(c.key))
    const assets = new Set(selectedCharacters.flatMap(c => c.assetNames)), emotions = new Set(selectedCharacters.flatMap(c => c.emotionNames))
    const characterKeys = new Set(source.kind === 'module' ? detectCharacters(input).flatMap(c => c.loreKeys) : [])
    const importedWorld = source.kind === 'module' && input.parts.some(p => p.kind === 'lore' && !characterKeys.has(p.key) && Object.hasOwn(source.partHashes, p.key) && !source.excluded.includes(p.key))
    const newWorld = source.kind === 'module' && importedWorld ? new Set(suggestWorld(input, selectedCharacters)) : new Set<string>()
    const excluded = new Set(source.excluded)
    for (const part of input.parts) {
        const known = Object.hasOwn(source.partHashes, part.key) && !excluded.has(part.key)
        const characterImage = part.kind === 'asset' && (assetOnly || assets.has(String((part.value as unknown[])[0]))) || part.kind === 'emotion' && emotions.has(String((part.value as unknown[])[0]))
        if (['lore', 'loreFolder', 'asset', 'emotion'].includes(part.kind) && (known || characterImage || !Object.hasOwn(source.partHashes, part.key) && newWorld.has(part.key)) && (part.kind !== 'lore' || selectedCharacters.some(c => c.loreKeys.includes(part.key)) || !isSystemLore(loreOf(part), source.kind === 'module'))) continue
        excluded.add(part.key)
        if (!Object.hasOwn(source.partHashes, part.key)) source.partHashes[part.key] = part.hash
    }
    source.excluded = [...excluded]
    // Excluded definitions must not participate in collision detection. Keep a
    // key translation for duplicate labels whose occurrence numbers compact.
    const incoming: CardFields = { name: args.incoming.name }
    const keyMap = new Map<string, string>()
    for (const [kind, field] of [['lore', 'globalLore'], ['asset', 'additionalAssets'], ['emotion', 'emotionImages']] as const) {
        const parts = input.parts.filter(p => (p.kind === kind || kind === 'lore' && p.kind === 'loreFolder') && !excluded.has(p.key))
        if (!Object.hasOwn(args.incoming, field) && !parts.length) continue
        incoming[field] = parts.map(p => clone(p.value))
        splitParts(source.id, { [field]: incoming[field] }).forEach((p, i) => keyMap.set(parts[i].key, p.key))
    }
    const mappings = new Map(source.renames.filter(r => r.space === 'loreNames').map(r => [r.from, r.to]))
    const originals = new Set(Object.keys(source.partHashes).filter(key => key.startsWith(`${source.id}:globalLore:`) && !excluded.has(key))
        .map(key => key === `${source.id}:globalLore:__risutide_bot_self__#0` ? source.name : key.slice(`${source.id}:globalLore:`.length).replace(/#\d+$/, '')))
    const names = new Map<string, string>(), labels = new Set<string>()
    for (const original of originals) {
        let renamed = mappings.get(original) ?? original
        const visited = new Set([original])
        while (!originals.has(renamed) && mappings.has(renamed) && !visited.has(renamed)) {
            visited.add(renamed); renamed = mappings.get(renamed)!
        }
        labels.add(renamed)
        if (renamed !== original) names.set(original, renamed)
    }
    const inverse = new Map([...names].map(([from, to]) => [to, from]))
    // Aliases share the person's destination, including on later source revisions.
    for (const c of selectedCharacters) for (const alias of c.aliases) if (!names.has(alias) && mappings.has(alias)) names.set(alias, names.get(c.name) ?? mappings.get(alias)!)
    // Compare in source coordinates; the generic updater only rewrites exact
    // lore references and cannot invert natural-language character names.
    const loreRenames = source.renames.filter(r => r.space === 'loreNames')
    source.renames = source.renames.filter(r => r.space !== 'loreNames')
    source.partHashes = Object.fromEntries(Object.entries(source.partHashes).filter(([key]) => !excluded.has(key)).map(([key, hash]) => [keyMap.get(key) ?? key, hash]))
    source.excluded = []
    const current = clone(args.current)
    const renameLore = (lore: ReturnType<typeof loreOf>, mapping: Map<string, string>) => {
        for (const field of ['comment', 'key', 'content'] as const) if (typeof lore[field] === 'string') lore[field] = renameText(lore[field]!, mapping, field === 'content')
    }
    const untouchedLore = new Set<string>()
    for (const lore of current.globalLore as ReturnType<typeof loreOf>[] ?? []) {
        const before = hashValue(lore)
        if (labels.has(String(lore.comment))) renameLore(lore, inverse)
        if (hashValue(lore) === before) untouchedLore.add(before)
    }
    const result = planPartialUpdate({ ...args, current, incoming, provenance })
    const candidate = partialUpdateFields(current, result.plan)
    const classifications = new Map<string, typeof result.plan.items[number]>()
    for (const item of result.plan.items) if (!item.id.startsWith('order:')) {
        for (const value of [item.current, item.incoming]) if (value !== undefined) {
            if (item.unit === 'lore' && value && typeof value === 'object') renameLore(value as ReturnType<typeof loreOf>, names)
            classifications.set(hashValue(value), item)
        }
    }
    // Rebuild list identities against the actual card, including name swaps.
    for (const lore of candidate.globalLore as ReturnType<typeof loreOf>[] ?? []) if (originals.has(String(lore.comment)) && !untouchedLore.has(hashValue(lore))) renameLore(lore, names)
    result.plan = planCharacterUpdate({ current: args.current, incomingFields: candidate, base: fingerprintCard(args.current, undefined, 0) })
    for (const item of result.plan.items) {
        const prior = classifications.get(hashValue(item.incoming)) ?? classifications.get(hashValue(item.current))
        if (prior) { item.kind = prior.kind; item.keepByDefault = prior.keepByDefault }
    }
    const nextSource = result.nextProvenance.sources.find(s => s.id === source.id)!
    nextSource.renames = [...loreRenames, ...nextSource.renames]
    nextSource.cardHash = hashValue(args.incoming)
    nextSource.partHashes = Object.fromEntries(input.parts.map(p => [p.key, p.hash]))
    nextSource.excluded = [...excluded]
    const targetId = provenance.sources[0].id
    const imageSystem = detectImageSystem({ card: args.current, meta: { id: targetId, name: '', short: '', ascii: '' }, parts: splitParts(targetId, args.current) })
    if (imageSystem.kind !== 'unknown') {
        const assetNames = (parts: Part[], renames: Provenance['sources'][number]['renames']) => renames.reduce((all, rename) => applyRenames(all, [rename]), parts).map(p => String((p.value as unknown[])[0]))
        const oldAssets: Part[] = Object.keys(originalSource!.partHashes).filter(key => key.startsWith(`${source.id}:additionalAssets:`) && !originalSource!.excluded.includes(key))
            .map(key => ({ sourceId: source.id, kind: 'asset', key, hash: '', value: [key.slice(`${source.id}:additionalAssets:`.length).replace(/#\d+$/, ''), ''] }))
        const before = imageRegistrationText(imageSystem, assetNames(oldAssets, source.renames))
        const after = imageRegistrationText(imageSystem, assetNames(input.parts.filter(p => p.kind === 'asset' && !excluded.has(p.key)), nextSource.renames))
        if (before !== after) {
            const candidate = partialUpdateFields(args.current, result.plan)
            const rows = candidate.globalLore as ReturnType<typeof loreOf>[] ?? []
            const targetPart = splitParts(targetId, args.current).find(p => p.key === imageSystem.loreKey)
            const namedList = targetPart?.kind === 'lore'
            const registration = namedList ? rows.find(l => l.comment === loreOf(targetPart!).comment) : [...rows].reverse().find(l => l.comment === `[${source.shortName}] 이미지`)
            let changed = false, edited = false
            if (registration && (!namedList || !before || String(registration.content).endsWith(before))) {
                edited = !namedList && registration.content !== before
                registration.content = namedList ? `${before ? String(registration.content).slice(0, -before.length) : `${registration.content ?? ''}\n\n`}${after}` : after
                changed = true
            } else if (!registration && !before && after && !namedList) {
                rows.push({ comment: `[${source.shortName}] 이미지`, mode: 'normal', key: '', content: after, alwaysActive: true } as ReturnType<typeof loreOf>)
                candidate.globalLore = rows
                changed = true
            }
            if (changed) {
                const previous = new Map(result.plan.items.map(item => [item.id, item]))
                result.plan = planCharacterUpdate({ current: args.current, incomingFields: candidate, base: fingerprintCard(args.current, undefined, 0) })
                for (const item of result.plan.items) {
                    const prior = previous.get(item.id)
                    if (prior) { item.kind = prior.kind; item.keepByDefault = prior.keepByDefault }
                    if (edited && item.unit === 'lore' && (item.incoming as ReturnType<typeof loreOf>)?.comment === registration?.comment) { item.kind = 'conflict'; item.keepByDefault = false }
                }
            }
        }
    }
    return result
}
