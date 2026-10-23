import { cardFieldsOf, KEPT_FIELDS, sanitizeCardValue } from '../characterUpdate'
import type { CardFields } from '../characterUpdate'
import { hashValue } from '../characterUpdateMerge'
import { shortNames, planRenames } from './collide'
import { buildComposite, parseBlocks } from './composite'
import { buildLuaBundle, canBundleLuaTrigger, luaSourceId, unwrapLuaBlocks, sourceLuaBlocks } from './luaBundle'
import { splitParts } from './parts'
import { preserveTargetLicense } from './license'
import { floatingConflicts, moveFloatingUI } from './floatingUI'
import { isModuleMaterial, moduleAttachment, type ModuleSourceOptions } from './moduleSource'
import { applyRenames, assetName } from './rewrite'
import { detectRoles, imageGenPart, nonempty, partField } from './roles'
import { selfCheck } from './selfCheck'
import type { CompositeField, CompositeSpec, MergeChoices, MergeInput, MergePlan, Part, Provenance, Warning } from './types'

type Problem = { sourceId: string; partKey: string; reason: string }
export class MergeSelfCheckError extends Error {
    constructor(public readonly problems: Problem[]) {
        super(`Merge self-check failed: ${problems.map(p => `${p.sourceId}: ${p.reason}`).join('; ')}`)
        this.name = 'MergeSelfCheckError'
    }
}
const lists = new Set(['globalLore', 'customscript', 'triggerscript', 'additionalAssets', 'emotionImages', 'alternateGreetings', 'group_only_greetings'])
const fields: CompositeField[] = ['backgroundHTML', 'desc', 'replaceGlobalNote', 'systemPrompt', 'exampleMessage', 'defaultVariables', 'loreSettings']
const textFields = new Set(['desc', 'replaceGlobalNote', 'systemPrompt', 'exampleMessage'])
const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
const extensionKey = (part: Part) => part.key.slice(`${part.sourceId}:extentions:ext:`.length, part.key.lastIndexOf('#'))
const isExtension = (part: Part) => part.key.startsWith(`${part.sourceId}:extentions:ext:`)
const existingPlans = new WeakMap<MergePlan, Provenance>()
const sourceCache = new WeakMap<CardFields, { serialized: string; card: CardFields; parts: Map<string, Part[]> }>()
const rewrittenPlans = new WeakMap<MergePlan, { signature: string; parts: Part[] }>()

