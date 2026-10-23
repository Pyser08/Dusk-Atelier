import { mediaLabelRenames } from './mediaLabels'
import { isUnsafeCardKey, isUserOwnedCardField, regexBody, sanitizeCardValue } from '../characterUpdate'
import type { CardFields } from '../characterUpdate'
import { applyUpdatePlan, fingerprintCard, hashValue, planCharacterUpdate } from '../characterUpdateMerge'
import type { PlanItem, UpdatePlan, Unit } from '../characterUpdateMerge'
import { planRenames } from './collide'
import { buildComposite, parseBlocks, replaceBlock, toggleBlock } from './composite'
import { buildLuaBundle, bundleBlocks, canBundleLuaTrigger, luaSourceId, sourceLuaBlocks, originalLuaBlockId } from './luaBundle'
import { applyMerge } from './plan'
import { splitParts } from './parts'
import { preserveTargetLicense } from './license'
import { applyRenames } from './rewrite'
import { partField } from './roles'
import type { CompositeField, CompositeSpec, Part, Provenance, Rename, SourceId } from './types'

type Source = Provenance['sources'][number]
type Location = { field: string; index: number }
const lists: Partial<Record<Unit, string>> = { lore: 'globalLore', regex: 'customscript', trigger: 'triggerscript', asset: 'additionalAssets', emotion: 'emotionImages' }
const sourceLists = [...Object.values(lists), 'alternateGreetings', 'group_only_greetings'] as string[]
const textFields = new Set(['desc', 'replaceGlobalNote', 'systemPrompt', 'exampleMessage'])
const clone = sanitizeCardValue
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {}
const labelOf = (source: Source, key: string) => key.slice(`${source.id}:${fieldOf(source, key)}:`.length).replace(/#\d+$/, '')
const fieldOf = (source: Source, key: string) => key.slice(source.id.length + 1).split(':')[0]
const inverse = (renames: Rename[]) => [...renames].reverse().map(r => ({ ...r, from: r.to, to: r.from }))
function rewrite(parts: Part[], renames: Rename[]): Part[] {
    // New renames can extend an old mapping. Preserve both records and replay in order.
    for (const rename of renames) parts = applyRenames(parts, [rename])
    return parts
}
function kindOf(field: string, value: unknown): Part['kind'] {
    return field === 'globalLore' ? object(value).mode === 'folder' ? 'loreFolder' : 'lore'
        : field === 'customscript' ? 'regex' : field === 'triggerscript' ? object(value).effect?.[0]?.type === 'triggerlua' ? 'luaTrigger' : 'trigger'
            : field === 'additionalAssets' ? 'asset' : field === 'emotionImages' ? 'emotion' : 'greeting'
}
function label(field: string, value: unknown): string {
    const v = object(value)
    return field === 'globalLore' ? String(v.comment || v.key || '-')
        : field === 'customscript' ? String(v.comment || v.in || '-') : field === 'triggerscript' ? String(v.comment || v.type || '-')
            : field === 'additionalAssets' || field === 'emotionImages' ? String((value as unknown[])[0]) : field
}
function rawPart(source: Source, key: string, field: string, value: unknown, folders: Map<string, string>, roots: Set<string>): Part {
    const kind = kindOf(field, value)
    let part = rewrite([{ sourceId: source.id, key, kind, value: clone(value), hash: hashValue(value) }], inverse(source.renames))[0]
    if (field === 'globalLore') {
        const v = object(part.value)
        if (v.mode === 'folder') {
            v.comment = labelOf(source, key)
            if (folders.has(v.key)) v.key = folders.get(v.key)
        }
        if (roots.has(v.folder)) delete v.folder
        else if (folders.has(v.folder)) v.folder = folders.get(v.folder)
    }
    part = { ...part, hash: hashValue(part.value) }
    return part
}

/** Reserve exact hashes first, then labels. Ambiguous ownership must not touch another source. */
function ownership(current: CardFields, p: Provenance, incoming: Map<string, Part>, sourceId: string) {
    const locations = new Map<string, Location>(), values = new Map<string, Part>()
    const loreFolders = (current.globalLore as any[] ?? []).filter(l => l.mode === 'folder')
    const folderMaps = new Map<string, { aliases: Map<string, string>; roots: Set<string> }>()
    for (const [index, source] of p.sources.entries()) {
        const aliases = new Map<string, string>(), roots = new Set<string>()
        const rootName = `[${source.shortName}]`
        if (index && !p.sources.some(s => Object.hasOwn(s.partHashes, `${s.id}:globalLore:${rootName}#0`))) {
            for (const folder of loreFolders.filter(l => l.comment === rootName)) roots.add(folder.key)
        }
        if (source.id === sourceId) {
            const sourceLabels = new Set(Object.keys(source.partHashes).filter(key => fieldOf(source, key) === 'globalLore').map(key => index ? `[${source.shortName}] ${labelOf(source, key)}` : labelOf(source, key)))
            const otherFolders = loreFolders.filter(l => !sourceLabels.has(l.comment) && !roots.has(l.key))
            const originalFolders = [...incoming.values()].filter(part => part.kind === 'loreFolder')
            const dummy = { id: '__other', name: '', short: '', ascii: 'oth' }, meta = { id: sourceId, name: source.name, short: source.shortName, ascii: source.ascii }
            const predicted = applyMerge({ sources: [dummy, meta], parts: [...splitParts(dummy.id, { globalLore: otherFolders }), ...originalFolders], renames: [], roles: [], composites: [], warnings: [], needsLowLevel: false, name: '' }, { roles: {}, composites: {}, edits: {}, lowLevel: false, name: '' }).card.globalLore as any[] ?? []
            for (const [i, part] of originalFolders.entries()) {
                if (part.hash !== source.partHashes[part.key]) continue
                const raw = object(part.value), expected = index ? predicted[otherFolders.length + i]?.key : raw.key
                const folder = loreFolders.find(l => l.key === expected && l.comment === (index ? `[${source.shortName}] ${raw.comment}` : raw.comment))
                if (folder) aliases.set(folder.key, raw.key)
            }
        }
        folderMaps.set(source.id, { aliases, roots })
    }
    for (const field of sourceLists) {
        const rows = current[field] as unknown[] ?? [], used = new Set<number>()
        const sharedBundle = (value: unknown) => field === 'triggerscript' && object(value).comment === 'RisuTide bundle'
        const slots = p.sources.flatMap(source => Object.keys(source.partHashes).filter(key => fieldOf(source, key) === field && !source.excluded.includes(key)
            && !(source.partHashes[key] === hashValue([]) && labelOf(source, key) === field)).map(key => {
                const original = labelOf(source, key), renamed = source.renames.find(r => (field === 'globalLore' && r.space === 'loreNames' || field === 'triggerscript' && r.space === 'buttons' || ['additionalAssets', 'emotionImages'].includes(field) && r.space === 'assets') && r.from === original)?.to ?? original
                return { source, key, labels: new Set([renamed, `[${source.shortName}] ${original}`]) }
            }))
        const normalized = (slot: typeof slots[number], i: number) => rawPart(slot.source, slot.key, field, rows[i], folderMaps.get(slot.source.id)!.aliases, folderMaps.get(slot.source.id)!.roots)
        const assign = (slot: typeof slots[number], i: number) => {
            used.add(i); locations.set(slot.key, { field, index: i })
            if (slot.source.id === sourceId) values.set(slot.key, normalized(slot, i))
        }
        const byLabel = new Map<string, number[]>()
        rows.forEach((value, i) => {
            if (sharedBundle(value)) return
            const name = label(field, value), indexes = byLabel.get(name) ?? []
            indexes.push(i); byLabel.set(name, indexes)
        })
        if (field === 'additionalAssets' || field === 'emotionImages') {
            const names = slots.map(slot => {
                const names = new Set(slot.labels)
                for (const rename of slot.source.renames) if (rename.space === 'assets' && names.has(rename.from)) names.add(rename.to)
                return names
            })
            const aliases = mediaLabelRenames(names.flatMap(names => [...names]), rows.map(row => label(field, row)))
            const byOld = new Map([...aliases].map(([next, old]) => [old, next]))
            for (const [index, slot] of slots.entries()) for (const name of names[index]) {
                const next = byOld.get(name)
                if (next !== undefined) slot.labels.add(next)
            }
        }
        // Preserve row order even when an original and a prefixed label both match.
        const candidates = (slot: typeof slots[number]) => [...slot.labels].flatMap(name => byLabel.get(name) ?? []).sort((a, b) => a - b)
        for (const slot of slots) {
            const i = candidates(slot).find(i => !used.has(i) && normalized(slot, i).hash === slot.source.partHashes[slot.key]) ?? -1
            if (i >= 0) assign(slot, i)
        }
        const slotsByLabel = new Map<string, typeof slots>()
        for (const slot of slots) for (const name of slot.labels) {
            const matches = slotsByLabel.get(name) ?? []
            matches.push(slot); slotsByLabel.set(name, matches)
        }
        for (const slot of slots.filter(s => !locations.has(s.key))) {
            const indexes = candidates(slot).filter(i => !used.has(i))
            if (!indexes.length) continue
            const other = indexes.some(i => slotsByLabel.get(label(field, rows[i]))?.some(s => !locations.has(s.key) && s.source.id !== slot.source.id))
            if (other) throw new Error(`Ambiguous source ownership: ${field}: ${labelOf(slot.source, slot.key)}`)
            assign(slot, indexes[0])
        }
    }
    return { locations, values }
}
const getField = (card: CardFields, field: CompositeField): unknown => field.startsWith('ext:') ? object(card.extentions)[field.slice(4)] : card[field]
function contributed(parts: Part[], sourceId: string, field: CompositeField): unknown {
    if (field.startsWith('ext:')) return parts.find(p => p.key.startsWith(`${sourceId}:extentions:${field}#`))?.value
    const own = parts.filter(p => partField(p) === field)
    return field === 'defaultVariables' ? own.length ? own.map(p => p.value).join('\n') : undefined : own[0]?.value
}
function setField(card: CardFields, field: CompositeField, value: unknown) {
    if (field.startsWith('ext:')) {
        if (value === undefined) delete object(card.extentions)[field.slice(4)]
        else ((card.extentions ??= {}) as CardFields)[field.slice(4)] = clone(value)
    } else if (value === undefined) delete card[field]; else card[field] = clone(value)
}
function syntax(field: CompositeField, json = false): CompositeSpec['syntax'] {
    return json ? 'json' : field === 'backgroundHTML' ? 'html' : field === 'defaultVariables' ? 'kv' : 'text'
}
function combineJson(field: CompositeField, order: string[], values: Record<string, unknown>): unknown {
    const blocks = order.filter(id => Object.hasOwn(values, id)).map(id => ({ blockId: id, sourceId: id, body: JSON.stringify(values[id]) }))
    if (!blocks.length) return undefined
    if (blocks.some(b => !b.body.startsWith('{'))) return JSON.parse(blocks[0].body)
    return JSON.parse(buildComposite({ field, syntax: 'json', blocks }, blocks.map(b => b.blockId)))
}

/** Use the shared three-way classifier with part identities and hashes, never merged-card baselines. */
function compare(source: Source, current: Map<string, Part>, incoming: Part[]): Map<string, PlanItem> {
    const excluded = new Set(source.excluded), base = fingerprintCard({}, undefined, 0)
    base.assets = Object.entries(source.partHashes).filter(([key]) => !excluded.has(key)).map(([key, hash]) => [key, hashValue(hash)])
    const aliases = new Map<string, string>()
    for (const field of ['additionalAssets', 'emotionImages']) {
        const oldKeys = Object.keys(source.partHashes).filter(key => fieldOf(source, key) === field && !excluded.has(key))
        const parts = incoming.filter(part => partField(part) === field && !excluded.has(part.key))
        const names = mediaLabelRenames(oldKeys.map(key => labelOf(source, key)), parts.map(part => labelOf(source, part.key)))
        const keysByName = new Map(oldKeys.map(key => [labelOf(source, key), key]))
        for (const part of parts) {
            const name = names.get(labelOf(source, part.key))
            if (name !== undefined) aliases.set(part.key, keysByName.get(name)!)
        }
    }
    const card = (parts: Iterable<Part>) => ({ additionalAssets: [...parts].filter(p => !excluded.has(p.key)).map(p => [aliases.get(p.key) ?? p.key, p.hash]) })
    const result = planCharacterUpdate({ current: card(current.values()), incomingFields: card(incoming), base })
    const originals = new Map([...aliases].map(([next, old]) => [old, next]))
    return new Map(result.items.filter(i => i.unit === 'asset').map(i => {
        const key = i.id.slice('asset:'.length).replace(/#0$/, '')
        if (i.incoming && originals.has(key)) i.incoming = [originals.get(key), (i.incoming as string[])[1]]
        return [key, i]
    }))
}
function aggregate(items: PlanItem[]): PlanItem | undefined {
    const conflict = items.find(i => i.kind === 'conflict'), mine = items.find(i => i.kind.startsWith('mine'))
    if (conflict) return conflict
    if (mine && items.some(i => i.kind === 'authorChanged')) return { ...mine, kind: 'conflict', keepByDefault: false }
    return mine ?? items[0]
}
function originalFieldKeys(source: Source, field: CompositeField): string[] {
    return Object.keys(source.partHashes).filter(key => field.startsWith('ext:') ? key.startsWith(`${source.id}:extentions:${field}#`) : fieldOf(source, key) === field)
}

export function planPartialUpdate(args: { current: CardFields; provenance: Provenance; sourceId: SourceId; incoming: CardFields }): { plan: UpdatePlan; nextProvenance: Provenance } {
    const { current, provenance, sourceId, incoming } = args
    const source = provenance.sources.find(s => s.id === sourceId)
    if (!source) throw new Error(`Unknown merge source: ${sourceId}`)
    if (hashValue(incoming) === source.cardHash) return { plan: { hasBase: true, items: [], silent: { authorChanged: 0, authorAdded: 0, authorRemoved: 0 } }, nextProvenance: clone(provenance) }
    const original = splitParts(sourceId, incoming), byKey = new Map(original.map(p => [p.key, p]))
    const owned = ownership(current, provenance, byKey, sourceId), excluded = new Set(source.excluded)
    const nextProvenance = clone(provenance), nextSource = nextProvenance.sources.find(s => s.id === sourceId)!
    for (const part of original) if (partField(part) === 'license') excluded.add(part.key)
    nextSource.excluded = [...excluded]
    const candidate = clone(current), other = clone(current), compositeBodies = new Map<CompositeField, string | undefined>()
    const workComposites = clone(provenance.composites)
    const fieldKeys = (field: CompositeField) => originalFieldKeys(source, field)
    const hasContribution = (s: Source, field: CompositeField) => originalFieldKeys(s, field).some(key => !s.excluded.includes(key) && ![hashValue(null), hashValue({})].includes(s.partHashes[key]))
    for (const field of sourceLists) {
        const indexes = new Set([...owned.locations].filter(([key, loc]) => key.startsWith(`${sourceId}:`) && loc.field === field).map(([, loc]) => loc.index))
        other[field] = (other[field] as unknown[] ?? []).filter((_, i) => !indexes.has(i))
    }
    for (const [field, composite] of Object.entries(provenance.composites) as [CompositeField, NonNullable<Provenance['composites'][CompositeField]>][]) {
        if (field === 'luaTrigger') continue
        const value = getField(current, field), syn = syntax(field, !!composite.jsonValues)
        if (composite.jsonValues) {
            const own = composite.jsonValues[sourceId]
            for (const p of rewrite(splitParts(sourceId, field.startsWith('ext:') ? { extentions: { [field.slice(4)]: own } } : { [field]: own }), inverse(source.renames))) owned.values.set(p.key, p)
            const order = composite.order.filter(id => id !== sourceId), values = { ...composite.jsonValues }; delete values[sourceId]
            setField(other, field, combineJson(field, order, values))
            continue
        }
        if (!composite.order.includes(sourceId)) continue
        const blocks = typeof value === 'string' ? parseBlocks(value, syn) : null
        let body = blocks?.find(b => b.blockId === sourceId)?.body
        if (body === undefined && composite.order.length === 1 && composite.order[0] === sourceId && typeof value === 'string' && !value.includes('risutide:src=')) body = value
        if (body === undefined) {
            if (fieldKeys(field).some(key => byKey.get(key)?.hash !== source.partHashes[key])) throw new Error(`Broken source markers: ${field}`)
            continue
        }
        compositeBodies.set(field, body)
        const header = `# ${source.name}\n`, raw = blocks?.length && textFields.has(field) && body.startsWith(header) ? body.slice(header.length) : body
        const rawParts = splitParts(sourceId, field.startsWith('ext:') ? { extentions: { [field.slice(4)]: raw } } : { [field]: raw })
        const normalized = rewrite(rawParts, inverse(source.renames))
        const originalKeys = field === 'defaultVariables' ? splitParts(sourceId, { defaultVariables: normalized.map(p => p.value).join('\n') }) : normalized
        for (const p of originalKeys) owned.values.set(p.key, p)
        const removed = toggleBlock(String(value), { field, syntax: syn, blocks: [] }, sourceId, false)
        if ('text' in removed) setField(other, field, removed.text)
    }
    // Source Lua code stays recoverable even inside a bundle made by a later chained merge.
    const luaParts = original.filter(p => p.kind === 'luaTrigger')
    const oldTriggerKeys = Object.keys(source.partHashes).filter(key => fieldOf(source, key) === 'triggerscript')
    const bundles: { index: number; blocks: NonNullable<ReturnType<typeof bundleBlocks>> }[] = []
    const luaPrefix = `${luaSourceId(sourceId)}#`
    const ownLua = (id: string) => id.startsWith(luaPrefix)
    const luaIndex = (id: string) => Number(id.slice(luaPrefix.length).split('#')[0])
    const hasOwnLua = (blocks: NonNullable<ReturnType<typeof bundleBlocks>>): boolean => blocks.some(b => ownLua(b.blockId) || !!bundleBlocks(b.code) && hasOwnLua(bundleBlocks(b.code)!))
    const sourceLua = new Map<number, NonNullable<ReturnType<typeof bundleBlocks>>>()
    const collectLua = (blocks: NonNullable<ReturnType<typeof bundleBlocks>>) => {
        for (const block of blocks) {
            const nested = bundleBlocks(block.code)
            if (nested) { collectLua(nested); continue }
            if (!ownLua(block.blockId)) continue
            const index = luaIndex(block.blockId)
            if (!sourceLua.has(index)) sourceLua.set(index, [])
            sourceLua.get(index)!.push(block)
        }
    }
    for (const [i, trigger] of (current.triggerscript as any[] ?? []).entries()) if (trigger.comment === 'RisuTide bundle') {
        const blocks = bundleBlocks(trigger.effect?.[0]?.code ?? '')
        if (!blocks) throw new Error('Broken Lua source markers')
        bundles.push({ index: i, blocks }); collectLua(blocks)
    }
    for (const [index, blocks] of sourceLua) {
        const key = oldTriggerKeys[index], template = key && byKey.get(key)
        if (!template || excluded.has(key)) continue
        const value = clone(template.value) as any
        const originalBlocks = blocks.map(b => ({ ...b, blockId: originalLuaBlockId(b.blockId) ?? b.blockId }))
        value.effect[0].code = originalLuaBlockId(blocks[0].blockId) ? buildLuaBundle(originalBlocks).code : blocks[0].code
        owned.values.set(key, rewrite([{ ...template, value, hash: hashValue(value) }], inverse(source.renames))[0])
    }
    other.triggerscript = (other.triggerscript as any[] ?? []).filter(t => t.comment !== 'RisuTide bundle')
    const otherLua = (blocks: NonNullable<ReturnType<typeof bundleBlocks>>): any[] => blocks.flatMap(b => {
        const nested = bundleBlocks(b.code)
        return nested ? otherLua(nested) : ownLua(b.blockId) ? [] : [{ type: 'start', effect: [{ type: 'triggerlua', code: b.code }] }]
    })
    for (const b of bundles) (other.triggerscript as any[]).push(...otherLua(b.blocks))
    // Ordinary scalar fields owned by this source, excluding identity and permission choices.
    const ignored = new Set(['name', 'characterVersion', 'realmId', 'lowLevelAccess', 'modules', 'additionalData', 'image', 'license'])
    const firstOwner = provenance.sources.find(s => Object.keys(s.partHashes).some(key => fieldOf(s, key) === 'firstMessage' && !s.excluded.includes(key)))?.id
    for (const p of original) {
        const field = partField(p)
        if (field === 'extentions' && !excluded.has(p.key)) {
            const compositeField = labelOf(source, p.key) as CompositeField
            if (provenance.composites[compositeField] || provenance.sources.some(s => s.id !== sourceId && hasContribution(s, compositeField))) continue
            const value = getField(current, compositeField)
            if (value !== undefined) owned.values.set(p.key, rewrite([{ ...p, value: clone(value), hash: hashValue(value) }], inverse(source.renames))[0])
            setField(other, compositeField, undefined)
            continue
        }
        if (sourceLists.includes(field) || provenance.composites[field as CompositeField] || ignored.has(field) || isUserOwnedCardField(field) || excluded.has(p.key)) continue
        if (field === 'firstMessage' && firstOwner !== sourceId) {
            const i = (current.alternateGreetings as string[] ?? []).findIndex(text => hashValue(text) === source.partHashes[p.key])
            if (i >= 0) {
                owned.values.set(p.key, { ...p, value: clone((current.alternateGreetings as string[])[i]), hash: hashValue((current.alternateGreetings as string[])[i]) })
                if (![...owned.locations.values()].some(loc => loc.field === 'alternateGreetings' && loc.index === i)) owned.locations.set(p.key, { field: 'alternateGreetings', index: i })
            }
            continue
        }
        if (provenance.sources.some(s => s.id !== sourceId && hasContribution(s, field as CompositeField))) continue
        if (field === 'defaultVariables') {
            const parts = rewrite(splitParts(sourceId, { defaultVariables: current.defaultVariables }), inverse(source.renames))
            for (const line of splitParts(sourceId, { defaultVariables: parts.map(p => p.value).join('\n') })) owned.values.set(line.key, line)
            delete other[field]; continue
        }
        if (Object.hasOwn(current, field)) owned.values.set(p.key, rewrite([{ ...p, value: clone(current[field]), hash: hashValue(current[field]) }], inverse(source.renames))[0])
        delete other[field]
    }
    const priorRenamed = rewrite(original, source.renames)
    const extra = planRenames([{ id: '__other', ascii: 'oth', parts: splitParts('__other', other) }, { id: sourceId, ascii: source.ascii, parts: priorRenamed }])
    nextSource.renames = [...source.renames, ...extra]
    nextSource.partHashes = Object.fromEntries(original.map(p => [p.key, p.hash]))
    nextSource.cardHash = hashValue(incoming)
    nextSource.name = String(incoming.name ?? source.name)
    const transformed = rewrite(priorRenamed, extra).filter(p => !excluded.has(p.key)), byTransformed = new Map(transformed.map(p => [p.key, p]))
    const potentialFields = new Set<CompositeField>(['backgroundHTML', 'desc', 'replaceGlobalNote', 'systemPrompt', 'exampleMessage', 'defaultVariables', 'loreSettings', ...Object.keys(object(incoming.extentions)).map(key => `ext:${key}` as CompositeField)])
    for (const field of potentialFields) {
        if (workComposites[field] || contributed(transformed, sourceId, field) === undefined) continue
        const before = getField(current, field), owners = provenance.sources.filter(s => hasContribution(s, field))
        const json = field === 'loreSettings' || field.startsWith('ext:') && typeof getField(incoming, field) !== 'string'
        if (json) {
            const values: Record<string, unknown> = {}, order: string[] = []
            if (before !== undefined && owners[0]) { order.push(owners[0].id); values[owners[0].id] = clone(before) }
            workComposites[field] = { order, jsonValues: values }
        } else if (owners.some(s => s.id !== sourceId) && typeof before === 'string') {
            const owner = owners.find(s => s.id !== sourceId)!, body = textFields.has(field) ? `# ${owner.name}\n${before}` : before
            workComposites[field] = { order: [owner.id] }
            setField(candidate, field, buildComposite({ field, syntax: syntax(field), blocks: [{ blockId: owner.id, sourceId: owner.id, body }] }, [owner.id]))
        }
        if (workComposites[field]) nextProvenance.composites[field] = clone(workComposites[field])
    }
    const changes = compare(source, owned.values, original.filter(p => !ignored.has(partField(p)) && !isUserOwnedCardField(partField(p))))
    const classifications = new Map<string, PlanItem>(), fieldKinds = new Map<string, PlanItem>()
    const scalarConflicts = new Map<string, string>()
    const setFieldKind = (field: string, item: PlanItem) => fieldKinds.set(field, aggregate([...(fieldKinds.has(field) ? [fieldKinds.get(field)!] : []), item])!)
    for (const field of ['alternateGreetings', 'group_only_greetings', 'defaultVariables']) {
        const kind = aggregate([...changes].filter(([key]) => fieldOf(source, key) === field || field === 'alternateGreetings' && fieldOf(source, key) === 'firstMessage' && firstOwner !== sourceId).map(([, item]) => item))
        if (kind) setFieldKind(field, kind)
    }
    for (const [key, item] of changes) {
        const loc = owned.locations.get(key)
        if (loc) classifications.set(hashValue((current[loc.field] as unknown[])[loc.index]), item)
        const n = byTransformed.get((item.incoming as string[] | undefined)?.[0] ?? key) ?? byTransformed.get(key)
        if (n) classifications.set(hashValue(n.value), item)
    }
    const bundledKeys = new Set<string>()
    const sourceBundled = bundles.some(b => hasOwnLua(b.blocks))
    if (sourceBundled) for (const p of luaParts) if (canBundleLuaTrigger(p.value)) bundledKeys.add(p.key)
    for (const field of sourceLists) {
        const old = current[field] as unknown[] ?? []
        const own = new Map([...owned.locations].filter(([key, loc]) => key.startsWith(`${sourceId}:`) && loc.field === field).map(([key, loc]) => [loc.index, key]))
        const incomingParts = transformed.filter(p => (partField(p) === field || owned.locations.get(p.key)?.field === field) && !bundledKeys.has(p.key))
        const incomingKeys = new Set(incomingParts.map(p => p.key))
        const values: unknown[] = [], emitted = new Set<string>()
        let next = 0
        const emit = () => { const p = incomingParts[next++]; values.push(clone(p.value)); emitted.add(p.key) }
        const lastOwn = Math.max(-1, ...own.keys())
        const laterSources = new Set(provenance.sources.slice(provenance.sources.indexOf(source) + 1).map(s => s.id))
        const anchor = own.size ? -1 : Math.min(old.length, ...[...owned.locations].filter(([key, loc]) => loc.field === field && [...laterSources].some(id => key.startsWith(`${id}:`))).map(([, loc]) => loc.index))
        for (let i = 0; i < old.length; i++) {
            if (i === anchor) while (next < incomingParts.length) emit()
            const key = own.get(i)
            if (!key) { values.push(clone(old[i])); continue }
            if (!emitted.has(key) && incomingKeys.has(key)) while (next < incomingParts.length && !emitted.has(key)) emit()
            if (i === lastOwn) while (next < incomingParts.length) emit()
        }
        while (next < incomingParts.length) emit()
        if (Object.hasOwn(current, field) || values.length) candidate[field] = values
    }
    // Reuse T3's deterministic folder transformation without merging unrelated card fields.
    const loreParts = transformed.filter(p => p.kind === 'lore' || p.kind === 'loreFolder')
    if (loreParts.length) {
        const oldOwned = new Set([...owned.locations].filter(([key, loc]) => key.startsWith(`${sourceId}:`) && loc.field === 'globalLore').map(([, loc]) => loc.index))
        const roots = new Set((current.globalLore as any[] ?? []).filter((l, i) => l.mode === 'folder' && l.comment === `[${source.shortName}]` && ![...owned.locations.values()].some(loc => loc.field === 'globalLore' && loc.index === i)).map(l => l.key))
        const others = (current.globalLore as any[] ?? []).filter((l, i) => !oldOwned.has(i) && !roots.has(l.key))
        const dummy = { id: '__other', name: '', short: '', ascii: 'oth' }, meta = { id: sourceId, name: source.name, short: source.shortName, ascii: source.ascii }
        const temp = applyMerge({ sources: [dummy, meta], parts: [...splitParts(dummy.id, { globalLore: others }), ...loreParts], renames: [], roles: [], composites: [], warnings: [], needsLowLevel: false, name: '' }, { roles: {}, composites: {}, edits: {}, lowLevel: false, name: '' }).card.globalLore as any[]
        let rewrittenLore = temp.slice(others.length)
        if (provenance.sources[0].id === sourceId) {
            const root = rewrittenLore.find(l => l.mode === 'folder' && l.comment === `[${source.shortName}]`)?.key
            rewrittenLore = rewrittenLore.filter(l => l.key !== root).map(l => { if (l.mode === 'folder') l.comment = String(l.comment).replace(`[${source.shortName}] `, ''); if (l.folder === root) delete l.folder; return l })
        }
        const sourceValues = new Map<string, unknown>(), offset = rewrittenLore.length - loreParts.length
        loreParts.forEach((p, i) => sourceValues.set(p.key, rewrittenLore[i + offset]))
        const addedRoot = offset > 0 ? rewrittenLore.slice(0, offset) : []
        const loreKeys = new Map([...owned.locations].filter(([key, loc]) => key.startsWith(`${sourceId}:`) && loc.field === 'globalLore').map(([key, loc]) => [loc.index, key]))
        const result: unknown[] = [], seen = new Set<string>()
        for (const [i, l] of (current.globalLore as any[] ?? []).entries()) {
            if (roots.has(l.key)) continue
            const key = loreKeys.get(i)
            if (!key) result.push(clone(l))
            else if (sourceValues.has(key)) { result.push(clone(sourceValues.get(key))); seen.add(key) }
        }
        result.push(...addedRoot)
        for (const [key, value] of sourceValues) {
            if (!seen.has(key)) result.push(clone(value))
            const change = changes.get(key)
            if (change) classifications.set(hashValue(value), change)
        }
        candidate.globalLore = result
    }
    for (const [field, composite] of Object.entries(workComposites) as [CompositeField, NonNullable<Provenance['composites'][CompositeField]>][]) {
        if (field === 'luaTrigger') continue
        const keys = new Set([...fieldKeys(field), ...transformed.filter(p => field.startsWith('ext:') ? p.key.startsWith(`${sourceId}:extentions:ext:${field.slice(4)}#`) : partField(p) === field).map(p => p.key)])
        const changed = [...keys].map(key => changes.get(key)).filter((i): i is PlanItem => !!i)
        if (!changed.length && source.name === nextSource.name) continue
        if ([...keys].every(key => excluded.has(key))) continue
        const kind = aggregate(changed)
        const rowField = field.startsWith('ext:') ? 'extentions' : field
        if (kind) setFieldKind(rowField, kind)
        const value = getField(incoming, field), renamedValue = contributed(transformed, sourceId, field)
        if (composite.jsonValues) {
            const updated = nextProvenance.composites[field]!, before = combineJson(field, composite.order, composite.jsonValues)
            const values = { ...composite.jsonValues }
            if (value === undefined) { delete values[sourceId]; updated.order = updated.order.filter(id => id !== sourceId) }
            else { values[sourceId] = clone(renamedValue); if (!updated.order.includes(sourceId)) updated.order.push(sourceId) }
            updated.jsonValues = values
            setField(candidate, field, combineJson(field, updated.order, values))
            if (hashValue(getField(current, field)) !== hashValue(before)) setFieldKind(rowField, { id: '', unit: 'field', label: rowField, kind: 'conflict', keepByDefault: false })
            continue
        }
        const body = compositeBodies.get(field)
        const syn = syntax(field), spec: CompositeSpec = { field, syntax: syn, blocks: [] }
        let replacement = value === undefined ? undefined : field === 'defaultVariables' ? transformed.filter(p => partField(p) === field).map(p => p.value).join('\n') : renamedValue ?? value
        if (replacement !== undefined && textFields.has(field)) replacement = `# ${nextSource.name}\n${replacement}`
        if (body === undefined && composite.order.includes(sourceId)) continue
        const currentText = String(getField(candidate, field) ?? '')
        if (body === undefined && replacement !== undefined) spec.blocks = [{ blockId: sourceId, sourceId, body: String(replacement) }]
        const result = replacement === undefined ? toggleBlock(currentText, spec, sourceId, false) : body === undefined ? toggleBlock(currentText, spec, sourceId, true) : replaceBlock(currentText, spec, sourceId, String(replacement))
        if ('markersBroken' in result) throw new Error(`Broken source markers: ${field}`)
        if (parseBlocks(currentText, syn)?.length || body === undefined) setField(candidate, field, result.text || undefined)
        else setField(candidate, field, replacement === undefined ? undefined : renamedValue)
        if (replacement === undefined) nextProvenance.composites[field]!.order = composite.order.filter(id => id !== sourceId)
        else if (!nextProvenance.composites[field]!.order.includes(sourceId)) nextProvenance.composites[field]!.order.push(sourceId)
    }
    for (const p of transformed) {
        const field = partField(p)
        if (field === 'extentions') {
            const compositeField = labelOf(source, p.key) as CompositeField
            if (workComposites[compositeField]) continue
            setField(candidate, compositeField, p.value)
            const kind = changes.get(p.key); if (kind) setFieldKind('extentions', aggregate([...(fieldKinds.has('extentions') ? [fieldKinds.get('extentions')!] : []), kind])!)
            continue
        }
        if (sourceLists.includes(field) || workComposites[field as CompositeField] || field === 'extentions' || ignored.has(field) || isUserOwnedCardField(field)) continue
        if (field === 'defaultVariables') { candidate[field] = contributed(transformed, sourceId, field); continue }
        if (field === 'firstMessage' && firstOwner !== sourceId) {
            const loc = owned.locations.get(p.key), greetings = candidate.alternateGreetings as string[] ?? []
            if (!loc && !greetings.includes(String(p.value))) greetings.push(String(p.value))
            candidate.alternateGreetings = greetings
        } else {
            const owner = provenance.sources.find(s => s.id !== sourceId && hasContribution(s, field as CompositeField))
            if (owner && Object.hasOwn(current, field)) {
                if (hashValue(current[field]) === hashValue(p.value)) continue
                scalarConflicts.set(field, `${field} (applying would overwrite content owned by ${owner.name}; kept by default)`)
                fieldKinds.set(field, { id: `field:${field}`, unit: 'field', label: field, kind: 'conflict', keepByDefault: true, applyByDefault: false })
                candidate[field] = clone(p.value)
                continue
            }
            candidate[field] = clone(p.value)
        }
        const item = changes.get(p.key); if (item) setFieldKind(field === 'firstMessage' && firstOwner !== sourceId ? 'alternateGreetings' : field, item)
    }
    if (sourceBundled) {
        const replacements = original.filter(p => partField(p) === 'triggerscript').flatMap((p, index) => p.kind === 'luaTrigger' && canBundleLuaTrigger(p.value) && !excluded.has(p.key) ? sourceLuaBlocks(sourceId, index, String(object(byTransformed.get(p.key)?.value).effect?.[0]?.code ?? '')) : [])
        const standalone = new Map<string, unknown>()
        const pack = (blocks: NonNullable<ReturnType<typeof bundleBlocks>>) => {
            // Existing sources retain their shared-global slot. Only updated
            // blocks can become standalone; their original metadata is available.
            const priority = buildLuaBundle([...blocks.filter(b => !ownLua(b.blockId)), ...blocks.filter(b => ownLua(b.blockId))])
            for (const id of priority.unbundled) {
                if (!ownLua(id)) throw new Error('Partial update would unbundle another source')
                const index = luaIndex(id), part = original.filter(p => partField(p) === 'triggerscript')[index]
                if (part && byTransformed.has(part.key)) {
                    const value = clone(byTransformed.get(part.key)!.value), block = blocks.find(b => b.blockId === id)!
                    if (originalLuaBlockId(id)) { object(value).effect[0].code = block.code; object(value).comment = `${object(value).comment} (${id})` }
                    standalone.set(id, value)
                }
            }
            return buildLuaBundle(blocks.filter(b => !priority.unbundled.includes(b.blockId))).code
        }
        const replaceLua = (blocks: NonNullable<ReturnType<typeof bundleBlocks>>): NonNullable<ReturnType<typeof bundleBlocks>> => {
            const nested = blocks.some(b => !!bundleBlocks(b.code) && hasOwnLua(bundleBlocks(b.code)!))
            if (nested) return blocks.map(b => { const inner = bundleBlocks(b.code); return inner && hasOwnLua(inner) ? { ...b, code: pack(replaceLua(inner)) } : b })
            if (!blocks.some(b => ownLua(b.blockId))) return blocks
            const result: typeof blocks = []; let inserted = false
            for (const b of blocks) if (ownLua(b.blockId)) { if (!inserted) result.push(...replacements); inserted = true } else result.push(b)
            return result
        }
        for (const b of bundles) {
            if (!hasOwnLua(b.blocks)) continue
            const trigger = clone((current.triggerscript as any[])[b.index]), blocks = replaceLua(b.blocks)
            trigger.effect[0].code = pack(blocks)
            const index = (candidate.triggerscript as any[]).findIndex(t => t.comment === 'RisuTide bundle')
            ;(candidate.triggerscript as any[])[index] = trigger
            const changesLua = oldTriggerKeys.map(key => changes.get(key)).filter((i): i is PlanItem => !!i)
            const kind = aggregate(changesLua)
            if (kind) classifications.set(hashValue(trigger), kind)
            if (nextProvenance.composites.luaTrigger) nextProvenance.composites.luaTrigger.order = bundleBlocks(trigger.effect[0].code)!.map(b => b.blockId)
        }
        ;(candidate.triggerscript as unknown[]).push(...standalone.values())
    }
    preserveTargetLicense(candidate, current)
    const plan = planCharacterUpdate({ current, incomingFields: candidate, base: fingerprintCard(current, undefined, 0) })
    for (const [field, item] of fieldKinds) if (Object.hasOwn(current, field) && !Object.hasOwn(candidate, field)) {
        plan.items.push({ id: `field:${field}`, unit: 'field', label: field, kind: item.kind, keepByDefault: item.keepByDefault, current: clone(current[field]) })
        plan.silent.authorRemoved++
    }
    for (const item of plan.items) {
        const sourceItem = item.unit === 'field' ? fieldKinds.get(item.label) : classifications.get(hashValue(item.incoming)) ?? classifications.get(hashValue(item.current))
        if (sourceItem) { item.kind = sourceItem.kind; item.keepByDefault = sourceItem.keepByDefault }
        if (sourceItem?.applyByDefault !== undefined) item.applyByDefault = sourceItem.applyByDefault
        if (item.unit === 'field' && scalarConflicts.has(item.label)) item.label = scalarConflicts.get(item.label)!
    }
    // Feed source order through the shared planner as well; the full-card base
    // above deliberately treats every other source's present content as fixed.
    for (const [unit, field] of Object.entries(lists) as [Unit, string][]) {
        if (!['lore', 'regex', 'trigger'].includes(unit)) continue
        const originals = original.filter(p => partField(p) === field && p.kind !== 'luaTrigger' && !excluded.has(p.key))
        const oldKeys = Object.keys(source.partHashes).filter(key => fieldOf(source, key) === field && !excluded.has(key) && owned.values.get(key)?.kind !== 'luaTrigger')
        const base = fingerprintCard({}, undefined, 0)
        const fake = (key: string, hash: string) => ({ comment: key, in: hash, out: '', type: 'editinput' as const, flag: '', ableFlag: false })
        base.regex = oldKeys.map(key => [key, hashValue(regexBody(fake(key, source.partHashes[key])))])
        const ordered = [...owned.values.values()].filter(p => partField(p) === field && p.kind !== 'luaTrigger' && !excluded.has(p.key)).sort((a, b) => (owned.locations.get(a.key)?.index ?? Infinity) - (owned.locations.get(b.key)?.index ?? Infinity))
        const sourcePlan = planCharacterUpdate({ current: { customscript: ordered.map(p => fake(p.key, p.hash)) }, incomingFields: { customscript: originals.map(p => fake(p.key, p.hash)) }, base })
        const order = sourcePlan.items.find(i => i.id === 'order:regex')
        if (order) plan.items.push({ ...order, id: `order:${unit}`, unit, label: `order:${unit}`, current: plan.listIds?.[unit]?.current, incoming: plan.listIds?.[unit]?.incoming })
    }
    return { plan, nextProvenance }
}

/** The review plan contains enough values to reconstruct its incoming lists after serialization. */
export function partialUpdateFields(current: CardFields, plan: UpdatePlan): CardFields {
    const fields = clone(current), items = new Map(plan.items.map(i => [i.id, i]))
    for (const [unit, field] of Object.entries(lists) as [Unit, string][]) {
        const ids = plan.listIds?.[unit]
        if (!ids) continue
        const old = current[field] as unknown[] ?? []
        if (old.length !== ids.current.length) throw new Error('Partial update plan is stale')
        const values = new Map(ids.current.map((id, i) => [id, old[i]]))
        fields[field] = ids.incoming.map(id => clone(items.get(id)?.incoming ?? values.get(id)))
    }
    for (const item of plan.items) if (item.unit === 'field') {
        const field = item.id.slice('field:'.length)
        if (field === 'license' || isUnsafeCardKey(field) || isUserOwnedCardField(field)) continue
        if (item.incoming === undefined) delete fields[field]; else fields[field] = clone(item.incoming)
    }
    return fields
}
/** JSON composites replace complete recomputed values; the normal updater merges dictionaries. */
export function applyPartialUpdatePlan(args: { current: CardFields; plan: UpdatePlan; keep: ReadonlySet<string> }): CardFields {
    const fields = partialUpdateFields(args.current, args.plan), card = applyUpdatePlan({ ...args, incomingFields: fields })
    for (const item of args.plan.items) if (item.unit === 'field' && !args.keep.has(item.id)) {
        const field = item.id.slice('field:'.length)
        if (field === 'license' || isUnsafeCardKey(field) || isUserOwnedCardField(field)) continue
        if (item.incoming === undefined) delete card[field]; else card[field] = clone(item.incoming)
    }
    preserveTargetLicense(card, args.current)
    return card
}
