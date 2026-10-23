import type { MergeInput } from './types'

export type ImageSystem = { kind: 'assetList'; loreKey: string; format: string }
    | { kind: 'keywordLore'; loreKey: string; format: string }
    | { kind: 'unknown' }

export function detectImageSystem(target: MergeInput): ImageSystem {
    const candidates = target.parts.filter(p => p.kind === 'lore' || p.key === `${target.meta.id}:replaceGlobalNote:replaceGlobalNote#0`)
    // The auxiliary model's named keyword entry takes precedence over main-model instructions.
    candidates.sort((a, b) => Number(/ASSET_KEYWORDS/i.test(String((b.value as any)?.comment))) - Number(/ASSET_KEYWORDS/i.test(String((a.value as any)?.comment))))
    for (const part of candidates) {
        const lore = part.value as { comment?: string; content?: string }
        const text = typeof part.value === 'string' ? part.value : String(lore.content ?? '')
        const tag = text.match(/<img\s*=\s*(["'])(.*?)\1\s*>/i)
        if (!tag) continue
        const keyword = /ASSET_KEYWORDS/i.test(lore.comment ?? '')
        if (!keyword && !/(?:image|asset)\s+(?:asset\s+)?guidelines/i.test(text) && !/(?:asset|image|character|이미지|에셋).*(?:command|list|registered|name|목록|명령|이름)|(?:command|list|registered).*(?:image|character|asset)/i.test(text)) continue
        // Native asset syntax survives a target's whitelist/catch-all display filters.
        const hiddenTags = target.parts.some(p => p.kind === 'regex' && (p.value as any)?.type === 'editdisplay'
            && (p.value as any)?.out === '' && /<img/i.test(String((p.value as any)?.in)) && String((p.value as any)?.in).includes('[^'))
        if (!keyword && /outfit/i.test(tag[2]) && hiddenTags) return { kind: 'assetList', loreKey: part.key, format: '{{img::{name}}}' }
        const format = tag[0].replace(/(["'])(.*?)\1/, `${tag[1]}{name}${tag[1]}`)
        return { kind: keyword ? 'keywordLore' : 'assetList', loreKey: part.key, format: `${keyword ? '- ' : ''}${format}` }
    }
    return { kind: 'unknown' }
}

export function imageRegistrationText(system: ImageSystem, names: string[]): string {
    if (system.kind === 'unknown') return ''
    return [...new Set(names)].map(name => system.format.replace('{name}', () => name.replace(/\.(?:png|webp|jpe?g|gif|avif)$/i, ''))).join('\n')
}
