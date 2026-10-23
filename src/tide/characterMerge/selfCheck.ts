import type { CardFields } from '../characterUpdate'
import { splitParts } from './parts'
import { applyRenames } from './rewrite'
import type { Rename } from './types'

function cbsBalanced(text: string): boolean {
    if (!text.includes('{{')) return true
    text = text.replace(/<!--[^]*?-->|\/\*[^]*?\*\//g, '')
    const stack: string[] = []
    for (const match of text.matchAll(/\{\{\s*(?:([#/])([a-z][\w]*)\b|(\/)\s*\}\})/gi)) {
        const name = match[2]?.toLowerCase().replace(/^if_pure$/, 'if')
        if (match[3]) { if (!stack.pop()) return false; continue }
        if (match[1] === '#') stack.push(name!)
        else if (stack.pop() !== name) return false
        // An incomplete opener/closer is broken even if a later token happens to balance it.
        if (text.indexOf('}}', match.index + match[0].length) < 0) return false
    }
    return stack.length === 0
}
function strings(value: unknown): string[] {
    if (typeof value === 'string') return [value]
    if (!value || typeof value !== 'object') return []
    const node = value as Record<string, unknown>
    return Object.entries(node).flatMap(([key, child]) => {
        if (node.type === 'triggerlua' && key === 'code' && typeof child === 'string') {
            const clean = child.replace(/--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g, token => token.startsWith('--') ? '' : token)
            return [clean]
        }
        return strings(child)
    })
}

/**
 * Check one source card with that source's renames before Task 3 combines sources.
 * CardFields has no source provenance, so a combined card cannot distinguish an
 * unchanged earlier source's valid names from stale references in a renamed source.
 */
export function selfCheck(card: CardFields, renames: Rename[]): { ok: boolean; problems: { partKey: string; reason: string }[] } {
    const problems: { partKey: string; reason: string }[] = []
    const parts = splitParts(renames[0]?.sourceId ?? 'card', card)
    const rewritten = applyRenames(parts, renames)
    for (const [index, part] of parts.entries()) {
        if (part.kind === 'regex' && part.value && typeof part.value === 'object') {
            const script = part.value as Record<string, unknown>
            const flag = script.ableFlag ? String(script.flag || 'g') : 'g'
            // Host <cbs> patterns only become regexes after runtime CBS expansion.
            if (!flag.includes('<cbs>')) {
                const flags = [...new Set(flag.replace(/<[^>]*>/g, '').replace(/[^dgimsuvy]/g, ''))].join('') || 'u'
                try { new RegExp(String(script.in ?? ''), flags) }
                catch (error) { problems.push({ partKey: part.key, reason: `regex: ${String(error)}` }) }
            }
        }
        if (strings(part.value).some(text => !cbsBalanced(text))) problems.push({ partKey: part.key, reason: 'CBS block pairing mismatch' })
        if (rewritten[index].hash === part.hash) continue
        const applicable = renames.map(rename => ({ ...rename, sourceId: part.sourceId }))
        // The same syntax-aware rewrite detects stale references, including Lua identifier keys.
        for (const rename of applicable) {
            if (applyRenames([part], [rename])[0].hash !== part.hash) problems.push({ partKey: part.key, reason: `Old ${rename.space} reference remains: ${rename.from}` })
        }
    }
    return { ok: problems.length === 0, problems }
}
