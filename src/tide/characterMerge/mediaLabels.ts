/** Only the suffix is case-insensitive; the rest of the label remains an exact identity. */
export const mediaLabelStem = (label: string): string => label.replace(/\.(?:webp|png|jpg|jpeg|gif|avif|bmp|mp4|webm|mp3|ogg|wav)$/i, '')

/** Incoming -> old labels. Reserve exact identities before unique stem matches, in linear time. */
export function mediaLabelRenames(current: string[], incoming: string[], base: string[] = []): Map<string, string> {
    const counts = (labels: string[]) => {
        const out = new Map<string, number>()
        for (const label of labels) out.set(label, (out.get(label) ?? 0) + 1)
        return out
    }
    const old = counts(base), live = counts(current), next = counts(incoming)
    for (const [label, count] of live) old.set(label, Math.max(count, old.get(label) ?? 0))
    const byStem = (labels: Map<string, number>, reserved: Map<string, number>) => {
        const out = new Map<string, string | null>()
        for (const [label, count] of labels) {
            if (reserved.has(label)) continue
            const stem = mediaLabelStem(label)
            out.set(stem, count === 1 && !out.has(stem) ? label : null)
        }
        return out
    }
    const before = byStem(old, next), after = byStem(next, old), result = new Map<string, string>()
    for (const [stem, label] of after) {
        const previous = before.get(stem)
        if (label != null && previous != null) result.set(label, previous)
    }
    return result
}
