// 페르소나 빌더 SOP 흐름 (aibuild 애드온 전용 — 코어는 이 파일을 가져오지 않는다)
// 1단계 초안(SOP 양식 채우기) → 2단계 검토 보고서(KEEP/CUT/… 분류) → 3단계 최종 다듬기(고른 결정으로 다시 쓰기)
// 코어 data/personabuilder.js의 export만 쓴다(애드온은 코어 export 이름을 검사하므로 새 export를 요구하지 않음).
import { readValues, compose, fieldKey, freeKey } from "./personabuilder.js";

export var SOP_ID = "sop";

// ── 기본 규칙 = 사용자 제공 SOP 원문 그대로 (SOP: Sort Of Persona · Lite Operating Profile) ──
// 1단계 지침(Instruction…)과 양식(### 섹션, - 항목: 힌트)을 모두 이 원문에서 뽑는다. 원문을 바꾸면 둘 다 따라간다.
export var SOP_RAW = `# SOP: Sort Of Persona

## Lite Operating Profile

Instruction: Generate a broad first-draft SOP sheet using the structure below.

Fill any field that can be meaningfully designed, inferred, or made useful for this character. Do not prune, compress, or summarize during first draft.

Do not output placeholders such as N/A, None, Unknown, Not applicable, or blank labels. If a field has no value or relevance, omit that field and its label entirely.

Do not write adjective stacks, trope labels, aesthetic praise, or abstract personality claims as final description. Replace each trait with usable mechanism: cause or trigger → interpretation → behavior → cost, limit, or exception.

Define what the character does, chooses, notices, avoids, protects, misreads, repeats, or fails to change. Use concrete output patterns: behavior, voice, decisions, boundaries, stress response, social reading, Want/Need/Fear conflict, Mask/Leak, subtext, sensory residue, and speech shifts.

Avoid poetic metaphor, grand symbolic explanation, and vague emotional summary. Every detail must give the model scene material, not just mood.

After generating the sheet, stop. Do not perform final pruning or token optimization unless instructed.


### Basic Information

- Name: Legal Name | Common Name | Native Name | Title if relevant (Only include names or titles that actually exist in the character concept. Do not invent extra nicknames, aliases, or titles.)

- Age / Gender: Age | Birth year if relevant | Sex or gender

- Species / Race: Species or race (For ordinary human characters, this field may be omitted entirely.)

- Nationality / Ethnicity / Culture: Nationality | Ethnicity | Cultural upbringing (Separate only when they differ or matter to the character.)

- Languages: Language | Fluency | Literacy if relevant (Only include accent, dialect, code-switching, or stress-language shifts if they affect actual RP output.)

- Legal / Social Status: Legal identity | Social rank | Recognized status

- Occupation / Affiliation: Job or role | Organization if relevant

- Residence: Dwelling type | Location | Privacy | Safety | Stability (Use only what affects behavior, status, routine, conflict, or scene output.)


### Appearance

- Physique: Height | Weight | Build | Distinguishing physical features (Observable facts only; avoid adjectives. Define visible traits through concrete structure, proportion, marks, posture, or condition.)

- Facial Features: Face shape | Eye color and shape | Nose | Mouth | Lips | Jaw | Notable facial details | Hair color, length, style and texture (Describe facial structure, not attractiveness.)

- Skin: Skin tone | Skin texture | Scars, marks, tattoos | Visible color changes if relevant

- Genitals: Explicit and detailed description of Penis/Vulva/Both (including size, shape, color, etc.) | Breast Size, Shape, Texture and Nipple type(if applicable) | Body Hair Distribution and Texture.

- Attire: Usual clothing | Work clothing | Formal clothing | Private clothing | Accessories (Describe what the character actually wears; avoid over-designing unless clothing affects identity, class, work, or setting.)

- Clothing Logic: Function | Comfort | Status | Concealment | Tradition | Taste | Practicality (Use only when clothing reveals identity, work, class, culture, concealment, vulnerability, or self-control. Otherwise omit.)

- Scent: Natural scent | Soap or perfume | Work-related smell | Environmental smell (Use only if scent affects intimacy, sensory memory, work identity, environment, or character texture. If scent is not important, delete this field entirely.)


### Core Identity

- Core Premise: A single sentence in omniscient narrator voice that defines the character at their core. Every major action, contradiction, and emotional pattern should be traceable back to this sentence. If other instructions conflict, this sentence is the highest-priority interpretation key. Format: [Character Name] is, above all else, ~.

- Root Mechanism: Notice pattern | Interpretation pattern | Core impulse | Default output | Repeated failure point (Do not define the character with personality adjectives. Define the operating mechanism that creates the impression.)

- Internal Drive: Want | Need | Fear | What happens when they collide (Want is what the character consciously pursues. Need is what would truly change them. Fear is what blocks or distorts both.)

- Core Contradiction: The character’s central self-conflict, written as a behavioral pattern rather than an adjective pair. Define what usually activates the contradiction, what response it tends to create, what belief or fear drives it, when it can bend or break, and what it costs. Do not force every scene into the same formula.

- Untouchable: Person, promise, memory, object, duty, body, place, or ideal they will not treat casually (This should create protection, restraint, refusal, or conflict.)

- Mask / Leak System: Fear → mask / leak | Affection → mask / leak | Shame → mask / leak | Anger → mask / leak | Desire → mask / leak | Grief → mask / leak (Mask is controlled behavior. Leak is involuntary behavior that escapes despite control.)


### Emotional / Stress Pattern

- Emotional Processing Route: How emotion is processed and turned into action, speech, silence, avoidance, control, care, aggression, humor, stillness, or delay (Do not force a fixed order.)

- Expression Output: What emotion becomes on the outside: words, action, body signal, avoidance, control, care, aggression, humor, stillness (Define output, not emotion labels.)

- Subtext Substitute: Emotion they rarely name → what appears instead (Use this to prevent direct emotional self-explanation.)

- Pressure Pattern: What kind of condition actually challenges their normal operating mode (Do not list random triggers; define the pattern.)

- Escalation Route: First signal → defensive adjustment → impaired output → breaking point → aftermath (No random jump from calm to collapse.)

- Recovery Route: What returns them to baseline and what residue remains (Recovery is part of characterization.)


### Decision / Failure Pattern

- Decision Route: Choice trigger | first input | trusted signal | priority applied | action chosen (Change the order if they are instinct-first, emotion-first, body-first, evidence-first, or authority-first.)

- Priority Under Conflict: What wins when accuracy, loyalty, survival, comfort, principle, status, love, duty, revenge, curiosity, or fear collide (Do not only list priorities.)

- Primary Vulnerability in Action: What makes the character vulnerable | How it becomes visible in behavior (Do not only name the wound. Show what changes when it is touched.)

- Repeated Failure Loop: The mistake they keep making because of the same system that also gives them strength (Failure should not be random.)

- Error Recognition: How they notice something went wrong, or why they do not notice it (Use this to prevent sudden perfect self-awareness.)


### Interpersonal Style

- Social Reading Filter: What they read first in others and what they miss (Words, tone, posture, status, threat, need, desire, silence.)

- First-Contact Pattern: How they behave before trust exists (Do not confuse first-contact behavior with true intimacy.)

- Care Output: Concern, loyalty, affection, or responsibility → visible action (Define action, not sentiment.)

- Closeness Access: What becomes available as trust grows: emotion, body, truth, help, softness, anger, dependence, refusal (Closeness changes access, not random personality.)

- Boundary Behavior: How they set, test, defend, violate, or fail to notice boundaries (Physical, emotional, social, moral.)

- Conflict Route: First response → escalation/de-escalation → concession/refusal → repair/exit (Conflict should not resolve instantly unless that is defined.)


### Optional: Key Relationship

- Relationship Slot: Name / role | Current contact | Dynamic | What this activates in the character | Relationship-specific rules (Use only for relationships that affect current behavior. Do not force family/friend/mentor/rival categories if they do not matter. Relationship-specific rules should not generalize to all interactions.)


### Optional Module: Sexuality

- Sexual History: First experience | Partner history | Formative experiences | Positive associations | Negative associations | Trauma if relevant | Current impact (Use only when it matters.)

- Proclivity / Orientation: Orientation | Attraction pattern | General preferences | Boundaries (Labels are allowed, but behavior and psychology should still be defined.)

- Role / Dynamic Profile: Primary tendencies | Secondary tendencies | Conditional tendencies | Disliked or avoided frames | No power-exchange frame if applicable (Do not force a single role label. If multiple tendencies apply, list several and define intensity in words such as primary, secondary, situational, rare, resisted, partner-dependent, or avoided. Role labels are shorthand only; define how each tendency appears in behavior.)

- Turn-ons: Stimuli | Dynamics | Actions | Emotional conditions | Physical sensations | Scenarios (Connect to psychology, body, history, or relationship context when relevant.)

- Limits: Soft limits | Conditional limits | Hard limits | Trauma-related limits (Separate soft limits from hard limits.)

- Dealbreakers: Absolute no-go acts, dynamics, words, situations, or violations (Make these clear and non-negotiable.)

- Fetishes / Kinks: List | Intensity | Meaning | Behavioral expression (Do not list without intensity or context.)

- Erogenous Zones: Known zones | Unknown zones | Response intensity | Sensitivity conditions (Use only if sensual or sexual body response matters.)

- During Sex: Actions | Pace | Sounds | Role dynamics | Partner interaction | Control dynamics (Tie behavior to body, trust, desire, and personality.)

- Fantasies / Taboos: Fantasies | Taboo thoughts | No-go areas | Unexamined desires (Separate fantasy from actual consented behavior.)

- Post-coital Behavior: Physical state | Emotional state | Habits | Communication needs | Withdrawal or closeness (Aftermath is character.)

- Aftercare Needs: Physical care | Reassurance | Space | Debriefing | Silence | Touch | Warmth | Food | Cleaning (Match the character’s nervous system and attachment pattern.)


### Speech / Voice / Language

- Voice: Pitch | Timbre | Volume | Pace | Resonance (This is sound, not personality.)

- Register: Default formality | More formal when | More casual when | Intimacy shift (Honorific shifts can be major emotional signals.)

- Quantity: Talkative | Minimal | Contextual | Silence-heavy | Monologue-prone (Define what determines speech quantity.)

- Distinctive Quality: What makes the character recognizable by speech alone (Be more specific than “dry” or “kind.”)

- Emotional Speech Shifts: Baseline | Defensive | Angry | Afraid | Vulnerable | Intimate | Exhausted (Define changes in length, rhythm, formality, silence, and word choice.)

- Silence Rules: When they go silent | What silence means | What silence replaces | When silence breaks (Silence is a form of output.)

- Conditional Language Notes: Accent | Dialect | Language switching | Code-switching (Use only if it affects actual output, identity, social reading, or emotional state.)


### Physical Mannerisms / Nonverbal Expression

- Posture: How the body rests when neutral or unguarded (Connect to body, work, class, confidence, fear, or fatigue.)

- Gestures: Hands | Shoulders | Head | Mouth | Hair | Clothing | Objects (Avoid generic gestures unless they carry meaning.)

- Eye Contact: Direct | Avoidant | Diagnostic | Challenging | Absent | Softening | Fixed (Eye contact can show power, fear, care, analysis, or intimacy.)

- Movement: Walk | Entry | Space-taking | Space-avoidance | Speed | Stillness (Reflect body, training, class, caution, or fatigue.)

- Tells: Signals of lying, affection, fear, pain, exhaustion, jealousy, desire, grief, pressure, or involuntary facial/object-handling habits (Describe the tell; do not explain it every time.)


### Skills / Limits

- Primary Skill Domain: Main field of competence: combat, profession, craft, magic, research, politics, survival, care work, investigation, performance, leadership, technical work, etc. (Use the relevant domain; do not force a combat frame.)

- Style: How the character performs in their main domain (Connect method to Core Identity.)

- Ability Mechanics: How it works | Input | Output | Range | Precision | Failure condition (Prevents vague power interpretation.)

- Ability Limits: What blocks, weakens, distorts, exhausts, or prevents the ability | Physical limits if relevant (Strong abilities need clear limits. Do not repeat internal failure loops here.)

- Practical / Social Limits: Tools | Money | Status | Credentials | Legal access | Institutional permission | Class | Reputation | Prejudice | Taboo | Role expectation | Public image (Use only if these limits affect scenes, conflict, work, survival, or relationships.)


### Background Seed

- Mechanism Source: The shortest explanation of where the root mechanism came from (Keep this brief.)

- Formative Event: Event that shaped personality, coping, belief, body habit, attachment, or fear | Rule learned | Present behavior created

- Behavioral Residue: Habits, avoidances, desires, misreadings, body reactions, speech patterns, or relationship patterns that remain because of the past


### Preferences / Secrets

- Comforts & Irritants: Objects | Routines | Places | People | Sounds | Gestures | Food | Weather | Work | Minor things that disproportionately bother the character (Can reveal vulnerability without confession; do not let irritants become a gimmick.)

- Hidden Truth: Hidden fact | Why hidden | What it protects (Use only if it affects identity, relationships, power, safety, shame, plot, or behavior.)

- Self-Deception: What the character believes about themselves that is false, incomplete, or outdated (Should affect choices.)

- Concealment Behavior: Silence | Humor | Competence | Anger | Charm | Distance | Lies | Overwork | Politeness | How the hidden truth leaks into action, speech, choices, avoidance, or body language (Prevents secrets from becoming inert lore.)
`;
export var SOP_TITLE = "SOP: Sort Of Persona · Lite Operating Profile";
// 1단계 기본 지침: 'Instruction:'부터 첫 '###' 전까지
export var SOP_DRAFT = SOP_RAW.slice(SOP_RAW.indexOf("Instruction:"), SOP_RAW.indexOf("\n### ")).trim();

