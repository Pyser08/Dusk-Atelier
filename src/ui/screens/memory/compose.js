// 새 봇 만들기 5단계: 인물 → 범위·등급 → 로어북 → AI 생성 → 확인·생성
import { h, replace } from "../../dom.js";
import { btn, chip, badge, note } from "../../kit.js";
import { mem, fail, gradeBadge, avatar, visibleRecords } from "./common.js";
import { GRADES } from "../../../engine/memorygrade.js";
import { selectRecords, sceneBlocks, pickLore, relationshipPrompt, descPrompt, relationLore } from "../../../engine/memorycompose.js";
import { sceneAt, draftFirstMessage } from "../../../data/memoryrewind.js";
import { buildMemoryCharacter } from "../../../data/memorybot.js";
import { insertCharacter } from "../../../data/addcharacter.js";
import { ensureCharacterInOrder } from "../../../engine/character.js";
import { runAI } from "../../../engine/runai.js";
import { isGenerating, Busy } from "../../../engine/safety.js";

const STEPS = ["인물", "범위·등급", "로어북", "AI 생성", "확인"];

export async function renderCompose(env, host) {
  const m = mem(env.ctx), { ctx, folder, bot, chatItem } = env;
  const people = Object.entries(folder.people ?? {}).filter(([, p]) => visibleRecords(p).length);
  if (!people.length) return replace(host, h("div", { class: "rb-empty" }, "기록된 인물이 있어야 새 봇을 만들 수 있어요."));
  const total = chatItem.chat?.message?.length ?? 0;
  const c = m.compose = { step: 0, keys: [people[0][0]], minGrade: "C", from: 1, to: total || 9999, picks: null, relationship: "", desc: "", first: "", lang: "ko", budget: 1500, extra: "", name: "", useImage: false, copyExtras: false, asAlways: true, perRecord: true, ...m.compose };
  const main = folder.people[c.keys[0]], names = main ? [main.name, ...(main.aliases ?? [])] : [];
  const records = () => selectRecords(folder, c.keys, { minGrade: c.minGrade, from: c.from - 1, to: c.to - 1 });
  const go = (s) => { c.step = s; renderCompose(env, host); };
  const stepper = h("ol", { class: "rb-mem-steps" }, STEPS.map((t, i) => h("li", { "aria-current": i === c.step ? "step" : null, class: i < c.step ? "done" : "" }, `${i + 1}. ${t}`)));
  const nav = (ok = true, nextLabel = "다음") => h("div", { class: "rb-mem-sact" }, c.step > 0 ? btn("이전", { onClick: () => go(c.step - 1) }) : null, c.step < 4 ? btn(nextLabel, { kind: "primary", disabled: !ok, onClick: () => go(c.step + 1) }) : null);
  let body;
  if (c.step === 0) {
    body = h("div", null, h("p", { class: "rb-muted" }, "주인공 1명을 고르고, 관계 기록에 함께 넣을 인물을 체크하세요."),
      h("div", { class: "rb-mem-grid" }, people.map(([k, p]) => h("label", { class: "rb-mem-card pick" }, h("input", { type: "radio", name: "main", checked: c.keys[0] === k, onChange: () => { c.keys = [k]; c.picks = null; renderCompose(env, host); } }), avatar(p.name), h("span", { class: "txt" }, h("span", { class: "name" }, p.name), h("span", { class: "meta" }, `기록 ${visibleRecords(p).length}`))))),
      people.length > 1 ? h("div", { class: "rb-mem-field" }, h("span", null, "함께 가져올 인물"), h("div", { class: "rb-mem-chats" }, people.filter(([k]) => k !== c.keys[0]).map(([k, p]) => chip(p.name, { pressed: c.keys.includes(k), onClick: () => { c.keys = c.keys.includes(k) ? c.keys.filter((x) => x !== k) : [...c.keys, k]; renderCompose(env, host); } })))) : null, nav());
  } else if (c.step === 1) {
    const rs = records(), chars = rs.reduce((n, r) => n + r.act.length, 0);
    body = h("div", null, env.backend.id === "bardwiki" && !rs.length ? note("warn", "BardWiki 기록에는 등급이 없어요. 인물 탭의 더보기에서 '등급 매기기(AI)'를 먼저 해 주세요.") : null,
      h("div", { class: "rb-mem-field" }, h("span", null, "등급 하한"), h("div", { class: "rb-mem-chats" }, GRADES.map((g) => chip(`${g}+`, { pressed: c.minGrade === g, onClick: () => { c.minGrade = g; renderCompose(env, host); } })))),
      h("div", { class: "rb-mem-range" }, h("label", null, "시작 메시지 ", h("input", { class: "rb-input", type: "number", min: 1, max: total, value: c.from, onChange: (e) => { c.from = Math.max(1, +e.target.value || 1); renderCompose(env, host); } })), h("label", null, "끝 메시지 ", h("input", { class: "rb-input", type: "number", min: 1, max: total, value: Math.min(c.to, total || c.to), onChange: (e) => { c.to = Math.max(c.from, +e.target.value || total); renderCompose(env, host); } }))),
      h("p", null, `선택된 기록 ${rs.length}개 · 약 ${chars.toLocaleString()}자`), nav(rs.length > 0));
  } else if (c.step === 2) {
    c.picks ??= pickLore(bot.character.globalLore, { names });
    body = h("div", null, h("p", { class: "rb-muted" }, "이 인물과 관련 있어 보이는 로어북이에요. 체크한 항목만 새 봇에 복사해요. 정규식·트리거·모듈은 마지막 단계에서 고를 수 있어요."),
      c.picks.length ? h("ul", { class: "rb-mem-reclist" }, c.picks.map((p) => h("li", { class: "rb-mem-rec" }, h("input", { type: "checkbox", checked: p.checked, "aria-label": p.entry.comment || p.entry.key, onChange: (e) => { p.checked = e.target.checked; } }), h("div", { class: "txt" }, p.entry.comment || p.entry.key || "(이름 없음)"), badge(p.reason, p.reason === "본인" ? "acc" : p.reason === "관련" ? "acc2" : "mute")))) : h("div", { class: "rb-empty" }, "후보가 없어요."), nav());
  } else if (c.step === 3) {
    const rs = records(), blocks = sceneBlocks(folder, rs), others = c.keys.slice(1).map((k) => folder.people[k]?.name).filter(Boolean);
    const model = env.idx.settings.model;
    const ta = (key, label, rows, redo) => { const t = h("textarea", { class: "rb-input", style: `min-height:${rows}px;height:auto;padding:10px`, "aria-label": label, onInput: (e) => { c[key] = e.target.value; } }); t.value = c[key]; return h("div", { class: "rb-mem-field" }, h("span", null, label, " ", btn("다시 쓰기", { size: "sm", onClick: async () => { try { await redo(); renderCompose(env, host); } catch (e) { fail(ctx)(e); } } })), t); };
    const genRel = async () => { c.relationship = (await runAI(ctx.api, relationshipPrompt({ name: main.name, blocks, others, budget: c.budget, lang: c.lang, extra: c.extra }), model)).trim(); };
    const genDesc = async () => { c.desc = (await runAI(ctx.api, descPrompt({ name: main.name, original: bot.character.desc ?? "", relationship: c.relationship, lang: c.lang, extra: c.extra }), model)).trim(); };
    const genFirst = async () => { c.first = await draftFirstMessage(ctx.api, { name: main.name, scene: sceneAt(folder, c.to - 1), relationship: c.relationship, model, lang: c.lang }); };
    const all = btn(c.relationship ? "전체 다시 생성" : "AI로 생성", { kind: "primary", onClick: async () => { try { ctx.toast("만드는 중이에요…"); await genRel(); await genDesc(); await genFirst(); renderCompose(env, host); } catch (e) { fail(ctx)(e); } } });
    body = h("div", null, h("div", { class: "rb-mem-range" },
      h("label", null, "언어 ", h("select", { class: "rb-input", onChange: (e) => { c.lang = e.target.value; } }, [["ko", "한국어"], ["en", "English"]].map(([v, l]) => h("option", { value: v, selected: c.lang === v }, l)))),
      h("label", null, "관계 기록 토큰 ", h("input", { class: "rb-input", type: "number", min: 300, max: 6000, step: 100, value: c.budget, onChange: (e) => { c.budget = +e.target.value || 1500; } }))),
      h("textarea", { class: "rb-input", placeholder: "추가 지시 (선택)", style: "min-height:60px;height:auto;padding:10px", "aria-label": "추가 지시", onInput: (e) => { c.extra = e.target.value; } }), h("div", { class: "rb-mem-sact" }, all),
      ta("relationship", "관계 기록", 140, genRel), ta("desc", "설명", 120, genDesc), ta("first", "첫 메시지", 120, genFirst),
      h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.asAlways, onChange: (e) => { c.asAlways = e.target.checked; } }), "관계 기록을 상시 로어북 항목으로 넣기"),
      h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.perRecord, onChange: (e) => { c.perRecord = e.target.checked; } }), "B 이상 기록마다 키워드 로어북 항목 만들기"), nav(true));
  } else {
    const nm = h("input", { class: "rb-input", value: c.name || `${bot.character.name} · ${main.name}`, "aria-label": "새 봇 이름", onInput: (e) => { c.name = e.target.value; } });
    const create = btn("새 봇 만들기", { kind: "primary", onClick: async () => {
      try {
        create.disabled = true;
        const db = await ctx.api.getDatabase(["characters"]); const characters = Array.isArray(db?.characters) ? db.characters : [];
        const src = bot.character, rs = records();
        const { created } = await insertCharacter(ctx.api, { characters, hooks: { created: (id) => ctx.watcher?.markKnown?.(id) }, ensureInOrder: (id) => ensureCharacterInOrder(ctx.api, id), isGenerating, Busy,
          build: (all) => buildMemoryCharacter({ name: nm.value, desc: c.desc || src.desc || "", firstMessage: c.first || src.firstMessage || "", relationship: c.relationship, source: src, records: rs.map((r) => ({ ...r, place: folder.scenes.find((s) => s.id === r.sit)?.place })), mainName: main.name, lorePicks: c.picks ?? [], asAlways: c.asAlways, perRecord: c.perRecord, useImage: c.useImage, copyExtras: c.copyExtras, minGrade: c.minGrade, chatName: chatItem.name, characters: all }) });
        m.bots = null; m.compose = null; ctx.toast(`'${created.name}' 봇을 만들었어요.`);
        env.redraw();
      } catch (e) { create.disabled = false; fail(ctx)(e); }
    } });
    body = h("div", null, h("div", { class: "rb-mem-field" }, h("span", null, "이름"), nm),
      h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.useImage, onChange: (e) => { c.useImage = e.target.checked; } }), "원본 봇의 이미지 사용"),
      h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: c.copyExtras, onChange: (e) => { c.copyExtras = e.target.checked; } }), "정규식·트리거·모듈도 복사"),
      h("p", { class: "rb-muted" }, `제작자 노트에 출처(원본 봇·채팅·날짜·등급 하한 ${c.minGrade}+)를 적어요. 원본 봇과 채팅은 바뀌지 않아요.`), h("div", { class: "rb-mem-sact" }, btn("이전", { onClick: () => go(3) }), create));
  }
  replace(host, stepper, body);
}
