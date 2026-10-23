import type { CompositeSpec } from './types'

type Syntax = CompositeSpec['syntax']
type Block = { blockId: string; start: number; end: number; body: string }
type Region = Block & { bodyStart: number; bodyEnd: number }
type EditResult = { text: string } | { markersBroken: true }

function markers(blockId: string, syntax: Syntax): [string, string] {
    if (syntax === 'lua') return [`-- >>> risutide:source ${blockId}`, `-- <<< risutide:source ${blockId}`]
    if (syntax === 'kv') return [`# risutide:src=${blockId}`, `# /risutide:src=${blockId}`]
    if (syntax === 'text') return [`{{// risutide:src=${blockId}}}`, `{{// /risutide:src=${blockId}}}`]
    return [`<!-- risutide:src=${blockId} -->`, `<!-- /risutide:src=${blockId} -->`]
}

function markedBody(blockId: string, body: string, syntax: Syntax): string {
    const [open, close] = markers(blockId, syntax)
    return `${open}\n${body}\n${close}`
}

function regions(finalText: string, syntax: Syntax): Region[] | null {
    if (syntax === 'json') return null
    const pattern = syntax === 'lua' ? /^-- (>>>|<<<) risutide:source (\S+)$/
        : syntax === 'kv' ? /^# (\/?)risutide:src=(\S+)$/
            : syntax === 'text' ? /^\{\{\/\/ (\/?)risutide:src=(\S+)\}\}$/
            : /^<!-- (\/?)risutide:src=(\S+) -->$/
    // Bundle payloads can contain another bundle's markers inside Lua strings.
    // Mask literals/comments without moving offsets; framing line comments remain visible.
    const markerText = syntax === 'lua' ? finalText.replace(/--\[(=*)\[[\s\S]*?\]\1\]|--[^\r\n]*|\[(=*)\[[\s\S]*?\]\2\]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g,
        token => token.startsWith('--') && !/^--\[(=*)\[/.test(token) ? token : token.replace(/[^\r\n]/g, ' ')) : finalText
    const result: Region[] = []
    const seen = new Set<string>()
    let open: { blockId: string; start: number; bodyStart: number } | undefined
    let start = 0
    while (start < finalText.length) {
        const newline = finalText.indexOf('\n', start)
        const end = newline === -1 ? finalText.length : newline
        const lineEnd = finalText[end - 1] === '\r' ? end - 1 : end
        const match = pattern.exec(markerText.slice(start, lineEnd))
        if (match) {
            const blockId = match[2]
            const closing = match[1] === '/' || match[1] === '<<<'
            if (!closing) {
                if (open || seen.has(blockId)) return null
                seen.add(blockId)
                open = { blockId, start, bodyStart: newline === -1 ? end : end + 1 }
            } else {
                if (!open || open.blockId !== blockId) return null
                // The newline before the close belongs to the framing, not the body.
                let bodyEnd = start
                if (bodyEnd > open.bodyStart && finalText[bodyEnd - 1] === '\n') {
                    bodyEnd--
                    if (bodyEnd > open.bodyStart && finalText[bodyEnd - 1] === '\r') bodyEnd--
                }
                result.push({ ...open, end: lineEnd, bodyEnd, body: finalText.slice(open.bodyStart, bodyEnd) })
                open = undefined
            }
        }
        start = newline === -1 ? finalText.length : end + 1
    }
    return open ? null : result
}

/** Half-open offsets cover the open marker through the close marker, excluding its newline. */
export function parseBlocks(finalText: string, syntax: Syntax): Block[] | null {
    return regions(finalText, syntax)?.map(({ blockId, start, end, body }) => ({ blockId, start, end, body })) ?? null
}

export function buildComposite(spec: CompositeSpec, included: string[]): string {
    const selected = new Set(included)
    const blocks = spec.blocks.filter(block => selected.has(block.blockId))
    if (spec.syntax === 'json') {
        const values: Record<string, unknown> = Object.create(null)
        for (const block of blocks) {
            const parsed = JSON.parse(block.body) as Record<string, unknown>
            for (const [key, value] of Object.entries(parsed)) {
                if (!Object.hasOwn(values, key)) values[key] = value
                else if (typeof values[key] === 'number' && typeof value === 'number') {
                    values[key] = Math.max(values[key] as number, value)
                }
            }
        }
        return JSON.stringify(values)
    }
    return blocks.map(block => markedBody(block.blockId, block.body, spec.syntax)).join('\n\n')
}

export function toggleBlock(finalText: string, spec: CompositeSpec, blockId: string, include: boolean): EditResult {
    const blocks = regions(finalText, spec.syntax)
    if (!blocks) return { markersBroken: true }
    const present = blocks.find(block => block.blockId === blockId)
    if (!include) {
        if (!present) return { text: finalText }
        let { start, end } = present
        const after = /^(?:\r?\n)[\t ]*(?:\r?\n)/.exec(finalText.slice(end))
        const before = /(?:\r?\n)[\t ]*(?:\r?\n)$/.exec(finalText.slice(0, start))
        if (after) end += after[0].length
        else if (before) start -= before[0].length
        return { text: finalText.slice(0, start) + finalText.slice(end) }
    }
    if (present) return { text: finalText }
    const index = spec.blocks.findIndex(block => block.blockId === blockId)
    if (index === -1) return { text: finalText }
    const block = spec.blocks[index]
    const inserted = markedBody(blockId, block.body, spec.syntax)
    for (let i = index - 1; i >= 0; i--) {
        const preceding = blocks.find(candidate => candidate.blockId === spec.blocks[i].blockId)
        if (!preceding) continue
        const suffix = finalText.slice(preceding.end)
        const separator = suffix && !/^\r?\n/.test(suffix) ? '\n\n' : ''
        return { text: finalText.slice(0, preceding.end) + '\n\n' + inserted + separator + suffix }
    }
    return { text: inserted + (finalText ? '\n\n' : '') + finalText }
}

export function replaceBlock(finalText: string, spec: CompositeSpec, blockId: string, body: string): EditResult {
    const blocks = regions(finalText, spec.syntax)
    if (!blocks) return { markersBroken: true }
    const block = blocks.find(candidate => candidate.blockId === blockId)
    if (!block) return { text: finalText }
    // Adjacent marker lines have no body framing newline yet.
    const adjacent = block.bodyEnd === block.bodyStart && finalText.slice(block.bodyEnd).startsWith(markers(blockId, spec.syntax)[1])
    const separator = adjacent ? (finalText.slice(block.bodyStart - 2, block.bodyStart) === '\r\n' ? '\r\n' : '\n') : ''
    return { text: finalText.slice(0, block.bodyStart) + body + separator + finalText.slice(block.bodyEnd) }
}