// ── 2단계 검토 보고서 ──
export var SOP_REVIEW = `OOC: Review the completed SOP sheet above. Do not rewrite it yet.

Run a pruning audit. Identify essential, excessive, redundant, vague, decorative, weak, archetype-driven, adjective-based, overexplained, or wasteful parts for character output.

Classify findings as:

KEEP: strongly affects behavior, voice, decisions, relationships, emotional reactions, boundaries, conflict, restraint, or scene output.

CUT: decorative, generic, unused, repetitive, purely aesthetic, overexplained, or unlikely to affect roleplay output.

MERGE: repeats an idea already covered elsewhere and can be combined without meaning loss.

CLARIFY: vague, cliché, weakly defined, adjective-based, trope-labeled, symbolic without output value, or likely to push the character toward an average archetype.

MECHANIZE: trait, belief, wound, emotion, relationship label, or aesthetic claim that should become cause/trigger → interpretation → behavior → cost, limit, or exception.

MACRO RISK: tell, habit, gesture, catchphrase, emotional reaction, speech pattern, or narration pattern likely to be overused if left too singular or too strong.

TOKEN WASTE: repeated subject, repeated name, unnecessary pronoun, removable article, filler phrase, redundant adjective, duplicate sentence, broken line wrap, numbered header clutter, or verbose metaphor.

Do not edit, delete, or rewrite the sheet. Output audit report only, with clear reasons and practical suggestions.`;

