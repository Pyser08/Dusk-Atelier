import { onboardingContent } from './characterUpdateOnboarding'
import { mediaLabelRenames, mediaLabelStem } from './characterMerge/mediaLabels'
import type { ImageProtectionGroup } from './characterMerge/sourceImages'
import type { CardFields } from './characterUpdate'
import { isUnsafeCardKey, sanitizeCardValue, keyList, loreBody, loreExtraBody, regexBody, PREFERENCE_FIELDS, KEPT_FIELDS, isUserOwnedCardField } from './characterUpdate'

export type ContentIdOf = (path: string) => string
export type Unit = 'lore' | 'regex' | 'trigger' | 'asset' | 'emotion' | 'field'
export type GroupKind = 'preference' | 'mineAdded' | 'mineEdited' | 'mineDeleted' | 'conflict' | 'unknownExtra' | 'unknownDiff' | 'authorChanged'

export const OFFERED_FIELDS: readonly string[] = [
    'name', 'image', 'desc', 'firstMessage', 'alternateGreetings', 'personality', 'scenario', 'exampleMessage',
    'systemPrompt', 'replaceGlobalNote', 'creatorNotes', 'backgroundHTML', 'defaultVariables', 'additionalText',
    'nickname', 'group_only_greetings',
]

export interface CardFingerprintV1 {
    v: 1; savedAt: number; version: string
    fields: Record<string, string>
    lore: [string, string][]; regex: [string, string][]; triggers: [string, string][]
    assets: [string, string][]; emotions: [string, string][]
    loreExtra?: string[]
}
export interface PlanItem {
    id: string
    unit: Unit; label: string; kind: GroupKind; keepByDefault: boolean
    applyByDefault?: boolean
    /** Rename ambiguity is not proof of a local edit. */
    mineChanged?: boolean
    current?: unknown; incoming?: unknown
}
export interface UpdatePlan {
    imageProtection?: ImageProtectionGroup[]
    detachReasons?: Record<string, string>
    hasBase: boolean
    listIds?: Partial<Record<Unit, { current: string[]; incoming: string[] }>>
    items: PlanItem[]
    silent: { authorChanged: number; authorAdded: number; authorRemoved: number }
}

type Pair = { label: string; hash: string; item: unknown; id: string }
type ListSpec = { unit: Unit; field: string }
const LISTS: ListSpec[] = [
    { unit: 'lore', field: 'globalLore' }, { unit: 'regex', field: 'customscript' },
    { unit: 'trigger', field: 'triggerscript' }, { unit: 'asset', field: 'additionalAssets' },
    { unit: 'emotion', field: 'emotionImages' },
]
type FingerprintList = 'lore' | 'regex' | 'triggers' | 'assets' | 'emotions'
const FINGERPRINT_KEY: Record<Exclude<Unit, 'field'>, FingerprintList> = {
    lore: 'lore', regex: 'regex', trigger: 'triggers', asset: 'assets', emotion: 'emotions',
}
const clone = <T>(v: T): T => sanitizeCardValue(v)

function canonical(value: unknown): unknown {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null
    if (Array.isArray(value)) return value.map(canonical)
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(value as object).sort()) {
            if (isUnsafeCardKey(key)) continue
            const v = (value as Record<string, unknown>)[key]
            if (v !== undefined) out[key] = canonical(v)
        }
        return out
    }
    return value
}

