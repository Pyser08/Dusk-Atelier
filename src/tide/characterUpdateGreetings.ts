import type { CardFields } from './characterUpdate'

type GreetingChat = { fmIndex?: number; _placeholder?: boolean; _stub?: boolean; message?: unknown[] }

export function isUnverifiableGreetingChat(chat: GreetingChat): boolean {
    return chat._placeholder === true || (chat._stub === true && (!Array.isArray(chat.message) || chat.message.length === 0))
}

/** fmIndex -1 selects firstMessage; all other valid indexes select alternates. */
export function greetingRemap(current: CardFields, fields: CardFields, chats: readonly GreetingChat[], appendMissing = true) {
    const old = (current.alternateGreetings ?? []) as string[]
    let next = [...(fields.alternateGreetings ?? old) as string[]]
    const unverifiableCount = chats.filter(isUnverifiableGreetingChat).length
    // Unknown server indexes must keep every old slot, including duplicates.
    if (unverifiableCount && old.some((text, index) => next[index] !== text)) {
        const incoming = next
        next = [...old]
        for (const text of incoming) if (!next.includes(text)) next.push(text)
    }
    const chosen = (chat: GreetingChat) => isUnverifiableGreetingChat(chat) ? undefined : chat.fmIndex === -1 ? current.firstMessage as string | undefined : old[chat.fmIndex!]
    const missingChats = chats.filter(chat => chosen(chat) !== undefined && chosen(chat) !== fields.firstMessage && !next.includes(chosen(chat)!))
    if (!appendMissing && missingChats.length && !unverifiableCount) next = [...old]
    // Retain the exact chosen text, including an old main greeting that moved
    // out of firstMessage. Append once; duplicate chats share the same slot.
    for (const chat of chats) {
        const text = chosen(chat)
        if (text !== undefined && text !== fields.firstMessage && !next.includes(text)) next.push(text)
    }
    return { unverifiableCount, missingCount: missingChats.length, alternateGreetings: next, indexes: chats.map(chat => {
        if (isUnverifiableGreetingChat(chat)) return undefined
        const text = chosen(chat)
        if (text === undefined) return chat.fmIndex
        return text === fields.firstMessage ? -1 : next.indexOf(text)
    }) }
}
