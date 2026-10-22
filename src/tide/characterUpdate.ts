import { onboardingContent } from './characterUpdateOnboarding'
// Update a character in place from a newer release of its card. The author's
// content (description, lorebook, scripts, background, assets...) is updated
// through the review and three-way merge; the chats and what the user set up on this device stay, and the
// character keeps its chaId, so plugin data bound to it survives. Moving the
// chats to a freshly imported copy instead loses all of that.
//
// Pure: the dialog (lib/SideBars/CharUpdateDialog.svelte) owns parsing, the
// kv backup and the live assignment.

import type { character, customscript, loreBook } from "./storage/database.svelte"
import { normalizeName } from './characterUpdateTargets'

// Fields absent from the host card exporters; importer defaults alone do not
// establish author ownership. See plugins/risutide/FIELD_OWNERSHIP.md.
// Host-only user settings are protected even when using a received bot as source.
export const USER_SETTINGS_FIELDS: ReadonlySet<string> = new Set([
    'oaiTTSConfig', 'oaiVoice', 'voicevoxConfig', 'naittsConfig', 'gptSoVitsConfig',
    'fishSpeechConfig', 'elevenLabsConfig', 'hfTTS', 'ttsReadOnlyQuoted', 'translatorNote',
    'doNotChangeSeperateModels', 'escapeOutput', 'coldstorage', 'coldStoragedChats',
])

export const KEPT_FIELDS: ReadonlySet<string> = new Set([
    'type',
    'chaId',
    'chats',
    'chatFolders',
    'chatPage',
    'firstMsgIndex',
    'notes',
    'ttsMode',
    'ttsSpeech',
    'removedQuotes',
    // Legacy import slot: characterFormatUpdate appends it to the open chat's
    // note once and nulls it, so taking a new card's value would stack a
    // second copy into the user's chat note.
    'postHistoryInstructions',
    'imported',
    'lastInteraction',
    'trashTime',
    'modules',
    'memoryPresetId',
    'supaMemory',
    'realmId',
    'scriptstate',
    'reloadKeys',
    'chatImageGenRefs',
    'chatImageGenRefsVersion',
    'chatImageGenGroups',
    'chatImageGenStyleGroups',
    'chatImageGenAppearance',
    'additionalAssetManifest',
    ...USER_SETTINGS_FIELDS,
])

// Exported appearance/lore settings participate in the three-way merge.
export const PREFERENCE_FIELDS: readonly string[] = ['loreSettings', 'viewScreen', 'largePortrait', 'inlayViewScreen', 'hideChatIcon', 'vits', 'virtualscript']

export const isCredentialKey = (key: string): boolean => /(?:apikey|token|secret|password|authorization|credentials?)$/i.test(key.replace(/[_-]/g, ''))
export const isUserOwnedCardField = (key: string): boolean => KEPT_FIELDS.has(key) || isCredentialKey(key)

export function isUnsafeCardKey(key: string): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

export function sanitizeCardValue<T>(value: T): T {
    // Primitive card fields need neither detachment nor a key sanitization walk.
    // Functions and symbols still go through structuredClone's rejection path.
    if (value === null || typeof value !== 'object' && typeof value !== 'function' && typeof value !== 'symbol') return value
    const copy = structuredClone(value)
    const clean = (item: unknown) => {
        if (!item || typeof item !== 'object') return
        for (const key of Object.keys(item)) {
            if (isUnsafeCardKey(key)) delete (item as CardFields)[key]
            else clean((item as CardFields)[key])
        }
    }
    clean(copy)
    return copy
}

export type CardFields = Record<string, unknown>

// Ownership policy for every top-level field:
// - KEPT_FIELDS: identity, chats, voice credentials and installation preferences;
//   never replaced by a card update (including received-copy updates).
// - Other fields: author-owned, offered by the three-way planner when supplied.
// - All author fields are format-dependent: absent/undefined means the source
//   does not carry it. Preserve current; only an explicit value can clear it.
// Unknown extensions follow the same policy, so new host fields cannot silently
// disappear when an older/off-spec format is read.
/**
 * The fields an update writes: everything the importer produced except
 * KEPT_FIELDS. A card without a picture (a .json card) keeps the current avatar.
 */