// cyrb53 with seed 0; kept local so the shared core has no external runtime dependency.
function cyrb53(str: string, seed = 0): number {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
    for (let i = 0, ch: number; i < str.length; i++) {
        ch = str.charCodeAt(i)
        h1 = Math.imul(h1 ^ ch, 2654435761)
        h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}
export function hashValue(value: unknown): string {
    return cyrb53(JSON.stringify(canonical(value)), 0).toString(16).padStart(14, '0')
}
export function assetContentId(path: string): string {
    return /(?:^|\/)assets\/([0-9a-f]{64})\.[^/]+$/.exec(path)?.[1] ?? path
}
const defaultContentId: ContentIdOf = assetContentId

function labelBody(unit: Unit, item: unknown, contentIdOf: ContentIdOf): { label: string; body: unknown } {
    const x = item as any
    switch (unit) {
        case 'lore': return { label: String(x.comment ?? '').trim() || keyList(x.key) || '-', body: loreBody(x) }
        case 'regex': return { label: String(x.comment ?? '') || String(x.in ?? '') || '-', body: regexBody(x) }
        case 'trigger': return { label: String(x.comment ?? '').trim() || `${x.type}:${x.effect?.[0]?.type ?? ''}`, body: x }
        case 'asset': case 'emotion': return { label: String(x?.[0] ?? ''), body: contentIdOf(x?.[1]) }
        default: return { label: '', body: x }
    }
}
function pairs(card: CardFields, unit: Unit, field: string, contentIdOf: ContentIdOf, hashBody = true): Pair[] {
    const counts = new Map<string, number>()
    const list = (card[field] ?? []) as unknown[]
    return list.map((item) => {
        const { label, body } = labelBody(unit, item, contentIdOf)
        const occurrence = counts.get(label) ?? 0
        counts.set(label, occurrence + 1)
        return { label, hash: hashBody ? hashValue(body) : '', item, id: `${unit}:${label}#${occurrence}` }
    })
}
// Base occurrences anchor ids; exact hashes reserve identities before edited leftovers.
function alignPairs(unit: Unit, base: [string, string][], current: Pair[], incoming: Pair[]): Map<string, string> {
    type Slot = { id: string; hash?: string; current?: Pair; incoming?: Pair }
    const groups = new Map<string, { slots: Slot[]; current: Pair[]; incoming: Pair[] }>()
    const group = (label: string) => {
        let g = groups.get(label)
        if (!g) { g = { slots: [], current: [], incoming: [] }; groups.set(label, g) }
        return g
    }
    for (const [label, hash] of base) {
        const g = group(label)
        g.slots.push({ id: `${unit}:${label}#${g.slots.length}`, hash })
    }
    for (const p of current) group(p.label).current.push(p)
    for (const p of incoming) group(p.label).incoming.push(p)
    const bMap = new Map<string, string>()
    for (const [label, g] of groups) {
        const baseSlots = [...g.slots]
        for (const slot of baseSlots) bMap.set(slot.id, slot.hash!)
        const assigned = new Set<Pair>()
        const assign = (slot: Slot, side: 'current' | 'incoming', p: Pair) => {
            slot[side] = p; p.id = slot.id; assigned.add(p)
        }
        // Prefer both hashes, then the legacy body hash so extras edits retain identity.
        const matchKeys = [(hash: string) => hash, (hash: string) => hash.split(':')[0]]
        for (const matchKey of matchKeys) for (const side of ['current', 'incoming'] as const) {
            const byHash = new Map<string, Slot[]>()
            for (const slot of baseSlots) if (!slot[side]) {
                const key = matchKey(slot.hash!)
                const queue = byHash.get(key) ?? []
                queue.push(slot); byHash.set(key, queue)
            }
            // Pop reversed queues to retain base occurrence order for equal bodies.
            for (const queue of byHash.values()) queue.reverse()
            for (const p of g[side]) if (!assigned.has(p)) {
                const slot = byHash.get(matchKey(p.hash))?.pop()
                if (slot) assign(slot, side, p)
            }
        }
        // Reserve exact current/incoming matches too, before occurrence fallback.
        for (const matchKey of matchKeys) {
            const byHash = new Map<string, Pair[]>()
            for (const p of g.incoming) if (!assigned.has(p)) {
                const key = matchKey(p.hash)
                const queue = byHash.get(key) ?? []
                queue.push(p); byHash.set(key, queue)
            }
            for (const queue of byHash.values()) queue.reverse()
            const empty = baseSlots.filter((slot) => !slot.current && !slot.incoming).reverse()
            for (const p of g.current) if (!assigned.has(p)) {
                const n = byHash.get(matchKey(p.hash))?.pop()
                if (!n) continue
                let slot = empty.pop()
                if (!slot) { slot = { id: `${unit}:${label}#${g.slots.length}` }; g.slots.push(slot) }
                assign(slot, 'current', p); assign(slot, 'incoming', n)
            }
        }
        for (const side of ['current', 'incoming'] as const) {
            const vacant = baseSlots.filter((slot) => !slot[side]).reverse()
            for (const p of g[side]) if (!assigned.has(p)) {
                const slot = vacant.pop()
                if (!slot) break
                assign(slot, side, p)
            }
        }
        // Remaining additions have no base identity; pair them in occurrence order.
        for (const p of g.current) if (!assigned.has(p)) {
            const slot = { id: `${unit}:${label}#${g.slots.length}` }
            g.slots.push(slot); assign(slot, 'current', p)
        }
        const vacant = g.slots.filter((slot) => slot.hash === undefined && !slot.incoming).reverse()
        for (const p of g.incoming) if (!assigned.has(p)) {
            let slot = vacant.pop()
            if (!slot) { slot = { id: `${unit}:${label}#${g.slots.length}` }; g.slots.push(slot) }
            assign(slot, 'incoming', p)
        }
    }
    return bMap
}
function fieldHash(key: string, value: unknown, contentIdOf: ContentIdOf): string {
    return hashValue(key === 'onboarding' ? onboardingContent(value) : key === 'image' && typeof value === 'string' && value ? contentIdOf(value) : value)
}
export function fingerprintCard(card: CardFields, contentIdOf: ContentIdOf = defaultContentId, now = Date.now()): CardFingerprintV1 {
    const fields: Record<string, string> = {}
    for (const key of Object.keys(card).filter(key => !isUserOwnedCardField(key) && !isUnsafeCardKey(key) && !LISTS.some(spec => spec.field === key))) if (key in card) fields[key] = fieldHash(key, card[key], contentIdOf)
    const output = { v: 1, savedAt: now, version: String(card.characterVersion ?? ''), fields } as CardFingerprintV1
    for (const { unit, field } of LISTS) {
        output[FINGERPRINT_KEY[unit as Exclude<Unit, 'field'>]] = pairs(card, unit, field, contentIdOf).map((p) => [p.label, p.hash])
    }
    output.loreExtra = ((card.globalLore ?? []) as Parameters<typeof loreExtraBody>[0][]).map((entry) => hashValue(loreExtraBody(entry)))
    return output
}
export function isFingerprintV1(value: unknown): value is CardFingerprintV1 {
    if (!value || typeof value !== 'object') return false
    const x = value as any
    return x.v === 1 && typeof x.savedAt === 'number' && typeof x.version === 'string' && !!x.fields && typeof x.fields === 'object' &&
        ['lore', 'regex', 'triggers', 'assets', 'emotions'].every((k) => Array.isArray(x[k]) && x[k].every((p: unknown) => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === 'string'))) &&
        (x.loreExtra === undefined || (Array.isArray(x.loreExtra) && x.loreExtra.length === x.lore.length && x.loreExtra.every((h: unknown) => typeof h === 'string')))
}

