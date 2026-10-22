export interface UpdateTarget {
    chaId: string
    name: string
    image?: string
    reason: 'realm' | 'name' | 'content' | 'similar' | 'other'
    score?: number
}

export type MatchableCharacter = {
    type?: string
    chaId: string
    name?: string
    realmId?: string
    trashTime?: number
    creator?: string
    firstMessage?: string
    globalLore?: { comment?: string }[]
    customscript?: { comment?: string }[]
    extentions?: Record<string, any>
    extensions?: Record<string, any>
    chats?: { message?: unknown[] }[]
    messageCount?: number
    chatMessageCount?: number
}

export function normalizeName(name: string | undefined): string {
    return (name ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Remove only version suffixes, preserving numbers embedded in a character name. */
export function baseName(name: string | undefined): string {
    let value = (name ?? '').normalize('NFKC').trim()
    const version = '(?:버전\\s*\\d+(?:\\.\\d+)*|(?:ver(?:sion)?\\.?\\s*|v\\s*)\\d+(?:\\.\\d+)*|\\d+\\.\\d+(?:\\.\\d+)*)'
    const suffix = new RegExp(`(?:\\s*[-–—:]?\\s*${version}|\\s*[([]\\s*${version}\\s*[)\\]])\\s*$`, 'iu')
    let previous: string
    do { previous = value; value = value.replace(suffix, '').trim() } while (value !== previous)
    return normalizeName(value)
}

function realmId(character: Partial<MatchableCharacter>): string | undefined {
    return character.realmId
        || character.extentions?.risuRealmImportId
        || character.extensions?.risuRealmImportId
        || character.extensions?.risuai?.risuRealmImportId
}

function labels(character: Partial<MatchableCharacter>): Set<string> {
    return new Set([
        ...(character.globalLore ?? []).map((entry) => normalizeName(entry.comment)),
        ...(character.customscript ?? []).map((entry) => normalizeName(entry.comment)),
    ].filter(Boolean))
}

function chatLength(character: MatchableCharacter): number {
    return character.messageCount ?? character.chatMessageCount
        ?? (character.chats ?? []).reduce((sum, chat) => sum + (chat.message?.length ?? 0), 0)
}

function contentScore(incoming: Partial<MatchableCharacter>, candidate: Partial<MatchableCharacter>): number | null {
    if (!incoming.creator || !candidate.creator || normalizeName(incoming.creator) !== normalizeName(candidate.creator)) return null
    const incomingLabels = labels(incoming)
    const candidateLabels = labels(candidate)
    let score = 0
    if (incomingLabels.size >= 3 && candidateLabels.size >= 3) {
        let overlap = 0
        for (const label of incomingLabels) if (candidateLabels.has(label)) overlap++
        score = overlap / Math.min(incomingLabels.size, candidateLabels.size)
        if (score >= 0.5) return score
    }
    return incoming.firstMessage && candidate.firstMessage && incoming.firstMessage === candidate.firstMessage ? score : null
}

function hasRealmEvidence(incoming: Partial<MatchableCharacter>, candidate: Partial<MatchableCharacter>): boolean {
    const creator = normalizeName(incoming.creator)
    const name = baseName(incoming.name)
    return !!creator && creator === normalizeName(candidate.creator)
        || !!name && name === baseName(candidate.name)
        || contentScore(incoming, candidate) !== null
}

export function matchSameBot<T extends MatchableCharacter>(incoming: T, candidates: T[]): { chaId: string, reason: 'realm' | 'name' | 'content', score: number } | null {
    return listSameBotMatches(incoming, candidates)[0] ?? null
}

export function listSameBotMatches<T extends MatchableCharacter>(incoming: T, candidates: T[]): { chaId: string, reason: 'realm' | 'name' | 'content', score: number, name: string, messageCount: number }[] {
    if (incoming.type === 'group') return []
    const incomingRealm = realmId(incoming)
    const incomingName = baseName(incoming.name)
    const matches = candidates.filter((candidate) => candidate.type !== 'group' && candidate.chaId !== incoming.chaId && !candidate.trashTime).map((candidate) => {
        const candidateRealm = realmId(candidate)
        const sameRealm = incomingRealm && candidateRealm === incomingRealm && hasRealmEvidence(incoming, candidate)
        const score = sameRealm ? 1
            : incomingName && baseName(candidate.name) === incomingName ? 1
            : contentScore(incoming, candidate)
        const reason: 'realm' | 'name' | 'content' | null = sameRealm ? 'realm'
            : incomingName && baseName(candidate.name) === incomingName ? 'name'
            : score !== null ? 'content' : null
        return reason ? { chaId: candidate.chaId, reason, score: score ?? 0, chatLength: chatLength(candidate) } : null
    }).filter((match): match is NonNullable<typeof match> => match !== null)
    const rank = { realm: 0, name: 1, content: 2 }
    matches.sort((a, b) => rank[a.reason] - rank[b.reason] || b.score - a.score || b.chatLength - a.chatLength)
    return matches.map(({ chaId, reason, score, chatLength }) => ({ chaId, reason, score, name: candidates.find((candidate) => candidate.chaId === chaId)?.name ?? '', messageCount: chatLength }))
}

export function rankUpdateTargets(
    chars: (MatchableCharacter & { image?: string })[],
    hub: Partial<MatchableCharacter> & { id?: string, name: string },
): UpdateTarget[] {
    if (hub.type === 'group') return []
    const hubName = baseName(hub.name)
    const ranked = chars.filter((char) => char.type !== 'group' && !char.trashTime).map((char) => {
        const name = char.name ?? ''
        const normalized = baseName(name)
        const contentMatch = contentScore(hub, char)
        const sameRealm = (char.realmId ?? realmId(char)) && (char.realmId ?? realmId(char)) === hub.id && hasRealmEvidence(hub, char)
        const reason = sameRealm ? 'realm'
            : normalized === hubName ? 'name'
            : contentMatch !== null ? 'content'
            : normalized && hubName && (normalized.includes(hubName) || hubName.includes(normalized)) ? 'similar'
            : 'other'
        return { chaId: char.chaId, name, image: char.image, reason, creator: char.creator, messageCount: chatLength(char) } as UpdateTarget & { creator?: string, messageCount: number }
    })
    const rank = { realm: 0, name: 1, content: 2, similar: 3, other: 4 }
    return ranked.sort((a, b) => rank[a.reason] - rank[b.reason]
        || Number((b.creator ?? '') === (hub.creator ?? '') && !!hub.creator) - Number((a.creator ?? '') === (hub.creator ?? '') && !!hub.creator)
        || b.messageCount - a.messageCount
        || a.name.localeCompare(b.name))
}

/** Candidates for the matching-bot question; similar names are shown only alongside an exact match. */
export function listUpdateCandidates<T extends MatchableCharacter & { image?: string }>(chars: T[], incoming: T): UpdateTarget[] {
    if (incoming.type === 'group') return []
    const eligible = chars.filter((char) => char.chaId !== incoming.chaId && !char.trashTime)
    const ranked = rankUpdateTargets(eligible, { ...incoming, id: realmId(incoming), name: incoming.name ?? '' })
    const exact = ranked.filter((target) => target.reason === 'realm' || target.reason === 'name' || target.reason === 'content')
    return exact.length ? ranked.filter((target) => target.reason !== 'other') : []
}
