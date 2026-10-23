// RisuTide plugins/risutide/src/detach.ts 에서 가져옴 (쓰기 부분만 Dusk 쪽으로 옮김)
type PreparedUpdate = any
import { mediaLabelRenames } from '../characterMerge/mediaLabels'
import { cardFieldsOf, isUserOwnedCardField, type CardFields } from '../characterUpdate'
import { fingerprintCard, hashValue, planCharacterUpdate, defaultKeep, type Unit } from '../characterUpdateMerge'
import { applyPartialUpdatePlan } from '../characterMerge/partialUpdate'
import { folderId } from '../characterMerge/plan'
import { buildComposite, parseBlocks, toggleBlock } from '../characterMerge/composite'
import { splitParts } from '../characterMerge/parts'
import { partField } from '../characterMerge/roles'
import { applyRenames } from '../characterMerge/rewrite'
import { bundleBlocks, unwrapLuaBlocks, luaSourceId } from '../characterMerge/luaBundle'
import type { CompositeField, Part, Provenance } from '../characterMerge/types'

const fields = { asset: 'additionalAssets', emotion: 'emotionImages', lore: 'globalLore', regex: 'customscript', trigger: 'triggerscript' } as const
const label = (part: Part) => part.key.slice(`${part.sourceId}:${partField(part)}:`.length).replace(/#\d+$/, '')

/** Conservative matching: body equality is proof; a matching label alone is a review candidate. */
function claims(current: CardFields, provenance: Provenance, exactOnly = false) {
    // Reserve every proven owner before trying an edited item's label. Otherwise
    // an earlier target row with the same title can become the detach candidate.
    const reserved: Set<string> = exactOnly ? new Set() : new Set(claims(current, provenance, true).map(c => `${c.field}:${c.index}`))
    const allocated = new Set<string>()
    const aliases = new Map<string, Map<string, string>>()
    for (const field of ['additionalAssets', 'emotionImages']) {
        const names = provenance.sources.flatMap(source => Object.keys(source.partHashes).filter(key => key.startsWith(`${source.id}:${field}:`) && !source.excluded.includes(key)).flatMap(key => {
            const original = key.slice(`${source.id}:${field}:`.length).replace(/#\d+$/, '')
            const names = new Set([original, `[${source.shortName}] ${original}`])
            for (const rename of source.renames) if (rename.space === 'assets' && names.has(rename.from)) names.add(rename.to)
            return [...names]
        }))
        const matches = mediaLabelRenames(names, (current[field] as string[][] ?? []).map(row => row[0]))
        aliases.set(field, new Map([...matches].map(([next, old]) => [old, next])))
    }
    return provenance.sources.flatMap(source => {
        const result: { source: typeof source; key: string; field: string; index: number; exact: boolean; renamed: boolean }[] = []
        const used = new Set<string>()
        const roots = new Set((current.globalLore as any[] ?? []).filter(lore => lore.mode === 'folder' && lore.comment === `[${source.shortName}]` && !Object.keys(source.partHashes).some(key => key.startsWith(`${source.id}:globalLore:${lore.comment}#`))).map(lore => lore.key))
        const byField = new Map<string, Map<string, { part: Part; index: number }[]>>()
        for (const field of Object.values(fields)) {
            const byLabel = new Map<string, { part: Part; index: number }[]>()
            splitParts(source.id, { [field]: current[field] }).forEach((part, index) => {
                const name = label(part), rows = byLabel.get(name) ?? []
                rows.push({ part, index }); byLabel.set(name, rows)
            })
            byField.set(field, byLabel)
        }
        for (const [key, hash] of Object.entries(source.partHashes)) {
            if (source.excluded.includes(key)) continue
            const field = key.slice(source.id.length + 1).split(':')[0]
            if (!Object.values(fields).includes(field as any)) continue
            const original = key.slice(`${source.id}:${field}:`.length).replace(/#\d+$/, '')
            const names = new Set([original, `[${source.shortName}] ${original}`, ...source.renames.filter(r => r.from === original).map(r => r.to)])
            for (const rename of source.renames) if (names.has(rename.from)) names.add(rename.to)
            for (const name of [...names]) {
                const next = aliases.get(field)?.get(name)
                if (next !== undefined) names.add(next)
            }
            const matches = [...names].flatMap(name => byField.get(field)?.get(name) ?? []).filter(({ index }) => !used.has(`${field}:${index}`))
            const candidates = matches.map(({ part, index }) => {
                let raw = part
                for (const r of [...source.renames].reverse()) raw = applyRenames([raw], [{ ...r, from: r.to, to: r.from }])[0]
                let value: any = structuredClone(raw.value)
                if (field === 'globalLore' && value.comment === `[${source.shortName}] ${original}`) value.comment = original
                let exact = hashValue(value) === hash
                if (!exact && field === 'globalLore' && roots.has(value.folder)) { delete value.folder; exact = hashValue(value) === hash }
                return { source, key, field, index, exact, renamed: source.renames.some(r => r.from === original || JSON.stringify(part.value).includes(r.to)) }
            }).filter(match => match.index >= 0)
            const shared = candidates.every(c => allocated.has(`${c.field}:${c.index}`)) ? candidates.find(c => c.exact) : undefined
            const match = candidates.find(c => c.exact && !allocated.has(`${c.field}:${c.index}`)) ?? shared ?? (exactOnly ? undefined : candidates.find(c => !reserved.has(`${c.field}:${c.index}`)))
            if (match) { used.add(`${field}:${match.index}`); allocated.add(`${field}:${match.index}`); result.push(match) }
        }
        return result
    })
}

export interface PreparedDetach { current: Record<string, any>; provenance: Provenance; sourceId: string; prepared: PreparedUpdate; keys: Map<string, string[]>; separated?: CompositeField[] }
export function prepareDetach(current: Record<string, any>, provenance: Provenance, sourceId: string): PreparedDetach {
    const source = provenance.sources.find(s => s.id === sourceId)
    if (!source) throw new Error('Recorded source no longer exists')
    const before = cardFieldsOf(current as any), candidate = structuredClone(before)
    const matches = claims(before, provenance), own = matches.filter(c => c.source.id === sourceId)
    const reasons = new Map<string, string>(), keys = new Map<string, string[]>()
    const unsafe = new Set<string>(), removed = new Map<string, Set<number>>()
    const ko = true
    for (const match of own) {
        const location = `${match.field}:${match.index}`
        const shared = matches.some(c => c.source.id !== sourceId && c.field === match.field && c.index === match.index)
        const composite = JSON.stringify((before[match.field] as unknown[])[match.index]).includes('risutide:src=')
        const reason = composite ? ko ? '합쳐진 항목 전체를 떼어내요. 다른 출처의 내용도 함께 없어져요.' : 'Removes the whole combined item, including other sources’ content.' : !match.exact ? ko ? '수정되었거나 AI로 다듬은 자료예요. 기본으로 유지해요.' : 'Edited or AI-adapted material; kept by default.'
            : shared ? ko ? '다른 출처와 공유하는 자료예요. 기본으로 유지해요.' : 'Shared with another source; kept by default.'
                : match.renamed ? ko ? '이름 충돌을 피하려고 바꾼 자료예요. 기본으로 유지해요.' : 'Renamed to avoid a collision; kept by default.' : ''
        if (reason) { unsafe.add(location); reasons.set(location, reason) }
        const indexes = removed.get(match.field) ?? new Set(); indexes.add(match.index); removed.set(match.field, indexes)
    }
    // Bundled triggers are a whole composite. Never remove just a nested block.
    ;(before.triggerscript as any[] ?? []).forEach((trigger, index) => {
        const code = trigger.effect?.[0]?.code ?? ''
        const blocks = [...bundleBlocks(code) ?? [], ...unwrapLuaBlocks(code) ?? []]
        if (!blocks?.some(b => b.blockId.startsWith(`${luaSourceId(sourceId)}#`))) return
        const location = `triggerscript:${index}`
        unsafe.add(location); reasons.set(location, ko ? '합쳐진 트리거 전체를 떼어내요. 다른 출처의 코드도 함께 없어져요.' : 'Removes the entire combined trigger, including other sources’ code.')
        const indexes = removed.get('triggerscript') ?? new Set(); indexes.add(index); removed.set('triggerscript', indexes)
    })
    for (const [field, indexes] of removed) candidate[field] = (before[field] as unknown[]).filter((_, i) => !indexes.has(i))
    const compositeFields = Object.entries(provenance.composites).filter(([, spec]) => spec?.order.includes(sourceId)).map(([field]) => field)
    if (String(before.firstMessage ?? '').includes(`risutide:src=${sourceId}`)) compositeFields.push('firstMessage')
    const removedFields = new Set<string>(), safeFields = new Set<string>(), separated: CompositeField[] = []
    for (const field of compositeFields) {
        if (field === 'luaTrigger') continue
        const spec = provenance.composites[field as CompositeField]
        const value = field.startsWith('ext:') ? (before.extentions as any)?.[field.slice(4)] : before[field]
        const assign = (next: unknown) => {
            if (field.startsWith('ext:')) {
                if (next === undefined) delete (candidate.extentions as any)?.[field.slice(4)]
                else (candidate.extentions as any)[field.slice(4)] = next
            } else if (next === undefined) { delete candidate[field]; removedFields.add(field) }
            else candidate[field] = next
        }
        if (spec?.jsonValues) {
            const combine = (order: string[]) => {
                const blocks = order.filter(id => Object.hasOwn(spec.jsonValues!, id)).map(id => ({ blockId: id, sourceId: id, body: JSON.stringify(spec.jsonValues![id]) }))
                if (!blocks.length) return undefined
                return blocks.some(b => !b.body.startsWith('{')) ? JSON.parse(blocks[0].body) : JSON.parse(buildComposite({ field: field as CompositeField, syntax: 'json', blocks }, order))
            }
            // Aggregate edits cannot be assigned to one author. Keep them in review.
            if (hashValue(value) === hashValue(combine(spec.order))) {
                assign(combine(spec.order.filter(id => id !== sourceId)))
                safeFields.add(field); separated.push(field as CompositeField)
                continue
            }
        } else if (spec && typeof value === 'string') {
            const syntax = field === 'backgroundHTML' ? 'html' : field === 'defaultVariables' ? 'kv' : 'text'
            const blocks = parseBlocks(value, syntax), own = blocks?.find(b => b.blockId === sourceId)
            if (own) {
                const rawBody = (body: string, name: string) => ['desc', 'replaceGlobalNote', 'systemPrompt', 'exampleMessage'].includes(field) && body.startsWith(`# ${name}\n`) ? body.slice(name.length + 3) : body
                const raw = rawBody(own.body, source.name)
                let parts = splitParts(sourceId, field.startsWith('ext:') ? { extentions: { [field.slice(4)]: raw } } : { [field]: raw })
                for (const r of [...source.renames].reverse()) parts = applyRenames(parts, [{ ...r, from: r.to, to: r.from }])
                const prefix = field.startsWith('ext:') ? `${sourceId}:extentions:${field}#` : `${sourceId}:${field}:`
                const hashes = Object.entries(source.partHashes).filter(([key]) => key.startsWith(prefix) && !source.excluded.includes(key)).map(([, hash]) => hash).sort()
                const exact = hashes.length > 0 && JSON.stringify(parts.map(p => hashValue(p.value)).sort()) === JSON.stringify(hashes)
                const result = toggleBlock(value, { field: field as CompositeField, syntax, blocks: [] }, sourceId, false)
                if ('text' in result) {
                    let next: unknown = result.text
                    const remaining = blocks!.filter(b => b.blockId !== sourceId)
                    // Unwrap a sole untouched contribution only when no user's text
                    // exists outside the frames, restoring the original scalar.
                    if (remaining.length === 1 && result.text === buildComposite({ field: field as CompositeField, syntax, blocks: remaining.map(b => ({ ...b, sourceId: b.blockId })) }, remaining.map(b => b.blockId))) {
                        const owner = provenance.sources.find(s => s.id === remaining[0].blockId)
                        if (owner) next = rawBody(remaining[0].body, owner.name)
                    } else if (!remaining.length && !result.text && !provenance.sources.some(s => s.id !== sourceId && Object.keys(s.partHashes).some(key => key.startsWith(`${s.id}:${field}:`)))) next = undefined
                    assign(next); separated.push(field as CompositeField)
                    if (exact) safeFields.add(field)
                    continue
                }
            }
        }
        if (field.startsWith('ext:')) { if (candidate.extentions) delete (candidate.extentions as any)[field.slice(4)] }
        else if (Object.hasOwn(candidate, field)) {
            if (typeof candidate[field] === 'string') candidate[field] = ''
            else { delete candidate[field]; removedFields.add(field) }
        }
    }
    const scalarFields = new Set<string>()
    for (const field of new Set(Object.keys(source.partHashes).filter(key => !source.excluded.includes(key)).map(key => key.slice(sourceId.length + 1).split(':')[0]))) {
        if (Object.values(fields).includes(field as any) || compositeFields.includes(field) || ['name', 'extentions', 'lowLevelAccess'].includes(field) || isUserOwnedCardField(field) || !Object.hasOwn(before, field)) continue
        const recorded = Object.entries(source.partHashes).filter(([key]) => key.startsWith(`${sourceId}:${field}:`) && !source.excluded.includes(key))
        if (['alternateGreetings', 'group_only_greetings'].includes(field) && Array.isArray(before[field])) {
            const hashes = new Map<string, number>()
            for (const [, hash] of recorded) hashes.set(hash, (hashes.get(hash) ?? 0) + 1)
            candidate[field] = (before[field] as unknown[]).filter(value => {
                const hash = hashValue(value), count = hashes.get(hash) ?? 0
                if (!count) return true
                hashes.set(hash, count - 1); return false
            })
            const shared = provenance.sources.some(s => s.id !== sourceId && Object.entries(s.partHashes).some(([key, hash]) => key.startsWith(`${s.id}:${field}:`) && !s.excluded.includes(key) && recorded.some(([, own]) => own === hash)))
            if (!shared && [...hashes.values()].every(count => !count)) safeFields.add(field)
        } else {
            // A scalar was only imported when applyMerge recorded it as included.
            // Do not turn another owner's value into a removal candidate.
            const otherOwner = provenance.sources.some(s => s.id !== sourceId && Object.keys(s.partHashes).some(key => key.startsWith(`${s.id}:${field}:`) && !s.excluded.includes(key)))
            if (otherOwner) continue
            delete candidate[field]; removedFields.add(field)
            if (recorded.length === 1 && hashValue(before[field]) === recorded[0][1]) safeFields.add(field)
        }
        scalarFields.add(field)
    }
    const plan = planCharacterUpdate({ current: before, incomingFields: candidate, base: fingerprintCard(before) })
    for (const field of removedFields) plan.items.push({ id: `field:${field}`, unit: 'field', label: field, kind: 'authorChanged', keepByDefault: true, applyByDefault: false, current: before[field] })
    plan.detachReasons = {}
    const itemsById = new Map(plan.items.map(item => [item.id, item]))
    const keysByLocation = new Map<string, string[]>()
    for (const claim of own) {
        const location = `${claim.field}:${claim.index}`, claimed = keysByLocation.get(location) ?? []
        claimed.push(claim.key); keysByLocation.set(location, claimed)
    }
    for (const [unit, field] of Object.entries(fields) as [Exclude<Unit, 'field'>, string][]) {
        plan.listIds?.[unit]?.current.forEach((id, index) => {
            const item = itemsById.get(id)
            if (!item) return
            const location = `${field}:${index}`
            keys.set(id, keysByLocation.get(location) ?? [])
            if (unsafe.has(location)) { item.keepByDefault = true; item.applyByDefault = false; item.mineChanged = true; item.kind = 'conflict'; plan.detachReasons![id] = reasons.get(location)! }
        })
    }
    for (const item of plan.items.filter(i => i.unit === 'field')) {
        const related = compositeFields.filter(field => (field.startsWith('ext:') ? 'extentions' : field) === item.label)
        const safe = related.length ? related.every(field => safeFields.has(field)) : safeFields.has(item.label)
        item.keepByDefault = !safe; item.applyByDefault = safe
        const split = scalarFields.has(item.label) || related.length > 0 && related.every(field => separated.includes(field as CompositeField))
        plan.detachReasons[item.id] = split ? safe ? ko ? '이 출처의 기록과 같은 부분만 떼어내고 다른 출처는 유지해요.' : 'Removes only this unchanged source contribution; other sources are kept.' : ko ? '수정한 출처 부분이에요. 기본으로 유지하며 선택하면 이 출처 부분만 떼어내요.' : 'Edited source contribution; kept by default. Selecting removes only this source block.' : ko ? '합쳐진 항목 전체를 되돌려요. 다른 출처의 내용도 함께 없어져요. 필요한 경우에만 선택하세요.' : 'Reverts this whole combined field, including other sources’ content. Select only if intended.'
        keys.set(item.id, Object.keys(source.partHashes).filter(k => related.length ? related.some(field => k.startsWith(field.startsWith('ext:') ? `${sourceId}:extentions:${field}#` : `${sourceId}:${field}:`)) : k.startsWith(`${sourceId}:${item.label}:`)))
    }
    const generatedRoots = new Set((before.globalLore as any[] ?? []).filter(lore => {
        if (lore.mode !== 'folder' || lore.comment !== `[${source.shortName}]`) return false
        const count = Object.keys(source.partHashes).filter(key => key.startsWith(`${source.id}:globalLore:`)).length
        return Array.from({ length: count + 1 }, (_, i) => folderId(source.id, i)).includes(lore.key)
            && hashValue(lore) === hashValue({ mode: 'folder', key: lore.key, comment: `[${source.shortName}]`, content: '', alwaysActive: false })
    }).map(lore => lore.key))
    const merge = (keep: ReadonlySet<string>) => {
        const card = applyPartialUpdatePlan({ current: before, plan, keep })
        if (generatedRoots.size && Array.isArray(card.globalLore)) {
            const parents = new Set((card.globalLore as any[]).map(lore => lore.folder).filter(Boolean))
            card.globalLore = (card.globalLore as any[]).filter(lore => !generatedRoots.has(lore.key) || parents.has(lore.key))
        }
        const originalTarget = provenance.sources[0]
        for (const field of new Set([...removed.keys(), ...scalarFields, ...separated.map(field => field.startsWith('ext:') ? 'extentions' : field)])) {
            const value = card[field]
            if (value && typeof value === 'object' && !Object.keys(value).length && hashValue(value) !== hashValue(before[field])
                && !Object.keys(originalTarget.partHashes).some(key => key.startsWith(`${originalTarget.id}:${field}:`))) delete card[field]
        }
        return card
    }
    const summary: any = { nameFrom: current.name, nameTo: current.name, versionFrom: current.characterVersion, versionTo: current.characterVersion }
    const caption = ko ? '가져온 자료 떼어내기 · 기록과 같은 자료와 안전하게 분리할 수 있는 출처 부분만 기본으로 선택했어요. 수정·AI 편집·이름 변경·공유 자료는 유지해요. 분리할 수 없는 합쳐진 항목은 전체로만 되돌릴 수 있어요. 적용 전 백업으로 되돌릴 수 있어요.' : 'Detach imported material. Unchanged recorded material and safely separable source contributions are selected. Edited, AI-adapted, renamed and shared material is kept. Inseparable composites can only be reverted whole. A backup is saved before applying.'
    return { current, provenance, sourceId, keys, separated, prepared: { plan, currentFields: before, incomingFields: candidate, base: null, merge, summary, summarize: () => summary, detachCaption: caption } }
}
export function applyPreparedDetach(detached: PreparedDetach, keep = defaultKeep(detached.prepared.plan)): { card: CardFields; provenance: Provenance } {
    const card = detached.prepared.merge!(keep), next = structuredClone(detached.provenance)
    const source = next.sources.find(s => s.id === detached.sourceId)!
    const removedExtensions = new Set(Object.keys(detached.prepared.currentFields.extentions ?? {}).filter(key => !Object.hasOwn(card.extentions ?? {}, key)))
    const extensionPrefix = `${source.id}:extentions:ext:`
    const removedKeys = new Set([...detached.keys].filter(([id]) => !keep.has(id)).flatMap(([, keys]) => keys)
        .filter(key => !key.startsWith(extensionPrefix) || removedExtensions.has(key.slice(extensionPrefix.length).replace(/#\d+$/, '')) || detached.separated?.includes(`ext:${key.slice(extensionPrefix.length).replace(/#\d+$/, '')}`)))
    for (const key of removedKeys) { delete source.partHashes[key]; if (!source.excluded.includes(key)) source.excluded.push(key) }
    for (const item of detached.prepared.plan.items.filter(item => !keep.has(item.id))) {
        if (item.unit === 'field') {
            for (const [field, spec] of Object.entries(next.composites)) {
                const cardField = field.startsWith('ext:') ? 'extentions' : field
                if (!spec || item.id !== `field:${cardField}`) continue
                if (detached.separated?.includes(field as CompositeField)) {
                    spec.order = spec.order.filter(id => id !== detached.sourceId)
                    if (spec.jsonValues) delete spec.jsonValues[detached.sourceId]
                    if (!spec.order.length) delete next.composites[field as CompositeField]
                    continue
                }
                if (field.startsWith('ext:') && !removedExtensions.has(field.slice(4))) continue
                delete (next.composites as any)[field]
                for (const owner of next.sources) for (const key of Object.keys(owner.partHashes)) {
                    const prefix = field.startsWith('ext:') ? `${owner.id}:extentions:${field}#` : `${owner.id}:${field}:`
                    if (key.startsWith(prefix)) { delete owner.partHashes[key]; if (!owner.excluded.includes(key)) owner.excluded.push(key) }
                }
            }
        } else if (item.unit === 'trigger') {
            const code = (item.current as any)?.effect?.[0]?.code ?? ''
            const blocks = [...bundleBlocks(code) ?? [], ...unwrapLuaBlocks(code) ?? []]
            if (!blocks.length) continue
            if (next.composites.luaTrigger) {
                next.composites.luaTrigger.order = next.composites.luaTrigger.order.filter(id => !blocks.some(b => b.blockId === id))
                if (!next.composites.luaTrigger.order.length) delete next.composites.luaTrigger
            }
            for (const owner of next.sources) {
                const original = detached.provenance.sources.find(s => s.id === owner.id)!
                const triggerKeys = Object.keys(original.partHashes).filter(key => key.startsWith(`${owner.id}:triggerscript:`))
                for (const block of blocks.filter(b => b.blockId.startsWith(`${luaSourceId(owner.id)}#`))) {
                    const index = Number(block.blockId.slice(luaSourceId(owner.id).length + 1).split('#')[0])
                    if (triggerKeys[index]) { delete owner.partHashes[triggerKeys[index]]; if (!owner.excluded.includes(triggerKeys[index])) owner.excluded.push(triggerKeys[index]) }
                }
            }
        }
    }
    const remaining = [...detached.keys].some(([id]) => keep.has(id)) || Object.keys(source.partHashes).some(key => !source.excluded.includes(key) && !key.startsWith(`${source.id}:name:`))
    if (!remaining && next.sources.length > 1) next.sources = next.sources.filter(s => s.id !== detached.sourceId)
    return { card, provenance: next }
}

