// 출처: risupot 2.3.0 src/director-facts.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

export const DIRECTOR_HANDOFF_LANGUAGE_CONTROL = 'Write final note, uncertainties and planning_notes text in concise English. Preserve person names, aliases, honorifics, forms of address and direct quotations verbatim in their source language, including Korean; do not romanize or translate them. Explain speech patterns and relationships in English. This runtime handoff-language rule overrides older template output-language directions. It does not change the language of Main RP or stored Wiki records.';
const DIRECTOR_KNOWLEDGE_RULE = 'Do not have a character mention or act on a secret or fact they have not witnessed, learned, or otherwise demonstrably known. Never invent how they acquired information. Keep facts, beliefs, guesses, and misunderstandings distinct. Missing Wiki data does not prove ignorance: actual evidence in the Main conversation may establish knowledge.';
export const DIRECTOR_FACTS_PROMPT = `# Director · Factual handoff
Read only the supplied current input, recent dialogue, Character records, People profiles, relationship state, and enabled memory references. Return a compact factual reference for Main in English, preserving source names, forms of address and direct quotations verbatim.
Include relevant established relationships, target-specific speech, current facts, secrets, who knows what, and uncertainties. Preserve each knowledge owner and the distinction between fact and belief. Include relevant hidden information for reference without granting every character knowledge of it.
Do not propose dialogue, emotions, next actions, scene beats, plot developments, staging, or desired outcomes. Do not perform additional historical searches. If evidence is insufficient, say it is unconfirmed; do not fill gaps.
${DIRECTOR_KNOWLEDGE_RULE}
Return the supplied JSON final-output contract. note contains factual reference and knowledge restrictions only. planning_notes and completed_checks must be empty arrays. used_refs must cite supplied references. No tool calls or need_context response.`;
export function directorMainControl(role = 'directing') {
  const purpose = role === 'facts'
    ? 'Use the following as factual reference, not a scene plan. Write natural RP with dialogue, action, and narration grounded in these facts and the current request; do not merely list the reference. Choose the scene development yourself within established evidence and character agency.'
    : 'Use this scene guidance together with higher-priority instructions and the current User request.';
  return `${purpose} ${DIRECTOR_KNOWLEDGE_RULE} Keep the RP's established or explicitly requested output language; English reference text does not change it. Do not expose this note verbatim.`;
}