/** Empty collections still carry field presence, needed for lossless target restoration. */
function originalParts(id: string, card: CardFields): Part[] {
    const parts = splitParts(id, card)
    for (const [field, value] of Object.entries(card)) {
        if ((lists.has(field) && Array.isArray(value) && !value.length) || field === 'extentions' && value && !Object.keys(value).length) {
            parts.push({ sourceId: id, kind: 'extension', key: `${id}:${field}:${field}#0`, value: sanitizeCardValue(value), hash: hashValue(value) })
        }
    }
    return parts
}
function cardOf(parts: Part[], copy = true): CardFields {
    const card: CardFields = {}
    for (const part of parts) {
        const field = partField(part), value = copy ? sanitizeCardValue(part.value) : part.value
        if (isExtension(part)) ((card.extentions ??= {}) as CardFields)[extensionKey(part)] = value
        else if (lists.has(field) && part.kind !== 'extension') ((card[field] ??= []) as unknown[]).push(value)
        else if (field === 'defaultVariables' && part.kind === 'variable') card[field] = card[field] === undefined ? value : `${card[field]}\n${value}`
        else card[field] = value
    }
    return card
}
function valueOf(card: CardFields, field: CompositeField): unknown {
    return field.startsWith('ext:') ? object(card.extentions)[field.slice(4)] : card[field]
}
function partsOfField(parts: Part[], field: CompositeField): Part[] {
    return parts.filter(p => field.startsWith('ext:') ? isExtension(p) && extensionKey(p) === field.slice(4) : partField(p) === field)
}
function syntaxOf(field: CompositeField, values: unknown[]): CompositeSpec['syntax'] {
    if (field === 'backgroundHTML') return 'html'
    if (field === 'defaultVariables') return 'kv'
    if (field === 'loreSettings' || field.startsWith('ext:') && values.some(v => typeof v !== 'string')) return 'json'
    return 'text'
}
function composites(inputs: MergeInput[], existing?: Provenance): CompositeSpec[] {
    const allFields = [...fields, ...new Set(inputs.flatMap(i => Object.keys(object(i.card.extentions)).map(k => `ext:${k}` as CompositeField)))]
    const result: CompositeSpec[] = []
    for (const field of allFields) {
        const values = inputs.map(i => valueOf(i.card, field))
        if (!values.slice(1).some(nonempty)) continue
        const syntax = syntaxOf(field, values), blocks: CompositeSpec['blocks'] = []
        for (let i = 0; i < inputs.length; i++) {
            const value = values[i]
            if (value === undefined || value === null) continue
            const input = inputs[i]
            if (i === 0 && syntax === 'json' && existing?.composites[field]?.jsonValues) {
                for (const blockId of existing.composites[field]!.order) if (Object.hasOwn(existing.composites[field]!.jsonValues!, blockId)) {
                    blocks.push({ blockId, sourceId: blockId, body: JSON.stringify(existing.composites[field]!.jsonValues![blockId]) })
                }
                continue
            }
            if (i === 0 && existing?.composites[field] && typeof value === 'string') {
                const parsed = parseBlocks(value, syntax)
                if (parsed?.length) {
                    blocks.push(...parsed.map(b => ({ blockId: b.blockId, sourceId: b.blockId, body: b.body })))
                    continue
                }
            }
            const body = syntax === 'json' ? JSON.stringify(value) : `${textFields.has(field) ? `# ${input.meta.name}\n` : ''}${String(value)}`
            blocks.push({ blockId: input.meta.id, sourceId: input.meta.id, body })
        }
        result.push({ field, syntax, blocks })
    }
    return result
}
const luaCode = (part: Part) => typeof part.value === 'string' ? part.value : String(object(part.value).effect?.[0]?.code ?? '')
type LuaPartBlock = { part: Part; blockId: string; code: string; sourceId: string; expanded: boolean }
function luaBlocks(parts: Part[], existing?: Provenance, target?: string): LuaPartBlock[] {
    const indexes = new Map<string, number>(), blocks: LuaPartBlock[] = [], used = new Set<string>()
    const bundledIds = new Set(parts.filter(p => p.sourceId === target && p.kind === 'luaTrigger').flatMap(p => unwrapLuaBlocks(luaCode(p))?.map(b => b.blockId) ?? []))
    const standaloneIds = existing?.composites.luaTrigger?.order.filter(id => !bundledIds.has(id)) ?? []
    let standaloneIndex = 0
    const hex = (value: string) => Array.from(new TextEncoder().encode(value), byte => byte.toString(16).padStart(2, '0')).join('')
    for (const part of parts) if (partField(part) === 'triggerscript' && part.kind !== 'extension') {
        const index = indexes.get(part.sourceId) ?? 0
        indexes.set(part.sourceId, index + 1)
        if (part.kind !== 'luaTrigger') continue
        const namespace = `${luaSourceId(part.sourceId)}#${index}`, code = luaCode(part), parsed = unwrapLuaBlocks(code)
        const values = parsed && part.sourceId !== target ? sourceLuaBlocks(part.sourceId, index, code) : parsed ?? [{ blockId: part.sourceId === target ? standaloneIds[standaloneIndex++] ?? namespace : namespace, code }]
        for (const value of values) {
            // Target bundles retain their original IDs; added bundles are a new source.
            let blockId = value.blockId
            if (!/^[A-Za-z0-9_.#-]+$/.test(blockId)) blockId = `${namespace}#${hex(blockId)}`
            let serial = 0
            while (used.has(blockId)) blockId = `${namespace}#${hex(value.blockId)}#${serial++}`
            used.add(blockId)
            const sourceId = existing?.sources.find(s => blockId.startsWith(`${luaSourceId(s.id)}#`))?.id ?? part.sourceId
            blocks.push({ part, blockId, code: value.code, sourceId, expanded: !!parsed })
        }
    }
    return blocks
}
function distance(a: string, b: string): number {
    if (Math.abs(a.length - b.length) > 2) return 3
    if (a === b) return 0
    let prefix = 0, aEnd = a.length, bEnd = b.length
    while (prefix < aEnd && prefix < bEnd && a[prefix] === b[prefix]) prefix++
    while (aEnd > prefix && bEnd > prefix && a[aEnd - 1] === b[bEnd - 1]) { aEnd--; bEnd-- }
    a = a.slice(prefix, aEnd); b = b.slice(prefix, bEnd)
    if (!a.length || !b.length) return Math.max(a.length, b.length)
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
    let row = new Array(b.length + 1).fill(3)
    for (let i = 1; i <= a.length; i++) {
        row[0] = i
        const first = Math.max(1, i - 2), last = Math.min(b.length, i + 2)
        if (first > 1) row[first - 1] = 3
        if (last < b.length) row[last + 1] = 3
        let minimum = i
        for (let j = first; j <= last; j++) {
            row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]))
            minimum = Math.min(minimum, row[j])
        }
        if (minimum > 2) return 3
        const old = previous; previous = row; row = old
    }
    return previous[b.length]
}
function warningsOf(inputs: MergeInput[], parts: Part[], existing?: Provenance): Warning[] {
    const warnings: Warning[] = []
    const add = (kind: Warning['kind'], detail: string) => warnings.push({ kind, detail })
    const walkCss = (value: unknown): string[] => typeof value === 'string' ? [...value.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map(m => m[1]) : value && typeof value === 'object' ? Object.values(value).flatMap(walkCss) : []
    for (const input of inputs.slice(1)) for (const part of input.parts) {
        const css = [...walkCss(part.value), ...(part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value) ? [part.value] : [])]
        for (const text of css) for (const match of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[{};])\s*([^{};]+)\{/g)) {
            if (/(?:^|[\s,>+~])(?:html|body|\*|:root)(?=[\s,:.#>[+~]|$)/i.test(match[1])) add('globalCss', `${input.meta.name}: ${match[1].trim()}`)
        }
    }
    const assets = inputs.map(i => [...new Set(i.parts.filter(p => p.kind === 'asset' || p.kind === 'emotion').map(p => String((p.value as unknown[])[0])))].map(name => ({ name, normalized: assetName(name.trim()) })))
    // Two edits leave a shared three-character subsequence in the first five
    // characters. Index that necessary condition before computing the distance.
    const prefixKeys = (text: string) => {
        const keys = new Set<string>()
        for (let a = 0; a < 3; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 5; c++) keys.add(text[a] + text[b] + text[c])
        return [...keys]
    }
    // With at most two edits, at least one of three disjoint blocks survives,
    // shifted by at most two positions. Use bounded blocks across the whole
    // name: common asset prefixes alone otherwise admit nearly every pair.
    const nameBlocks = (length: number) => {
        const size = Math.min(8, Math.floor(length / 3))
        return [0, Math.floor((length - size) / 2), length - size].map(start => ({ start, size }))
    }
    const indexes = assets.map((names, source) => {
        const index = new Map<string, typeof names>()
        if (!source) return index
        for (const name of names) {
            const keys = new Set<string>()
            for (let length = Math.max(6, name.normalized.length - 2); length <= name.normalized.length + 2; length++) {
                nameBlocks(length).forEach(({ start, size }, block) => {
                    for (let delta = -2; delta <= 2; delta++) {
                        const at = start + delta
                        if (at >= 0 && at + size <= name.normalized.length) keys.add(`${length}:${block}:${name.normalized.slice(at, at + size)}`)
                    }
                })
            }
            for (const key of keys) {
                if (!index.has(key)) index.set(key, [])
                index.get(key)!.push(name)
            }
        }
        return index
    })
    const orders = assets.map(names => new Map(names.map((name, index) => [name, index])))
    const prefixSets = assets.map(names => new Map(names.map(name => [name, new Set(prefixKeys(name.normalized))])))
    for (let i = 0; i < inputs.length; i++) for (let j = i + 1; j < inputs.length; j++) for (const a of assets[i]) {
        const candidates = new Set<(typeof assets)[number][number]>()
        if (a.normalized.length < 6) {
            for (const b of assets[j]) if (Math.abs(a.normalized.length - b.normalized.length) <= 2) candidates.add(b)
        } else nameBlocks(a.normalized.length).forEach(({ start, size }, block) => {
            for (const b of indexes[j].get(`${a.normalized.length}:${block}:${a.normalized.slice(start, start + size)}`) ?? []) candidates.add(b)
        })
        // Keep the deployed warning order: length, first shared prefix bucket,
        // then source occurrence. Only indexed candidates need this ordering.
        const prefixes = prefixKeys(a.normalized), order = orders[j]
        const rank = (b: (typeof assets)[number][number]) => a.normalized.length < 5 || b.normalized.length < 5 ? 0 : prefixes.findIndex(prefix => prefixSets[j].get(b)!.has(prefix))
        const ranked = [...candidates].map(b => ({ b, rank: rank(b) })).filter(b => b.rank >= 0)
        ranked.sort((a, b) => a.b.normalized.length - b.b.normalized.length || a.rank - b.rank || order.get(a.b)! - order.get(b.b)!)
        for (const { b } of ranked) if (distance(a.normalized, b.normalized) <= 2) add('assetFuzzy', `${inputs[i].meta.short}: ${a.name} / ${inputs[j].meta.short}: ${b.name}`)
    }
    const budget = Math.max(...inputs.map(i => Number(object(i.card.loreSettings).tokenBudget) || 0))
    const tokens = parts.filter(p => p.kind === 'lore' && object(p.value).alwaysActive).reduce((n, p) => n + String(object(p.value).content ?? '').length / 3.5, 0)
    if (tokens > budget) add('loreTokens', `${Math.ceil(tokens)} always-active lore tokens > ${budget} tokenBudget`)
    for (const part of parts.filter(p => p.kind === 'regex')) {
        const r = object(part.value)
        if (r.type === 'editoutput' && /^[\p{L}\p{N}_\s]+$/u.test(String(r.in ?? '').trim()) && nonempty(r.in)) add('globalRegex', `${part.sourceId}: ${r.comment || r.in}`)
    }
    if (inputs.filter(i => i.parts.some(p => p.kind === 'luaTrigger' && /\bonOutput\b/.test(luaCode(p)))).length >= 2) add('crossLua', 'Multiple sources define onOutput; each can act on the other sources’ scenes')
    for (const part of parts.filter(p => p.kind === 'luaTrigger' && !canBundleLuaTrigger(p.value))) {
        add('unbundledLua', `${inputs.find(i => i.meta.id === part.sourceId)?.meta.name ?? part.sourceId}: ${object(part.value).comment || part.key} (trigger conditions or mode must remain standalone)`)
    }
    const blocks = luaBlocks(parts, existing, inputs[0]?.meta.id).filter(b => canBundleLuaTrigger(b.part.value))
    if (blocks.length >= 2) for (const id of buildLuaBundle(blocks).unbundled) add('unbundledLua', id)
    return warnings
}

export function planMerge(target: MergeInput, added: MergeInput[], existing?: Provenance, options: ModuleSourceOptions = {}): MergePlan {
    const raw = [target, ...added]
    if (new Set(raw.map(i => i.meta.id)).size !== raw.length) throw new Error('Merge source IDs must be unique')
    const shorts = shortNames(raw.map(i => String(i.card.name ?? i.meta.name)))
    if (existing) {
        const usedShorts = new Set(existing.sources.map(s => s.shortName)), usedAscii = new Set(existing.sources.map(s => s.ascii))
        for (let i = 1; i < raw.length; i++) {
            const base = shortNames([String(raw[i].card.name ?? raw[i].meta.name)])[0]
            let suffix = 1
            while (usedShorts.has(base.short + (suffix === 1 ? '' : suffix)) || usedAscii.has(base.ascii + (suffix === 1 ? '' : suffix))) suffix++
            shorts[i] = { short: base.short + (suffix === 1 ? '' : suffix), ascii: base.ascii + (suffix === 1 ? '' : suffix) }
            usedShorts.add(shorts[i].short); usedAscii.add(shorts[i].ascii)
        }
    }
    const inputs = raw.map((input, i) => {
        // Reuse the card split's sanitization and ownership policy; target kept fields survive.
        const serialized = JSON.stringify(input.card)
        let cached = sourceCache.get(input.card)
        if (!cached || cached.serialized !== serialized) {
            const author = cardFieldsOf(input.card as Parameters<typeof cardFieldsOf>[0])
            cached = { serialized, card: { ...sanitizeCardValue(input.card), ...author }, parts: new Map() }
            sourceCache.set(input.card, cached)
        }
        const card = cached.card
        const realmId = input.meta.realmId ?? card.realmId ?? object(card.extentions).risuRealmImportId
        const meta = { ...input.meta, name: String(card.name ?? input.meta.name), ...shorts[i], ...(typeof realmId === 'string' && realmId ? { realmId } : {}) }
        if (!cached.parts.has(meta.id)) cached.parts.set(meta.id, originalParts(meta.id, card))
        return { card, meta, parts: cached.parts.get(meta.id)! }
    })
    const renames = planRenames(inputs.map(i => ({ id: i.meta.id, ascii: i.meta.ascii, parts: i.parts })))
    const rewritten = inputs.map((input, index) => {
        const parts = index ? applyRenames(input.parts, renames) : input.parts
        return { ...input, card: cardOf(parts), parts }
    })
    const problems = rewritten.slice(1).flatMap(input => selfCheck(input.card, renames.filter(r => r.sourceId === input.meta.id)).problems.map(p => ({ sourceId: input.meta.id, ...p, partKey: p.partKey.replace(/^card:/, `${input.meta.id}:`) })))
    if (problems.length) throw new MergeSelfCheckError(problems)
    const plan: MergePlan = {
        sources: inputs.map(i => i.meta), renames, roles: detectRoles(rewritten), composites: composites(rewritten, existing),
        // Keep original values/hashes for provenance. Application reuses applyRenames.
        parts: sanitizeCardValue(inputs.flatMap(i => i.parts)), warnings: warningsOf(rewritten, rewritten.flatMap(i => i.parts), existing),
        needsLowLevel: inputs.slice(1).some(i => i.card.lowLevelAccess === true || i.parts.some(p => p.kind === 'luaTrigger' && object(p.value).lowLevelAccess === true)),
        name: inputs.map(i => i.meta.name).join(' & '),
    }
    plan.floatingConflicts = floatingConflicts(rewritten)
    for (const { a, b } of plan.floatingConflicts) {
        const name = (id: string) => plan.sources.find(source => source.id === id)!.name
        plan.warnings.push({ kind: 'floatingUI', detail: `떠 있는 버튼/패널이 겹칠 수 있어요 · ${name(a.sourceId)} ${a.selector} / ${name(b.sourceId)} ${b.selector} (${a.vertical}-${a.horizontal})` })
    }
    const modules = inputs.slice(1).filter(i => i.meta.kind === 'module' && i.meta.moduleId)
    if (modules.length) {
        const db = options.db ?? { modules: modules.map(i => ({ id: i.meta.moduleId!, namespace: i.meta.namespace })) }
        plan.moduleAttachments = modules.map(i => {
            const namespace = db.modules.find(m => m.id === i.meta.moduleId)?.namespace
            return { moduleId: i.meta.moduleId!, namespace,
                attachment: moduleAttachment(target.card, db, i.meta.moduleId!),
            }
        })
        plan.moduleMaterial = inputs.slice(1).filter(i => i.meta.kind === 'module').flatMap(i => i.parts.filter(isModuleMaterial))
        plan.moduleLinkMembers = Object.fromEntries((Array.isArray(target.card.modules) ? target.card.modules : []).map(id => [id, db.modules.filter(m => m.id === id || !!m.namespace && m.namespace === id).map(m => m.id)]))
        plan.detachModuleExplicit = options.detachModuleAfter !== undefined
        for (const m of plan.moduleAttachments.filter(m => m.attachment === 'global')) plan.warnings.push({ kind: 'globalModule', detail: `${m.moduleId}: 전역 활성 모듈과 가져온 내용이 중복될 수 있어요. 전역 활성 설정은 유지해요.` })
    }
    const blocks = luaBlocks(rewritten.flatMap(i => i.parts), existing, inputs[0]?.meta.id).filter(b => canBundleLuaTrigger(b.part.value))
    if (blocks.length >= 2) plan.composites.push({ field: 'luaTrigger', syntax: 'lua', blocks: blocks.map(b => ({ blockId: b.blockId, sourceId: b.sourceId, body: b.code })) })
    if (existing) existingPlans.set(plan, sanitizeCardValue(existing))
    if (modules.length) plan.detachModuleAfter = options.detachModuleAfter ?? (plan.moduleAttachments!.some(m => m.attachment === 'bot') && !untransferredModuleParts(plan).length)
    rewrittenPlans.set(plan, { signature: JSON.stringify([plan.parts, plan.renames]), parts: rewritten.flatMap(i => i.parts) })
    return plan
}
function edited(part: Part, text: string | undefined, itemValue?: unknown): Part {
    if (text === undefined && itemValue === undefined) return part
    let value = sanitizeCardValue(itemValue === undefined ? part.value : itemValue)
    if (typeof value !== typeof part.value || Array.isArray(value) !== Array.isArray(part.value) || value === null) throw new Error('Invalid edited item')
    if (text === undefined) return { ...part, value, hash: hashValue(value) }
    if (typeof value === 'string') value = text
    else if (part.kind === 'lore') object(value).content = text
    else if (part.kind === 'regex') object(value).out = text
    else if (part.kind === 'luaTrigger') object(value).effect[0].code = text
    else if (part.kind === 'trigger') {
        const effect = object(value).effect?.find((e: Record<string, unknown>) => typeof e.value === 'string' || typeof e.code === 'string')
        if (effect) effect[typeof effect.code === 'string' ? 'code' : 'value'] = text
    } else value = JSON.parse(text)
    return { ...part, value, hash: hashValue(value) }
}
export function folderId(sourceId: string, index: number): string {
    const hex = (hashValue([sourceId, index, 0]) + hashValue([sourceId, index, 1]) + hashValue([sourceId, index, 2])).slice(0, 32)
    return `folder:${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`
}
function mergeLore(parts: Part[], sources: MergePlan['sources']): unknown[] {
    const result: Record<string, any>[] = [], used = new Set<string>()
    for (let s = 0; s < sources.length; s++) {
        const source = sources[s], entries = parts.filter(p => p.sourceId === source.id && ['lore', 'loreFolder'].includes(p.kind)).map(p => sanitizeCardValue(object(p.value)))
        if (!s) { for (const e of entries) { result.push(e); if (e.mode === 'folder') used.add(e.key) }; continue }
        const mapping = new Map<string, string>()
        let serial = 0
        const next = () => { let key: string; do { key = folderId(source.id, serial++) } while (used.has(key)); used.add(key); return key }
        for (const e of entries) if (e.mode === 'folder') {
            const key = used.has(e.key) || !e.key ? next() : e.key
            mapping.set(e.key, key); used.add(key); e.key = key; e.comment = `[${source.short}] ${e.comment ?? ''}`
        }
        const unfoldered = entries.some(e => e.mode !== 'folder' && !mapping.has(e.folder))
        const root = unfoldered ? next() : undefined
        if (root) result.push({ mode: 'folder', key: root, comment: `[${source.short}]`, content: '', alwaysActive: false })
        for (const e of entries) {
            if (e.mode !== 'folder') e.folder = mapping.get(e.folder) ?? root
            else if (e.folder) e.folder = mapping.get(e.folder)
            result.push(e)
        }
    }
    return result
}

/** Count original material, including parts omitted before scoped planning and by role/composite choices. */
export function untransferredModuleParts(plan: MergePlan, choices?: MergeChoices): Part[] {
    const excluded = new Set(choices?.exclude ?? [])
    plan.roles.forEach((role, index) => {
        const choice = choices?.roles[index] ?? role.default
        if (choice !== 'both') for (const [id, keys] of Object.entries(role.members)) if (id !== choice) for (const key of keys) excluded.add(key)
    })
    for (const spec of plan.composites) {
        const included = new Set(choices?.composites[spec.field]?.included ?? spec.blocks.map(b => b.blockId))
        if (spec.field === 'luaTrigger') {
            for (const block of luaBlocks(plan.parts, existingPlans.get(plan), plan.sources[0].id)) if (canBundleLuaTrigger(block.part.value) && !included.has(block.blockId)) excluded.add(block.part.key)
        } else for (const part of partsOfField(plan.parts, spec.field)) if (!included.has(part.sourceId)) excluded.add(part.key)
    }
    const present = new Set(plan.parts.map(p => p.key))
    return (plan.moduleMaterial ?? []).filter(p => !present.has(p.key) || excluded.has(p.key))
}

export function applyMerge(plan: MergePlan, choices: MergeChoices): { card: CardFields; provenance: Provenance } {
    const target = plan.sources[0].id, excluded = new Set<string>()
    const addedKeys = new Set(plan.parts.filter(p => p.sourceId !== target).map(p => p.key))
    for (const part of plan.parts) if (part.sourceId !== target && partField(part) === 'license') excluded.add(part.key)
    for (const key of choices.exclude ?? []) if (addedKeys.has(key)) excluded.add(key)
    const roleChoices: Record<string, string> = {}
    plan.roles.forEach((role, index) => {
        const choice = choices.roles[index] ?? role.default
        roleChoices[String(index)] = choice
        if (choice !== 'both') for (const [id, keys] of Object.entries(role.members)) if (id !== choice) for (const key of keys) excluded.add(key)
    })
    const signature = JSON.stringify([plan.parts, plan.renames])
    let rewritten = rewrittenPlans.get(plan)
    if (!rewritten || rewritten.signature !== signature) {
        rewritten = { signature, parts: applyRenames(plan.parts, plan.renames) }
        rewrittenPlans.set(plan, rewritten)
    }
    const editedParts = rewritten.parts.map(p => partField(p) === 'license' ? p : edited(p, choices.edits[p.key], choices.itemEdits?.[p.key]))
    const all = choices.moveFloatingUI ? moveFloatingUI(editedParts, plan.floatingConflicts ?? []) : editedParts
    const selected = () => all.filter(p => !excluded.has(p.key))
    const allLua = luaBlocks(all, existingPlans.get(plan), target)
    const omittedLua = new Set<string>()
    for (const spec of plan.composites) {
        const included = new Set(choices.composites[spec.field]?.included ?? spec.blocks.map(b => b.blockId))
        if (spec.field === 'luaTrigger') {
            for (const block of allLua) if (canBundleLuaTrigger(block.part.value) && !included.has(block.blockId)) omittedLua.add(block.blockId)
            for (const block of allLua) if (allLua.filter(b => b.part.key === block.part.key).every(b => omittedLua.has(b.blockId))) excluded.add(block.part.key)
            continue
        }
        for (const p of partsOfField(all, spec.field)) if (!included.has(p.sourceId)) excluded.add(p.key)
    }
    const kept = selected(), targetParts = all.filter(p => p.sourceId === target), originalTarget = cardOf(plan.parts.filter(p => p.sourceId === target), false)
    const card = cardOf(kept.filter(p => p.sourceId === target))
    const compositeFields = new Set(plan.composites.map(c => c.field))
    const authorKeys = new Set(Object.keys(cardFieldsOf(Object.fromEntries(all.map(p => [partField(p), true])) as Parameters<typeof cardFieldsOf>[0])))
    for (const p of kept.filter(p => p.sourceId !== target)) {
        const field = partField(p)
        if (lists.has(field) || field === 'name' || field === 'firstMessage' || field === 'lowLevelAccess' || field === 'defaultVariables' || compositeFields.has(field as CompositeField)) continue
        if (field === 'modules') continue
        if (imageGenPart(p)) {
            if (!plan.roles.some(r => r.kind === 'imageGen') && !targetParts.some(t => partField(t) === field && imageGenPart(t))) card[field] = sanitizeCardValue(p.value)
            continue
        }
        if (KEPT_FIELDS.has(field) || !authorKeys.has(field)) { excluded.add(p.key); continue }
        if (isExtension(p)) {
            const key = extensionKey(p)
            if (compositeFields.has(`ext:${key}`)) continue
            const extensions = (card.extentions ??= {}) as CardFields
            if (!Object.hasOwn(extensions, key)) extensions[key] = sanitizeCardValue(p.value)
            else excluded.add(p.key)
        } else if (!Object.hasOwn(card, field)) card[field] = sanitizeCardValue(p.value)
        else excluded.add(p.key)
    }
    // Role selection replaces the entire image-generation family, including defaults.
    const imageRole = plan.roles.findIndex(r => r.kind === 'imageGen')
    if (imageRole >= 0) {
        const choice = choices.roles[imageRole] ?? plan.roles[imageRole].default
        if (choice !== 'both') {
            const source = kept.filter(p => p.sourceId === choice && imageGenPart(p))
            if (source.length) {
                for (const p of targetParts.filter(imageGenPart)) delete card[partField(p)]
                for (const p of source) card[partField(p)] = sanitizeCardValue(p.value)
            }
        }
    }
    for (const field of lists) {
        if (field === 'triggerscript' || field === 'globalLore') continue
        const parts = kept.filter(p => partField(p) === field && p.kind !== 'extension')
        if (parts.length || Object.hasOwn(originalTarget, field)) card[field] = parts.map(p => sanitizeCardValue(p.value))
    }
    if (kept.some(p => p.kind === 'lore' || p.kind === 'loreFolder') || Object.hasOwn(originalTarget, 'globalLore')) card.globalLore = mergeLore(kept, plan.sources)
    const greetings = kept.filter(p => partField(p) === 'firstMessage')
    if (greetings.length) {
        card.firstMessage = greetings[0].value
        const extra = greetings.slice(1).map(p => String(p.value))
        if (extra.length) card.alternateGreetings = [...new Set([...(card.alternateGreetings as string[] ?? []), ...extra])]
    }
    const blocks = allLua.filter(b => !excluded.has(b.part.key) && !omittedLua.has(b.blockId)), unbundled = new Set<string>()
    // With all added material unchecked, preserve the target's original triggers.
    const trimmedBundle = blocks.some(b => b.expanded && allLua.some(original => original.part.key === b.part.key && omittedLua.has(original.blockId)))
    const bundleable = blocks.filter(b => canBundleLuaTrigger(b.part.value))
    const bundle = bundleable.length >= 2 && (kept.some(p => p.sourceId !== target) || trimmedBundle) ? buildLuaBundle(bundleable) : undefined
    if (bundle) for (const id of bundle.unbundled) unbundled.add(id)
    const triggers: unknown[] = [], first = bundleable[0]?.part.key
    const originalTrigger = (b: LuaPartBlock) => {
        const value = sanitizeCardValue(b.part.value)
        if (b.expanded) { object(value).effect[0].code = b.code; object(value).comment = `${object(value).comment} (${b.blockId})` }
        return value
    }
    for (const p of kept.filter(p => partField(p) === 'triggerscript' && p.kind !== 'extension')) {
        if (p.kind !== 'luaTrigger' || !canBundleLuaTrigger(p.value)) triggers.push(sanitizeCardValue(p.value))
        else if (!bundle) {
            const own = blocks.filter(b => b.part.key === p.key)
            if (own.length === allLua.filter(b => b.part.key === p.key).length) triggers.push(sanitizeCardValue(p.value))
            else triggers.push(...own.map(originalTrigger))
        }
        else {
            if (p.key === first) triggers.push({ comment: 'RisuTide bundle', type: 'start', conditions: [], effect: [{ type: 'triggerlua', code: choices.composites.luaTrigger?.finalText ?? bundle.code }], lowLevelAccess: object(all.find(p => p.sourceId === target && p.kind === 'luaTrigger')?.value).lowLevelAccess ?? false })
            for (const block of blocks.filter(b => b.part.key === p.key && unbundled.has(b.blockId))) triggers.push(originalTrigger(block))
        }
    }
    if (triggers.length || Object.hasOwn(originalTarget, 'triggerscript')) card.triggerscript = triggers
    const compositeOrders: Provenance['composites'] = {}
    for (const spec of plan.composites) {
        if (spec.field === 'luaTrigger') continue
        const choice = choices.composites[spec.field], eligible = new Set(choice?.included ?? spec.blocks.map(b => b.blockId))
        const active = spec.blocks.filter(b => eligible.has(b.blockId) && (partsOfField(kept, spec.field).some(p => p.sourceId === b.sourceId) || existingPlans.get(plan)?.sources.some(s => s.id === b.sourceId)))
        const order = active.map(b => b.blockId)
        compositeOrders[spec.field] = { order }
        const activeParts = partsOfField(kept, spec.field)
        const previous = existingPlans.get(plan)?.composites[spec.field]
        const retainedBlock = (id: string) => previous?.order.includes(id)
        if (spec.syntax === 'json') compositeOrders[spec.field]!.jsonValues = Object.fromEntries(active.map(b => {
            const parts = activeParts.filter(p => p.sourceId === b.sourceId)
            return [b.blockId, parts.length && !retainedBlock(b.blockId) ? valueOf(cardOf(parts), spec.field) : JSON.parse(b.body)]
        }))
        let value: unknown
        if (choice?.finalText !== undefined) value = spec.syntax === 'json' ? JSON.parse(choice.finalText) : choice.finalText
        else if (previous && active.every(b => retainedBlock(b.blockId)) && previous.order.every(id => order.includes(id))) value = valueOf(originalTarget, spec.field)
        else if (active.length === 1 && active[0].sourceId === target && !retainedBlock(active[0].blockId)) value = valueOf(cardOf(activeParts), spec.field)
        else if (!active.length) value = undefined
        else {
            const updated: CompositeSpec = { ...spec, blocks: active.map(b => {
                const sourceParts = activeParts.filter(p => p.sourceId === b.sourceId)
                if (!sourceParts.length || retainedBlock(b.blockId)) return b
                const v = valueOf(cardOf(sourceParts), spec.field)
                return { ...b, body: spec.syntax === 'json' ? JSON.stringify(v) : `${textFields.has(spec.field) ? `# ${plan.sources.find(s => s.id === b.sourceId)!.name}\n` : ''}${v}` }
            }) }
            if (spec.syntax === 'json' && previous?.jsonValues && previous.order.every(id => order.includes(id))) {
                const old: CompositeSpec = { ...spec, blocks: previous.order.map(blockId => ({ blockId, sourceId: blockId, body: JSON.stringify(previous.jsonValues![blockId]) })) }
                const stored = old.blocks.some(b => !b.body.startsWith('{')) ? JSON.parse(old.blocks[0].body) : JSON.parse(buildComposite(old, previous.order))
                const current = valueOf(originalTarget, spec.field)
                if (hashValue(current) !== hashValue(stored)) {
                    // Preserve the user's aggregate edit while retaining the original source values.
                    updated.blocks = [{ blockId: target, sourceId: target, body: JSON.stringify(current) }, ...updated.blocks.filter(b => !retainedBlock(b.blockId))]
                }
            }
            if (spec.syntax === 'json' && updated.blocks.some(b => !b.body.startsWith('{'))) value = JSON.parse(updated.blocks[0].body)
            else { const text = buildComposite(updated, updated.blocks.map(b => b.blockId)); value = spec.syntax === 'json' ? JSON.parse(text) : text }
        }
        if (spec.field.startsWith('ext:')) {
            const key = spec.field.slice(4)
            if (value === undefined) {
                if (card.extentions && typeof card.extentions === 'object') {
                    delete (card.extentions as CardFields)[key]
                    if (!Object.keys(card.extentions).length && !Object.hasOwn(originalTarget, 'extentions')) delete card.extentions
                }
            } else ((card.extentions ??= {}) as CardFields)[key] = value
        } else if (value === undefined) delete card[spec.field]; else card[spec.field] = value
    }
    if (blocks.length) compositeOrders.luaTrigger = { order: blocks.map(b => b.blockId) }
    const moduleParts = kept.filter(p => partField(p) === 'modules' && Array.isArray(p.value))
    if (moduleParts.length) card.modules = [...new Set(moduleParts.flatMap(p => p.value as string[]))]
    if (Object.hasOwn(originalTarget, 'lowLevelAccess') || kept.some(p => partField(p) === 'lowLevelAccess')) card.lowLevelAccess = !!originalTarget.lowLevelAccess || choices.lowLevel && plan.needsLowLevel
    if (plan.detachModuleAfter && Array.isArray(card.modules)) {
        const keptKeys = new Set(kept.map(p => p.key))
        const detached = plan.moduleAttachments?.filter(m => {
            if (m.attachment !== 'bot') return false
            const sourceId = plan.sources.find(s => s.moduleId === m.moduleId)?.id
            const material = (plan.moduleMaterial ?? []).filter(p => p.sourceId === sourceId)
            const missing = material.some(p => !keptKeys.has(p.key) || allLua.some(b => b.part.key === p.key && omittedLua.has(b.blockId)))
            return (plan.detachModuleExplicit || !missing) && material.some(p => keptKeys.has(p.key))
        }) ?? []
        const ids = new Set(detached.map(m => m.moduleId))
        card.modules = [...new Set(card.modules.flatMap(id => {
            const members = plan.moduleLinkMembers?.[id] ?? [id]
            return members.some(member => ids.has(member)) ? members.filter(member => !ids.has(member)) : [id]
        }))]
    }
    card.name = choices.name
    preserveTargetLicense(card, originalTarget)
    const sources: Provenance['sources'] = plan.sources.map(source => {
        const parts = plan.parts.filter(p => p.sourceId === source.id)
        return { id: source.id, ...(source.kind === 'module' ? { kind: 'module' as const, moduleId: source.moduleId } : {}), shortName: source.short, ascii: source.ascii, name: source.name, ...(source.realmId ? { realmId: source.realmId } : {}), cardHash: hashValue(cardOf(parts)), partHashes: Object.fromEntries(parts.map(p => [p.key, p.hash])), renames: plan.renames.filter(r => r.sourceId === source.id), excluded: parts.filter(p => excluded.has(p.key)).map(p => p.key), roleChoices: { ...roleChoices } }
    })
    const existing = existingPlans.get(plan), retainedSources = existing ? sanitizeCardValue(existing.sources) : undefined
    if (existing && retainedSources) for (const [field, previous] of Object.entries(existing.composites) as [CompositeField, NonNullable<Provenance['composites'][CompositeField]>][]) {
        const current = compositeOrders[field]
        if (!current) continue
        for (const blockId of previous.order.filter(id => !current.order.includes(id))) {
            if (field === 'luaTrigger') {
                const source = retainedSources.find(s => blockId.startsWith(`${luaSourceId(s.id)}#`))
                if (!source) continue
                const prefix = `${luaSourceId(source.id)}#`, index = Number(blockId.slice(prefix.length).split('#')[0])
                if (current.order.some(id => id.startsWith(`${prefix}${index}#`) || id === `${prefix}${index}`)) continue
                const key = Object.keys(source.partHashes).filter(key => key.startsWith(`${source.id}:triggerscript:`))[index]
                if (key && !source.excluded.includes(key)) source.excluded.push(key)
            } else {
                const source = retainedSources.find(s => s.id === blockId)
                if (!source) continue
                for (const key of Object.keys(source.partHashes).filter(key => field.startsWith('ext:') ? key.startsWith(`${source.id}:extentions:${field}#`) : key.startsWith(`${source.id}:${field}:`))) if (!source.excluded.includes(key)) source.excluded.push(key)
            }
        }
    }
    return { card, provenance: { version: 1, sources: existing ? [...retainedSources!, ...sources.slice(1)] : sources, composites: { ...existing?.composites, ...compositeOrders } } }
}
