// 유저 편향 없애기 상세 (1.8.3): 홈 빠른 설정·시작 안내가 같이 쓴다. 박스 한 줄(diceRow)을 누르면 상세 창이 열린다.
// 상세 = 쓰기 스위치 + 강도(약하게·보통·강하게) + (고급 모드) 난이도 수치·굴림 개수 직접 입력 + ? 작동 방식.
import { h, replace } from './dom.js';
import { btn, iconBtn, modal, note, segmented, switchEl } from './kit.js';
import { icon } from './icons.js';
import { DICE_LEVELS, MAX_DICE, resolveDice } from '../engine/fairplay.js';
import { DICE_LEVEL_KEY, DICE_CUTS_KEY, DICE_COUNT_KEY, loadDiceLevel, loadDiceCustom } from '../data/fairplay.js';

export const LEVEL_LABEL = { weak: "약하게", normal: "보통", strong: "강하게", custom: "직접 입력" };
const CUT_LABEL = [["easy", "쉬움"], ["normal", "보통"], ["hard", "어려움"], ["extreme", "극악"]];
const cutsLine = (c) => CUT_LABEL.map(([k, t]) => `${t} ${c[k]}`).join(" · ");

async function saveLevel(ctx, level) {
  if (ctx.fairPlay) return ctx.fairPlay.setDiceLevel(level);
  return ctx.api.pluginStorage.setItem(DICE_LEVEL_KEY, level);
}
async function saveCustom(ctx, cuts, count) {
  if (ctx.fairPlay) return ctx.fairPlay.setDiceCustom(cuts, count);
  await ctx.api.pluginStorage.setItem(DICE_CUTS_KEY, JSON.stringify(cuts));
  await ctx.api.pluginStorage.setItem(DICE_COUNT_KEY, String(count));
  return ctx.api.pluginStorage.setItem(DICE_LEVEL_KEY, "custom");
}
// 직접 입력 검사: 1~100 정수, 쉬움 ≤ 보통 ≤ 어려움 ≤ 극악, 굴림 1~6개
export function parseCustom(raw) {
  const cuts = {};
  for (const [k] of CUT_LABEL) { const n = Number(raw[k]); if (!Number.isInteger(n) || n < 1 || n > 100) return { error: "난이도 수치는 1~100 사이 정수로 넣어 주세요." }; cuts[k] = n; }
  if (!(cuts.easy <= cuts.normal && cuts.normal <= cuts.hard && cuts.hard <= cuts.extreme)) return { error: "쉬움 ≤ 보통 ≤ 어려움 ≤ 극악 순서가 되게 넣어 주세요." };
  const count = Number(raw.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_DICE) return { error: `주사위 개수는 1~${MAX_DICE} 사이 정수로 넣어 주세요.` };
  return { cuts, count };
}

