export interface WordChange { op: 'same' | 'add' | 'del'; text: string }
export interface WordHunk { id: number; original: string; proposed: string }

// Keep whitespace verbatim; Korean eojeol and punctuation are separate tokens.
function tokens(text: string): string[] {
    return text.match(/\s+|[\p{L}\p{N}\p{M}_]+|[^\s]/gu) ?? []
}

function scores(a: string[], b: string[]): Uint32Array {
    const row = new Uint32Array(b.length + 1)
    for (const token of a) {
        let diagonal = 0
        for (let j = 1; j <= b.length; j++) {
            const previous = row[j]
            row[j] = token === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1])
            diagonal = previous
        }
    }
    return row
}

// Hirschberg LCS avoids a quadratic-memory table for large lore entries.
function lcs(a: string[], b: string[]): string[] {
    if (!a.length || !b.length) return []
    if (a.length === 1) return b.includes(a[0]) ? [a[0]] : []
    const middle = Math.floor(a.length / 2)
    const left = scores(a.slice(0, middle), b)
    const right = scores(a.slice(middle).reverse(), [...b].reverse())
    let split = 0, best = -1
    for (let j = 0; j <= b.length; j++) {
        const score = left[j] + right[b.length - j]
        if (score > best) { best = score; split = j }
    }
    return [...lcs(a.slice(0, middle), b.slice(0, split)), ...lcs(a.slice(middle), b.slice(split))]
}

export function wordDiff(a: string, b: string): WordChange[] {
    const original = tokens(a), proposed = tokens(b), result: WordChange[] = []
    // Trim unchanged ends before computing LCS (the usual small-edit case).
    let start = 0, endA = original.length, endB = proposed.length
    while (start < endA && start < endB && original[start] === proposed[start]) {
        result.push({ op: 'same', text: original[start++] })
    }
    while (endA > start && endB > start && original[endA - 1] === proposed[endB - 1]) { endA--; endB-- }
    let i = start, j = start
    for (const common of lcs(original.slice(start, endA), proposed.slice(start, endB))) {
        while (original[i] !== common) result.push({ op: 'del', text: original[i++] })
        while (proposed[j] !== common) result.push({ op: 'add', text: proposed[j++] })
        result.push({ op: 'same', text: common }); i++; j++
    }
    while (i < endA) result.push({ op: 'del', text: original[i++] })
    while (j < endB) result.push({ op: 'add', text: proposed[j++] })
    while (i < original.length) result.push({ op: 'same', text: original[i++] })
    return result
}

function segments(a: string, b: string): (WordHunk | { same: string })[] {
    const result: (WordHunk | { same: string })[] = []
    let id = 0, hunk: WordHunk | undefined
    for (const change of wordDiff(a, b)) {
        if (change.op === 'same') {
            hunk = undefined
            const last = result[result.length - 1]
            if (last && 'same' in last) last.same += change.text
            else result.push({ same: change.text })
        } else {
            if (!hunk) { hunk = { id: id++, original: '', proposed: '' }; result.push(hunk) }
            if (change.op === 'del') hunk.original += change.text
            else hunk.proposed += change.text
        }
    }
    return result
}

export function diffHunks(a: string, b: string): WordHunk[] {
    return segments(a, b).filter((segment): segment is WordHunk => 'id' in segment)
}

export function composeFromChoices(a: string, b: string, choices: Record<number, 'original' | 'ai'>): string {
    return segments(a, b).map(segment => 'same' in segment ? segment.same
        : choices[segment.id] === 'ai' ? segment.proposed : segment.original).join('')
}
