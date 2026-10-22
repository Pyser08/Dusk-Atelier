// Creator-defined onboarding is card content. Question IDs identify controls,
// not user answers (which remain in chat state); host-generated IDs and default
// values must not turn an otherwise identical card round trip into an edit.
export function normalizeCardOnboarding(raw: unknown, newId: () => string = () => ''): Record<string, any> | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    const data = raw as Record<string, any>, str = (value: unknown) => typeof value === 'string' ? value : ''
    return {
        ...data, enabled: data.enabled === true, mode: data.mode === 'html' ? 'html' : 'form',
        title: str(data.title), description: str(data.description), html: str(data.html), floatingButton: data.floatingButton === true,
        questions: (Array.isArray(data.questions) ? data.questions : []).filter(q => q && typeof q === 'object' && !Array.isArray(q)).map(q => ({
            ...q, id: str(q.id) || newId(), title: str(q.title), description: str(q.description),
            type: q.type === 'multiple' || q.type === 'text' ? q.type : 'single', varName: str(q.varName),
            required: q.required === true, placeholder: str(q.placeholder),
            options: (Array.isArray(q.options) ? q.options : []).filter(o => o && typeof o === 'object' && !Array.isArray(o)).map(o => ({ ...o, label: str(o.label), value: str(o.value) })),
        })),
    }
}
export function onboardingContent(raw: unknown): unknown {
    const normalized = normalizeCardOnboarding(raw)
    if (!normalized) return null
    return { ...normalized, questions: normalized.questions.map(({ id: _id, ...question }: Record<string, unknown>) => question) }
}