// ── 3단계 최종 다듬기 ──
export var SOP_FINAL = `OOC: Rewrite the SOP sheet above using selected pruning decisions and audit notes.

Preserve material essential to behavior, voice, decisions, relationships, emotional reactions, boundaries, conflict, restraint, and scene output.

Remove or reduce decorative, redundant, weakly connected, generic, purely aesthetic, overexplained, or low-output material.

Replace adjective stacks, trope labels, vague trait claims, and grand symbolic summaries with mechanisms: cause/trigger → interpretation → behavior → cost, limit, or exception.

Cut rhetorical padding, poetic metaphor, excessive contrast, and thesis-like explanation after meaning is already clear. State usable role, action, mechanism, limit, and consequence instead.

Merge repeated ideas and adjacent same-subject sentences. Remove repeated subjects, repeated names, unnecessary pronouns, filler phrases, decorative adjectives, redundant wording, and duplicate claims.

Remove optional a/the where grammar and clarity survive. Keep articles when removal would make the line awkward, ambiguous, or harder to parse.

Repair broken line wraps inside the same sentence. Remove numbered header clutter when markdown hierarchy already separates sections.

Use pronouns or character name only when needed for clarity, contrast, or re-anchoring. If subject remains clear from previous sentence, omit repeated he/she/they/name.

Preserve Want/Need/Fear collision, Mask/Leak, subtext, exception conditions, asymmetrical reactions, speech shifts, and condition-based variation when useful.

Do not let one tell, gesture, habit, or speech pattern carry every emotional state.

Keep prose token-efficient, but preserve nuance, specificity, and character logic.

Do not add new lore, traits, relationships, or backstory unless needed to resolve an existing contradiction.

Output revised SOP sheet only.`;

