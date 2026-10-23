import type { CardFields } from '../characterUpdate'
import { isUnsafeCardKey, sanitizeCardValue } from '../characterUpdate'
import { hashValue } from '../characterUpdateMerge'
import type { Part, PartKind, SourceId } from './types'

const textFields = new Set([
    'name', 'desc', 'personality', 'scenario', 'exampleMessage', 'systemPrompt', 'replaceGlobalNote',
    'creatorNotes', 'additionalText', 'nickname', 'depth_prompt',
])
const imageGenFields = new Set(['sdData', 'newGenData', 'prebuiltAssetCommand', 'prebuiltAssetExclude', 'prebuiltAssetStyle'])
const listKinds: Record<string, PartKind> = {
    customscript: 'regex', additionalAssets: 'asset', emotionImages: 'emotion',
    alternateGreetings: 'greeting', group_only_greetings: 'greeting',
}

/** Keys include source, field, label and occurrence; editing a body preserves its key. */
export function splitParts(sourceId: SourceId, card: CardFields): Part[] {
    const parts: Part[] = []
    const counts = new Map<string, number>()
    const add = (kind: PartKind, field: string, label: string, value: unknown) => {
        const base = `${sourceId}:${field}:${label}`
        const occurrence = counts.get(base) ?? 0
        counts.set(base, occurrence + 1)
        const copy = sanitizeCardValue(value)
        parts.push({ sourceId, kind, key: `${base}#${occurrence}`, value: copy, hash: hashValue(copy) })
    }
    for (const [field, value] of Object.entries(card)) {
        if (value === undefined || isUnsafeCardKey(field)) continue
        if (field === 'globalLore' && Array.isArray(value)) {
            for (const entry of value) add(entry.mode === 'folder' ? 'loreFolder' : 'lore', field, entry.comment || entry.key || '-', entry)
        } else if (field === 'triggerscript' && Array.isArray(value)) {
            for (const trigger of value) add(trigger.effect?.[0]?.type === 'triggerlua' ? 'luaTrigger' : 'trigger', field, trigger.comment || trigger.type || '-', trigger)
        } else if (listKinds[field] && Array.isArray(value)) {
            for (const entry of value) {
                const label = listKinds[field] === 'greeting' ? field : field === 'customscript' ? entry.comment || entry.in || '-' : String(entry[0])
                add(listKinds[field], field, label, entry)
            }
        } else if (field === 'defaultVariables' && typeof value === 'string') {
            // Keep comments and blank lines too, so source formatting is available to composites.
            for (const line of value.split('\n')) add('variable', field, line.split('=')[0].trim(), line)
        } else if (field === 'extentions' && value && typeof value === 'object' && !Array.isArray(value)) {
            for (const [key, extension] of Object.entries(value)) if (!isUnsafeCardKey(key)) add('extension', field, `ext:${key}`, extension)
        } else {
            const kind: PartKind = field === 'firstMessage' ? 'greeting'
                : field === 'backgroundHTML' || field === 'backgroundCSS' ? 'css'
                : field === 'loreSettings' ? 'loreSettings'
                : imageGenFields.has(field) ? 'imageGenSetting'
                : textFields.has(field) ? 'textField' : 'extension'
            add(kind, field, field, value)
        }
    }
    return parts
}
