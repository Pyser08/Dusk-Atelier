// 새 봇 만들기 5단계: 인물 → 범위·등급 → 카드 → 연결 → 첫 메시지·확인
// AI 호출은 카드·연결·첫 메시지 3회(에셋 자동 고르기는 누를 때만 +1회). 호출 전에 횟수를 먼저 보여 준다.
import { h, replace, download } from "../../dom.js";
import { btn, chip, badge, note } from "../../kit.js";
import { mem, fail, avatar, visibleRecords, gradeBadge } from "./common.js";
import { GRADES } from "../../../engine/memorygrade.js";
import { selectRecords, pickLore } from "../../../engine/memorycompose.js";
import { excerptCount, memoryText } from "../../../engine/card/memories.js";
import { autoGrade, tagCountOf, MEMORY_LABEL } from "../../../engine/card/grade.js";
import { parseTags, calcStats } from "../../../engine/card/tags.js";
import { editCard, defaultImage } from "../../../engine/card/card.js";
import { sceneAt, draftFirstMessage } from "../../../data/memoryrewind.js";
import { buildCardCharacter } from "../../../data/cardbot.js";
import { generateCard, generateLink, listBotImages, pickIllustrations, roleNamesOf } from "../../../data/cardflow.js";
import { insertCharacter } from "../../../data/addcharacter.js";
import { ensureCharacterInOrder } from "../../../engine/character.js";
import { isGenerating, Busy } from "../../../engine/safety.js";
import { cardPreview, assetThumb } from "../../card/preview.js";
import { cardPng } from "../../card/render.js";

const STEPS = ["인물", "범위·등급", "카드", "연결", "확인"];
const IMAGE_USE = [["card", "카드 이미지(PNG)"], ["illustration", "카드 일러스트 에셋"], ["source", "원본 봇 이미지"], ["none", "없음"]];
const LEVELS = ["M1", "M2", "M3"];

const textarea = (label, value, rows, onChange) => { const t = h("textarea", { class: "rb-input", style: `min-height:${rows}px;height:auto;padding:10px`, "aria-label": label, placeholder: label.includes("추가 지시") ? `${label} (선택)` : null, onChange: (e) => onChange(e.target.value) }); t.value = value ?? ""; return t; };
const field = (label, ...kids) => h("div", { class: "rb-mem-field" }, h("span", null, label), ...kids);
const input = (label, value, onChange) => h("input", { class: "rb-input", "aria-label": label, value: value ?? "", onChange: (e) => onChange(e.target.value) });
const slider = (label, value, min, max, step, onInput) => h("label", { class: "rb-card-slider" }, h("span", null, label), h("input", { type: "range", min, max, step, value, "aria-label": label, onInput: (e) => onInput(+e.target.value) }));