function classify(b: string | undefined, c: string | undefined, n: string | undefined, hasBase: boolean): { kind: GroupKind; keep: boolean } | null {
    if (!hasBase) {
        if (c !== undefined && n !== undefined && c !== n) return { kind: 'unknownDiff', keep: false }
        if (c !== undefined && n === undefined) return { kind: 'unknownExtra', keep: false }
        return null
    }
    if (c !== undefined && n !== undefined) {
        if (c === n || (c === b && n !== b)) return null
        if (n === b && c !== b) return { kind: 'mineEdited', keep: true }
        return { kind: 'conflict', keep: false }
    }
    if (c !== undefined) {
        if (b === undefined) return { kind: 'mineAdded', keep: true }
        if (c === b) return null
        return { kind: 'conflict', keep: false }
    }
    if (n !== undefined) {
        if (b === undefined) return null
        if (n === b) return { kind: 'mineDeleted', keep: true }
        return { kind: 'conflict', keep: false }
    }
    return null
}
function indexed(p: Pair[]): Map<string, Pair> { return new Map(p.map((x) => [x.id, x])) }

export function planCharacterUpdate(args: { current: CardFields; incomingFields: CardFields; base: CardFingerprintV1 | null; contentIdOf?: ContentIdOf }): UpdatePlan {
    const { current } = args
    const incomingFields = Object.fromEntries(Object.entries(args.incomingFields).filter(([, value]) => value !== undefined))
    const contentIdOf = args.contentIdOf ?? defaultContentId
    const hasBase = !!args.base && isFingerprintV1(args.base)
    const items: PlanItem[] = []
    const silent = { authorChanged: 0, authorAdded: 0, authorRemoved: 0 }
    const listIds: NonNullable<UpdatePlan['listIds']> = {}
    for (const key of Object.keys(incomingFields).filter(key => !isUserOwnedCardField(key) && !isUnsafeCardKey(key) && !LISTS.some(spec => spec.field === key))) {
        if (!(key in incomingFields)) continue
        // A field is a value, never absent: a key I removed compares as empty.
        const c = fieldHash(key, current[key], contentIdOf)
        const n = fieldHash(key, incomingFields[key], contentIdOf)
        const b = hasBase ? args.base!.fields[key] ?? fieldHash(key, undefined, contentIdOf) : undefined
        const result = classify(b, c, n, hasBase)
        if (result && hasBase && PREFERENCE_FIELDS.includes(key) && (b === undefined ? current[key] !== undefined : c !== b)) result.keep = true
        if (result) items.push({ id: `field:${key}`, unit: 'field', label: key, kind: result.kind, keepByDefault: result.keep, current: clone(current[key]), incoming: clone(incomingFields[key]) })
        else if (hasBase && c === b && n !== b) {
            silent.authorChanged++
            items.push({ id: `field:${key}`, unit: 'field', label: key, kind: 'authorChanged', keepByDefault: false, current: clone(current[key]), incoming: clone(incomingFields[key]) })
        }
    }
    for (const spec of LISTS) {
        if (!(spec.field in incomingFields)) continue
        const cp = pairs(current, spec.unit, spec.field, contentIdOf), np = pairs(incomingFields, spec.unit, spec.field, contentIdOf)
        let bpairs = hasBase ? args.base![FINGERPRINT_KEY[spec.unit as Exclude<Unit, 'field'>]] : []
        // Old bases only know the original body hash; retain their comparison behavior.
        if (spec.unit === 'lore' && (!hasBase || args.base!.loreExtra !== undefined)) {
            for (const p of [...cp, ...np]) p.hash += ':' + hashValue(loreExtraBody(p.item as Parameters<typeof loreExtraBody>[0]))
            bpairs = bpairs.map(([label, hash], i) => [label, hash + ':' + args.base!.loreExtra![i]])
        }
        const renames: [Pair, string][] = []
        const mediaRenames = new Set<Pair>()
        const mediaStems = new Set<string>()
        if (spec.unit === 'asset' || spec.unit === 'emotion') {
            for (const label of [...cp.map(p => p.label), ...bpairs.map(([label]) => label)]) mediaStems.add(mediaLabelStem(label))
            const labels = mediaLabelRenames(cp.map(p => p.label), np.map(p => p.label), bpairs.map(([label]) => label))
            for (const n of np) {
                const previous = labels.get(n.label)
                if (previous !== undefined) { renames.push([n, n.label]); mediaRenames.add(n); n.label = previous }
            }
        }
        const currentLabels = new Set(cp.map(p => p.label)), baseLabels = new Set(bpairs.map(([label]) => label))
        const incomingLabels = new Map<string, number>(), unmatchedHashes = new Map<string, number>()
        const count = (map: Map<string, number>, key: string, delta: number) => map.set(key, (map.get(key) ?? 0) + delta)
        for (const n of np) {
            count(incomingLabels, n.label, 1)
            if (!currentLabels.has(n.label)) count(unmatchedHashes, n.hash, 1)
        }
        // A current occurrence can match its live hash or any base hash for its label.
        // Sets preserve distinct duplicate occurrences without counting one twice.
        const baseHashes = new Map<string, Set<string>>(), byHash = new Map<string, Set<Pair>>()
        for (const [label, hash] of bpairs) {
            if (!baseHashes.has(label)) baseHashes.set(label, new Set())
            baseHashes.get(label)!.add(hash)
        }
        for (const c of cp) for (const hash of new Set([c.hash, ...baseHashes.get(c.label) ?? []])) {
            if (!byHash.has(hash)) byHash.set(hash, new Set())
            byHash.get(hash)!.add(c)
        }
        const ambiguous = new Set<Pair>()
        for (const n of np) {
            if (currentLabels.has(n.label) || baseLabels.has(n.label)) continue
            // An ambiguous media stem must not be paired by the later content heuristic.
            if (mediaStems.has(mediaLabelStem(n.label))) continue
            // Trigger fingerprints include comments. Evaluate each distinct comment
            // once per incoming occurrence; old bases carry no comment-free hash.
            const triggerHashes = new Map<unknown, string>()
            const renameHash = (c: Pair) => {
                if (spec.unit !== 'trigger') return n.hash
                const comment = (c.item as any).comment
                if (!triggerHashes.has(comment)) triggerHashes.set(comment, hashValue({ ...(n.item as object), comment }))
                return triggerHashes.get(comment)!
            }
            const candidates = spec.unit === 'trigger'
                ? cp.filter(c => !incomingLabels.get(c.label) && (c.hash === renameHash(c) || baseHashes.get(c.label)?.has(renameHash(c))))
                : [...byHash.get(n.hash) ?? []].filter(c => !incomingLabels.get(c.label))
            if (candidates.length === 1 && unmatchedHashes.get(n.hash) === 1) {
                renames.push([n, n.label])
                count(incomingLabels, n.label, -1); count(unmatchedHashes, n.hash, -1)
                n.hash = renameHash(candidates[0]); n.label = candidates[0].label
                count(incomingLabels, n.label, 1)
            } else if (candidates.length) { ambiguous.add(n); candidates.forEach(c => ambiguous.add(c)) }
        }
        const bMap = alignPairs(spec.unit, bpairs, cp, np)
        for (const [n, label] of renames) n.label = label
        if (hasBase && ['lore', 'regex', 'trigger'].includes(spec.unit)) {
            const counts = new Map<string, number>()
            const baseIds = bpairs.map(([label]) => { const i = counts.get(label) ?? 0; counts.set(label, i + 1); return `${spec.unit}:${label}#${i}` })
            const currentIds = new Set(cp.map(p => p.id)), incomingIds = new Set(np.map(p => p.id))
            const shared = new Set(baseIds.filter(id => currentIds.has(id) && incomingIds.has(id)))
            const order = (ids: string[]) => ids.filter(id => shared.has(id))
            const co = order(cp.map(p => p.id)), no = order(np.map(p => p.id)), bo = order(baseIds)
            if (JSON.stringify(co) !== JSON.stringify(bo) && JSON.stringify(co) !== JSON.stringify(no)) {
                const conflict = JSON.stringify(no) !== JSON.stringify(bo)
                items.push({ id: `order:${spec.unit}`, unit: spec.unit, label: `order:${spec.unit}`, kind: conflict ? 'conflict' : 'mineEdited', keepByDefault: !conflict, current: co, incoming: no })
            }
        }
        listIds[spec.unit] = { current: cp.map((p) => p.id), incoming: np.map((p) => p.id) }
        const cm = indexed(cp), nm = indexed(np), ids = new Set([...bMap.keys(), ...cm.keys(), ...nm.keys()])
        for (const id of ids) {
            const c = cm.get(id), n = nm.get(id), b = bMap.get(id)
            const result = ambiguous.has(c!) || ambiguous.has(n!) ? { kind: 'conflict' as const, keep: false } : classify(b, c?.hash, n?.hash, hasBase)
            if (result) items.push({ id, unit: spec.unit, label: ambiguous.has(c!) || ambiguous.has(n!) ? `ambiguous:${(c ?? n)?.label ?? id}` : c && n && mediaRenames.has(n) && c.label !== n.label ? `${c.label} → ${n.label}` : (c ?? n)?.label ?? id, kind: result.kind, keepByDefault: result.keep, ...(ambiguous.has(c!) || ambiguous.has(n!) ? { mineChanged: hasBase && b !== undefined && c?.hash !== b } : {}), ...(c ? { current: clone(c.item) } : {}), ...(n ? { incoming: clone(n.item) } : {}) })
            else if ((c && n && c.label !== n.label) || (hasBase && c && n && c.hash === b && n.hash !== b)
                || (n && !c && b === undefined) || (hasBase && !n && b !== undefined && (!c || c.hash === b))) {
                items.push({ id, unit: spec.unit, label: c && n && c.label !== n.label ? `${c.label} → ${n.label}` : (c ?? n)?.label ?? id, kind: 'authorChanged', keepByDefault: false, ...(c ? { current: clone(c.item) } : {}), ...(n ? { incoming: clone(n.item) } : {}) })
                if (c && n) silent.authorChanged++
            }
        }
        if (hasBase) {
            for (const id of nm.keys()) if (!bMap.has(id) && !cm.has(id)) silent.authorAdded++
            for (const [id, hash] of bMap) if (!nm.has(id) && (!cm.has(id) || cm.get(id)!.hash === hash)) silent.authorRemoved++
        } else {
            for (const id of nm.keys()) if (!cm.has(id)) silent.authorAdded++
        }
    }
    return { hasBase, items, silent, listIds }
}
export function defaultKeep(plan: UpdatePlan): Set<string> { return new Set(plan.items.filter((x) => x.keepByDefault).map((x) => x.id)) }

