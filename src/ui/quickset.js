// 빠른 설정 묶음 (1.8.3): 홈 '빠른 설정' 카드. 채팅 입력창 옆 메뉴의 토글은 data/chatmenu.js가 따로 맡는다.
import { h } from './dom.js';
import { switchEl, setSwitch } from './kit.js';
import { loadFairOn, loadDiceOn, DICE_KEY } from '../data/fairplay.js';
import { loadStoryTimeOn } from '../data/storytime.js';
import { diceRow } from './dicedetail.js';
import { loadDiceShow, loadCallShow, DICE_SHOW_KEY, CALL_SHOW_KEY, isBardHost } from '../data/turninfo.js';

export async function quickSettingsCard(ctx) {
  const [fairOn, diceOn, stOn, diceShowOn, callShowOn] = await Promise.all([
    loadFairOn(ctx.api).catch(() => false),
    loadDiceOn(ctx.api).catch(() => false),
    loadStoryTimeOn(ctx.api).catch(() => false),
    loadDiceShow(ctx.api).catch(() => false),
    loadCallShow(ctx.api).catch(() => false)
  ]);
  const failStory = (e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
  // 유저 편향 없애기는 공정한 전개 위에서만 작동 → 공정한 전개가 꺼져 있으면 함께 켜고 이유를 알린다
  let fairCur = !!fairOn, fairSw = null;
  const setFair = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.set(v);
      else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", v ? "on" : "off");
      fairCur = !!v;
      ctx.toast(v ? "공정한 전개를 켰어요. 다음 요청부터 적용돼요." : "공정한 전개를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setDice = async (v) => {
    try {
      if (ctx.fairPlay) await ctx.fairPlay.setDice(v);
      else await ctx.api.pluginStorage.setItem(DICE_KEY, v ? "on" : "off");
      if (v && !fairCur) {
        if (ctx.fairPlay) await ctx.fairPlay.set(true);
        else await ctx.api.pluginStorage.setItem("dusk.ui.fairPlay", "on");
        fairCur = true; if (fairSw) setSwitch(fairSw, true);
        ctx.toast("유저 편향 없애기를 켰어요. 공정한 전개 위에서 작동해서 공정한 전개도 함께 켰어요.");
      } else ctx.toast(v ? "유저 편향 없애기를 켰어요. 다음 요청부터 적용돼요." : "유저 편향 없애기를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setDiceShow = async (v) => {
    try {
      if (ctx.turnInfo) await ctx.turnInfo.setDiceShow(v); else await ctx.api.pluginStorage.setItem(DICE_SHOW_KEY, v ? "on" : "off");
      ctx.toast(v ? "주사위 결과 표시를 켰어요. 다음 응답부터 아래에 보여요." : "주사위 결과 표시를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setCallShow = async (v) => {
    try {
      if (ctx.turnInfo) await ctx.turnInfo.setCallShow(v); else await ctx.api.pluginStorage.setItem(CALL_SHOW_KEY, v ? "on" : "off");
      ctx.toast(v ? "모델 호출 표시를 켰어요. 다음 요청부터 보여요." : "모델 호출 표시를 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setImgFix = async (v) => {
    try {
      if (!ctx.imgFix) throw new Error("이 환경에서는 쓸 수 없어요.");
      await ctx.imgFix.set(v);
      ctx.toast(v ? "이미지 태그 교정을 켰어요. 다음 응답부터 적용돼요." : "이미지 태그 교정을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setImgHint = async (v) => {
    try {
      if (!ctx.imgFix) throw new Error("이 환경에서는 쓸 수 없어요.");
      await ctx.imgFix.setHint(v);
      ctx.toast(v ? "이미지 태그 알림을 켰어요. 다음 요청부터 적용돼요." : "이미지 태그 알림을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const setStory = async (v) => {
    try {
      if (ctx.storyTime) await ctx.storyTime.set(v);
      else await ctx.api.pluginStorage.setItem("dusk.ui.storyTime", v ? "on" : "off");
      ctx.toast(v ? "이야기 시간 삽입을 켰어요. 다음 요청부터 적용돼요." : "이야기 시간 삽입을 껐어요.");
    } catch (e) { failStory(e); }
  };
  const storyRow = (title, text, on, onChange) => h("div", { class: "rb-srow" },
    h("span", { class: "t" }, title, h("small", null, text)),
    switchEl(on, { label: title, onChange: (v, el) => {
      el.setAttribute("aria-checked", v ? "true" : "false");
      onChange(v);
    } })
  );
  return h("section", { class: "rb-card bordered rb-story-helper" },
    (() => { const row = storyRow("공정한 전개", "내 뜻대로만 흐르지 않게 해요.", fairOn, setFair); fairSw = row.querySelector("[role=switch]"); return row; })(),
    diceRow(ctx, { on: diceOn, setOn: setDice, fail: failStory }),
    storyRow("주사위 결과 표시", "응답 아래에 굴린 값과 판정을 보여줘요.", diceShowOn, setDiceShow),
    isBardHost(ctx.api) ? null : storyRow("모델 호출 표시", "모델·걸린 시간·토큰·들어간 로어북을 보여줘요.", callShowOn, setCallShow),
    storyRow("이야기 시간 자동 삽입", "이야기 속 시각을 AI에게 알려줘요.", stOn, setStory),
    ctx.imgFix ? storyRow("이미지 태그 자동 교정", "AI가 틀리게 쓴 에셋 이미지 태그를 이 봇의 실제 에셋 이름으로 고쳐요.", ctx.imgFix.isOn(), setImgFix) : null,
    ctx.imgFix ? storyRow("이미지 태그 상황 알림", "직전 옷·동작과 쓸 수 있는 태그를 AI에게 다시 알려줘요.", ctx.imgFix.isHintOn(), setImgHint) : null
  );
}
