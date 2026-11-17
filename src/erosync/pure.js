// addon-rebuild 4단계: Erosync 엔진에서 떼어 낸 순수 조각(상수·값 정리·자료 변환·제공자 요청 모양 등).
// 엔진 상태(저장소·api·실행 중 상태)를 쓰지 않는 것만 원본 erosync.js 순서·글자 그대로 옮겼다(tools 없이 eslint-scope로 자동 판정).
// 고칠 때는 이 파일을 고친다. 주제별로 더 나누는 건 다음 조각에서.
// 나눈 파일도 여기서 함께 내보낸다(엔진·시험은 pure.js 하나만 불러온다).
import { clampInt, clampNumber, fnv1a, isPlainObject, latestStringList, normalizeStringList, safeClone, truncate } from "./pure-util.js";
import { BEHIND_KEY_PREFIX, EXTERNAL_CONTEXT_MAX_ITEMS, MAX_ACTIONS_PER_TURN, PAIR_CONTACT_LIMIT, normalizeContentMode, relationChangePlanningSettings } from "./pure-config.js";
import { PAIR_CONTACT_SUMMARY, accumulatedRelationChange, entityDisplayName, relationKey } from "./pure-relation.js";
import { resolveRoleProfile, risupotRecordText } from "./pure-provider.js";
import { isAssetMaidInternalLore } from "./pure-source.js";
import { CYCLE_AFFECT_TYPES, CYCLE_CAUSES, CYCLE_CLINICAL_LEVELS, CYCLE_DISCLOSURES, CYCLE_EVENT_SYMPTOM_DEFAULTS, CYCLE_METHODS, CYCLE_NURSING, CYCLE_PREMENSTRUAL_TYPES, CYCLE_RESUME_DAYS, CYCLE_SYMPTOM_DEFAULTS, CYCLE_TIMING_TYPES, CYCLE_TRANSITIONS, cycleHash, cycleIntentLevel, cycleResumeTableKey, cycleSeededDays, cycleStartShift } from "./pure-cycle.js";
import { isNonActingMainProfile, normalizeGenderIdentity, normalizeGoalPlan, normalizeSexualTarget, sexualTargetPlanningSettings } from "./pure-profile.js";
import { normalizeKocoRefs, stripKocoArtifacts } from "./pure-koco.js";
import { chatMessageText, commitContentHash } from "./pure-session.js";

export const MAX_PROFILE_CHARACTERS = 2000;

export function mapGeneration(map, key) {
  return clampInt(map.get(String(key || '')) || 0, 0, 0, 1000000000);
}

export function staleLifecycleError(stage = 'background task') {
  const error = new Error(`stale ${stage} discarded after reset or unload`);
  error.code = 'EROSYNC_STALE_LIFECYCLE';
  return error;
}

export function isStaleLifecycleError(error) {
  return String(error?.code || '').startsWith('EROSYNC_STALE_')
    || error?.code === 'EROSYNC_RISU_PREEMPTED';
}

