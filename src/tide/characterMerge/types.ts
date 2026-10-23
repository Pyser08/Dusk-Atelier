import type { CardFields } from '../characterUpdate'
import type { Unit } from '../characterUpdateMerge'

export type SourceId = string
export type PartKind = 'lore' | 'loreFolder' | 'regex' | 'trigger' | 'luaTrigger' | 'css' | 'variable' | 'asset' | 'emotion' | 'greeting' | 'textField' | 'imageGenSetting' | 'loreSettings' | 'extension'
export interface Part { sourceId: SourceId; kind: PartKind; key: string; value: unknown; hash: string }
export interface NameSet { css: Set<string>; cssVars: Set<string>; keyframes: Set<string>; variables: Set<string>; buttons: Set<string>; loreNames: Set<string>; assets: Set<string> }
export interface Rename { sourceId: SourceId; space: keyof NameSet; from: string; to: string }
export type RoleKind = 'status' | 'imageDisplay' | 'imageGen' | 'events' | 'firstMessage' | 'other'
export interface RoleGroup { kind: RoleKind; members: Record<SourceId, string[] /*part keys*/>; default: SourceId | 'both'; label?: string }
export interface Warning { kind: 'globalCss' | 'assetFuzzy' | 'loreTokens' | 'globalRegex' | 'crossLua' | 'unbundledLua' | 'globalModule' | 'floatingUI'; detail: string }
export interface FloatingUI { sourceId: SourceId; selector: string; position: string; horizontal: 'left' | 'right' | 'center'; vertical: 'top' | 'bottom' | 'middle'; inset: number; width: number; height: number }
export interface FloatingConflict { a: FloatingUI; b: FloatingUI }
export interface SourceMeta { id: SourceId; name: string; short: string; ascii: string; realmId?: string; chaId?: string; kind?: 'module'; moduleId?: string; description?: string; namespace?: string; license?: string }
export interface MergeInput { card: CardFields; meta: SourceMeta; parts: Part[] }
export interface MergePlan { sources: SourceMeta[]; renames: Rename[]; roles: RoleGroup[]; composites: CompositeSpec[]; parts: Part[]; warnings: Warning[]; needsLowLevel: boolean; name: string; floatingConflicts?: FloatingConflict[]; detachModuleAfter?: boolean; detachModuleExplicit?: boolean; moduleMaterial?: Part[]; moduleLinkMembers?: Record<string, string[]>; moduleAttachments?: { moduleId: string; namespace?: string; attachment: 'none' | 'bot' | 'global' }[] }
export interface MergeChoices { roles: Record<number /*roles array index*/, SourceId | 'both'>; composites: CompositeChoices; edits: Record<string /*part key*/, string>; lowLevel: boolean; name: string; moveFloatingUI?: boolean; exclude?: string[]; itemEdits?: Record<string /*part key*/, unknown> }
export type CompositeField = 'luaTrigger' | 'backgroundHTML' | 'desc' | 'replaceGlobalNote' | 'systemPrompt' | 'exampleMessage' | 'defaultVariables' | 'loreSettings' | `ext:${string}`
export interface CompositeSpec { field: CompositeField; syntax: 'text' | 'html' | 'lua' | 'kv' | 'json'; blocks: { blockId: string /* = sourceId, or `${sourceId}#${triggerIndex}` for Lua */; sourceId: SourceId; body: string }[] }
export type CompositeChoices = Partial<Record<CompositeField, { included: string[] /* blockIds */; finalText?: string }>>
export interface Provenance {
    version: 1
    sources: { id: SourceId; kind?: 'import' | 'module'; moduleId?: string; importMode?: boolean; shortName: string; ascii: string; name: string; realmId?: string; cardHash: string; partHashes: Record<string, string>; renames: Rename[]; excluded: string[]; roleChoices: Record<string, string> }[]
    composites: Partial<Record<CompositeField, { order: string[] /* blockIds */; jsonValues?: Record<string /* blockId */, unknown> }>>
}
export type ChangeKind = 'added' | 'changed' | 'removed'
export interface ReviewRow { id: string; unit: Unit; label: string; change: ChangeKind; apply: boolean; warnMine: boolean; composite?: CompositeField; current?: unknown; incoming?: unknown; mineDiff?: Hunk[]; mineDiffFallback?: boolean }
export interface ReviewModel { imageProtection?: import('./sourceImages').ImageProtectionGroup[]; mode: 'update' | 'partial' | 'merge'; summary: Record<ChangeKind, Partial<Record<Unit, number>>>; rows: ReviewRow[]; untouchedMine: ReviewRow[]; roles?: RoleGroup[]; autoFixed?: Rename[]; warnings?: Warning[] }
export interface Hunk { before: string[]; mine: string[]; contextBefore: string[]; contextAfter: string[] }