export function loreSettingsSummary(value: unknown, labels: { global: string; card: string; scanDepth: string; tokenBudget: string }): string {
    if (value === undefined) return labels.global
    const settings = value as { scanDepth?: unknown; tokenBudget?: unknown }
    return `${labels.card} (${labels.scanDepth} ${settings?.scanDepth ?? '—'} · ${labels.tokenBudget} ${settings?.tokenBudget ?? '—'})`
}

export function applyUpdatePlan(args: { current: CardFields; incomingFields: CardFields; plan: UpdatePlan; keep: ReadonlySet<string> }): CardFields {
    const { current, plan } = args
    const keep = new Set([...args.keep, ...(plan.imageProtection ?? []).flatMap(group => !group.sync || !group.canSync ? group.rowIds : group.ambiguousRowIds ?? [])])
    const incomingFields = Object.fromEntries(Object.entries(args.incomingFields).filter(([, value]) => value !== undefined))
    const out = mergePresentFields(current, incomingFields)
    if ('onboarding' in incomingFields && hashValue(onboardingContent(current.onboarding)) === hashValue(onboardingContent(incomingFields.onboarding))) out.onboarding = clone(current.onboarding)
    for (const key of new Set([...KEPT_FIELDS, ...Object.keys(out).filter(isUserOwnedCardField)])) { if (key in current) out[key] = clone(current[key]); else delete out[key] }
    const itemMap = new Map(plan.items.map((x) => [x.id, x]))
    for (const key of new Set([...Object.keys(current), ...plan.items.filter(item => item.unit === 'field').map(item => item.label)])) {
        if (isUnsafeCardKey(key)) continue
        const id = `field:${key}`
        if (keep.has(id)) out[key] = clone(current[key])
    }
    for (const spec of LISTS) {
        if (!(spec.field in incomingFields)) continue
        const cp = pairs(current, spec.unit, spec.field, defaultContentId, false), np = pairs(incomingFields, spec.unit, spec.field, defaultContentId, false)
        const ids = plan.listIds?.[spec.unit]
        if (ids) {
            // Ids are positional: a plan built from other lists would pair the wrong items.
            if (ids.current.length !== cp.length || ids.incoming.length !== np.length) throw new Error('Update plan is stale: rebuild it from the current character')
            cp.forEach((p, i) => { p.id = ids.current[i] })
            np.forEach((p, i) => { p.id = ids.incoming[i] })
        }
        const cMap = indexed(cp), nMap = indexed(np)
        // Kept incoming-only items are my deletions (or my side of a conflict): drop them.
        const dropped = new Set([...nMap.keys()].filter((id) => keep.has(id) && itemMap.has(id) && !cMap.has(id)))
        const entries = np.filter((p) => !dropped.has(p.id)).map((p) => {
            const mine = keep.has(p.id) && itemMap.has(p.id) ? cMap.get(p.id) : undefined
            return { id: p.id, item: clone(mine ? mine.item : p.item) }
        })
        // Kept current-only items go right after the nearest earlier current item
        // that is in the result (kept ones included), or first when none is.
        // One pass in current order, then one emit pass: linear in list size.
        const present = new Set(entries.map((x) => x.id))
        const after = new Map<string | null, Pair[]>()
        let anchor: string | null = null
        for (const p of cp) {
            if (keep.has(p.id) && itemMap.has(p.id) && !nMap.has(p.id)) {
                const queue = after.get(anchor)
                if (queue) queue.push(p)
                else after.set(anchor, [p])
                anchor = p.id
            } else if (present.has(p.id)) {
                anchor = p.id
            }
        }
        const result: unknown[] = []
        const resultIds = new Map<unknown, string>()
        // Depth-first, iterative: a long run of my own items forms one chain.
        const emitAfter = (id: string | null) => {
            const stack = [...(after.get(id) ?? [])].reverse()
            while (stack.length > 0) {
                const p = stack.pop()!
                const value = clone(p.item)
                result.push(value); resultIds.set(value, p.id)
                const next = after.get(p.id)
                if (next) for (let i = next.length - 1; i >= 0; i--) stack.push(next[i])
            }
        }
        emitAfter(null)
        for (const entry of entries) {
            result.push(entry.item); resultIds.set(entry.item, entry.id)
            emitAfter(entry.id)
        }
        if (keep.has(`order:${spec.unit}`)) {
            const resultRank = new Map(cp.map((p, i) => [p.id, i]))
            // Keep the current order of surviving identities; genuinely new
            // author items follow it in their incoming order.
            result.sort((a, b) => (resultRank.get(resultIds.get(a)!) ?? Infinity) - (resultRank.get(resultIds.get(b)!) ?? Infinity))
        }
        out[spec.field] = result
    }
    const lore = (out.globalLore ?? []) as any[]
    const folderKeys = new Set(lore.filter((x) => x.mode === 'folder').map((x) => x.key))
    for (const entry of lore) if (entry.folder && !folderKeys.has(entry.folder)) delete entry.folder
    return out
}

// Extension dictionaries carry their own presence: an absent subkey is not an
// instruction to delete it. Explicit null/empty strings/arrays still replace.
function mergePresentFields(current: CardFields, incoming: CardFields): CardFields {
    const out = clone(current)
    for (const [key, value] of Object.entries(incoming)) {
        if (isUnsafeCardKey(key) || value === undefined) continue
        const before = current[key]
        out[key] = value && typeof value === 'object' && !Array.isArray(value)
            && Object.keys(value).length > 0 && before && typeof before === 'object' && !Array.isArray(before)
            ? mergePresentFields(before as CardFields, value as CardFields) : clone(value)
    }
    return out
}
