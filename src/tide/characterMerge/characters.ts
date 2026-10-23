import type { MergeInput } from './types'
import { hashValue } from '../characterUpdateMerge'
import { splitParts } from './parts'

export interface DetectedCharacter {
    key: string
    name: string
    aliases: string[]
    loreKeys: string[]
    assetNames: string[]
    emotionNames: string[]
    botSelf?: boolean
    displayName?: string
    defaultSelected?: false
}
type Lore = { comment?: string; key?: string; content?: string; folder?: string }
const keywords = (lore: Lore) => String(lore.key ?? '').split(',').map(s => s.trim()).filter(Boolean)
const normalizedName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
const bilingual = (a: string, b: string) => {
    const scripts = [/\p{Script=Latin}/u, /\p{Script=Hangul}/u, /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u]
    return scripts.some(script => script.test(a) && !script.test(b)) && scripts.some(script => script.test(b) && !script.test(a))
}
const nameField = (text: string) => (text.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:Name|이름)\s*:\s*([^\n]+)/im)?.[1]
    ?? text.match(/^\s*#{1,6}\s+([\p{L} .'-]+\s*[（(][\p{L} .'-]+[）)])\s*(?=$|["“])/mu)?.[1])?.replace(/\*\*/g, '').split(/[·|]|\.\s/)[0].trim()
// Lore identities use only whole names and explicit bilingual pairs.
const fullNames = (value: string) => {
    const [canonical, ...aliases] = value.split(/[（()）]/).map(part => part.trim()).filter(Boolean)
    if (!canonical) return []
    return [canonical, ...aliases.filter(alias => bilingual(canonical, alias))]
}
const searchAliases = (value: string) => [...new Set([value, ...value.split(/[（()）]/).flatMap(part => [part.trim(), ...part.trim().split(/\s+/)])].filter(Boolean))]

/** Romanization links identity fields and bounded prose names to the bot's identity. */
function identityKey(name: string): string {
    const initials = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
    const vowels = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
    const finals = ['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h']
    return [...name.toLocaleLowerCase()].map(char => {
        const syllable = char.charCodeAt(0) - 0xac00
        return syllable >= 0 && syllable < 11172 ? initials[Math.floor(syllable / 588)] + vowels[Math.floor(syllable % 588 / 28)] + finals[syllable % 28] : char
    }).join('').replace(/[^a-z0-9]/g, '')
}
const sameIdentity = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase() || !!identityKey(a) && identityKey(a) === identityKey(b)
const sameFullName = (a: string, b: string) => normalizedName(a) === normalizedName(b)
const botDescription = (input: MergeInput) => [input.card.desc, input.card.personality].map(value => String(value ?? '')).filter(value => value.trim()).join('\n')
const botIdentities = (input: MergeInput) => {
    const description = botDescription(input), botName = String(input.card.name || input.meta.name).trim()
    const candidates = [...new Set(description.split('\n').map(line => {
        const explicit = nameField(line)
        if (explicit) return explicit
        const heading = line.match(/^\s*#{1,6}\s+([\p{L} .'-]+)\s*$/u)?.[1]?.trim()
        return heading && fullNames(heading).some(alias => fullNames(botName).some(name => sameIdentity(alias, name))) ? heading : undefined
    }).filter((name): name is string => !!name))]
    const identities = candidates.length <= 1 ? candidates : candidates.filter(candidate => fullNames(candidate).some(alias => fullNames(botName).some(name => sameIdentity(alias, name))))
    return [...new Set([botName, ...identities].flatMap(fullNames))]
}
const botAliases = (input: MergeInput) => {
    const description = botDescription(input), names = botIdentities(input).flatMap(searchAliases)
    for (const match of description.matchAll(/[（(]([\p{L} .'-]+)[）)]/gu)) {
        const before = description.slice(0, match.index).trimEnd()
        if (names.some(name => before.endsWith(name) && mentions(before.slice(-name.length - 1), name))) names.push(...searchAliases(match[1].trim()))
    }
    // Only accept prose aliases whose identity matches the bot, e.g. Haru → 하루는.
    for (const match of description.matchAll(/(?<![\p{L}\p{N}_])([가-힣]+?)(?:은|는|이|가)(?=\s)/gu)) {
        if (names.some(name => sameIdentity(match[1], name))) names.push(match[1])
    }
    // A compact Korean full name can contain the bot's given name (향하율 → 하율).
    for (const name of [...names]) if (/^[가-힣]+$/.test(name)) for (let i = 1; i < name.length; i++) {
        const suffix = name.slice(i)
        if (names.some(other => /^[a-z -]+$/i.test(other) && sameIdentity(suffix, other))) names.push(suffix)
    }
    return [...new Set(names)]
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Match Latin words exactly; Korean keywords may be followed by a grammatical particle. */
export const nameSuffix = (keyword: string) => /[가-힣]$/.test(keyword.normalize('NFC')) ? '(?=$|[^\\p{L}\\p{N}_]|(?:(?:씨|님|선배|후배)(?:은|는|이|가|의|께서)?|은|는|이|가|을|를|의|에|에서|에게|께서|으로|와|과|도|로|야|아)(?=$|[^\\p{L}\\p{N}_]))' : '(?=$|[^\\p{L}\\p{N}_])'
export function mentions(text: string, keyword: string): boolean {
    text = text.normalize('NFC'); keyword = keyword.normalize('NFC')
    if (!keyword.trim()) return false
    return new RegExp(`(?<![\\p{L}\\p{N}_])${escape(keyword)}${nameSuffix(keyword)}`, 'iu').test(text)
}

/** Confidence controls selection only; every non-empty bot description remains available. */
function confidentBotPerson(input: MergeInput): boolean {
    const description = botDescription(input)
    const profiles = description.split('\n').map(nameField).filter(Boolean)
    const traits = /외모|나이|성격|말투|성별|\b(?:Appearance|Age|Personality|Gender|Speech)\b/i.test(description)
    return profiles.length === 1 && (traits || /^\s*(?:[-*]\s*)?(?:\*\*)?(?:Name|이름)\s*:/im.test(description))
        || traits && botAliases(input).some(alias => mentions(description, alias))
}

/** Executable/system instructions are never world material, even when manually selected. */
export function isSystemLore(lore: Lore, moduleMaterial = false): boolean {
    return /(?:ASSET_KEYWORDS|CALENDAR|상태창|status window|image command|image tag|이미지.*(?:지침|명령)|시스템)/i.test(String(lore.comment ?? ''))
        || moduleMaterial && /통합 이미지|Image System/i.test(String(lore.comment ?? '') + String(lore.content ?? '').slice(0, 80))
        || (moduleMaterial ? /\{\{(?:#(?!when\b)|getvar::|setvar::|addvar::)|<style\b|<script\b|@@(?:inject|depth)|listenEdit\s*\(/i : /\{\{(?:#|getvar::|setvar::|addvar::)|<style\b|<script\b|@@(?:inject|depth)|listenEdit\s*\(/i).test(String(lore.content ?? ''))
}

function detectLoreCharacters(input: MergeInput) {
    const result: DetectedCharacter[] = [], ownAliases = botAliases(input), ownIdentities = botIdentities(input)
    const botCharacters = new Set<DetectedCharacter>()
    const byIdentity = new Map<string, DetectedCharacter>()
    const folders = new Map(input.parts.filter(p => p.kind === 'loreFolder').map(p => [(p.value as Lore).key, p.value as Lore]))
    for (const part of input.parts) {
        if (part.kind !== 'lore') continue
        const lore = part.value as Lore, text = String(lore.content ?? ''), keys = keywords(lore)
        const botSelf = part.key === `${input.meta.id}:globalLore:__risutide_bot_self__#0`
        const folderNames: string[] = [], visited = new Set<string>()
        let folder = lore.folder
        while (folder && !visited.has(folder)) {
            visited.add(folder); const row = folders.get(folder); if (!row) break
            folderNames.push(String(row.comment ?? '')); folder = row.folder
        }
        const folderText = folderNames.join(' ').replace(/[^\p{L}\p{N}\s]/gu, ' ')
        const personFolder = /\b(?:heroines?|hero(?:es)?|cast|npc|characters?)\b|인물|캐릭터|히로인|공략/i.test(folderText)
        const excludedFolder = /\b(?:world|places?|land|system|events?|items?|organizations?|groups?)\b|장소|세계관|시스템|이벤트|아이템|조직|단체/i.test(folderText)
        const title = String(lore.comment ?? '').normalize('NFC').trim().replace(/^[\p{S}\p{P}\s]+/u, '')
        const roster = /\b(?:list|roster|rules?|assets?|system)\b|리스트|목록|규칙|출력|지침/i.test(title)
        if (!botSelf && (excludedFolder || roster)) continue
        const moduleHeading = /^\s*#\s*Identity\b/im.test(text) ? text.match(/(?:^|\}\})\[([^\]\n]+?)\s+-\s+[^\]\n]+\]/)?.[1] : undefined
        const nameLine = (moduleHeading || nameField(text))?.replace(/\{\{char\}\}/gi, String(input.card.name || input.meta.name))
        if (!botSelf && /\{\{user\}\}/i.test(nameLine ?? title)) continue
        const sheet = /<character\b|^\s*#{1,6}\s*Character Sheet:/im.test(text)
        const traits = /^\s*(?:[-*]\s*)?(?:\*\*)?(?:Age[^:\n]*|Hair[^:\n]*|Eyes?[^:\n]*|Personality|Speech[^:\n]*|Appearance|나이|성격|외모|말투)\s*:/im.test(text)
            || /^\s*#{1,6}\s*(?:Appearance|Personality)\b/im.test(text)
        // Conditional secrets/quests are profile material; writable/executable lore is not.
        if (!botSelf && isSystemLore(lore, input.meta.kind === 'module') && !(nameLine && traits && !/\{\{(?:setvar::|addvar::)|<style\b|<script\b|@@(?:inject|depth)|listenEdit\s*\(/i.test(text))) continue
        const personTitle = /^[\p{L}][\p{L} .'-]*(?:\s*[（(][\p{L}\s]+[）)])?$/u.test(title)
        const keyedTitle = keys.some(k => k.toLocaleLowerCase() === title.split(/[（(]/)[0].trim().toLocaleLowerCase())
        if (!botSelf && !(nameLine && (traits || sheet || personFolder) || personTitle && (personFolder && (keyedTitle || traits) || traits && keyedTitle))) continue
        const canonical = botSelf ? String(lore.comment) : (text.match(/<character\s+name=["']([^"']+)["']/i)?.[1] ?? (nameLine || title).split(/[（(]/)[0]).trim()
        const identityNames = [title, canonical, ...(nameLine ? [nameLine] : []), ...(title.match(/[（(]([^）)]+)[）)]/)?.slice(1) ?? []), ...(nameLine?.match(/[（(]([^）)]+)[）)]/)?.slice(1) ?? [])]
        const aliases = [...new Set([...identityNames, ...identityNames.flatMap(n => n.split(/[（()）]/).flatMap(n => n.trim().split(/\s+/))), ...keys].filter(Boolean))]
        const identities = [canonical, nameLine || title].flatMap(fullNames).map(normalizedName)
        const isBot = input.meta.kind !== 'module' && (botSelf || identities.some(identity => ownIdentities.some(name => sameFullName(identity, name))))
        if (isBot) aliases.push(...ownAliases.filter(name => !aliases.includes(name)))
        const matches = new Set(identities.map(identity => byIdentity.get(identity)).filter(Boolean))
        const existing = result.find(character => matches.has(character))
        if (existing) {
            for (const other of result.filter(character => character !== existing && matches.has(character))) {
                existing.loreKeys.push(...other.loreKeys)
                existing.aliases.push(...other.aliases)
                if (botCharacters.delete(other)) botCharacters.add(existing)
                for (const [identity, owner] of byIdentity) if (owner === other) byIdentity.set(identity, existing)
                result.splice(result.indexOf(other), 1)
            }
            if (isBot) botCharacters.add(existing)
            existing.loreKeys.push(part.key); existing.aliases = [...new Set([...existing.aliases, ...aliases])]
            for (const identity of identities) byIdentity.set(identity, existing)
            continue
        }
        const character: DetectedCharacter = { key: part.key, name: String(lore.comment || canonical), aliases, loreKeys: [part.key], assetNames: [], emotionNames: [] }
        if (isBot) botCharacters.add(character)
        if (botSelf) {
            character.botSelf = true
            if (!confidentBotPerson(input)) character.defaultSelected = false
            character.displayName = `${character.name} · ${character.defaultSelected === false ? '봇 설명의 인물' : '봇 본인'}`
        }
        for (const identity of identities) byIdentity.set(identity, character)
        result.push(character)
    }
    // Romanization is a bot-only fallback after strict lore grouping, never a lore identity.
    if (input.meta.kind !== 'module' && ![...botCharacters].some(character => !character.botSelf)) {
        const botNames = fullNames(String(input.card.name || input.meta.name)).map(normalizedName)
        const candidates = result.filter(character => !character.botSelf && [...byIdentity].some(([identity, owner]) => owner === character && botNames.some(name => sameIdentity(identity, name))))
        if (candidates.length === 1) {
            const character = candidates[0], self = result.find(candidate => candidate.botSelf)
            character.aliases = [...new Set([...character.aliases, ...ownAliases, ...(self?.aliases ?? [])])]
            if (self) {
                character.loreKeys.push(...self.loreKeys)
                character.botSelf = true
                character.defaultSelected = self.defaultSelected
                character.displayName = self.displayName
                result.splice(result.indexOf(self), 1)
                botCharacters.delete(self)
            }
            botCharacters.add(character)
        }
    }
    for (const part of input.parts) {
        if (part.kind !== 'lore' || result.some(c => c.loreKeys.includes(part.key))) continue
        const lore = part.value as Lore, title = String(lore.comment ?? '')
        if (!/—|밈|NSFW/i.test(title) || /통합|공용|출력|이미지/.test(title)) continue
        let folder = lore.folder, excluded = false
        const visited = new Set<string>()
        while (folder && !visited.has(folder)) {
            visited.add(folder); const row = folders.get(folder); if (!row) break
            excluded ||= /\b(?:world|places?|land|system|events?|items?)\b|장소|세계관|시스템|이벤트|아이템/i.test(String(row.comment ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' '))
            folder = row.folder
        }
        if (excluded || /\{\{(?:setvar::|addvar::)|<style\b|<script\b|@@(?:inject|depth)|listenEdit\s*\(/i.test(String(lore.content ?? ''))) continue
        const owners = result.filter(c => c.aliases.some(a => mentions(title, a)))
        if (owners.length === 1) owners[0].loreKeys.push(part.key)
    }
    const portraitName = [...botCharacters][0]?.name ?? String(input.card.name || input.meta.name).trim()
    const botPortrait = new RegExp(`^${escape(portraitName)}_portrait(?:_\\d+)?$`, 'u')
    const aliasOwners = new Map<string, Set<DetectedCharacter>>()
    for (const character of result) for (const alias of character.aliases) {
        const key = normalizedName(alias), owners = aliasOwners.get(key) ?? new Set()
        owners.add(character); aliasOwners.set(key, owners)
    }
    for (const character of result) {
        const ownsBotImages = botCharacters.has(character)
        const normalize = (value: string) => normalizedName(value).replace(/[\s_]+/g, ' ')
        const patterns = character.aliases.filter(alias => aliasOwners.get(normalizedName(alias))?.size === 1).map(alias => new RegExp(`(?:^|[ .&-])${escape(normalize(alias))}(?=$|[ .&-])`, 'u'))
        const matches = (name: string) => {
            const normalized = normalize(name.replace(/\.(?:png|webp|jpe?g|gif|avif)$/i, ''))
            return patterns.some(pattern => pattern.test(normalized))
        }
        const assetNames = new Set(character.assetNames), emotionNames = new Set(character.emotionNames)
        for (const part of input.parts) if ((part.kind === 'asset' || part.kind === 'emotion') && Array.isArray(part.value) && (matches(String(part.value[0])) || (character.botSelf || ownsBotImages) && part.kind === 'emotion')) {
            // The bot portrait has a known owner even when a surname search alias matches it.
            if (!ownsBotImages && part.kind === 'asset' && part.value[1] === input.card.image && botPortrait.test(String(part.value[0]))) continue
            const names = part.kind === 'asset' ? character.assetNames : character.emotionNames
            const seen = part.kind === 'asset' ? assetNames : emotionNames, name = String(part.value[0])
            if (!seen.has(name)) { seen.add(name); names.push(name) }
        }
    }
    return { characters: result, botCharacters }
}

/** Virtual import material leaves the source card and ordinary update/merge parts intact. */
export function characterImportInput(input: MergeInput): MergeInput {
    const key = `${input.meta.id}:globalLore:__risutide_bot_self__#0`
    if (input.meta.kind === 'module' || input.parts.some(p => p.key === key)) return input
    const name = String(input.card.name || input.meta.name).trim()
    if (!name) return input
    const { characters: found, botCharacters } = detectLoreCharacters(input)
    const duplicate = found.find(c => botCharacters.has(c))
    if (!duplicate && !botDescription(input).trim()) return input
    const fields = ['desc', 'personality', 'scenario', 'exampleMessage']
    const content = [`Name: ${name}`, ...fields.map(field => String(input.card[field] ?? '')).filter(text => text.trim())].join('\n\n')
    const value = { comment: name, key: name, content, mode: 'normal', alwaysActive: false }
    const parts = [...input.parts]
    if (!duplicate) parts.push({ sourceId: input.meta.id, kind: 'lore', key, value, hash: hashValue(value) })
    if (typeof input.card.image === 'string' && input.card.image && !parts.some(p => p.kind === 'asset' && String((p.value as string[])[0]).startsWith(`${duplicate?.name ?? name}_portrait`) && (p.value as string[])[1] === input.card.image)) {
        const assetNames = new Set(parts.filter(p => p.kind === 'asset').map(p => (p.value as string[])[0]))
        let portrait = `${duplicate?.name ?? name}_portrait`, i = 2
        while (assetNames.has(portrait)) portrait = `${duplicate?.name ?? name}_portrait_${i++}`
        parts.push(...splitParts(input.meta.id, { additionalAssets: [[portrait, input.card.image, 'png']] }))
    }
    return parts.length === input.parts.length ? input : { ...input, parts }
}

export function detectCharacters(input: MergeInput): DetectedCharacter[] {
    return detectLoreCharacters(characterImportInput(input)).characters
}

export function suggestWorld(input: MergeInput, picked: DetectedCharacter[]): string[] {
    input = characterImportInput(input)
    const characterKeys = new Set(detectCharacters(input).flatMap(c => c.loreKeys))
    const pickedKeys = new Set(picked.flatMap(c => c.loreKeys))
    const text = input.parts.filter(p => pickedKeys.has(p.key)).map(p => String((p.value as Lore).content ?? '')).join('\n')
    return input.parts.filter(p => p.kind === 'lore' && !characterKeys.has(p.key) && !isSystemLore(p.value as Lore, input.meta.kind === 'module')
        && keywords(p.value as Lore).some(keyword => mentions(text, keyword))).map(p => p.key)
}