export async function renderCompose(env, host) {
  const m = mem(env.ctx), { ctx, folder, bot, chatItem } = env, M = ctx.memory;
  const people = Object.entries(folder.people ?? {}).filter(([, p]) => visibleRecords(p).length);
  if (!people.length) return replace(host, h("div", { class: "rb-empty" }, "기록된 인물이 있어야 새 봇을 만들 수 있어요."));
  const total = chatItem.chat?.message?.length ?? 0, messages = chatItem.chat?.message ?? [];
  const cfg = await M.cards.getCfg();
  const c = m.compose ??= {};
  for (const [k, v] of Object.entries({ step: 0, keys: [people[0][0]], minGrade: "C", from: 1, to: total || 9999, gradeSet: null, card: null, mode: "memory", picks: null, entryLevels: [...cfg.entryLevels], lang: cfg.lang, extra: "", linkExtra: cfg.linkExtra ?? "", link: null, first: "", name: "", imageUse: cfg.imageUse, withPng: cfg.withPng, copyExtras: false, withRel: true, calls: 0, assets: null, aiPicks: null, work: Promise.resolve() })) if (!(k in c)) c[k] = v;
  const main = folder.people[c.keys[0]], names = main ? [main.name, ...(main.aliases ?? [])] : [];
  const parsed = parseTags(cfg.tagText);
  const model = env.idx.settings.model;
  const records = () => selectRecords(folder, c.keys, { minGrade: c.minGrade, from: c.from - 1, to: c.to - 1 });
  const cardGrade = () => c.gradeSet ?? autoGrade(records());
  const go = async (s) => { await c.work; c.step = s; renderCompose(env, host); };
  const again = () => renderCompose(env, host);
  const guard = (fn) => async () => { try { await fn(); } catch (e) { fail(ctx)(e); again(); } };

  // 카드 편집은 순서대로 한 줄로 처리한다(해시 계산이 비동기라서).
  const apply = (patch) => { c.work = c.work.then(async () => { c.card = await editCard(c.card, patch); c.link = null; preview.draw(c.card); }).catch(fail(ctx)); return c.work; };
  const preview = cardPreview(ctx);

  const stepper = h("ol", { class: "rb-mem-steps" }, STEPS.map((t, i) => h("li", { "aria-current": i === c.step ? "step" : null, class: i < c.step ? "done" : "" }, `${i + 1}. ${t}`)));
  const nav = (ok = true, nextLabel = "다음") => h("div", { class: "rb-mem-sact" }, c.step > 0 ? btn("이전", { onClick: () => go(c.step - 1) }) : null, c.step < 4 ? btn(nextLabel, { kind: "primary", disabled: !ok, onClick: () => go(c.step + 1) }) : null);
  const callNote = h("p", { class: "rb-muted" }, `이번 만들기에서 AI ${c.calls}회 호출했어요.`);
  let body;

  if (c.step === 0) {
    body = h("div", null, h("p", { class: "rb-muted" }, "주인공 1명을 고르고, 함께 가져올 인물을 체크하세요."),
      h("div", { class: "rb-mem-grid" }, people.map(([k, p]) => h("label", { class: "rb-mem-card pick" }, h("input", { type: "radio", name: "main", checked: c.keys[0] === k, onChange: () => { c.keys = [k]; c.picks = null; c.card = null; c.link = null; again(); } }), avatar(p.name), h("span", { class: "txt" }, h("span", { class: "name" }, p.name), h("span", { class: "meta" }, `기록 ${visibleRecords(p).length}`))))),
      people.length > 1 ? field("함께 가져올 인물", h("div", { class: "rb-mem-chats" }, people.filter(([k]) => k !== c.keys[0]).map(([k, p]) => chip(p.name, { pressed: c.keys.includes(k), onClick: () => { c.keys = c.keys.includes(k) ? c.keys.filter((x) => x !== k) : [...c.keys, k]; c.card = null; c.link = null; again(); } })))) : null, nav());
  } else if (c.step === 1) {
    const rs = records(), ex = excerptCount(rs), g = cardGrade();
    body = h("div", null, env.backend.id === "bardwiki" && !rs.length ? note("warn", "BardWiki 기록에는 등급이 없어요. 인물 탭의 더보기에서 '등급 매기기(AI)'를 먼저 해 주세요.") : null,
      field("기록 등급 하한", h("div", { class: "rb-mem-chats" }, GRADES.map((x) => chip(`${x}+`, { pressed: c.minGrade === x, onClick: () => { c.minGrade = x; c.card = null; c.link = null; again(); } })))),
      h("div", { class: "rb-mem-range" }, h("label", null, "시작 메시지 ", h("input", { class: "rb-input", type: "number", min: 1, max: total, value: c.from, onChange: (e) => { c.from = Math.max(1, +e.target.value || 1); c.card = null; again(); } })), h("label", null, "끝 메시지 ", h("input", { class: "rb-input", type: "number", min: 1, max: total, value: Math.min(c.to, total || c.to), onChange: (e) => { c.to = Math.max(c.from, +e.target.value || total); c.card = null; again(); } }))),
      field(`카드 등급 (${c.gradeSet ? "직접 정함" : "구간의 최고 등급으로 자동"})`, h("div", { class: "rb-mem-chats" }, chip("자동", { pressed: !c.gradeSet, onClick: () => { c.gradeSet = null; c.card = null; again(); } }), GRADES.map((x) => chip(x, { pressed: c.gradeSet === x, onClick: () => { c.gradeSet = x; c.card = null; again(); } })))),
      h("p", null, `선택된 기록 ${rs.length}개 · 원문 발췌 대상 ${ex}개 · 카드 ${g}등급(태그 ${tagCountOf(g)}개)`),
      note("info", "AI 3회 호출: 카드 → 연결 문서 → 첫 메시지. 일러스트를 AI가 고르게 하면 1회 더 들어요."), nav(rs.length > 0));
  } else if (c.step === 2) {
    body = renderCardStep();
  } else if (c.step === 3) {
    body = renderLinkStep();
  } else {
    body = renderFinish();
  }
  replace(host, stepper, body);
  if (c.card && c.step === 2) preview.draw(c.card);

  // ───────── 3단계: 카드 ─────────
  function renderCardStep() {
    const rs = records(), others = c.keys.slice(1).map((k) => folder.people[k]?.name).filter(Boolean);
    const make = btn(c.card ? "카드 다시 만들기 (AI 1회)" : "AI로 카드 만들기 (AI 1회)", { kind: c.card ? "" : "primary", onClick: guard(async () => {
      make.disabled = true; ctx.toast("카드를 만드는 중이에요…");
      const { card, body: b } = await generateCard(ctx.api, { folder, records: rs, messages, name: main.name, grade: cardGrade(), others, cfg, model, lang: c.lang, roleNames: await roleNamesOf(ctx.api), source: { botName: bot.character.name, chatName: chatItem.name, chaId: bot.id, chatId: chatItem.id, from: c.from, to: c.to, minGrade: c.minGrade, people: c.keys.map((k) => folder.people[k]?.name) } });
      c.calls++; c.card = card; c.link = null; c.picks = null; c.aiPicks = null; c.warnings = b.warnings;
      const assets = c.assets ??= await listBotImages(ctx.api, bot.character);
      if (assets.length && !card.image.ref) c.card = { ...card, image: { ...card.image, ref: assets[0].path } };
      again();
    }) });
    const lang = h("select", { class: "rb-input", "aria-label": "언어", onChange: (e) => { c.lang = e.target.value; } }, [["ko", "한국어"], ["en", "English"]].map(([v, l]) => h("option", { value: v, selected: c.lang === v }, l)));
    if (!c.card) return h("div", null, h("p", { class: "rb-muted" }, "선택한 기록(B 이상은 원문 발췌 포함)으로 이름·키워드·대사·태그·프로필·기억이 든 카드를 만들어요."),
      h("div", { class: "rb-mem-range" }, h("label", null, "언어 ", lang)), textarea("카드 추가 지시", c.extra, 60, (v) => { c.extra = v; }), h("div", { class: "rb-mem-sact" }, make), callNote, nav(false));
    const card = c.card, catalog = [...new Set([...Object.keys(parsed.tags), ...Object.keys(card.tagDefinitions ?? {})])], limit = tagCountOf(card.grade);
    const toggleTag = (n) => { const on = card.tags.includes(n); const tags = on ? card.tags.filter((t) => t !== n) : [...card.tags, n].slice(0, limit); const defs = Object.fromEntries(tags.map((t) => [t, parsed.tags[t] ?? card.tagDefinitions?.[t] ?? { description: t, stats: {} }])); return apply({ tags, tagDefinitions: defs, stats: calcStats(tags, defs) }).then(again); };
    const setGrade = (g) => { const tags = card.tags.slice(0, tagCountOf(g)), defs = Object.fromEntries(tags.map((t) => [t, card.tagDefinitions[t]])); return apply({ grade: g, tags, tagDefinitions: defs, stats: calcStats(tags, defs) }).then(again); };
    // 태그 목록은 수백 개일 수 있어서 검색해서 고른다(이름·설명).
    const tagPicker = () => {
      const q = h("input", { class: "rb-input", placeholder: "태그 검색", "aria-label": "태그 검색" }), list = h("div", { class: "rb-mem-chats rb-card-tagpool" });
      const paint = () => { const k = q.value.trim().toLowerCase(), hits = catalog.filter((n) => !card.tags.includes(n) && (!k || n.toLowerCase().includes(k) || String(parsed.tags[n]?.description ?? card.tagDefinitions?.[n]?.description ?? "").toLowerCase().includes(k)));
        replace(list, hits.slice(0, 60).map((n) => chip(n, { onClick: () => toggleTag(n) })), hits.length > 60 ? h("span", { class: "rb-muted" }, `외 ${hits.length - 60}개 — 검색으로 좁혀 보세요`) : null); };
      q.addEventListener("input", paint); paint();
      return h("details", { class: "rb-mem-man", open: card.tags.length < limit }, h("summary", null, card.tags.length < limit ? "태그 추가" : "태그 바꾸기(먼저 하나를 빼세요)"), q, list);
    };
    const crop = (k, v) => { c.card = { ...c.card, image: { ...c.card.image, crop: { ...c.card.image.crop, [k]: v } } }; preview.draw(c.card); };
    const cur = c.card.image;
    const picks = c.aiPicks ?? [];
    const findAi = btn("AI로 에셋 고르기 (AI 1회)", { onClick: guard(async () => {
      const assets = c.assets ??= await listBotImages(ctx.api, bot.character);
      if (!assets.length) { ctx.toast("이 봇에는 고를 수 있는 이미지 에셋이 없어요.", { error: true }); return; }
      ctx.toast("어울리는 에셋을 찾는 중이에요…");
      c.aiPicks = await pickIllustrations(ctx.api, { card, assets, model }); c.calls++;
      if (!c.aiPicks.length) ctx.toast("이름만으로는 고르기 어려워서 직접 골라 주세요.");
      else { c.card = { ...c.card, image: { ...cur, ref: c.aiPicks[0].path } }; }
      again();
    }) });
    const pick = (a) => { c.card = { ...c.card, image: { ...cur, ref: a.path } }; again(); };
    const allBox = h("details", { class: "rb-mem-man", open: !!c.allOpen, onToggle: (e) => { c.allOpen = e.target.open; } }, h("summary", null, `모든 이미지 에셋에서 고르기${c.assets ? ` (${c.assets.length})` : ""}`),
      h("div", { class: "rb-card-thumbs" }, (c.assets ?? []).slice(0, 300).map((a) => assetThumb(ctx, a, { selected: cur.ref === a.path, onClick: () => pick(a) }))));
    if (!c.assets) listBotImages(ctx.api, bot.character).then((a) => { c.assets = a; if (c.step === 2 && !c.card?.image?.ref && a.length) { c.card = { ...c.card, image: { ...c.card.image, ref: a[0].path } }; } again(); }).catch(() => { c.assets = []; });
    const saveOnly = btn("카드만 저장", { onClick: guard(async () => { await c.work; await M.cards.save(c.card); ctx.toast("카드를 저장했어요. 카드 탭에서 볼 수 있어요."); }) });
    const dl = btn("PNG 받기", { onClick: guard(async () => { await c.work; const bmp = await preview.bitmapFor(c.card.image.ref); download(`${c.card.name}-${c.card.grade}.png`, new Blob([await cardPng(c.card, bmp)], { type: "image/png" })); }) });
    return h("div", { class: "rb-card-edit" },
      h("div", { class: "rb-card-side" }, preview.el, h("div", { class: "rb-mem-sact" }, saveOnly, dl),
        slider("확대", cur.crop.zoom, 0.5, 3, 0.01, (v) => crop("zoom", v)), slider("좌우", cur.crop.x, -0.5, 0.5, 0.005, (v) => crop("x", v)), slider("상하", cur.crop.y, -0.5, 0.5, 0.005, (v) => crop("y", v)), slider("회전", cur.crop.rotation, -30, 30, 0.5, (v) => crop("rotation", v)),
        slider("밤 베일", cur.veil, 0, 1, 0.01, (v) => { c.card = { ...c.card, image: { ...c.card.image, veil: v } }; preview.draw(c.card); })),
      h("div", { class: "rb-card-form" },
        c.warnings?.length ? note("warn", c.warnings.slice(0, 3).join(" · ")) : null,
        field("등급", h("div", { class: "rb-mem-chats" }, GRADES.map((g) => chip(g, { pressed: card.grade === g, onClick: () => setGrade(g) })))),
        field("이름", input("이름", card.name, (v) => apply({ name: v.trim() || card.name }).then(again))), field("키워드", input("키워드", card.keyword, (v) => apply({ keyword: v }))),
        field("대표 대사", textarea("대표 대사", card.quote, 60, (v) => apply({ quote: v }))),
        field(`태그 (${card.tags.length}/${limit})`, limit ? h("div", null, h("div", { class: "rb-mem-chats" }, card.tags.map((n) => chip(`${n} ✕`, { pressed: true, onClick: () => toggleTag(n) }))), tagPicker()) : h("span", { class: "rb-muted" }, "D등급은 태그가 없어요.")),
        field("일러스트", h("div", { class: "rb-mem-sact" }, findAi), picks.length ? h("div", { class: "rb-card-thumbs" }, picks.map((a) => assetThumb(ctx, a, { selected: cur.ref === a.path, onClick: () => pick(a) }))) : null, allBox),
        field("BEFORE", textarea("BEFORE", card.before, 90, (v) => apply({ before: v }))), field("AFTER", textarea("AFTER", card.after, 90, (v) => apply({ after: v }))),
        field("지금 관계", textarea("관계", card.relationship, 70, (v) => apply({ relationship: v }))), field("현재 상태", textarea("현재 상태", card.currentState, 60, (v) => apply({ currentState: v }))),
        h("details", { class: "rb-mem-man" }, h("summary", null, `기억 ${card.memories.length}개`), h("ul", { class: "rb-mem-reclist" }, card.memories.map((x) => h("li", { class: "rb-mem-rec" }, badge(x.importance, x.importance === "M3" ? "acc" : x.importance === "M2" ? "acc2" : "mute"), h("div", { class: "txt" }, memoryText(x, card.name)), btn("지우기", { size: "sm", onClick: () => apply({ memories: card.memories.filter((y) => y !== x) }).then(again) }))))),
        h("div", { class: "rb-mem-sact" }, make), callNote, nav(true)));
  }

  // ───────── 4단계: 연결 ─────────
  function renderLinkStep() {
    const card = c.card, mems = card.memories ?? [];
    c.picks ??= pickLore(bot.character.globalLore, { names: [card.name, ...names] });
    const modeBox = h("div", { class: "rb-mem-chats" }, [["memory", "기억 연결"], ["fate", "운명 연결"]].map(([v, l]) => chip(l, { pressed: c.mode === v, onClick: () => { c.mode = v; c.link = null; again(); } })));
    const picked = mems.filter((x) => c.entryLevels.includes(x.importance)).length;
    const make = btn(c.link ? "연결 문서 다시 만들기 (AI 1회)" : "연결 문서 만들기 (AI 1회)", { kind: c.link ? "" : "primary", onClick: guard(async () => {
      make.disabled = true; ctx.toast("연결 문서를 만드는 중이에요…");
      c.link = await generateLink(ctx.api, { card, mode: c.mode, originalDesc: bot.character.desc ?? "", entryLevels: c.entryLevels, lang: c.lang, extra: [cfg.linkExtra, c.linkExtra].filter(Boolean).join("\n"), model }); c.calls++; again();
    }) });
    const link = c.link;
    return h("div", null,
      h("p", { class: "rb-muted" }, c.mode === "memory" ? "기억 연결: 새 봇이 이 카드의 일을 이미 겪은 것으로 기억해요. 설명은 AFTER 기준이에요." : "운명 연결: 새 봇은 아직 겪지 않았고, 카드의 일이 앞으로 흘러갈 방향으로 들어가요. 설명은 BEFORE 기준이에요."),
      field("연결 방식", modeBox),
      field(`로어북 항목으로 넣을 기억 (${picked}개)`, h("div", { class: "rb-mem-chats" }, LEVELS.map((lv) => chip(`${lv} ${MEMORY_LABEL[lv]} ${mems.filter((x) => x.importance === lv).length}`, { pressed: c.entryLevels.includes(lv), onClick: () => { c.entryLevels = c.entryLevels.includes(lv) ? c.entryLevels.filter((x) => x !== lv) : [...c.entryLevels, lv]; c.link = null; again(); } })))),
      field("원본 봇 로어북 복사", c.picks.length ? h("ul", { class: "rb-mem-reclist" }, c.picks.map((p) => h("li", { class: "rb-mem-rec" }, h("input", { type: "checkbox", checked: p.checked, "aria-label": p.entry.comment || p.entry.key, onChange: (e) => { p.checked = e.target.checked; } }), h("div", { class: "txt" }, p.entry.comment || p.entry.key || "(이름 없음)"), badge(p.reason, p.reason === "본인" ? "acc" : p.reason === "관련" ? "acc2" : "mute")))) : h("span", { class: "rb-muted" }, "후보가 없어요. 정규식·트리거·모듈은 마지막 단계에서 고를 수 있어요.")),
      h("div", { class: "rb-mem-range" }, h("label", null, "언어 ", h("select", { class: "rb-input", onChange: (e) => { c.lang = e.target.value; c.link = null; } }, [["ko", "한국어"], ["en", "English"]].map(([v, l]) => h("option", { value: v, selected: c.lang === v }, l))))),
      textarea("연결 추가 지시", c.linkExtra, 60, (v) => { c.linkExtra = v; }),
      h("div", { class: "rb-mem-sact" }, make),
      link ? h("div", { class: "rb-mem-sec rb-card" }, field("설명", textarea("설명", link.desc, 160, (v) => { link.desc = v; })), field("관계 기록 (상시 로어북)", textarea("관계 기록", link.relationship, 120, (v) => { link.relationship = v; })),
        h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.withRel, onChange: (e) => { c.withRel = e.target.checked; } }), "관계 기록을 상시 로어북 항목으로 넣기"),
        h("details", { class: "rb-mem-man", open: true }, h("summary", null, `기억 항목 ${link.entries.length}개`), link.entries.map((e) => h("div", { class: "rb-mem-field" }, h("span", null, `${e.id} · ${e.memory}`), input("키워드", e.key, (v) => { e.key = v; }), textarea("내용", e.content, 70, (v) => { e.content = v; }))))) : null,
      callNote, nav(!!link));
  }

  // ───────── 5단계: 첫 메시지·확인 ─────────
  function renderFinish() {
    const card = c.card, link = c.link;
    if (!card || !link) return h("div", { class: "rb-empty" }, "카드와 연결 문서를 먼저 만들어 주세요.");
    const nm = h("input", { class: "rb-input", value: c.name || `${bot.character.name} · ${card.name}`, "aria-label": "새 봇 이름", onInput: (e) => { c.name = e.target.value; } });
    const first = textarea("첫 메시지", c.first, 130, (v) => { c.first = v; });
    const genFirst = btn(c.first ? "첫 메시지 다시 쓰기 (AI 1회)" : "첫 메시지 만들기 (AI 1회)", { kind: c.first ? "" : "primary", onClick: guard(async () => {
      genFirst.disabled = true; ctx.toast("첫 메시지를 쓰는 중이에요…");
      c.first = await draftFirstMessage(ctx.api, { name: card.name, scene: sceneAt(folder, c.to - 1), relationship: link.relationship, model, lang: c.lang }); c.calls++; again();
    }) });
    const create = btn("새 봇 만들기", { kind: "primary", onClick: async () => {
      try {
        create.disabled = true; await c.work;
        const need = c.imageUse === "card" || c.withPng;
        let cardAssetKey = null;
        if (need) { const bmp = await preview.bitmapFor(card.image.ref); cardAssetKey = await ctx.api.saveAsset(await cardPng(card, bmp)); if (typeof cardAssetKey !== "string" || !cardAssetKey) throw new Error("카드 이미지를 저장하지 못했어요."); }
        await M.cards.save(card);
        const db = await ctx.api.getDatabase(["characters"]); const characters = Array.isArray(db?.characters) ? db.characters : [];
        const { created } = await insertCharacter(ctx.api, { characters, hooks: { created: (id) => ctx.watcher?.markKnown?.(id) }, ensureInOrder: (id) => ensureCharacterInOrder(ctx.api, id), isGenerating, Busy,
          build: (all) => buildCardCharacter({ source: bot.character, name: nm.value, card, link, firstMessage: c.first || bot.character.firstMessage || "", lorePicks: c.picks ?? [], withRelationship: c.withRel, characters: all, chatName: chatItem.name, minGrade: c.minGrade, imageUse: c.imageUse, illustrationPath: card.image.ref, cardAssetKey, withPng: c.withPng, copyExtras: c.copyExtras }) });
        m.bots = null; m.compose = null; ctx.toast(`'${created.name}' 봇을 만들었어요.`); env.redraw();
      } catch (e) { create.disabled = false; fail(ctx)(e); }
    } });
    return h("div", null, h("div", { class: "rb-card-edit" }, h("div", { class: "rb-card-side" }, preview.el),
      h("div", { class: "rb-card-form" }, field("이름", nm), field("첫 메시지", first), h("div", { class: "rb-mem-sact" }, genFirst),
        field("봇 이미지", h("select", { class: "rb-input", "aria-label": "봇 이미지", onChange: (e) => { c.imageUse = e.target.value; again(); } }, IMAGE_USE.map(([v, l]) => h("option", { value: v, selected: c.imageUse === v }, l)))),
        h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.withPng, onChange: (e) => { c.withPng = e.target.checked; } }), "카드 PNG를 새 봇 에셋에도 넣기"),
        h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.copyExtras, onChange: (e) => { c.copyExtras = e.target.checked; } }), "정규식·트리거·모듈도 복사"),
        h("p", { class: "rb-muted" }, `제작자 노트에 출처(원본 봇·채팅·날짜·등급 하한 ${c.minGrade}+)와 카드 정보를 적고, 새 봇 태그에 카드 태그 이름을 합쳐요. 카드는 카드 탭에도 저장돼요. 원본 봇과 채팅은 바뀌지 않아요.`),
        callNote, h("div", { class: "rb-mem-sact" }, btn("이전", { onClick: () => go(3) }), create))));
  }
  if (c.step === 4 && c.card) preview.draw(c.card);
}