// 상세 창. st = { on, level }, setOn(v)는 호출한 쪽(홈·시작 안내)이 저장·안내를 맡는다. 닫히면 st를 최신으로 돌려 준다.
export async function openDiceDetail(ctx, st, { setOn, fail = () => {} }) {
  const custom = await loadDiceCustom(ctx.api);
  const adv = !!ctx.prefs?.advanced;
  await modal(ctx.win, (done) => {
    const cutsEl = h("div", { class: "cuts" });
    const paintCuts = () => replace(cutsEl, cutsLine(resolveDice(st.level, custom.cuts, custom.count).cuts));
    const info = h("div", { class: "rb-dice-info", hidden: true }, note("info", "요청을 보낼 때마다 프로그램이 1~100 주사위를 굴려 AI에게 함께 줘요. AI는 성공할지 불확실한 행동만 이 값으로 가려요. 행동마다 쉬움·보통·어려움·극악 중 난이도 수치가 정해지고, 굴림이 그 수치 이상이면 성공이에요. 강하게일수록 수치가 높아 실패가 늘고, 약하게일수록 성공하기 쉬워요. 공정한 전개가 켜져 있을 때만 작동해요."));
    const help = iconBtn("help", "작동 방식 보기", { onClick: () => { info.hidden = !info.hidden; } });
    const sw = switchEl(st.on, { label: "유저 편향 없애기", onChange: async (v, el) => {
      el.setAttribute("aria-checked", v ? "true" : "false");
      try { await setOn(v); st.on = v; } catch (e) { fail(e); }
    } });
    const seg = segmented(Object.entries(LEVEL_LABEL).filter(([k]) => k !== "custom"), st.level, async (v) => {
      try { await saveLevel(ctx, v); st.level = v; paintCuts(); if (advBox) fill(); } catch (e) { fail(e); }
    }, "강도");
    const inputs = {}; let advBox = null, msg = null;
    const fill = () => { const r = resolveDice(st.level, custom.cuts, custom.count); for (const [k] of CUT_LABEL) inputs[k].value = r.cuts[k]; inputs.count.value = r.count; };
    if (adv) {
      const mk = (key, label, attrs) => { inputs[key] = h("input", { class: "rb-input", type: "number", inputmode: "numeric", "aria-label": label, ...attrs }); return h("label", null, label, inputs[key]); };
      msg = h("div", { class: "rb-dice-msg" });
      advBox = h("section", { class: "lv" },
        h("span", { class: "l" }, "직접 입력 · 이기려면 굴림이 수치 이상이어야 해요"),
        h("div", { class: "rb-dice-grid" },
          ...CUT_LABEL.map(([k, t]) => mk(k, `${t} 수치`, { min: 1, max: 100 })),
          mk("count", "주사위 개수", { min: 1, max: MAX_DICE })),
        msg,
        btn("직접 입력 적용", { size: "sm", onClick: async () => {
          const r = parseCustom({ easy: inputs.easy.value, normal: inputs.normal.value, hard: inputs.hard.value, extreme: inputs.extreme.value, count: inputs.count.value });
          if (r.error) { replace(msg, note("warn", r.error)); return; }
          try { await saveCustom(ctx, r.cuts, r.count); custom.cuts = r.cuts; custom.count = r.count; st.level = "custom"; seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", "false")); replace(msg, note("info", "적용했어요. 다음 요청부터 쓰여요.")); paintCuts(); } catch (e) { fail(e); }
        } }));
      fill();
    }
    paintCuts();
    return h("div", { class: "rb-dialog rb-dice", role: "dialog", "aria-modal": "true", "aria-label": "유저 편향 없애기" },
      h("div", { class: "hd" }, h("b", null, "유저 편향 없애기"), help),
      info,
      h("div", { class: "rb-srow" }, h("span", { class: "t" }, "사용하기", h("small", null, "공정한 전개가 꺼져 있으면 함께 켜져요.")), sw),
      h("section", { class: "lv" }, h("span", { class: "l" }, "강도"), seg, cutsEl),
      advBox,
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(true) })));
  });
  return st;
}

// 홈·시작 안내에 놓는 박스 한 줄. 누르면 상세가 열리고, 현재 상태(꺼짐/강도)가 오른쪽에 보인다.
export function diceRow(ctx, { on, setOn, fail }) {
  const st = { on: !!on, level: "normal" };
  const val = h("span", { class: "val" }, st.on ? LEVEL_LABEL.normal : "꺼짐");
  const paint = () => replace(val, st.on ? (LEVEL_LABEL[st.level] ?? "보통") : "꺼짐");
  loadDiceLevel(ctx.api).then((l) => { st.level = l; paint(); }).catch(() => {});
  const row = h("button", { type: "button", class: "rb-srow dicebox", id: "rb-dice-row", "aria-haspopup": "dialog", onClick: async () => { await openDiceDetail(ctx, st, { setOn, fail }); paint(); } },
    h("span", { class: "t" }, "유저 편향 없애기", h("small", null, "캐릭터가 나만 편들지 않게 해요.")),
    h("span", { class: "end" }, val, h("span", { class: "go" }, icon("chevron", 16))));
  row.refresh = (v) => { st.on = !!v; paint(); };
  return row;
}