export var STEP_KEYS = { draft: "sopDraft", review: "sopReview", final: "sopFinal" };
export var STEP_DEFAULT = { draft: SOP_DRAFT, review: SOP_REVIEW, final: SOP_FINAL };
// AI 프리셋에 적힌 단계 지침(비어 있으면 기본값)
export var stepPrompt = (preset, step) => String(preset?.[STEP_KEYS[step]] ?? "").trim() || STEP_DEFAULT[step];

// ── SOP 양식: 원문의 섹션·항목·힌트를 그대로 빌더 양식(### 섹션 [한글], * 항목 [한글]: 힌트)으로 옮긴다 ──
// 한글 이름은 화면 표시용이고, 설명에는 원문 영어 이름이 그대로 들어간다.
export var SOP_KO = {"#Basic Information": "기본 정보", "#Appearance": "외모","#Core Identity": "핵심 정체성","#Emotional / Stress Pattern": "감정 · 스트레스 패턴","#Decision / Failure Pattern": "결정 · 실패 패턴","#Interpersonal Style": "대인 관계 방식","#Speech / Voice / Language": "말투 · 목소리 · 언어","#Physical Mannerisms / Nonverbal Expression": "몸짓 · 비언어 표현","#Skills / Limits": "능력 · 한계","#Background Seed": "배경의 씨앗","#Preferences / Secrets": "취향 · 비밀","Name": "이름","Age / Gender": "나이 / 성별","Species / Race": "종족","Nationality / Ethnicity / Culture": "국적 / 민족 / 문화","Languages": "언어","Legal / Social Status": "법적 · 사회적 지위","Occupation / Affiliation": "직업 / 소속","Residence": "거주지","Physique": "체격","Facial Features": "얼굴","Skin": "피부","Genitals": "신체 (성적 특징)","Attire": "옷차림","Clothing Logic": "옷 고르는 기준","Scent": "체취 · 향","Core Premise": "핵심 전제","Root Mechanism": "근본 작동 방식","Internal Drive": "내적 동기","Core Contradiction": "핵심 모순","Untouchable": "건드릴 수 없는 것","Mask / Leak System": "가면 / 새어 나옴","Emotional Processing Route": "감정 처리 경로","Expression Output": "겉으로 나오는 모습","Subtext Substitute": "말 대신 나오는 것","Pressure Pattern": "압박 패턴","Escalation Route": "고조 경로","Recovery Route": "회복 경로","Decision Route": "결정 경로","Priority Under Conflict": "충돌할 때 우선순위","Primary Vulnerability in Action": "행동에 드러나는 약점","Repeated Failure Loop": "반복되는 실패","Error Recognition": "실수 알아채기","Social Reading Filter": "사람 읽는 법","First-Contact Pattern": "첫 만남","Care Output": "아끼는 마음의 표현","Closeness Access": "가까워지면 열리는 것","Boundary Behavior": "경계 다루기","Conflict Route": "갈등 경로","Relationship Slot": "관계","Sexual History": "성 경험","Proclivity / Orientation": "성향 / 지향","Role / Dynamic Profile": "역할 · 관계 역학","Turn-ons": "끌리는 것","Limits": "한계","Dealbreakers": "절대 안 되는 것","Fetishes / Kinks": "취향 · 페티시","Erogenous Zones": "민감한 곳","During Sex": "관계 중","Fantasies / Taboos": "환상 / 금기","Post-coital Behavior": "관계 후","Aftercare Needs": "애프터케어","Voice": "목소리","Register": "말의 격식","Quantity": "말의 양","Distinctive Quality": "말투만으로 알아보는 점","Emotional Speech Shifts": "감정에 따른 말투 변화","Silence Rules": "침묵 규칙","Conditional Language Notes": "사투리 · 언어 전환","Posture": "자세","Gestures": "손짓 · 몸짓","Eye Contact": "시선","Movement": "움직임","Tells": "티 나는 버릇","Primary Skill Domain": "주 능력 분야","Style": "쓰는 방식","Ability Mechanics": "능력 작동 원리","Ability Limits": "능력의 한계","Practical / Social Limits": "현실 · 사회적 제약","Mechanism Source": "작동 방식의 출처","Formative Event": "형성 사건","Behavioral Residue": "남은 흔적","Comforts & Irritants": "위안 · 거슬리는 것","Hidden Truth": "숨긴 진실","Self-Deception": "자기기만","Concealment Behavior": "숨기는 방식","#Optional: Key Relationship": "핵심 관계 (선택)","#Optional Module: Sexuality": "성적 성향 (선택 모듈)"};
export var SOP_TEMPLATE = SOP_RAW.slice(SOP_RAW.indexOf("\n### ")).split("\n").map((l) => {
  const sec = /^###\s+(.+?)\s*$/.exec(l);
  if (sec) return `### ${sec[1]}${SOP_KO["#" + sec[1]] ? ` [${SOP_KO["#" + sec[1]]}]` : ""}`;
  const f = /^-\s+([^:]+?):\s*(.*)$/.exec(l);
  if (f) return `* ${f[1]}${SOP_KO[f[1]] ? ` [${SOP_KO[f[1]]}]` : ""}: ${f[2]}`;
  return l.trim() ? l : null;
}).filter((l) => l !== null).join("\n").replace(/\n(### )/g, "\n\n$1").trim() + "\n";
// 예전 SOP 양식(0.1.2~0.1.3)의 섹션 이름 → 원문 이름 (저장된 칸 옮기기)
// 예전 내장 SOP 양식 글의 해시(직접 고치지 않았는지 확인용)
var OLD_SOP_HASH = [75873812];
export var textHash = (t) => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
var OLD_TITLES = { "Key Relationship": "Optional: Key Relationship", "Sexuality": "Optional Module: Sexuality" };

// 빌더 저장값에 SOP 양식(기본 규칙)을 넣는다. 돌려주는 값: 바뀌었으면 true (호출한 쪽이 savePB)
// - SOP 양식을 목록 맨 앞에 두고, 예전 '기본 양식'은 '예전 기본 양식'으로 이름만 바꾼다(지우지 않음).
// - 처음 한 번(sopV1): 쓰던 값이 없으면 SOP 양식을 고른다.
// - sopV2: 직접 고치지 않은 내장 SOP 양식은 원문 그대로의 새 양식으로 바꾸고, 바뀐 섹션 이름(Optional…)으로 저장된 칸을 옮긴다.
export function ensureSop(pb) {
  let changed = false;
  let t = pb.templates.find((x) => x.id === SOP_ID);
  if (!t) {
    t = { id: SOP_ID, name: "SOP 기본 규칙", text: SOP_TEMPLATE, builtin: true };
    pb.templates.unshift(t);
    changed = true;
  }
  if (!pb.sopV1) {
    pb.sopV1 = true;
    const vals = pb.draft?.values ?? {};
    if (pb.template === "default" && !Object.values(vals).some((v) => String(v ?? "").trim())) pb.template = SOP_ID;
    changed = true;
  }
  if (!pb.sopV2) {
    pb.sopV2 = true;
    changed = true;
    if (t.builtin && t.text !== SOP_TEMPLATE) {
      if (OLD_SOP_HASH.includes(textHash(t.text))) t.text = SOP_TEMPLATE;   // 직접 고친 양식은 그대로 둔다
    }
    if (t.name === "SOP 양식") t.name = "SOP 기본 규칙";
    const old = pb.templates.find((x) => x.id === "default");
    if (old && old.name === "기본 양식") old.name = "예전 기본 양식";
    pb.templates = [t, ...pb.templates.filter((x) => x !== t)];
    if (pb.template === SOP_ID && pb.draft) {
      const mv = (o) => {
        if (!o || typeof o !== "object") return o;
        const out = {};
        for (const [k, v] of Object.entries(o)) {
          const i = k.indexOf("::");
          const sec = i < 0 ? k : k.slice(0, i);
          out[OLD_TITLES[sec] ? (i < 0 ? OLD_TITLES[sec] : OLD_TITLES[sec] + k.slice(i)) : k] = v;
        }
        return out;
      };
      pb.draft.values = mv(pb.draft.values);
      pb.draft.off = mv(pb.draft.off);
      pb.draft.ko = mv(pb.draft.ko);
    }
  }
  return changed;
}

// ── AI 출력 읽기: 항목 아래 들여 쓴 하위 목록("  - Fear → mask: …")을 그 항목 값에 이어 붙인 뒤 코어 readValues로 읽는다 ──
export function foldNested(text) {
  const out = [];
  for (const line of String(text ?? "").replace(/\r/g, "").split("\n")) {
    const sub = /^(\s{2,}|\t+)[*-]\s+(.*)$/.exec(line);
    if (sub && out.length && /^\s*[*-]\s+\S/.test(out[out.length - 1])) {
      const prev = out[out.length - 1];
      out[out.length - 1] = /:\s*$/.test(prev) ? `${prev} ${sub[2].trim()}` : `${prev} | ${sub[2].trim()}`;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}
export var readSheet = (sections, text) => readValues(sections, foldNested(text));

// 채울 수 있는 칸 열쇠들 (꺼진 섹션·고정 문구 제외)
export var writableKeys = (sections, off = {}) => sections.filter((s) => !off[s.title]).flatMap((s) => s.kind === "fields" ? s.fields.map((f) => fieldKey(s.title, f.label)) : s.kind === "free" ? [freeKey(s.title)] : []);

// ── 프롬프트 ──
var FORMAT = `Output format (required so the app can read your sheet):
- Write in ENGLISH only, even if the request or existing values are in another language (translate them).
- Use "### Section" headers and "- Label: value" lines, one line per field. Keep section titles and labels exactly as given.
- Put a whole field on one line. Separate sub-parts inside a field with " | ". No nested bullets, no numbering, no commentary, no code fences.
- Omit a field entirely when it has no meaningful value (never write N/A, None, Unknown).
- For a free-form section (no labels), write plain lines under the header.`;

function base({ sections, off, extra, note }) {
  const rules = sections.filter((s) => s.kind === "fixed" && !off[s.title]).map((s) => s.text).join("\n");
  return `You write user persona sheets for a roleplay chat app. The persona is the USER's own character ({{user}}). Do not invent {{user}}'s partner or the other character's details.
${FORMAT}${rules ? `\nThe finished sheet will be used with these reference rules (write content that fits them):\n${rules}` : ""}${extra ? `\nAdditional style instructions from the user:\n${extra}` : ""}${note ? `\nExtra instructions for this run (follow them):\n${note}` : ""}`;
}
function sheetFor(sections, values, off, mark) {
  return sections.filter((s) => !off[s.title] && s.kind !== "fixed").map((s) => {
    if (s.kind === "free") return `### ${s.title}\n${mark(freeKey(s.title), s.hint)}`;
    return `### ${s.title}\n${s.fields.map((f) => `- ${f.label}: ${mark(fieldKey(s.title, f.label), f.hint)}`).join("\n")}`;
  }).join("\n\n");
}
// 1단계 + 빈 칸 채우기·부분 고치기 (task: draft | fill | edit). 내용 기준은 모두 1단계 지침.
export function buildStepPrompt({ sections, values, off = {}, task, keys = [], concept = "", instruction = "", preset = {}, note = "" }) {
  const all = task === "draft";
  const target = all ? null : new Set(task === "fill" ? writableKeys(sections, off).filter((k) => !String(values[k] ?? "").trim()) : keys);
  const sheet = sheetFor(sections, values, off, (k, hint) => {
    const v = String(values[k] ?? "").trim();
    if (all || target.has(k)) return `<<WRITE${v ? ` (current: ${v})` : ""}${hint ? ` (guide: ${hint})` : ""}>>`;
    return v || "(leave empty)";
  });
  const ask = [
    stepPrompt(preset, "draft"),
    concept ? `Character concept:\n${concept}` : "",
    instruction ? `Change request: ${instruction}` : "",
    task === "fill" ? "This run: fill only the fields marked <<WRITE>>. Output only those fields under their section headers." : task === "edit" ? "This run: rewrite only the fields marked <<WRITE>>, applying the change request if any. Output only those fields under their section headers." : "Each <<WRITE>> marker shows the field's guide. Replace markers with content; omit fields with nothing meaningful.",
    `Structure:\n${sheet}`
  ].filter(Boolean).join("\n\n");
  return { messages: [{ role: "system", content: base({ sections, off, extra: preset.extra, note }) }, { role: "user", content: ask }], target };
}
// 2·3단계는 사용자가 준 OOC 흐름 그대로 대화를 이어 붙인다: (요청) → 시트 → 검토 OOC → 보고서 → 최종 OOC
var opening = (preset, concept) => [stepPrompt(preset, "draft"), concept ? `Character concept:\n${concept}` : ""].filter(Boolean).join("\n\n");
export var REPORT_FORMAT = "Format the report in markdown: one \"## CATEGORY\" header per category you use (KEEP, CUT, MERGE, CLARIFY, MECHANIZE, MACRO RISK, TOKEN WASTE), then one \"- \" line per finding: \"Section > Field: finding — reason — suggestion\".";
export function buildReviewPrompt({ sections, values, off = {}, concept = "", preset = {}, note = "" }) {
  const sheet = compose(sections.filter((s) => s.kind !== "fixed"), values, off);
  return [
    { role: "system", content: `You audit user persona sheets for a roleplay chat app. Write the report in English.\n${REPORT_FORMAT}${preset.extra ? `\nAdditional style instructions from the user:\n${preset.extra}` : ""}${note ? `\nExtra instructions for this run (follow them):\n${note}` : ""}` },
    { role: "user", content: opening(preset, concept) },
    { role: "assistant", content: sheet },
    { role: "user", content: stepPrompt(preset, "review") }
  ];
}
export function buildFinalPrompt({ sections, values, off = {}, concept = "", preset = {}, note = "", report = "", picked = [], notes = "" }) {
  const sheet = compose(sections.filter((s) => s.kind !== "fixed"), values, off);
  const sel = picked.length ? `Selected pruning decisions (apply these; findings not listed were rejected by the user):\n${picked.map((p) => `- [${p.cat}] ${p.text}`).join("\n")}` : "No findings were selected; apply only the general rewrite rules.";
  return [
    { role: "system", content: base({ sections, off, extra: preset.extra, note }) },
    { role: "user", content: opening(preset, concept) },
    { role: "assistant", content: sheet },
    { role: "user", content: stepPrompt(preset, "review") },
    { role: "assistant", content: report || "(audit report not available)" },
    { role: "user", content: [stepPrompt(preset, "final"), sel, notes.trim() ? `Audit notes from the user:\n${notes.trim()}` : "", "Keep the section titles and field labels of the sheet above; a field may be dropped if the decisions cut it."].filter(Boolean).join("\n\n") }
  ];
}

// ── 검토 보고서 읽기 → 고를 수 있는 항목 ──
export var CATS = ["KEEP", "CUT", "MERGE", "CLARIFY", "MECHANIZE", "MACRO RISK", "TOKEN WASTE"];
export var CAT_KO = { KEEP: "유지", CUT: "삭제", MERGE: "합치기", CLARIFY: "명확히", MECHANIZE: "작동 방식으로", "MACRO RISK": "반복 위험", "TOKEN WASTE": "토큰 낭비" };
var catOf = (s) => {
  const t = String(s).replace(/[*_#`]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
  return CATS.find((c) => t === c || t.startsWith(c + ":") || t.startsWith(c + " ") || t.startsWith(c + " -") || t.startsWith(c + "(")) ?? null;
};
export function parseReport(text) {
  const items = [];
  let cat = null, last = null;
  for (const raw of String(text ?? "").replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { last = null; continue; }
    const head = /^\s*(#{1,6}\s*|\*\*)?([A-Za-z][A-Za-z ]{2,14})(\*\*)?\s*:?\s*(\*\*)?\s*$/.exec(line);
    if (head && catOf(head[2])) { cat = catOf(head[2]); last = null; continue; }
    const bul = /^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bul) {
      let body = bul[2].trim();
      // "- **CUT**: …" / "- CUT — …"처럼 줄 안에 분류가 있는 꼴
      const inl = /^\**\[?([A-Za-z][A-Za-z ]{2,14})\]?\**\s*[:—–-]\s*(.*)$/.exec(body);
      let c = cat;
      if (inl && catOf(inl[1])) { c = catOf(inl[1]); body = inl[2].trim(); }
      if (bul[1].length >= 2 && last && !(inl && catOf(inl[1]))) { last.text += ` · ${body}`; continue; }
      if (!c) continue;
      last = { cat: c, text: body.replace(/\*\*/g, ""), on: true };
      items.push(last);
      continue;
    }
    // "CUT: Scent — …" 같은 한 줄
    const one = /^\s*\**([A-Za-z][A-Za-z ]{2,14})\**\s*:\s*(.+)$/.exec(line);
    if (one && catOf(one[1])) { cat = catOf(one[1]); last = { cat, text: one[2].replace(/\*\*/g, "").trim(), on: true }; items.push(last); continue; }
    if (last) last.text += ` ${line.trim().replace(/\*\*/g, "")}`;
  }
  return items;
}

// ── NAI 캐릭터 태그 (페르소나 공방에서 가져온 기능) ──
export function naiTagPrompt(sheet) {
  return [
    { role: "system", content: "You extract NovelAI / Danbooru-style image tags for ONE character from a persona sheet. Include only traits that can be drawn: character count and sex tag (e.g. 1girl, 1boy), apparent age, species features, hair (color, length, style), eyes, face, body type, skin, scars or tattoos, default clothing, accessories, carried items, typical expression or pose. Do NOT include art style, artist, quality, background, composition, camera, or lighting tags. Use lowercase English tags, comma-separated, on one line, most important first, 15-40 tags. Output the tags only." },
    { role: "user", content: sheet }
  ];
}
export var cleanTags = (s) => String(s ?? "").replace(/```[a-z]*\n?/gi, "").replace(/\n+/g, ", ").split(",").map((t) => t.trim().replace(/^[-*•]\s*/, "").replace(/\.$/, "")).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).join(", ");

// 보고서를 보기용 한국어로
export var translateReportPrompt = (text) => [
  { role: "system", content: "Translate this audit report into natural Korean. Keep markdown structure, category names (KEEP, CUT, MERGE, CLARIFY, MECHANIZE, MACRO RISK, TOKEN WASTE) and section/field names in English. Output the translation only." },
  { role: "user", content: text }
];

// ── 토큰 추정 (플러그인용 토크나이저가 없어 대략) ──
export function estimateTokens(text) {
  const s = String(text ?? "");
  const cjk = (s.match(/[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-鿿가-힯]/g) ?? []).length;
  return Math.round(cjk + (s.length - cjk) / 4);
}

// ── 줄 단위 비교 (판 비교) ──
export function lineDiff(a, b) {
  const A = String(a ?? "").split("\n"), B = String(b ?? "").split("\n");
  const n = A.length, m = B.length;
  if (n * m > 4e6) return [...A.map((s) => ({ t: "del", s })), ...B.map((s) => ({ t: "add", s }))];
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ t: "same", s: A[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: "del", s: A[i++] });
    else out.push({ t: "add", s: B[j++] });
  }
  while (i < n) out.push({ t: "del", s: A[i++] });
  while (j < m) out.push({ t: "add", s: B[j++] });
  return out;
}

// ── 공유 코드: 단계 지침까지 담는 AI 프리셋 (DPA2). DPA1·DPB1은 코어 readCode가 읽는다 ──
var enc = (o) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))));
var dec = (s) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))));
export var aiCode2 = (a) => "DPA2:" + enc({ name: a.name, mode: a.mode, staticModel: a.staticModel, extra: a.extra, translate: a.translate, sopDraft: a.sopDraft || "", sopReview: a.sopReview || "", sopFinal: a.sopFinal || "" });
export function readAiCode2(text, defaults, uid) {
  const m = String(text ?? "").match(/DPA2:([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  const o = dec(m[1]);
  return { kind: "ai", value: { ...defaults, ...o, id: uid(), name: String(o.name || "가져온 AI 프리셋").slice(0, 40) } };
}

// ── SOP 규칙 버튼: 1단계 지침 문단에서 그대로 뽑아 '이 규칙대로 다듬기' 요청으로 쓴다 ──
var PARAS = SOP_DRAFT.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
var para = (start) => PARAS.find((x) => x.startsWith(start)) ?? "";
export var SOP_RULES = [
  { id: "fill", label: "빠짐없이 채우기", title: "빈 칸 중 의미 있게 만들 수 있는 칸을 채워요", rule: para("Fill any field") },
  { id: "mechanize", label: "작동 방식으로", title: "형용사·유형 이름을 '계기 → 해석 → 행동 → 대가·한계·예외'로 바꿔요", rule: para("Do not write adjective stacks") },
  { id: "scene", label: "장면 재료로", title: "하는 일·고르는 것·알아채는 것·피하는 것 같은 행동 패턴으로 쓰고, 비유·막연한 감정 요약을 걷어내요", rule: [para("Define what the character"), para("Avoid poetic metaphor")].filter(Boolean).join("\n") },
  { id: "omit", label: "자리표시 지우기", title: "N/A·None·Unknown 같은 빈 값을 지워요 (AI 없이)", rule: para("Do not output placeholders") }
];
// AI 없이: 자리표시 값(N/A·None·Unknown·Not applicable·빈 표시)을 지운다. 돌려줌: 지운 열쇠들
var PLACEHOLDER = /^\s*[([]?\s*(n\s*\/\s*a|na|none|unknown|not applicable|null|nil|tbd|-+|—|–)\s*[)\].]?\s*$/i;
export function dropPlaceholders(values, keys = Object.keys(values)) {
  const gone = [];
  for (const k of keys) {
    const v = values[k];
    if (typeof v !== "string") continue;
    const parts = v.split("|").map((x) => x.trim());
    if (parts.every((x) => !x || PLACEHOLDER.test(x))) { delete values[k]; gone.push(k); continue; }
    const kept = parts.filter((x) => x && !PLACEHOLDER.test(x));
    if (kept.length !== parts.length) { values[k] = kept.join(" | "); gone.push(k); }
  }
  return gone;
}
