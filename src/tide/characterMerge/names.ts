import type { NameSet, Part } from './types'

const emptyNames = (): NameSet => ({ css: new Set(), cssVars: new Set(), keyframes: new Set(), variables: new Set(), buttons: new Set(), loreNames: new Set(), assets: new Set() })
const addName = (set: Set<string>, name: string) => { if (name.trim()) set.add(name.trim()) }
type LuaToken = { kind: 'word' | 'string' | 'symbol'; text: string }

// Tokenize only what name collection needs. Comments and string contents cannot open Lua scopes.
function luaTokens(code: string): LuaToken[] {
    const tokens: LuaToken[] = []
    let i = 0
    const longString = () => {
        const opener = /^\[(=*)\[/.exec(code.slice(i))
        if (!opener) return null
        const start = i + opener[0].length
        const closer = `]${opener[1]}]`
        const end = code.indexOf(closer, start)
        i = end < 0 ? code.length : end + closer.length
        return code.slice(start, end < 0 ? code.length : end).replace(/^\r?\n/, '')
    }
    while (i < code.length) {
        if (/\s/.test(code[i])) { i++; continue }
        if (code.startsWith('--', i)) {
            i += 2
            if (longString() === null) {
                const end = code.indexOf('\n', i)
                i = end < 0 ? code.length : end + 1
            }
            continue
        }
        const long = longString()
        if (long !== null) { tokens.push({ kind: 'string', text: long }); continue }
        if (code[i] === '"' || code[i] === "'") {
            const quote = code[i++]
            let text = ''
            while (i < code.length && code[i] !== quote) {
                if (code[i] === '\\') {
                    const escaped = code[++i]
                    text += ({ n: '\n', r: '\r', t: '\t' } as Record<string, string>)[escaped] ?? escaped ?? ''
                    i++
                } else text += code[i++]
            }
            i++
            tokens.push({ kind: 'string', text })
            continue
        }
        const word = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(code.slice(i))
        if (word) { tokens.push({ kind: 'word', text: word[0] }); i += word[0].length }
        else tokens.push({ kind: 'symbol', text: code[i++] })
    }
    return tokens
}

function collectLua(code: string, defined: NameSet, used: NameSet, scanText: (text: string) => void) {
    const tokens = luaTokens(code)
    const blocks: { type: string; awaitingDo?: boolean }[] = []
    const locals = new Set<string>()
    let tableDepth = 0
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (token.kind === 'string') { scanText(token.text); continue }
        if (token.kind !== 'word') {
            if (token.text === '{') tableDepth++
            if (token.text === '}') tableDepth--
            continue
        }
        const t = token.text
        const previous = tokens[i - 1]?.text
        if (blocks.length === 0 && t === 'local') {
            let j = i + 1
            if (tokens[j]?.text === 'function') j++
            while (tokens[j]?.kind === 'word') {
                locals.add(tokens[j].text)
                if (tokens[j + 1]?.text !== ',') break
                j += 2
            }
        }
        if (blocks.length === 0 && tableDepth === 0 && t === 'function' && previous !== 'local'
            && tokens[i + 1]?.kind === 'word' && tokens[i + 2]?.text === '(' && !locals.has(tokens[i + 1].text)) {
            defined.buttons.add(tokens[i + 1].text)
        }
        if (blocks.length === 0 && tableDepth === 0 && previous !== '.' && previous !== ':' && !locals.has(t)
            && tokens[i + 1]?.text === '=' && tokens[i + 2]?.text === 'function') defined.buttons.add(t)
        if (['getChatVar', 'setChatVar', 'setChatVarChanged', 'getLoreBooks', 'getLoreBooksMain'].includes(t)
            && previous !== '.' && previous !== ':' && tokens[i + 1]?.text === '(') {
            // The second argument must be a literal; commas in the ID expression do not separate arguments.
            let depth = 0, argument = 0
            const second: LuaToken[] = []
            for (let j = i + 2; j < tokens.length; j++) {
                const next = tokens[j]
                if (next.kind === 'symbol') {
                    if (next.text === ')' && depth === 0) break
                    if (next.text === ',' && depth === 0) { argument++; if (argument > 1) break; continue }
                    if (['(', '[', '{'].includes(next.text)) depth++
                    if ([')', ']', '}'].includes(next.text)) depth--
                }
                if (argument === 1) second.push(next)
            }
            if (second.length === 1 && second[0].kind === 'string') {
                const name = second[0].text
                if (t.startsWith('getLoreBooks')) addName(used.loreNames, name)
                else {
                    addName(used.variables, name)
                    if (t.startsWith('set')) addName(defined.variables, name)
                }
            }
        }
        if (['function', 'if', 'for', 'while', 'repeat'].includes(t)) blocks.push({ type: t, awaitingDo: t === 'for' || t === 'while' })
        else if (t === 'do') {
            const last = blocks[blocks.length - 1]
            if (last?.awaitingDo) last.awaitingDo = false
            else blocks.push({ type: t })
        } else if (t === 'end' || t === 'until') blocks.pop()
    }
}

function collectCss(css: string, defined: NameSet, used: NameSet) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of clean.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) defined.keyframes.add(match[1])
    for (const match of clean.matchAll(/(?:^|[{};])\s*([^{};]+)(?=\{)/g)) {
        if (match[1].trim().startsWith('@')) continue
        const selector = match[1].replace(/\[[^\]]*\]/g, '').replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g, '')
        for (const name of selector.matchAll(/[.#][\p{L}_-][\p{L}\p{N}_-]*/gu)) defined.css.add(name[0])
    }
    // Quoted declaration contents (URLs, generated text) are not selectors or properties.
    const declarations = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g, '""')
    for (const match of declarations.matchAll(/(?:^|[;{])\s*(--[\w-]+)\s*:/g)) defined.cssVars.add(match[1])
    for (const match of declarations.matchAll(/var\(\s*(--[\w-]+)/g)) used.cssVars.add(match[1])
    const keywords = new Set(['none', 'initial', 'inherit', 'unset', 'revert', 'infinite', 'normal', 'reverse', 'alternate', 'alternate-reverse', 'forwards', 'backwards', 'both', 'running', 'paused', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'important'])
    for (const match of declarations.matchAll(/(?:^|[;{])\s*(?:-webkit-)?animation(?:-name)?\s*:\s*([^;}]+)/g)) {
        const value = match[1].replace(/[\w-]+\([^)]*\)/g, '').replace(/(?:^|[\s,])(?:\d*\.)?\d+(?:ms|s)?(?=[\s,]|$)/g, ' ')
        for (const name of value.matchAll(/[a-zA-Z_][\w-]*/g)) if (!keywords.has(name[0])) used.keyframes.add(name[0])
    }
}

/** CSS names include their selector prefix (.class / #id); custom properties retain --. */
export function collectNames(parts: Part[]): { defined: NameSet; used: NameSet } {
    const defined = emptyNames(), used = emptyNames()
    const scanText = (text: string) => {
        for (const match of text.matchAll(/\{\{\s*(getvar|setvar|addvar)\s*::\s*([^{}:]+)(?=::|\}\})/gi)) {
            addName(used.variables, match[2])
            if (match[1].toLowerCase() !== 'getvar') addName(defined.variables, match[2])
        }
        for (const match of text.matchAll(/\brisu-(?:trigger|btn)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) addName(used.buttons, match[1] ?? match[2])
        for (const match of text.matchAll(/\{\{button::[^{}]*?::([^{}:]+)\}\}/gi)) addName(used.buttons, match[1])
        for (const match of text.matchAll(/@@inject_lore[ \t]+([^\r\n]+)/g)) addName(used.loreNames, match[1])
        for (const match of text.matchAll(/\{\{(?:raw|image|img|emotion|audio|video|asset)::([^{}:]+)\}\}/gi)) addName(used.assets, match[1])
        for (const match of text.matchAll(/<[^>]+>/g)) {
            for (const attribute of match[0].matchAll(/\b(class|id)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
                const value = attribute[2] ?? attribute[3]
                if (attribute[1].toLowerCase() === 'class') {
                    for (const name of value.split(/\s+/)) if (name) used.css.add(`.${name}`)
                } else if (value.trim()) addName(used.css, `#${value}`)
            }
            for (const variable of match[0].matchAll(/var\(\s*(--[\w-]+)/g)) used.cssVars.add(variable[1])
        }
        for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) collectCss(match[1], defined, used)
    }
    const walk = (value: unknown) => {
        if (typeof value === 'string') scanText(value)
        else if (Array.isArray(value)) value.forEach(walk)
        else if (value && typeof value === 'object') {
            const node = value as Record<string, unknown>
            if (node.type === 'triggerlua' && typeof node.code === 'string') {
                collectLua(node.code, defined, used, scanText)
                return
            }
            if (node.type === 'var' || node.type === 'setvar' || node.type === 'v2SetVar') {
                if (typeof node.var === 'string' && !node.var.includes('{{')) {
                    addName(used.variables, node.var)
                    if (node.type !== 'var') addName(defined.variables, node.var)
                }
            }
            if (node.targetType === 'var' && typeof node.target === 'string') addName(used.variables, node.target)
            if (node.valueType === 'var' && typeof node.value === 'string') addName(used.variables, node.value)
            if (node.type === 'runtrigger' && typeof node.value === 'string') addName(used.buttons, node.value)
            if (node.type === 'v2RunTrigger' && typeof node.target === 'string') addName(used.buttons, node.target)
            Object.values(node).forEach(walk)
        }
    }
    for (const part of parts) {
        const node = part.value as Record<string, unknown> | null
        if (part.kind === 'variable' && typeof part.value === 'string') {
            const match = /^\s*([^#=\s][^=]*)=/.exec(part.value)
            if (match) addName(defined.variables, match[1])
        }
        if ((part.kind === 'asset' || part.kind === 'emotion') && Array.isArray(part.value)) addName(defined.assets, String(part.value[0]))
        if (part.kind === 'lore' && typeof node?.comment === 'string') addName(defined.loreNames, node.comment)
        if ((part.kind === 'trigger' || part.kind === 'luaTrigger') && node?.type === 'manual' && typeof node.comment === 'string') addName(defined.buttons, node.comment)
        if (part.kind === 'luaTrigger' && typeof part.value === 'string') collectLua(part.value, defined, used, scanText)
        else {
            walk(part.value)
            if (part.kind === 'css' && typeof part.value === 'string' && !/<[a-z]/i.test(part.value)) collectCss(part.value, defined, used)
        }
    }
    return { defined, used }
}
