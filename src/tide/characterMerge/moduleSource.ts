import { sanitizeCardValue, type CardFields } from '../characterUpdate'
import type { RisuModule } from '../process/modules'
import { splitParts } from './parts'
import type { MergeInput, Part } from './types'

export type ModuleAttachment = 'none' | 'bot' | 'global'
export interface ModuleSourceOptions {
    db?: { modules: Pick<RisuModule, 'id' | 'namespace'>[]; enabledModules?: string[] }
    detachModuleAfter?: boolean
}

export class ModuleAssetsLoadingError extends Error {
    constructor() { super('Module assets could not be loaded'); this.name = 'ModuleAssetsLoadingError' }
}

export function assertModuleAssetsLoaded(module: RisuModule): void {
    if (module.assetManifest && !Array.isArray(module.assets)) throw new ModuleAssetsLoadingError()
}

/** Re-reading the v3 subset retries host hydration without treating unavailable assets as empty. */
export async function loadModuleSnapshot(load: () => Promise<{ modules?: RisuModule[]; enabledModules?: string[] } | null | undefined>, moduleId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise(resolve => setTimeout(resolve, attempt * 250))
        const db = await load(), module = db?.modules?.find(m => m.id === moduleId)
        if (!module) return null
        if (!module.assetManifest || Array.isArray(module.assets)) return { db: { modules: db!.modules!, enabledModules: db!.enabledModules }, module }
    }
    throw new ModuleAssetsLoadingError()
}

export function isModuleMaterial(part: Part): boolean {
    return ['lore', 'regex', 'trigger', 'luaTrigger', 'asset'].includes(part.kind) || part.kind === 'css' && !!String(part.value ?? '').trim()
}

/** Adapt material only; module description and namespace are source metadata. */
export function moduleToMergeInput(module: RisuModule): MergeInput {
    assertModuleAssetsLoaded(module)
    const card: CardFields = {}
    for (const [from, to] of [
        ['lorebook', 'globalLore'], ['regex', 'customscript'], ['trigger', 'triggerscript'],
        ['assets', 'additionalAssets'], ['backgroundEmbedding', 'backgroundHTML'], ['lowLevelAccess', 'lowLevelAccess'],
    ] as const) if (module[from] !== undefined) card[to] = sanitizeCardValue(module[from])
    const id = `module:${module.id}`
    return { card, meta: { id, kind: 'module', moduleId: module.id, name: module.name, short: '', ascii: '', description: module.description, namespace: module.namespace, license: (module as RisuModule & { license?: string }).license }, parts: splitParts(id, card) }
}

/** Global activation takes precedence: detaching a bot cannot disable it. */
export function moduleAttachment(target: CardFields, db: NonNullable<ModuleSourceOptions['db']>, moduleId: string): ModuleAttachment {
    const namespace = db.modules.find(m => m.id === moduleId)?.namespace
    const matches = (ids: unknown) => Array.isArray(ids) && ids.some(id => id === moduleId || !!namespace && id === namespace)
    if (matches(db.enabledModules)) return 'global'
    return matches(target.modules) ? 'bot' : 'none'
}