export function cardFieldsOf(incoming: character): CardFields {
    const fields: CardFields = {}
    for (const key of Object.keys(incoming)) {
        if (!isUserOwnedCardField(key) && !isUnsafeCardKey(key) && (incoming as unknown as CardFields)[key] !== undefined) fields[key] = sanitizeCardValue((incoming as unknown as CardFields)[key])
    }
    if (!incoming.image) delete fields.image
    return fields
}

/**
 * Write `fields` onto the live character. A key in `keys` without a value is
 * deleted, so a backup (JSON drops undefined) restores a field the old card
 * never had. An inline asset list replaces the lazy manifest: the server
 * splits it back into a manifest on the next save, as for a fresh import.
 */
export function applyCardFields(target: character, fields: CardFields, keys: readonly string[] = Object.keys(fields)) {
    const t = target as unknown as CardFields
    for (const key of keys) {
        if (isUserOwnedCardField(key) || isUnsafeCardKey(key)) continue
        const value = fields[key]
        if (value === undefined) delete t[key]
        else t[key] = sanitizeCardValue(value)
    }
    if (keys.includes('additionalAssets')) delete t.additionalAssetManifest
}

export interface ListDiff {
    added: string[]
    removed: string[]
    changed: string[]
}

export interface CharacterUpdateSummary {
    nameFrom: string
    nameTo: string
    versionFrom: string
    versionTo: string
    /** The file looks like a different character (names differ). */
    nameMismatch: boolean
    /** Keys of the text/look fields that differ (see TEXT_FIELDS). */
    texts: string[]
    /** Other written fields that differ (tags, license, settings...). */
    others: string[]
    lore: ListDiff
    regex: ListDiff
    triggersChanged: boolean
    /** Assets pair up by name; `changed` = same name, different file. */
    assets: { from: number, to: number, added: number, removed: number, changed: number }
    chats: number
}

// Card fields shown as "changed" by name in the summary. Lists (lore, regex,
// triggers, assets) get their own counts.
export const TEXT_FIELDS = [
    'name', 'image', 'desc', 'firstMessage', 'alternateGreetings', 'personality', 'scenario',
    'exampleMessage', 'systemPrompt', 'replaceGlobalNote', 'creatorNotes', 'backgroundHTML',
    'defaultVariables', 'additionalText', 'emotionImages',
] as const

// Shown on their own lines, so not repeated under "others" — plus metadata
// that changes with every release (additionalData mirrors tags, creator and
// the version).
const SUMMARIZED_FIELDS: ReadonlySet<string> = new Set([
    ...TEXT_FIELDS, 'globalLore', 'customscript', 'triggerscript', 'additionalAssets', 'characterVersion',
    'additionalData', 'modification_date',
])

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Pair two lists by label (in order, so duplicate labels pair up one to one)
 * and report what was added, removed or changed.
 */
export function diffByLabel<T>(from: readonly T[], to: readonly T[], label: (item: T) => string, body: (item: T) => unknown): ListDiff {
    const pending = new Map<string, T[]>()
    for (const item of from ?? []) {
        const key = label(item)
        const queue = pending.get(key)
        if (queue) queue.push(item)
        else pending.set(key, [item])
    }
    for (const queue of pending.values()) queue.reverse()
    const diff: ListDiff = { added: [], removed: [], changed: [] }
    for (const item of to ?? []) {
        const key = label(item)
        const match = pending.get(key)?.pop()
        if (match === undefined) diff.added.push(key)
        else if (!same(body(match), body(item))) diff.changed.push(key)
    }
    for (const [key, rest] of pending) {
        for (let i = 0; i < rest.length; i++) diff.removed.push(key)
    }
    return diff
}