export function scheduleUiRefresh(delay = 80) { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export function uiWorkSchedule() { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export function pairContactForDirector(state, candidateIds, policy = null) {
  const allowed = new Set([...(Array.isArray(candidateIds) ? candidateIds : []), 'user']);
  const sfw = policy?.contentMode === 'sfw';
  const turnIndex = clampInt(state?.turnIndex, 0, 0, 100000000);
  const pairs = [];
  const seen = new Set();
  const push = (actor, target) => {
    if (!actor || !target || actor === target || actor === 'user' || !allowed.has(actor) || !allowed.has(target)) return;
    const key = relationKey(actor, target);
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([actor, target]);
  };
  if (!sfw) {
    Object.values(isPlainObject(state?.sexualTargets) ? state.sexualTargets : {})
      .filter(item => isPlainObject(item)).sort((a, b) => clampInt(b.desire, 0, 0, 100) - clampInt(a.desire, 0, 0, 100))
      .forEach(item => push(item.actor, item.target));
  }
  Object.values(isPlainObject(state?.goals) ? state.goals : {})
    .filter(goal => isPlainObject(goal) && !['complete', 'abandon'].includes(goal.status)).sort((a, b) => clampInt(b.priority, 50, 0, 100) - clampInt(a.priority, 50, 0, 100))
    .forEach(goal => push(goal.actor, goal.target));
  const history = Array.isArray(state?.interactionHistory) ? state.interactionHistory : [];
  const ledgers = isPlainObject(state?.interactionLedger) ? state.interactionLedger : {};
  const count = value => clampInt(value, 0, 0, 100000000);
  const rows = pairs.slice(0, PAIR_CONTACT_LIMIT).map(([actor, target]) => {
    const ledger = isPlainObject(ledgers[relationKey(actor, target)]) ? ledgers[relationKey(actor, target)] : null;
    let lastActual = null;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const event = history[index];
      if (!isPlainObject(event) || event.type !== 'observed_action' || !['executed', 'partially_executed'].includes(String(event.result || ''))) continue;
      const forward = event.actor === actor && event.target === target;
      const reverse = event.actor === target && event.target === actor;
      if (!forward && !reverse) continue;
      const turn = count(event.turn);
      lastActual = { turn, turnsAgo: Math.max(0, turnIndex - turn), by: String(event.actor), mode: String(event.mode || ''), summary: truncate(event.summary, PAIR_CONTACT_SUMMARY) };
      break;
    }
    if (!lastActual && ledger && count(ledger.lastActualTurn) > 0) {
      const turn = count(ledger.lastActualTurn);
      lastActual = { turn, turnsAgo: Math.max(0, turnIndex - turn), by: actor, mode: '' };
    }
    return {
      actor, target,
      firstTurn: ledger ? count(ledger.firstTurn) : 0,
      lastActual,
      ran: ledger ? count(ledger.actualCount) : 0,
      partly: ledger ? count(ledger.partialCount) : 0,
      notRun: ledger ? count(ledger.detailOnlyCount) : 0,
    };
  });
  return sfwDirectorView(rows, policy);
}

export function normalizeLoreSelection(value) {
  const raw = isPlainObject(value) ? value : {}, seen = new Set();
  // solo: the user keeps this source apart from other sources with the same activation keys.
  const selectedEntries = (Array.isArray(raw.selectedEntries) ? raw.selectedEntries : []).filter(isPlainObject).slice(0, MAX_PROFILE_CHARACTERS).map(entry => ({
    id: truncate(entry.id, 180), hash: truncate(entry.hash, 100), title: truncate(entry.title, 240), ...(entry.solo === true ? { solo: true } : {}),
  })).filter(entry => entry.id && !seen.has(entry.id) && seen.add(entry.id));
  return { schemaVersion: 1, revision: clampInt(raw.revision, 0, 0, 1000000000), selectedEntries };
}

export function normalizeSelectedLoreProfile(value) {
  if (!isPlainObject(value)) return null;
  return { entries: normalizeLoreSelection({ selectedEntries: value.entries }).selectedEntries.map(({ id, hash }) => ({ id, hash })) };
}

export function selectedLoreSelectionKey(value) {
  return fnv1a(JSON.stringify(normalizeLoreSelection(value).selectedEntries.map(entry => entry.id).sort()));
}

// 봇별 극단 행동 수위 · SFW/NSFW · NSFW+ · 재검사 (0.8.6). 기본값은 0.8.5와 같은 동작이다.
export const EXTREMITY_LIMITS = Object.freeze({
  off: { cap: null, label: '사용 안 함' },
  // 화면 이름은 정의학의 극단성 구간 이름과 맞춘다. 키와 상한값(저장값)은 그대로다.
  moderate: { cap: 20, label: '대화 안에서만' },
  pressure: { cap: 40, label: '비물리적 압박까지' },
  indirect: { cap: 60, label: '위협·통제·경미한 손실까지' },
  direct: { cap: 80, label: '폭력·감금·강압까지' },
  unlimited: { cap: 100, label: '제한 없음' },
});

export const EXTREMITY_LIMIT_KEYS = Object.freeze(Object.keys(EXTREMITY_LIMITS));

export function normalizeExtremityLimit(value) {
  return Object.prototype.hasOwnProperty.call(EXTREMITY_LIMITS, value) ? value : 'unlimited';
}

// 장면 판단 AI와 지시문에 무엇을 보낼지 정하는 봇 단위 정책. NSFW+는 NSFW이고 수위가 제한 없음일 때만 유효하다.
export function contentPolicyFor(botOverride) {
  const contentMode = normalizeContentMode(botOverride?.contentMode);
  const extremityLimit = normalizeExtremityLimit(botOverride?.extremityLimit);
  const nsfwPlus = contentMode === 'nsfw' && extremityLimit === 'unlimited' && botOverride?.nsfwPlus === true;
  return {
    contentMode,
    extremityLimit,
    extremityCap: EXTREMITY_LIMITS[extremityLimit].cap,
    nsfwPlus,
    recheck: nsfwPlus && botOverride?.nsfwPlusRecheck === true,
    tag: contentMode === 'sfw' ? 'SFW' : nsfwPlus ? 'NSFW+' : 'NSFW',
  };
}

// SFW에서는 행동 모드 이름을 농담/다가가기로 주고받고 저장할 때는 기존 키로 되돌린다.
export const SFW_MODE_OUT = Object.freeze({ sexual_humor: 'humor', seduce: 'approach' });

export const SFW_MODE_IN = Object.freeze({ humor: 'sexual_humor', approach: 'seduce' });

export function storedModeKey(value) {
  const text = String(value || '');
  return SFW_MODE_IN[text] || text;
}

export function directorModeName(value, policy) {
  const text = String(value || '');
  return policy?.contentMode === 'sfw' ? SFW_MODE_OUT[text] || text : text;
}

export function sfwDirectorView(value, policy, depth = 0) {
  if (policy?.contentMode !== 'sfw' || depth > 8) return value;
  if (Array.isArray(value)) return value.map(item => sfwDirectorView(item, policy, depth + 1));
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = key === 'mode' && typeof item === 'string' ? directorModeName(item, policy) : sfwDirectorView(item, policy, depth + 1);
  return result;
}

export function globalContentFields(value) {
  if (!isPlainObject(value)) return null;
  const out = {};
  if ('contentMode' in value) out.contentMode = normalizeContentMode(value.contentMode);
  if ('extremityLimit' in value) out.extremityLimit = normalizeExtremityLimit(value.extremityLimit);
  if ('nsfwPlus' in value) out.nsfwPlus = value.nsfwPlus === true;
  if ('nsfwPlusRecheck' in value) out.nsfwPlusRecheck = value.nsfwPlusRecheck === true;
  return Object.keys(out).length ? out : null;
}

// Adapted from the user-supplied text-to-pdf.ts (SHA-256 6E55654F).
// Lazy scope: unavailable browser PDF primitives cannot break the default text path.
export async function createGeminiInputPdf(text) {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const DEFAULT_FONT_SIZE = 1;
  const DEFAULT_MARGIN = 0;
  const GLYPH_WIDTH = 0.5;
  const encoder = new TextEncoder();
  
  function bytes(value        )             {
      return encoder.encode(value);
  }
  
  function concat(chunks              )             {
      const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
      const result = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
      }
      return result;
  }
  
  function pdfNumber(value        )         {
      return Number(value.toFixed(6)).toString();
  }
  
  function calculatePageGrid(fontSize        , margin        )                                    {
      if (!Number.isFinite(fontSize) || fontSize <= 0) {
          throw new RangeError("fontSize must be a positive finite number");
      }
      if (!Number.isFinite(margin) || margin < 0) {
          throw new RangeError("margin must be a non-negative finite number");
      }
  
      const columns = Math.floor((PAGE_WIDTH - margin * 2) / (fontSize * GLYPH_WIDTH));
      const rows = Math.floor((PAGE_HEIGHT - margin * 2) / fontSize);
      if (columns < 1 || rows < 1) {
          throw new RangeError("fontSize and margin leave no usable page area");
      }
      return { columns, rows };
  }
  
  function hex(value        )         {
      return value.toString(16).toUpperCase().padStart(4, "0");
  }
  
  function unicodeHex(value        )         {
      return [...value]
          .map((character) => {
              const codePoint = character.codePointAt(0) ;
              if (codePoint <= 0xff_ff) return hex(codePoint);
              const supplementary = codePoint - 0x1_00_00;
              return hex(0xd8_00 + (supplementary >> 10)) + hex(0xdc_00 + (supplementary & 0x03_ff));
          })
          .join("");
  }
  
  function wrapText(text        , columns        )             {
      const lines           = [];
      for (const hardLine of text.replaceAll(/\r\n?/g, "\n").split("\n")) {
          const characters = [...hardLine];
          if (characters.length === 0) {
              lines.push("");
              continue;
          }
          for (let index = 0; index < characters.length; index += columns) {
              lines.push(characters.slice(index, index + columns).join(""));
          }
      }
      return lines.map((line) => [...line]);
  }
  
  function isRtlCharacter(character        )          {
      const codePoint = character.codePointAt(0) ;
      return (
          (codePoint >= 0x05_90 && codePoint <= 0x08_ff) ||
          (codePoint >= 0xfb_1d && codePoint <= 0xfd_ff) ||
          (codePoint >= 0xfe_70 && codePoint <= 0xfe_ff) ||
          (codePoint >= 0x1_08_00 && codePoint <= 0x1_0f_ff) ||
          (codePoint >= 0x1_e8_00 && codePoint <= 0x1_ef_ff)
      );
  }
  
  // PDF text operators do not apply bidirectional layout. Reversing strong RTL runs for display lets
  // ToUnicode-aware extractors reconstruct their original logical order without embedding a font.
  function visualOrder(line          )           {
      const clusters             = [];
      for (const character of line) {
          if (/\p{Mark}/u.test(character) && clusters.length > 0) clusters.at(-1) .push(character);
          else clusters.push([character]);
      }
  
      const visual           = [];
      for (let index = 0; index < clusters.length;) {
          if (!isRtlCharacter(clusters[index][0])) {
              visual.push(...clusters[index]);
              index += 1;
              continue;
          }
          let end = index + 1;
          while (end < clusters.length && isRtlCharacter(clusters[end][0])) end += 1;
          for (let cursor = end - 1; cursor >= index; cursor--) visual.push(...clusters[cursor]);
          index = end;
      }
      return visual;
  }
  
  function createCharacterMap(lines            )                      {
      const characters = new Map                ();
      for (const line of lines) {
          for (const character of line) {
              if (characters.has(character)) continue;
              if (characters.size === 65_535) {
                  throw new RangeError("A PDF can contain at most 65,535 distinct characters");
              }
              characters.set(character, characters.size + 1);
          }
      }
      return characters;
  }
  
  function createToUnicodeCMap(characters                     )             {
      const entries = Array.from(characters, ([character, cid]) => `<${hex(cid)}><${unicodeHex(character)}>`);
      const mappings           = [];
      for (let index = 0; index < entries.length; index += 100) {
          const chunk = entries.slice(index, index + 100);
          mappings.push(`${chunk.length} beginbfchar\n${chunk.join("\n")}\nendbfchar`);
      }
  
      return bytes(
          [
              "/CIDInit /ProcSet findresource begin",
              "12 dict begin",
              "begincmap",
              "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
              "/CMapName /PMUnicode-UCS def",
              "/CMapType 2 def",
              "1 begincodespacerange",
              "<0000><FFFF>",
              "endcodespacerange",
              ...mappings,
              "endcmap",
              "CMapName currentdict /CMap defineresource pop",
              "end",
              "end",
          ].join("\n"),
      );
  }
  
  function createPageContent(
      lines            ,
      characters                     ,
      fontSize        ,
      margin        ,
  )             {
      const commands = [
          "BT",
          `/F0 ${pdfNumber(fontSize)} Tf`,
          `${pdfNumber(fontSize)} TL`,
          `1 0 0 1 ${pdfNumber(margin)} ${pdfNumber(PAGE_HEIGHT - margin - fontSize)} Tm`,
      ];
      for (const [index, line] of lines.entries()) {
          const encoded = visualOrder(line)
              .map((character) => hex(characters.get(character) ))
              .join("");
          commands.push(`<${encoded}> Tj`);
          if (index < lines.length - 1) commands.push("T*");
      }
      commands.push("ET");
      return bytes(commands.join("\n"));
  }
  
  async function streamObject(data            )                      {
      const compressed = new Uint8Array(
          await new Response(
              new Blob([data            ]).stream().pipeThrough(new CompressionStream("deflate")),
          ).arrayBuffer(),
      );
      return concat([
          bytes(`<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`),
          compressed,
          bytes("\nendstream"),
      ]);
  }
  
  function serialize(objects              )             {
      const chunks = [concat([bytes("%PDF-1.7\n%"), new Uint8Array([255, 255, 255, 255]), bytes("\n")])];
      const offsets = [0];
      let length = chunks[0].length;
  
      for (const [index, object] of objects.entries()) {
          offsets.push(length);
          const serialized = concat([bytes(`${index + 1} 0 obj\n`), object, bytes("\nendobj\n")]);
          chunks.push(serialized);
          length += serialized.length;
      }
  
      const xrefOffset = length;
      const xref = [
          `xref\n0 ${objects.length + 1}`,
          "0000000000 65535 f ",
          ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
          "trailer",
          `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
          "startxref",
          String(xrefOffset),
          "%%EOF",
      ].join("\n");
      chunks.push(bytes(`${xref}\n`));
      return concat(chunks);
  }
  
  async function textToPdf(text        , options                   = {})                {
      const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
      const margin = options.margin ?? DEFAULT_MARGIN;
      const { columns, rows } = calculatePageGrid(fontSize, margin);
  
      const lines = wrapText(text, columns);
      const pages               = [];
      for (let index = 0; index < lines.length; index += rows) {
          pages.push(lines.slice(index, index + rows));
          if (pages.length > 1000) throw new RangeError("PDF page limit exceeded");
      }
      const characters = createCharacterMap(lines);
  
      const firstPageObject = 7;
      const pageIds = pages.map((_, index) => firstPageObject + index * 2);
      const objects               = [
          bytes("<< /Type /Catalog /Pages 2 0 R >>"),
          bytes(
              `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F0 3 0 R >> >> >>`,
          ),
          bytes(
              "<< /Type /Font /Subtype /Type0 /BaseFont /PMUnicode /Encoding /Identity-H /DescendantFonts [4 0 R] /ToUnicode 6 0 R >>",
          ),
          bytes(
              "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /PMUnicode /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 5 0 R /DW 500 /CIDToGIDMap /Identity >>",
          ),
          bytes(
              "<< /Type /FontDescriptor /FontName /PMUnicode /Flags 4 /FontBBox [0 -200 1000 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /MissingWidth 500 >>",
          ),
          await streamObject(createToUnicodeCMap(characters)),
      ];
  
      for (const [index, page] of pages.entries()) {
          const pageId = pageIds[index];
          const contentId = pageId + 1;
          objects.push(
              bytes(`<< /Type /Page /Parent 2 0 R /Contents ${contentId} 0 R >>`),
              await streamObject(createPageContent(page, characters, fontSize, margin)),
          );
      }
  
      const pdf = serialize(objects);
      return new Blob([pdf            ], { type: "application/pdf" });
  }
  return textToPdf(text);
}

export function promptPolicyFor(branch) {
  return branch === 'sfw' ? { contentMode: 'sfw', nsfwPlus: false } : { contentMode: 'nsfw', nsfwPlus: branch === 'plus' };
}

export function promptBranchOf(policy) {
  return policy?.contentMode === 'sfw' ? 'sfw' : policy?.nsfwPlus === true ? 'plus' : 'nsfw';
}

// 자료 자리 채우기: 줄마다 {{이름}}을 값으로 바꾸고, 자리만 있고 값이 전부 빈 줄은 뺀다.
export function promptFill(template, values) {
  return String(template || '').split('\n').map(line => {
    let used = 0, filled = 0;
    const output = line.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      used += 1;
      const value = values?.[key];
      if (value === undefined || value === null || String(value) === '') return '';
      filled += 1;
      return String(value);
    });
    return used && !filled ? null : output;
  }).filter(line => line !== null).join('\n');
}

// ---------- 축 호출 나누기 (2026-10-22, 출력 한도) ----------
// 1단계 답이 길어지면(판단 의무) 네 사람분 여덟 축은 프로필 역할의 기본 출력 한도(5,000토큰)를 넘겨 잘리고, 잘린 JSON은 축 단계 실패로 끝나
// 프로필이 "축 미분석"으로 저장된다. 그래서 여덟 축 호출은 두 사람까지만 묶고, 성적 축 넷·동기 유형은 같은 자료로 바로 이어 따로 부른다.
export const AXIS_CALL_PEOPLE = 2;

export function axisCallChunks(group) {
  const chunks = [];
  for (let index = 0; index < group.length; index += AXIS_CALL_PEOPLE) chunks.push(group.slice(index, index + AXIS_CALL_PEOPLE));
  return chunks;
}

export function axisKoreanText(value) {
  if (typeof value === 'string') return value;
  if (!isPlainObject(value)) return '';
  for (const key of ['answerKo', 'ko', 'korean', 'kr', 'text', 'answer', 'value', 'description']) if (typeof value[key] === 'string') return value[key];
  return '';
}

// 프로필의 지금 변형에서 축 답이 들어 있는 기록들(읽기는 첫 기록, 쓰기는 영어가 같은 기록 전부).
// 고르는 순서는 materializeProfileVariant와 같다: 그 변형 → 기본 변형 → 겉 프로필.
export function axisKoreanBaseRecords(root, variantKey) {
  if (!isPlainObject(root)) return [];
  const variants = isPlainObject(root.variants) ? root.variants : {};
  const key = isPlainObject(variants[variantKey]) ? variantKey : isPlainObject(variants.default) ? 'default' : '';
  const records = [];
  if (key && isPlainObject(variants[key].baseProfile)) records.push(variants[key].baseProfile);
  if ((!key || String(root.activeVariantKey || 'default') === key) && isPlainObject(root.baseProfile)) records.push(root.baseProfile);
  return records;
}

// 한 호출에 묶는 사람 수: 분석 AI 최대 출력 토큰에 맞춘다(1명당 약 1,000토큰으로 잡음, 1~6명).
export function axisKoreanGroupSize(config) {
  const maxTokens = clampInt(resolveRoleProfile(config, 'profile').profile.maxTokens, 5000, 256, 100000);
  return Math.max(1, Math.min(6, Math.floor(maxTokens * 0.6 / 1000)));
}

// 실패 요약 한 줄("3명 실패 · 응답 형식"). 실패가 없으면 ''.
export function axisKoreanFailureText(summary) {
  return summary?.failed ? `${summary.failed}명 실패${summary.reason ? ` · ${summary.reason}` : ''}` : '';
}

export function externalLoreSource(entry, content) {
  if (isAssetMaidInternalLore(entry, content)) return 'asset_maid_storage';
  const labelText = [entry?.name, entry?.title, entry?.comment, entry?.key, ...(Array.isArray(entry?.keys) ? entry.keys : [])]
    .filter((value) => typeof value === 'string' && value.trim())
    .join('\n');
  return externalMessageSource({
    role: 'system',
    memo: labelText,
    content: `${labelText}${labelText ? '\n' : ''}${String(content || '')}`,
  });
}

export function characterIdentity(character) {
  const id = character?.chaId ?? character?.characterId ?? character?.id ?? character?.data?.id;
  const name = character?.name ?? character?.data?.name ?? character?.character?.name ?? 'current-character';
  return { id: String(id ?? name), name: String(name || 'current-character') };
}

export function scopeUnavailableError(detail = 'current chat coordinates are unavailable', cause = null) {
  const error = new Error(detail);
  error.code = 'EROSYNC_SCOPE_UNAVAILABLE';
  if (cause) error.cause = cause;
  return error;
}

export function normalizeCycleSymptoms(value, defaults) {
  const raw = isPlainObject(value) ? value : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, Math.round(clampNumber(raw[key], fallback))]));
}

export function normalizeCycleProfile(value, gender = null) {
  const raw = isPlainObject(value) ? value : {}, evidence = normalizeStringList(raw.evidence, 4, 240);
  const basis = ['explicit', 'inferred', 'rp_default', 'user'].includes(raw.basis) ? raw.basis : 'rp_default';
  const lengthDays = clampInt(raw.lengthDays, 28, 2, 366);
  const exception = raw.applicable === false && (['explicit', 'user'].includes(basis) || evidence.length > 0);
  const applicable = !exception && (raw.applicable === true || gender?.value === 'female');
  const premenstrualType = CYCLE_PREMENSTRUAL_TYPES.includes(raw.premenstrualType) ? raw.premenstrualType : 'mild';
  const clinicalLevel = CYCLE_CLINICAL_LEVELS.includes(raw.clinicalLevel) ? raw.clinicalLevel : 'physiological';
  const initialStatus = ['paused', 'waiting', 'ended'].includes(raw.initialStatus) && (basis === 'user' || evidence.length > 0) ? raw.initialStatus : 'active';
  const method = CYCLE_METHODS.includes(raw.method) ? raw.method : '';
  return { applicable, lengthDays, bleedingDays: clampInt(raw.bleedingDays, 5, 1, Math.min(30, lengthDays - 1)), lutealDays: clampInt(raw.lutealDays, 13, 10, 16),
    initialDay: clampInt(raw.initialDay, 0, 0, lengthDays),
    initialStatus,
    initialReason: truncate(raw.initialReason, 240), irregular: raw.irregular === true, aware: raw.aware === true, awareNextPeriod: raw.awareNextPeriod !== false,
    premenstrualType, clinicalLevel, affectType: CYCLE_AFFECT_TYPES.includes(raw.affectType) ? raw.affectType : 'irritable',
    // 시기에서 기분으로 바로 오는 경로는 강한 유형·PMDD·PME에만 있다.
    hormoneSensitive: raw.hormoneSensitive === true && (premenstrualType === 'strong' || ['pmdd', 'pme'].includes(clinicalLevel)),
    disclosure: CYCLE_DISCLOSURES.includes(raw.disclosure) ? raw.disclosure : 'hidden', contraception: raw.contraception === 'hormonal' || method ? 'hormonal' : 'none',
    symptoms: normalizeCycleSymptoms(raw.symptoms, CYCLE_SYMPTOM_DEFAULTS),
    basis, evidence, reason: truncate(raw.reason, 300),
    // 생리 2차: 피임 방법(방법 모름 = 알약), 폐경 이행, 시기 아형(기본 1주형), 임신 의향(원문에 있을 때만), 처음 상태의 원인·수유·경과 일수
    method, transition: CYCLE_TRANSITIONS.includes(raw.transition) ? raw.transition : '',
    timingType: CYCLE_TIMING_TYPES.includes(raw.timingType) ? raw.timingType : 'week',
    intentLevel: cycleIntentLevel(raw.intentLevel),
    initialCause: initialStatus !== 'active' && CYCLE_CAUSES.includes(raw.initialCause) ? raw.initialCause : '',
    initialNursing: CYCLE_NURSING.includes(raw.initialNursing) ? raw.initialNursing : '',
    initialElapsedDays: clampInt(raw.initialElapsedDays, 0, 0, 2000) };
}

export function normalizeCycleActor(value) {
  const raw = isPlainObject(value) ? value : {};
  const minute = number => typeof number === 'number' && Number.isFinite(number) ? clampInt(number, 0, -1000000000, 1000000000) : null;
  const base = { status: ['active', 'paused', 'waiting', 'ended'].includes(raw.status) ? raw.status : 'active', reason: truncate(raw.reason, 300),
    anchorMinute: clampInt(raw.anchorMinute, 0, -1000000000, 1000000000), initialDay: clampInt(raw.initialDay, 0, 0, 366),
    resumeAtMinute: typeof raw.resumeAtMinute === 'number' && Number.isFinite(raw.resumeAtMinute) ? clampInt(raw.resumeAtMinute, 0, 0, 1000000000) : null,
    lengthDays: clampInt(raw.lengthDays, 0, 0, 366), bleedingDays: clampInt(raw.bleedingDays, 0, 0, 30), irregular: raw.irregular === true,
    aware: raw.aware === true, symptoms: isPlainObject(raw.symptoms) ? normalizeCycleSymptoms(raw.symptoms, CYCLE_EVENT_SYMPTOM_DEFAULTS) : null,
    symptomToken: truncate(raw.symptomToken, 100), pregnancyIntent: ['avoid', 'seek'].includes(raw.pregnancyIntent) ? raw.pregnancyIntent : 'unspecified',
    intentTarget: truncate(raw.intentTarget, 180), intentKnown: raw.intentKnown === true, intentEvidence: truncate(raw.intentEvidence, 300),
    // 생리 재편에서 더한 채팅 값. 비어 있으면(0 · '' · null) 프로필 값을 따른다. 옛 채팅 자료는 전부 빈 값으로 읽힌다.
    lutealDays: (days => days >= 10 ? days : 0)(clampInt(raw.lutealDays, 0, 0, 16)),
    contraception: ['none', 'hormonal'].includes(raw.contraception) ? raw.contraception : '',
    awareNextPeriod: typeof raw.awareNextPeriod === 'boolean' ? raw.awareNextPeriod : null };
  // 생리 2차 값은 있을 때만 남긴다(옛 자료의 모양과 크기가 그대로다).
  const extra = {}, stopped = base.status !== 'active';
  const level = cycleIntentLevel(raw.intentLevel);
  if (level !== null && base.intentKnown) extra.intentLevel = level;
  if (stopped && CYCLE_CAUSES.includes(raw.cause)) extra.cause = raw.cause;
  if (extra.cause === 'birth' && CYCLE_NURSING.includes(raw.nursing)) extra.nursing = raw.nursing;
  const lossWeeks = clampInt(raw.lossWeeks, 0, 0, 45);
  if (extra.cause === 'loss' && lossWeeks) extra.lossWeeks = lossWeeks;
  if (extra.cause === 'stopped_contraception' && CYCLE_METHODS.includes(raw.stoppedMethod)) extra.stoppedMethod = raw.stoppedMethod;
  if (stopped) for (const key of ['stoppedAtMinute', 'lastOnsetMinute', 'expectedOnsetMinute']) { const at = minute(raw[key]); if (at !== null) extra[key] = at; }
  if (base.resumeAtMinute !== null && ['story', 'default'].includes(raw.resumeBasis)) extra.resumeBasis = raw.resumeBasis;
  const exposures = (Array.isArray(raw.exposures) ? raw.exposures : []).filter(isPlainObject).map(entry => ({ minute: clampInt(entry.minute, 0, -1000000000, 1000000000),
    ...(typeof entry.target === 'string' && entry.target ? { target: truncate(entry.target, 180) } : {}),
    protected: typeof entry.protected === 'boolean' ? entry.protected : null, aware: entry.aware !== false, knowsPartner: entry.aware !== false && entry.knowsPartner !== false }))
    .sort((left, right) => left.minute - right.minute).slice(-4);
  if (exposures.length) extra.exposures = exposures;
  if (isPlainObject(raw.check) && ['not_pregnant', 'pregnant'].includes(raw.check.result)) {
    extra.check = { minute: clampInt(raw.check.minute, 0, -1000000000, 1000000000), result: raw.check.result, means: truncate(raw.check.means, 80) };
  }
  const delays = (Array.isArray(raw.delays) ? raw.delays : []).filter(isPlainObject).map(entry => ({ cycle: clampInt(entry.cycle, 0, 0, 100000), days: clampInt(entry.days, 1, 1, 14) })).slice(-12);
  if (!stopped && delays.length) extra.delays = delays;
  if (CYCLE_METHODS.includes(raw.method)) extra.method = raw.method;
  if (CYCLE_TRANSITIONS.includes(raw.transition)) extra.transition = raw.transition;
  const resumed = minute(raw.resumedAtMinute);
  if (!stopped && resumed !== null) { extra.resumedAtMinute = resumed; if (CYCLE_CAUSES.includes(raw.resumedCause)) extra.resumedCause = raw.resumedCause; }
  return { ...base, ...extra };
}

// 처음 값: 분석의 처음 상태. 처음부터 멈춘 인물은 원인과 원문의 경과로 남은 기본 기간을 센다(이야기 시간 0분 = 채팅 시작).
export function cycleInitialValue(settings, seed) {
  const initialDay = settings.initialDay || (cycleHash(`${seed}:cycle`) % settings.lengthDays + 1);
  const value = normalizeCycleActor({ status: settings.initialStatus, reason: settings.initialReason, aware: settings.aware, irregular: settings.irregular,
    lengthDays: settings.lengthDays, bleedingDays: settings.bleedingDays, initialDay });
  if (value.status === 'active' || !settings.initialCause) return value;
  const elapsed = settings.initialElapsedDays, cause = settings.initialCause;
  const next = { ...value, cause, nursing: settings.initialNursing, stoppedAtMinute: -elapsed * 1440 };
  if (cause === 'pregnancy' && elapsed > 0) { next.lastOnsetMinute = -elapsed * 1440; next.expectedOnsetMinute = next.lastOnsetMinute + settings.lengthDays * 1440; }
  if (value.status === 'waiting') {
    const key = cycleResumeTableKey(cause, { nursing: settings.initialNursing, method: settings.method });
    if (key) { next.resumeAtMinute = Math.max(7, cycleSeededDays(`${seed}:initial-resume`, CYCLE_RESUME_DAYS[key]) - elapsed) * 1440; next.resumeBasis = 'default'; }
  }
  return normalizeCycleActor(next);
}

// 기다림이 끝나 월경이 돌아온 값. 원인이 있던 기다림은 "돌아온 뒤 첫 두 주기"를 표시한다.
export function cycleResumedValue(value, atMinute) {
  const next = { ...value, status: 'active', reason: '', initialDay: 1, anchorMinute: atMinute, resumeAtMinute: null, symptoms: null };
  for (const key of ['cause', 'nursing', 'lossWeeks', 'stoppedMethod', 'stoppedAtMinute', 'lastOnsetMinute', 'expectedOnsetMinute', 'resumeBasis', 'delays', 'resumedAtMinute', 'resumedCause']) delete next[key];
  if (value.cause) { next.resumedAtMinute = atMinute; next.resumedCause = value.cause; }
  return normalizeCycleActor(next);
}

// 기준점에서 센 날(ordinal, 0부터)을 주기 번호·그 주기 안의 일차·그 주기의 길이로 바꾼다.
// 주기 n은 n×기준 길이 + 흔들림에서 시작하므로 흔들린 길이를 차례로 더한 것과 같고, 먼 미래도 바로 계산된다.
// 기준점의 일차가 0번 주기 안에 남도록 1번 주기의 시작은 그 일차 뒤로만 흔든다.
export function locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay) {
  const start = number => number * lengthDays + (number === 1 ? Math.max(anchorDay - lengthDays, cycleStartShift(seed, 1, swing)) : cycleStartShift(seed, number, swing));
  let number = Math.floor(ordinal / lengthDays);
  for (let guard = 0; guard < 16 && start(number) > ordinal; guard += 1) number -= 1;
  for (let guard = 0; guard < 16 && start(number + 1) <= ordinal; guard += 1) number += 1;
  const day = ordinal - start(number) + 1, length = start(number + 1) - start(number);
  // 비정상 자료(아주 짧은 주기 등)로 위치가 맞지 않으면 흔들림 없는 계산으로 돌아간다.
  if (day >= 1 && day <= length) return { number, day, length };
  const plain = Math.floor(ordinal / lengthDays);
  return { number: plain, day: ordinal - plain * lengthDays + 1, length: lengthDays };
}

// 주기마다 더해지는 날(한때의 지연, 후기 이행기의 긴 공백, 돌아온 뒤 첫 두 주기)이 있을 때의 위치. 앞에서부터 차례로 센다.
export function locateCycleDayExtra(ordinal, lengthDays, swing, seed, anchorDay, extraOf) {
  if (ordinal < 0) return locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay);
  const base = number => number === 0 ? 0 : number * lengthDays + (number === 1 ? Math.max(anchorDay - lengthDays, cycleStartShift(seed, 1, swing)) : cycleStartShift(seed, number, swing));
  let number = 0, start = 0, added = 0;
  for (let guard = 0; guard < 20000; guard += 1) {
    const extra = Math.max(0, extraOf(number)), next = base(number + 1) + added + extra;
    if (next > ordinal) {
      const day = ordinal - start + 1, length = next - start;
      if (day >= 1 && day <= length) return { number, day, length };
      break;
    }
    added += extra; number += 1; start = next;
  }
  return locateCycleDay(ordinal, lengthDays, swing, seed, anchorDay);
}

export function cycleProfileFor(profile) {
  if (!profile || isNonActingMainProfile(profile)) return normalizeCycleProfile({ applicable: false, basis: 'explicit' });
  const base = profile.baseProfile || {}, gender = normalizeGenderIdentity(profile.userOverrides?.genderIdentity || base.genderIdentity);
  if (isPlainObject(base.menstrualCycle) || isPlainObject(profile.userOverrides?.menstrualCycle)) {
    return normalizeCycleProfile({ ...(base.menstrualCycle || {}), ...(profile.userOverrides?.menstrualCycle || {}),
      ...(profile.userOverrides?.menstrualCycle ? { basis: 'user' } : {}) }, gender);
  }
  const evidence = normalizeStringList(profile.evidence, 24, 600);
  const exception = evidence.find(text => /(?:species|race|종족)\s*[:：]\s*(?:robot|android|machine|로봇|안드로이드)|\bis (?:an? )?(?:robot|android)\b|does not menstruate|never menstruates|(?:생리|월경)(?:를|을)\s*하지\s*않|자궁이\s*없/iu.test(text));
  return normalizeCycleProfile({ applicable: gender.value === 'female' && !exception, basis: exception ? 'explicit' : 'rp_default',
    evidence: exception ? [exception] : [], reason: exception || '원문에 없는 주기는 RP 기본값을 사용합니다.' }, gender);
}

export function normalizeCycleState(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1) return null;
  const absolute = raw => typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : null;
  const clockEvents = (Array.isArray(value.clockEvents) ? value.clockEvents : []).slice(-80).filter(e => isPlainObject(e) && e.commitId)
    .map(e => ({ commitId: truncate(e.commitId, 300), turn: clampInt(e.turn, 0, 0, 100000000), delta: clampInt(e.delta, 0, 0, 1000000000), absolute: absolute(e.absolute) }));
  const actorBase = (Array.isArray(value.actorBase) ? value.actorBase : []).slice(-1000).filter(e => isPlainObject(e) && e.actor)
    .map(e => ({ actor: truncate(e.actor, 180), value: normalizeCycleActor(e.value) }));
  const actorEvents = (Array.isArray(value.actorEvents) ? value.actorEvents : []).slice(-512).filter(e => isPlainObject(e) && e.id && e.actor)
    .map(e => ({ id: truncate(e.id, 180), actor: truncate(e.actor, 180), commitId: truncate(e.commitId, 300), turn: clampInt(e.turn, 0, 0, 100000000),
      value: normalizeCycleActor(e.value), evidence: truncate(e.evidence, 300), source: e.source === 'user' ? 'user' : 'rp' }));
  return { schemaVersion: 1, revision: clampInt(value.revision, 0, 0, Number.MAX_SAFE_INTEGER), baseMinutes: clampInt(value.baseMinutes, 0, 0, 1000000000),
    baseAbsolute: absolute(value.baseAbsolute), clockEvents, actorBase, actorEvents };
}

export function cycleStateForRead(state) {
  return normalizeCycleState(state?.cycleState) || { schemaVersion: 1, revision: 0, baseMinutes: 0, baseAbsolute: null, clockEvents: [], actorBase: [], actorEvents: [] };
}

export function cycleClock(state) {
  const data = cycleStateForRead(state);
  let minutes = data.baseMinutes, absolute = data.baseAbsolute;
  for (const event of data.clockEvents) { minutes += event.delta; absolute = event.absolute !== null ? event.absolute : absolute === null ? null : absolute + event.delta; }
  return { minutes, absolute };
}

export function compactCycleHistory(state) {
  const data = state.cycleState, journal = state.commitJournal || [];
  if (!data || data.schemaVersion !== 1 || !journal.length) return;
  const ids = new Set(journal.map(e => e.commitId)), oldest = Math.min(...journal.map(e => Number(e.turnIndex || 0)));
  data.clockEvents = data.clockEvents.filter(event => {
    if (event.turn >= oldest || ids.has(event.commitId)) return true;
    data.baseMinutes += event.delta; data.baseAbsolute = event.absolute !== null ? event.absolute : data.baseAbsolute === null ? null : data.baseAbsolute + event.delta;
    return false;
  });
  data.actorEvents = data.actorEvents.filter(event => {
    if (event.turn >= oldest || ids.has(event.commitId)) return true;
    const at = data.actorBase.findIndex(e => e.actor === event.actor), value = { actor: event.actor, value: safeClone(event.value) };
    if (at < 0) data.actorBase.push(value); else data.actorBase[at] = value;
    return false;
  });
}

export function rollbackCycleChanges(state, removed) {
  const data = normalizeCycleState(state.cycleState);
  if (!data) return;
  const ids = new Set(removed.map(e => e.commitId)), before = JSON.stringify(data);
  data.clockEvents = data.clockEvents.filter(e => !ids.has(e.commitId));
  data.actorEvents = data.actorEvents.filter(e => e.source === 'user' || !ids.has(e.commitId));
  if (JSON.stringify(data) !== before) data.revision++;
  state.cycleState = data;
}

export function kocoApplyOperation(previous, op) {
  if (op.replace !== undefined) return safeClone(op.replace);
  if (op.kind === 'relations') {
    const current = safeClone(previous) || { from: op.from, to: op.to, affection: 50, eroticAttraction: 50, notes: [], lastUpdatedTurn: 0 };
    const pending = { ...(current.changeRemainders || {}) };
    let changed = false;
    for (const [field, delta] of Object.entries(op.deltas || {})) if (delta !== 0) {
      const next = accumulatedRelationChange(current[field], delta, pending[field], field === 'hatred' ? 0 : 50);
      current[field] = next.value; pending[field] = next.remainder; changed = true;
    }
    if (changed) { current.changeRemainders = pending; current.lastUpdatedTurn = op.turn; }
    if (op.note) { current.notes = latestStringList([...(current.notes || []), op.note], 30, 500); current.lastNoteTurn = op.turn; } // 기록의 연속성(2026-10-29): 최신 30개
    return current;
  }
  const previousRival = safeClone(previous) || { id: op.key, actor: op.actor, rival: op.rival, focusTarget: op.focusTarget, kind: 'romantic', intensity: 0, evidence: [] };
  if (!op.delta) {
    if (previous && op.note) { previousRival.reason = op.note; previousRival.evidence = normalizeStringList([...(previousRival.evidence || []), op.note], 20, 500); previousRival.lastNoteTurn = op.turn; }
    return previous ? previousRival : null;
  }
  const intensity = Math.round(clampNumber(clampNumber(previousRival.intensity, 0) + op.delta, 0));
  if (intensity <= 0) return null;
  return { ...previousRival, intensity, reason: op.note || truncate(previousRival.reason, 500), evidence: normalizeStringList([...(previousRival.evidence || []), op.note], 20, 500), confidence: Math.round(clampNumber(op.confidence, previousRival.confidence || 40)), lastUpdatedTurn: op.turn };
}

export function kocoReplayLane(lane, invalid = new Set()) {
  let result = safeClone(lane.baseline);
  for (const op of lane.operations || []) if (!op.withdrawn && (!op.source || !invalid.has(op.source))) result = kocoApplyOperation(result, op);
  return result;
}

export function kocoTrackOperation(state, kind, key, before, operation, externalEvent = null) {
  if (!state.koco) return;
  const laneId = kind + ':' + key;
  let lane = state.koco.lanes[laneId];
  if (!lane && !externalEvent) return;
  if (!lane) lane = state.koco.lanes[laneId] = { kind, key, baseline: safeClone(before) || null, operations: [] };
  const expected = kocoReplayLane(lane);
  // An explicit repair/import/base update is authoritative, not a delta to undo.
  if (JSON.stringify(expected) !== JSON.stringify(before || null)) lane.operations.push({ kind, key, replace: safeClone(before) || null });
  lane.operations.push({ ...operation, kind, key, turn: state.turnIndex, ...(externalEvent ? { source: externalEvent.key + '@' + externalEvent.revision } : {}) });
}

export function kocoRetract(state, invalid) {
  if (!state.koco || !invalid.size) return;
  const replay = (holder, lane, undo = false) => {
    const bucket = holder[lane.kind];
    if (!isPlainObject(bucket)) return;
    const before = kocoReplayLane(lane), actual = bucket[lane.key] ?? null, after = kocoReplayLane(lane, invalid);
    if (JSON.stringify(actual) !== JSON.stringify(before)) return; // preserve a later explicit replacement
    if (after === null && (!undo || lane.kind === 'rivalries')) delete bucket[lane.key]; else bucket[lane.key] = after;
  };
  // Update exact before-images too, so a later reroll cannot resurrect a
  // withdrawn contribution. Normal deltas/caps/fractional carries are replayed.
  for (const [key, lane] of Object.entries(state.koco.lanes)) {
    if (!lane.operations.some(op => !op.withdrawn && invalid.has(op.source))) continue;
    replay(state, lane);
    for (const entry of state.commitJournal || []) {
      const length = entry.undo?.koco?.checkpoint ? entry.undo.koco.lanes[key] : null;
      if (Number.isInteger(length)) replay(entry.undo, { ...lane, operations: lane.operations.slice(0, length) }, true);
    }
    for (const op of lane.operations) if (invalid.has(op.source)) op.withdrawn = true;
  }
  for (const koco of [state.koco, ...(state.commitJournal || []).map(entry => entry.undo?.koco)]) {
    for (const receipt of Object.values(koco?.receipts || {})) if (invalid.has(receipt.key + '@' + receipt.revision)) receipt.status = 'retracted';
  }
  for (const event of [...(state.events || []), ...(state.commitJournal || []).flatMap(e => e.undo?.trimmedEvents || [])]) if (invalid.has(event.kocoRef)) { event.retracted = true; event.status = '철회됨'; }
  for (const goals of [state.goals, ...(state.commitJournal || []).map(e => e.undo?.goals)]) {
    for (const goal of Object.values(goals || {})) if (goal && !['complete', 'abandon', 'pause'].includes(goal.status) && (goal.kocoRefs || []).some(ref => invalid.has(ref.key + '@' + ref.revision))) { goal.status = 'pause'; goal.lastResult = '코코에몬 원본 사건 변경·철회'; }
  }
}

export function kocoRelationDependencies(state, actor, target) {
  const refs = new Map();
  for (const key of [relationKey(actor, target)]) {
    const lane = state.koco?.lanes?.['relations:' + key];
    for (const op of lane?.operations || []) {
      if (!op.source || op.withdrawn) continue;
      const [eventKey, revision] = op.source.split('@');
      if (state.koco.receipts[eventKey]?.status === 'applied') refs.set(op.source, { key: eventKey, revision });
    }
  }
  return [...refs.values()];
}

// RisuPot(2026-10-16): 인물 기록·팩트전달 노트는 기억(참고 자료), 연출지시 노트는 감독(판단에서 뺌). 홈 목록에는 RisuPot을 한 번만 보인다(home: false).
export const COMPATIBILITY_SOURCES = Object.freeze({
  flashback: { label: 'Flashback', group: 'memory' }, hayaku: { label: 'HAYAKU', group: 'memory' },
  libra: { label: 'LIBRA', group: 'memory' }, simcore: { label: 'SimCore', group: 'memory' }, wyglore: { label: 'WYGlore', group: 'memory' },
  risupot: { label: 'RisuPot', group: 'memory' },
  archive_director: { label: 'Archive Center', group: 'director' }, gradia_director: { label: 'GRADIA', group: 'director' },
  agents_director: { label: 'Agents!', group: 'director' }, coco_director: { label: 'cocoA(gent!)', group: 'director' },
  risupot_director: { label: 'RisuPot Director', group: 'director', home: false },
});

// Diagnostic-only storage: never included in sessions, backups or model inputs.
export function createCompatibilityDiagnostics(notify = () => {}) {
  const entries = new Map(), maxEntries = 100, maxBytes = 128 * 1024;
  let sequence = 0, generation = 0, bytes = 2, encoder = null;
  const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
  const scopeOf = scope => ({ sourceBundleKey: text(scope?.sourceBundleKey, 96), scopeKey: text(scope?.scopeKey, 200), variantKey: text(scope?.variantKey || 'default', 160) });
  const sameScope = (left, right) => left.sourceBundleKey === right?.sourceBundleKey && left.scopeKey === right?.scopeKey && left.variantKey === String(right?.variantKey || 'default');
  const announce = () => { try { notify(); } catch (_) {} };
  const excerpt = value => {
    const sample = text(value, 600);
    const hidden = /authorization|api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|client[_\s-]?secret|private[_\s-]?key|password|passwd|비밀번호|bearer\s|-----BEGIN|\b(?:sk|sess|rk)-[\w-]+|\bAIza[\w-]+|\bya29\.|\beyJ[\w-]{12,}/i.test(sample);
    return { excerpt: hidden ? '' : JSON.parse(JSON.stringify(sample.slice(0, 300))), excerptHidden: hidden, excerptTruncated: typeof value === 'string' && value.length > 300 };
  };
  const put = (row, create = false) => {
    const previous = entries.get(row.id);
    if (!create && !previous) return; // late completion cannot revive an evicted item
    encoder ||= new TextEncoder();
    const size = encoder.encode(JSON.stringify(row)).length + 1;
    if (size > maxBytes - 2) return;
    entries.set(row.id, { row, size }); bytes += size - (previous?.size || 0);
    while (entries.size > maxEntries || bytes > maxBytes) {
      const oldest = entries.keys().next().value; bytes -= entries.get(oldest).size; entries.delete(oldest);
    }
    announce();
  };
  const patch = (id, fields) => { const saved = entries.get(id); if (saved) put({ ...saved.row, ...fields }); };
  const api = {
    start(scope) {
      const selected = scopeOf(scope);
      if (!selected.sourceBundleKey || !selected.scopeKey) return null;
      return { id: `compat_${++sequence}`, generation, scope: selected, ids: [], externalIds: [], attemptId: '' };
    },
    record(trace, slot, source, content, stage, reason) {
      if (!trace || trace.generation !== generation || !Object.hasOwn(COMPATIBILITY_SOURCES, source)) return null;
      const id = `${trace.id}:${slot}`;
      if (!trace.ids.includes(id)) { trace.ids.push(id); if (trace.ids.length > maxEntries) trace.ids.shift(); }
      put({ id, ...trace.scope, source, at: new Date().toISOString(), requestId: trace.id, attemptId: '', baseCommitId: '', turn: null,
        stage, reason, collectedChars: typeof content === 'string' ? content.length : 0, preparedChars: 0, includedChars: stage.endsWith('_excluded') ? 0 : null,
        requestState: 'unknown', requestNumber: 0, errorCode: '', httpStatus: 0, invalidated: false, ...excerpt(content) }, true);
      return id;
    },
    prepared(id, chars, stage = 'reference_prepared', reason = 'bounded_reference') { patch(id, { preparedChars: chars, stage, reason, ...(stage.endsWith('_excluded') ? { includedChars: 0 } : {}) }); },
    references(trace, ids) { if (trace) trace.externalIds = ids.slice(0, EXTERNAL_CONTEXT_MAX_ITEMS); },
    fromReferences(scope, references) {
      const trace = api.start(scope); if (!trace) return null;
      trace.externalIds = (Array.isArray(references) ? references : []).slice(0, EXTERNAL_CONTEXT_MAX_ITEMS).map((item, index) => {
        const id = api.record(trace, index, item?.source, item?.content, 'reference_prepared', 'reused_reference');
        api.prepared(id, typeof item?.content === 'string' ? item.content.length : 0, 'reference_prepared', 'reused_reference');
        return id;
      });
      return trace;
    },
    bind(trace, values) {
      for (const id of trace?.ids || []) patch(id, {
        ...(typeof values.requestId === 'string' ? { requestId: text(values.requestId, 180) } : {}),
        ...(typeof values.baseCommitId === 'string' ? { baseCommitId: text(values.baseCommitId, 180) } : {}),
        ...(Number.isInteger(values.turn) && values.turn >= 0 ? { turn: values.turn } : {}),
        ...(values.requestState ? { requestState: values.requestState } : {}),
      });
    },
    finalInput(trace, references, tooLarge = false) {
      if (!trace) return;
      trace.inputTooLarge = tooLarge;
      for (const [index, id] of trace.externalIds.entries()) {
        const saved = entries.get(id)?.row; if (!saved) continue;
        const item = references?.[index];
        if (item?.source === saved.source && typeof item.content === 'string' && item.content.length) {
          const preview = excerpt(item.content);
          patch(id, { includedChars: item.content.length, stage: item.content.length < saved.collectedChars ? 'input_shortened' : 'input_included',
            reason: tooLarge ? 'prompt_limit_no_call' : 'final_input', requestState: tooLarge ? 'not_called' : 'preparing',
            ...preview, ...(saved.excerptHidden ? { excerpt: '', excerptHidden: true } : {}) });
        } else patch(id, { includedChars: 0, stage: 'limit_excluded', reason: 'final_compaction', requestState: tooLarge ? 'not_called' : 'preparing' });
      }
    },
    attempt(trace, value) {
      if (!trace || !value) return;
      const phases = ['queued', 'preparing', 'requesting', 'retry_wait', 'parsing', 'validating', 'applying', 'prepared', 'failed', 'cancelled', 'discarded', 'skipped'];
      if (value.id) trace.attemptId = text(value.id, 180);
      for (const id of trace.ids) patch(id, {
        attemptId: trace.attemptId, requestState: trace.inputTooLarge ? 'not_called' : phases.includes(value.phase) ? value.phase : 'unknown',
        requestNumber: Number.isInteger(value.attemptNumber) ? Math.max(0, Math.min(100, value.attemptNumber)) : 0,
        errorCode: /^[A-Z0-9_]{1,100}$/.test(value.errorCode || '') ? value.errorCode : '',
        httpStatus: Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599 ? value.httpStatus : 0,
      });
    },
    invalidate(scope, commitIds) {
      const removed = new Set(commitIds || []);
      if (!removed.size) return;
      for (const { row } of entries.values()) if (sameScope(row, scope) && removed.has(row.baseCommitId)) patch(row.id, { invalidated: true });
    },
    rows(scope) { return [...entries.values()].filter(({ row }) => sameScope(row, scope)).map(({ row }) => ({ ...row })).reverse(); },
    has(scope) { return [...entries.values()].some(({ row }) => sameScope(row, scope)); },
    stats() { return { count: entries.size, bytes, maxEntries, maxBytes }; },
    clear(mode = 'all', botKey = '', scopeKey = '') {
      generation++;
      for (const [id, entry] of entries) if (mode === 'all' || mode === 'bot' && entry.row.sourceBundleKey === botKey || mode !== 'all' && mode !== 'bot' && entry.row.scopeKey === scopeKey) { bytes -= entry.size; entries.delete(id); }
      if (!entries.size) bytes = 2;
      announce();
    },
  };
  return api;
}

export function externalMessageSource(message, hasRemovableDialogue = false) {
  if (!message || typeof message.content !== 'string') return '';
  const memo = String(message.memo || message.metadata?.memo || '').toLowerCase();
  const content = message.content;
  if (/<\/?agents_analysis_note>|\[cocoA\(gent!\) Analysis Context\]/i.test(content)) return 'coco_director';
  if (memo.includes('debug') || memo.includes('diagnostic') || /^\s*\[(?:DEBUG|TRACE|DIAGNOSTIC|PLUGIN LOG)[^\]]*\]/i.test(content)) return 'technical_debug';
  if (memo.includes('hayaku-runtime-context') || memo.includes('hayaku-cache-static') || /\[HAYAKU(?:\s|_)/i.test(content)) return 'hayaku';
  if (/\[(?:FLASHBACK EVIDENCE CONTRACT|PAST EVIDENCE RULES|FLASHBACK MEMORY)/i.test(content)) return 'flashback';
  if (/\[(?:LIBRA[^\]\n]{0,100}(?:Injection|Runtime Contract)|LIBRA-HAYAKU|LIBRA-FLASHBACK)/i.test(content)) return 'libra';
  if (/\b(?:SIMCORE|simcore state|시뮬 엔진)\b|⟦simcore:\d+⟧/i.test(content)) return 'simcore';
  if (/\b(?:WYGlore|WygLore Leaf|WL MEMORY|WL LORE)\b/i.test(content)) return 'wyglore';
  if (/\b(?:GRADIA|SHADOW ACT|Character AIDE|World AIDE|Plot AIDE)\b/i.test(content)) return 'gradia_director';
  if (/\b(?:Agents!|AGENT NOTES|PRE-AGENT|POST-AGENT)\b/i.test(content)) return 'agents_director';
  if (/\b(?:Archive Center|Publisher Directive|Supervisor Directive|RECOMPOSER)\b/i.test(content)) return 'archive_director';
  if (hasRemovableDialogue && message.role === 'assistant' && message.removable !== true && message.isChat !== true) return 'omninode_or_synthetic';
  return '';
}

export function stripTechnicalArtifacts(value) {
  return stripKocoArtifacts(value)
    .replace(/\n?⟦simcore:\d+⟧\s*/gi, '\n')
    .replace(/<!--[\s\S]*?(?:HAYAKU_STATE_PACKET|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[\s\S]*?-->/gi, '')
    .replace(/\[(?:EROSYNC|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[^\]\n]*\][\s\S]*?\[\/(?:EROSYNC|HAYAKU|FLASHBACK|LIBRA|WYGLORE)[^\]\n]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitRisupotBlocks(content) {
  const result = { found: false, remaining: typeof content === 'string' ? content : '', references: [], facts: [], directives: [] };
  if (!result.remaining.includes('<!-- RISUPOT_')) return result;
  const take = (start, end, onBlock) => {
    for (let guard = 0; guard < 8; guard += 1) {
      const from = result.remaining.indexOf(start);
      if (from < 0) return;
      const to = result.remaining.indexOf(end, from + start.length);
      if (to < 0) return;
      result.found = true;
      onBlock(result.remaining.slice(from + start.length, to));
      result.remaining = result.remaining.slice(0, from) + result.remaining.slice(to + end.length);
    }
  };
  take('<!-- RISUPOT_WIKI_REFERENCE_START -->', '<!-- RISUPOT_WIKI_REFERENCE_END -->', (inner) => {
    const body = inner.replace(/^\s*\[CONTROL\][^\n]*\n?/, '').trim();
    if (!body) return;
    let records = null;
    try { const parsed = JSON.parse(body); if (Array.isArray(parsed)) records = parsed; } catch (_) {}
    if (!records) { result.references.push(body); return; }
    for (const record of records) {
      const text = risupotRecordText(record);
      if (text) result.references.push(text);
    }
  });
  take('<!-- RISUPOT_DIRECTOR_NOTE_START -->', '<!-- RISUPOT_DIRECTOR_NOTE_END -->', (inner) => {
    const lines = inner.trim().split('\n');
    const control = /^\[CONTROL\s*\S\s*DIRECTOR NOTE\]/.test(lines[0] || '') ? lines.shift() : '';
    const note = lines.join('\n').trim();
    if (!note) return;
    if (/^\[CONTROL\s*\S\s*DIRECTOR NOTE\]\s*Use the following as factual reference\b/.test(control)) result.facts.push(note);
    else result.directives.push(note);
  });
  if (result.found) result.remaining = result.remaining.trim();
  return result;
}

export function normalizeDuskGuard(v) {
  const n = (x, d, lo, hi) => Math.round(clampNumber(x, d, lo, hi));
  return { on: v?.on === true, obsessionCap: n(v?.obsessionCap, 20, 0, 100), sameTargetTurns: n(v?.sameTargetTurns, 3, 1, 20), restTurns: n(v?.restTurns, 4, 1, 50) };
}

export function botPlanningInputs(store) {
  return JSON.stringify(Object.entries(store?.bots || {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key,
    value.narrativePreset || 'general', value.domains || {}, value.activeVariantKey || 'default', value.analysisModules?.revision || 0,
    relationChangePlanningSettings(value),
    contentPolicyFor(value),
    sexualTargetPlanningSettings(value),
  ]));
}

export function normalizeSexualTargets(value) {
  const result = {};
  for (const [key, item] of Object.entries(isPlainObject(value) ? value : {})) {
    const entry = normalizeSexualTarget(item, key);
    if (entry) result[relationKey(entry.actor, entry.target)] = entry;
  }
  return result;
}

export function sexualTargetFor(state, actor, target) {
  const entry = state?.sexualTargets?.[relationKey(actor, target)];
  return isPlainObject(entry) ? entry : null;
}

export function normalizePreparedLookahead(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !isPlainObject(value.decision)) return null;
  const textField = (name, limit, required = true) => typeof value[name] === 'string' && value[name].length <= limit && (!required || value[name].length > 0);
  for (const name of ['planId', 'sourceBundleKey', 'scopeKey', 'variantKey', 'baseCommitId', 'baseContentHash', 'planningSignature', 'journalHash']) if (!textField(name, 300)) return null;
  if (!textField('sourceHash', 300, false) || !textField('variantSignatureHash', 80)
    || !Number.isInteger(value.baseTurnIndex) || value.baseTurnIndex < 0 || value.baseTurnIndex > 100000000
    || !Number.isFinite(value.createdAt) || value.createdAt <= 0
    || !value.scopeKey.startsWith(value.sourceBundleKey + ':')) return null;
  const decision = value.decision;
  if (!['ACT', 'NEUTRAL', 'NO_TARGET', 'SCENE_TRANSITION', 'CONTINUE_LATER'].includes(decision.type)
    || !Array.isArray(decision.actions) || decision.actions.length > MAX_ACTIONS_PER_TURN
    || (decision.type === 'ACT') !== (decision.actions.length > 0)) return null;
  const actions = [];
  for (const action of decision.actions) {
    if (!isPlainObject(action) || typeof action.actor !== 'string' || !action.actor || action.actor === 'user' || action.actor.length > 160
      || typeof action.target !== 'string' || !action.target || action.target.length > 160
      || !['sexual_humor', 'flirt', 'seduce', 'pursue_goal'].includes(action.mode)) return null;
    if (action.goal && (!isPlainObject(action.goal) || typeof action.goal.goalId !== 'string' || !action.goal.goalId)) return null;
    if (['score', 'intensity', 'activationChance', 'roll'].some(key => !Number.isFinite(action[key]) || action[key] < 0 || action[key] > 100)) return null;
    if (action.goal && ((action.goal.actor && action.goal.actor !== action.actor) || (action.goal.target && action.goal.target !== action.target)
      || ['priority', 'persistence'].some(key => !Number.isFinite(action.goal[key]) || action.goal[key] < 0 || action.goal[key] > 100))) return null;
    actions.push({ actor: action.actor, target: action.target, mode: action.mode,
      score: clampInt(action.score, 0, 0, 100), intensity: clampInt(action.intensity, 0, 0, 100), style: truncate(action.style, 500),
      ...(isPlainObject(action.cycleAdjustment) && Number.isFinite(action.cycleAdjustment.delta) && Math.abs(action.cycleAdjustment.delta) <= 5 ? {
        unadjustedScore: clampInt(action.unadjustedScore, action.score, 0, 100),
        cycleAdjustment: { delta: clampInt(action.cycleAdjustment.delta, 0, -5, 5), kind: action.cycleAdjustment.kind === 'fertility' ? 'fertility' : 'comfort', reason: truncate(action.cycleAdjustment.reason, 260) },
      } : {}),
      goal: action.goal ? normalizeGoalPlan(action.goal, action.actor, action.target, value.baseTurnIndex + 1) : null,
      activationChance: clampInt(action.activationChance, 0, 0, 100), roll: clampInt(action.roll, 0, 0, 100),
      // 성적 목표 대상(2026-10-22): 의도·사다리 관문·거절 넘김 표식(허용/보류)은 저장된 계획에도 남는다(장면 화면·기록이 본다).
      ...(action.intent === 'lead' ? { intent: 'lead' } : action.intent === 'play' ? { intent: 'play' } : {}),
      ...(action.gate === 'desire' ? { gate: 'desire' } : {}),
      ...(action.refusalOverride === true ? { refusalOverride: true } : {}),
      ...(action.refusalOverrideWithheld === true ? { refusalOverrideWithheld: true, refusalOverrideChance: clampInt(action.refusalOverrideChance, 0, 0, 100) } : {}),
      ...(normalizeKocoRefs(action.kocoRefs).length ? { kocoRefs: normalizeKocoRefs(action.kocoRefs) } : {}) });
  }
  // 확률 탈락 계획(2026-10-22): 확정 때 기록으로 남기려고 저장된 계획에 함께 둔다(12개까지).
  const dropped = (Array.isArray(decision.dropped) ? decision.dropped : []).filter(isPlainObject).slice(0, 12).map(item => ({
    actor: truncate(item.actor, 160), target: truncate(item.target, 160), mode: truncate(item.mode, 40), intent: item.intent === 'lead' ? 'lead' : 'play',
    gate: item.gate === 'desire' ? 'desire' : 'activation', activationChance: clampInt(item.activationChance, 0, 0, 100), roll: clampInt(item.roll, 0, 0, 100),
    ...(item.goalType ? { goalType: truncate(item.goalType, 60) } : {}) }));
  const forecast = { location: truncate(value.forecast?.location, 300) };
  for (const key of ['confirmed', 'likely', 'excluded', 'arrivalSupported', 'remoteContact', 'rememberedOnly']) forecast[key] = normalizeStringList(value.forecast?.[key], 30, 160);
  const result = { schemaVersion: 1, planId: value.planId, sourceBundleKey: value.sourceBundleKey,
    scopeKey: value.scopeKey, variantKey: value.variantKey, baseCommitId: value.baseCommitId, baseContentHash: value.baseContentHash,
    baseTurnIndex: value.baseTurnIndex, sourceHash: value.sourceHash, variantSignatureHash: value.variantSignatureHash,
    planningSignature: value.planningSignature, journalHash: value.journalHash, restoreHash: truncate(value.restoreHash, 100),
    userIdentitySignature: truncate(value.userIdentitySignature, 100),
    ...(Number(value.preferenceRevision) > 0 ? { preferenceRevision: clampInt(value.preferenceRevision, 0, 0, Number.MAX_SAFE_INTEGER) } : {}),
    ...(Number(value.cycleRevision) > 0 ? { cycleRevision: clampInt(value.cycleRevision, 0, 0, Number.MAX_SAFE_INTEGER) } : {}),
    ...(typeof value.cyclePolicySignature === 'string' ? { cyclePolicySignature: truncate(value.cyclePolicySignature, 100) } : {}),
    moduleSelectionRevision: clampInt(value.moduleSelectionRevision, 0, 0, 1000000000), createdAt: value.createdAt,
    decision: { type: decision.type, reason: truncate(decision.reason, 700), actions, ...(dropped.length ? { dropped } : {}) }, forecast,
    sceneAssessment: { category: truncate(value.sceneAssessment?.category, 80), relationalOpportunity: value.sceneAssessment?.relationalOpportunity === true, reason: truncate(value.sceneAssessment?.reason, 500) },
    profileSourceIds: normalizeStringList(value.profileSourceIds, MAX_PROFILE_CHARACTERS, 160), externalSources: normalizeStringList(value.externalSources, 30, 120),
    boundCommitId: truncate(value.boundCommitId, 180), boundRequestSlotKey: truncate(value.boundRequestSlotKey, 500), boundUserInputHash: truncate(value.boundUserInputHash, 160),
  };
  return result.profileSourceIds.length && JSON.stringify(result).length <= 262144 ? result : null;
}

export function missedObservationTurns(state, messages) {
  const journal = Array.isArray(state?.commitJournal) ? state.commitJournal.filter(isPlainObject) : [];
  if (journal.length < 2 || !Array.isArray(messages)) return [];
  const caught = new Set(journal.flatMap(entry => Array.isArray(entry.caughtUpCommitIds) ? entry.caughtUpCommitIds : []));
  const missed = [];
  for (let k = journal.length - 2; k >= 0 && missed.length < 2; k -= 1) {
    const entry = journal[k];
    if (entry.directorObservationApplied !== false || caught.has(entry.commitId) || entry.unverified || !Number.isInteger(entry.messageIndex) || entry.messageIndex < 0) break;
    const message = messages[entry.messageIndex];
    const id = String(message?.id ?? message?.messageId ?? message?.chatId ?? '');
    const text = message ? chatMessageText(message) : '';
    if (!text || (entry.messageId && id && id !== entry.messageId) || commitContentHash(text) !== (entry.currentContentHash || entry.contentHash)) break;
    missed.unshift({ commitId: String(entry.commitId), turn: clampInt(entry.turnIndex, 0, 0, 100000000), text: stripTechnicalArtifacts(text) });
  }
  return missed;
}

// 최근 로그: 글 칸은 넣지 않는다(공백이 든 긴 문자열은 길이만, 객체는 한 단계의 코드·id·숫자만).
export function pluginLogValue(value, depth = 0) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return /\s/.test(value) && value.length > 48 ? `<글 ${value.length}자>` : value.length > 120 ? `${value.slice(0, 120)}…` : value;
  if (value instanceof Error) return `오류(${value.code || ''}): ${String(value.message || '').slice(0, 120)}`;
  if (Array.isArray(value)) return `[목록 ${value.length}]`;
  if (typeof value === 'object') {
    if (depth > 0) return `{…${Object.keys(value).length}}`;
    return `{${Object.entries(value).slice(0, 12).map(([key, item]) => `${key}: ${pluginLogValue(item, 1)}`).join(', ')}}`;
  }
  return typeof value;
}

export function behindStorageKey(scope) {
  return `${BEHIND_KEY_PREFIX}${scope.scopeKey}:${String(scope.variantKey || 'default')}`;
}

export function profileBelongsToContext(profile, entity, context) {
  if (!isPlainObject(profile)) return false;
  const botKey = context?.scope?.sourceBundleKey;
  if (botKey && Array.isArray(profile.ownerBundleKeys) && profile.ownerBundleKeys.length && !profile.ownerBundleKeys.includes(botKey)) return false;
  const bundleIds = new Set(context?.bundle?.characterIds || []);
  if (bundleIds.has(profile.id)) return true;
  if (entity?.scopeKey && entity.scopeKey === context?.scope?.scopeKey) return true;
  return false;
}

export function freezeUiInventory(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeUiInventory(child, seen);
  return Object.freeze(value);
}

export function contextProfiles(context) {
  return Object.values(context.profiles?.profiles || {})
    .filter((profile) => profileBelongsToContext(profile, context.registry?.entities?.[profile.id], context));
}

// A selected source that only changed position keeps its profile: carry the profile's claims on
// that content to the slots that hold it now, without asking the model again. `sources` are the
// selected sources bound to this profile whose content it has already been analysed from.
export function stageSelectedLoreRebind(profile, variantKey, sources) {
  if (!profile || !sources.length) return false;
  const hashes = new Set(sources.map(source => source.hash)), slots = new Set(sources.map(source => source.id));
  let changed = false;
  for (const holder of [profile.variants?.[variantKey], String(profile.activeVariantKey || 'default') === variantKey ? profile : null]) {
    const entries = holder?.selectedLore?.entries;
    if (!Array.isArray(entries) || !entries.length) continue;
    const next = normalizeSelectedLoreProfile({ entries: [...sources, ...entries.filter(claim => !hashes.has(claim.hash) && !slots.has(claim.id))] });
    if (JSON.stringify(next.entries.map(claim => `${claim.id}\n${claim.hash}`).sort()) === JSON.stringify(entries.map(claim => `${claim.id}\n${claim.hash}`).sort())) continue;
    const dropped = new Set(entries.filter(claim => hashes.has(claim.hash) && !slots.has(claim.id)).map(claim => claim.id));
    holder.selectedLore = next;
    if (Array.isArray(holder.sourceDocumentIds)) holder.sourceDocumentIds = normalizeStringList([...holder.sourceDocumentIds.filter(id => !dropped.has(id)), ...sources.map(source => source.id)], 160, 160);
    changed = true;
  }
  return changed;
}

export function uiPersonName(context, id) {
  if (id === 'user') return '당신';
  const registry = context.registry; return entityDisplayName(registry, id);
}

export function normalizePortraitChoice(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    path: typeof value.path === 'string' ? value.path.slice(0, 400) : '',
    name: typeof value.name === 'string' ? value.name.slice(0, 200) : '',
    offsetY: Math.max(0, Math.min(100, Math.round(Number.isFinite(Number(value.offsetY)) ? Number(value.offsetY) : 12))),
    manual: value.manual === true,
    ...(value.none === true ? { none: true } : {}), // 사진 없음(2026-10-15): 직접 정함, 자동으로 고르지 않음. 아니면 키도 없다(저장 모양 그대로)
  };
}

export function trackTransferWrite(promise, tracked) {
  const pending = Promise.resolve(promise);
  tracked.add(pending);
  pending.then(() => tracked.delete(pending), () => tracked.delete(pending));
  return pending;
}

export async function transferBounded(promise, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('BACKUP_DRAIN_TIMEOUT')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

export function scheduleCompatibilityUiRefresh() { /* Dusk 이식: 원본 화면 연결 끊음 */ }

export async function renderSettingsApp(show = true, { preserveProfileScroll = false, cachedContext = null } = {}) { /* Dusk 이식: 원본 화면 연결 끊음 */ }

// ── Dusk: {{user}} 관찰 칸 ── 기록은 턴 번호와 함께 쌓고, 읽을 때 지금 턴 이후 것은 버린다(다시 굴리기·되돌리기로 턴이 돌아가도 맞게).
export const DUSK_USER_MAX = 60;

export function duskUserView(state) {
  const turn = clampInt(state?.turnIndex, 0, 0, 100000000);
  const log = (state?.duskUser?.log || []).filter((e) => e.turn <= turn);
  const openness = Math.max(0, Math.min(100, 50 + log.reduce((n, e) => n + (Number(e.open) || 0) * 5, 0)));
  const last = (k) => [...log].reverse().find((e) => e[k])?.[k] || '';
  return { openness, state: last('state'), lastAction: last('action'), tendencies: log.flatMap((e) => (e.signals || []).map((x) => ({ ...x, turn: e.turn }))).slice(-8), entries: log.length };
}

// Dusk ‘동작·분석’ 카드 연결부: 허용된 설정 키만 읽고 쓴다(저장 때 normalizeConfig가 범위를 다시 맞춘다).
export const DUSK_CONFIG_KEYS = Object.freeze(['mode', 'frequency', 'autonomy', 'goalPersistence', 'cooldownTurns', 'maxActorsPerTurn', 'recentMessages', 'progressiveFollowUp', 'autoVerifyCharacters', 'autoRefreshProfiles', 'developmentMode', 'behindEnabled']);

// 성격 변화 검토: 반영을 기다리는 후보(근거가 문턱을 넘었지만 자동 반영 기준에 못 미치거나 ‘검토 후 반영’·‘후보만 쌓기’ 방식인 것)를 보여 주고 반영·무시한다.
export const DEV_REVIEW_STATUS = Object.freeze(['ready', 'pending_review']);

// ── Dusk 매 턴 계산(HandOff/EROSYNC-TURN.md): 장기기억이 기록한 인물만, 원본 축 정의로 변화분 1번 호출 → 분석값(baseProfile)에 반영 ──
// people: [{ name, aliases, memory }], rp: 이번 턴 글, groups: ['axes','sexual']. 사용자 수정값(userOverrides)·잠근 인물은 건드리지 않는다.
export const turnValueOf = (base, key) => key === 'eroticInterest' ? (Number.isFinite(base?.eroticInterest?.level) ? base.eroticInterest.level : null) : (Number.isFinite(base?.[key]) ? base[key] : null);

export * from "./pure-util.js";
export * from "./pure-cbs.js";
export * from "./pure-cycle.js";
export * from "./pure-provider.js";
export * from "./pure-source.js";
export * from "./pure-backup.js";
export * from "./pure-config.js";
export * from "./pure-koco.js";
export * from "./pure-profile.js";
export * from "./pure-session.js";
export * from "./pure-relation.js";
export * from "./pure-analysis.js";
export * from "./pure-director.js";
export * from "./pure-lore.js";