// A card round trip rewrites some lore fields without changing what they do:
// keys come back joined with ", " (the in-app editor stores "a,b"), secondary
// keys vanish unless selective, unset flags become false.
// Export adds mirrored risu_activationPercent/risu_loreCache extensions; ignore those copies in extras.
export const keyList = (keys: string | undefined) => (keys ?? '').split(',').map((k) => k.trim()).filter(Boolean).join(',')
const loreLabel = (entry: loreBook) => entry.comment || entry.key || '-'
export const loreBody = (entry: loreBook) => [
    keyList(entry.key), entry.selective ? keyList(entry.secondkey) : '', entry.content, entry.mode ?? 'normal',
    !!entry.alwaysActive, !!entry.selective, entry.insertorder, !!entry.useRegex, entry.activationPercent ?? null,
]
function normalizeLoreExtra(value: unknown): unknown {
    if (value === undefined || value === null || value === false || value === '') return undefined
    if (Array.isArray(value)) {
        const out = value.map(normalizeLoreExtra).filter((v) => v !== undefined)
        return out.length ? out : undefined
    }
    if (typeof value === 'object') {
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(value).sort()) {
            if (isUnsafeCardKey(key)) continue
            const normalized = normalizeLoreExtra((value as Record<string, unknown>)[key])
            if (normalized !== undefined) out[key] = normalized
        }
        return Object.keys(out).length ? out : undefined
    }
    return value
}
export function loreExtraBody(entry: loreBook): unknown {
    const { risu_activationPercent: _probability, risu_loreCache: _cache, ...extensions } = (entry.extentions ?? {}) as Record<string, unknown>
    return [normalizeLoreExtra(extensions) ?? null, entry.folder || null]
}
const regexLabel = (script: customscript) => script.comment || script.in || '-'
export const regexBody = (script: customscript) => [script.in, script.out, script.type, script.flag, script.ableFlag]

/**
 * What an update would change. `currentAssets` is the current asset list,
 * already loaded when the character keeps it in a lazy manifest.
 */
export function summarizeCharacterUpdate(current: character, incoming: character, currentAssets: readonly [string, string, string?][]): CharacterUpdateSummary {
    const fields = cardFieldsOf(incoming)
    const differs = (key: string) => key in fields && !same(key === 'onboarding' ? onboardingContent((current as unknown as CardFields)[key]) : (current as unknown as CardFields)[key], key === 'onboarding' ? onboardingContent(fields[key]) : fields[key])
    const texts = TEXT_FIELDS.filter(differs)
    const others = Object.keys(fields).filter((key) => !SUMMARIZED_FIELDS.has(key) && differs(key))
    const toAssets = (fields.additionalAssets ?? currentAssets) as readonly [string, string, string?][]
    const toLore = (fields.globalLore ?? current.globalLore ?? []) as loreBook[]
    const toRegex = (fields.customscript ?? current.customscript ?? []) as customscript[]
    const lore = diffByLabel(current.globalLore ?? [], toLore, loreLabel, loreBody)
    const regex = diffByLabel(current.customscript ?? [], toRegex, regexLabel, regexBody)
    for (const [key, before, after, diff] of [['globalLoreOrder', current.globalLore ?? [], toLore, lore], ['customscriptOrder', current.customscript ?? [], toRegex, regex]] as const) {
        if (!same(before, after) && !diff.added.length && !diff.removed.length && !diff.changed.length) others.push(key)
    }
    const assets = diffByLabel(currentAssets, toAssets, (a) => a[0], (a) => a[1])
    return {
        nameFrom: current.name ?? '',
        nameTo: incoming.name ?? current.name ?? '',
        versionFrom: current.characterVersion ?? '',
        versionTo: incoming.characterVersion ?? current.characterVersion ?? '',
        nameMismatch: normalizeName(current.name) !== normalizeName(incoming.name ?? current.name),
        texts,
        others,
        lore,
        regex,
        triggersChanged: 'triggerscript' in fields && !same(current.triggerscript, fields.triggerscript),
        assets: {
            from: currentAssets.length,
            to: toAssets.length,
            added: assets.added.length,
            removed: assets.removed.length,
            changed: assets.changed.length,
        },
        chats: current.chats?.length ?? 0,
    }
}
