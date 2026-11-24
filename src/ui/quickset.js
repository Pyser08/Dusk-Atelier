// 빠른 설정 묶음 (1.8.3): 홈 '빠른 설정' 카드. 채팅 입력창 옆 메뉴의 토글은 data/chatmenu.js가 따로 맡는다.
import { h } from './dom.js';
import { switchEl, setSwitch, modal, btn, segmented } from './kit.js';
import { loadFabLook, saveFabLook, FAB_SIZES, FAB_LOOK_DEFAULT } from '../data/floatbtn.js';
import { loadFairOn, loadDiceOn, DICE_KEY } from '../data/fairplay.js';
import { loadStoryTimeOn } from '../data/storytime.js';
import { diceRow } from './dicedetail.js';
import { loadMemoryButtonOn, MEMORY_BUTTON_KEY } from '../data/memorybuttonkey.js';
import { loadDiceShow, loadCallShow, DICE_SHOW_KEY, CALL_SHOW_KEY, isBardHost } from '../data/turninfo.js';

export async function quickSettingsCard(ctx) {
  const [fairOn, diceOn, stOn, diceShowOn, callShowOn, fabOn] = await Promise.all([
    loadFairOn(ctx.api).catch(() => false),
    loadDiceOn(ctx.api).catch(() => false),
    loadStoryTimeOn(ctx.api).catch(() => false),
    loadDiceShow(ctx.api).catch(() => false),
    loadCallShow(ctx.api).catch(() => false),
    loadMemoryButtonOn(ctx.api).catch(() => true)
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
    } catch (e) { failStory(e); if (e && typeof e === "object") e.shown = true; throw e; }   // 상세 창이 실패한 값을 '켜짐'으로 바꾸지 않게 다시 던진다
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
  // 11-22: 떠 있는 버튼(인물 관계도) 없애기. 장기기억 애드온이 꺼져 있으면 설정값만 저장(켜질 때 따름)
  const setNoFab = async (hide) => {
    try { const fab = ctx.memoryButton; const ok = fab?.set ? await fab.set(!hide) : (await ctx.api.pluginStorage.setItem(MEMORY_BUTTON_KEY, hide ? "off" : "on"), true); ctx.toast(hide ? (ok === false ? "저장했어요. 다음 실행부터 버튼이 안 보여요." : "떠 있는 버튼을 없앴어요.") : "떠 있는 버튼을 다시 보여줘요."); } catch (e) { failStory(e); }
  };
  // 11-22: 설정이 길어 스크롤되면 아래쪽을 살짝 흐리게 해 더 있다는 걸 보여준다(끝까지 내리면 사라짐)
  // 11-23: 흐림만으론 스크롤되는 줄 모른다 → 아래에 ‘아래에 더 있어요’ 버튼(누르면 내려감)과 늘 보이는 얇은 스크롤 막대
  const fade = (card) => {
    const more = h("button", { type: "button", class: "rb-qs-hint", "aria-label": "아래 설정 더 보기", onClick: () => card.scrollBy({ top: Math.max(120, card.clientHeight * 0.7), behavior: "smooth" }) }, "아래에 설정이 더 있어요 ⌄");
    const upd = () => { const m = card.scrollHeight - card.scrollTop - card.clientHeight > 4; card.classList.toggle("rb-qs-more", m); more.hidden = !m; };
    card.addEventListener("scroll", upd, { passive: true });
    try { new (card.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver)(upd).observe(card); } catch { /* 없으면 스크롤 때만 */ }
    setTimeout(upd, 0);
    return h("div", { class: "rb-qs-wrap" }, card, more);
  };
  // 2.2.50: 플로팅 버튼 설정(맨 위) — 켜기·끄기, 크기, 투명도를 한 창에서
  let fabCur = !!fabOn;
  const fabVal = h("span", { class: "val" }, fabCur ? "켜짐" : "꺼짐");
  const openFab = async () => {
    let look = await loadFabLook(ctx.api);
    const apply = async (next) => { look = await saveFabLook(ctx.api, { ...look, ...next }); await ctx.memoryButton?.setLook?.(look)?.catch?.(() => {}); draw(); };
    const prev = h("span", { "aria-hidden": "true", style: "display:grid;place-items:center;border-radius:50%;color:#fff;border:1px solid rgba(255,255,255,.3);background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.42),rgba(255,255,255,0) 58%),color-mix(in srgb,var(--rb-acc,#7c5cf0) 60%,transparent);box-shadow:0 4px 12px rgba(0,0,0,.25);transition:all .15s" }, "◎");
    const opIn = h("input", { type: "range", min: "20", max: "100", step: "5", style: "flex:1", "aria-label": "투명도" });
    const opVal = h("b", { style: "min-width:44px;text-align:right" });
    const sizeHost = h("div");
    const sw = switchEl(fabCur, { label: "플로팅 버튼 보이기", onChange: async (v, el) => { el.setAttribute("aria-checked", v ? "true" : "false"); fabCur = v; fabVal.textContent = v ? "켜짐" : "꺼짐"; await setNoFab(!v); } });
    function draw() {
      Object.assign(prev.style, { width: `${look.size}px`, height: `${look.size}px`, opacity: String(look.opacity), fontSize: `${Math.round(look.size * 0.42)}px` });
      opIn.value = String(Math.round(look.opacity * 100)); opVal.textContent = `${Math.round(look.opacity * 100)}%`;
      sizeHost.replaceChildren(segmented(FAB_SIZES.map(([n, l]) => [String(n), l]), String(FAB_SIZES.some(([n]) => n === look.size) ? look.size : FAB_LOOK_DEFAULT.size), (v) => apply({ size: Number(v) }), "버튼 크기"));
    }
    let opT = null;
    opIn.addEventListener("input", () => { look = { ...look, opacity: Number(opIn.value) / 100 }; draw(); clearTimeout(opT); opT = setTimeout(() => apply({ opacity: look.opacity }), 150); });
    draw();
    const row = (title, sub, ...right) => h("div", { style: "display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--rb-line,rgba(127,127,127,.15))" }, h("div", { style: "flex:1;min-width:0" }, h("b", null, title), sub ? h("div", { class: "rb-muted", style: "font-size:12px" }, sub) : null), ...right);
    return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-label": "플로팅 버튼 설정", style: "max-width:440px" },
      h("h3", { class: "rb-h3" }, "플로팅 버튼 설정"),
      h("p", { class: "rb-muted", style: "margin:0 0 6px" }, "채팅 위에 떠 있는 동그란 인물 관계도 버튼이에요. 끌어서 옮기고, 길게 누르면 가장자리로 자리를 바꿔요."),
      h("div", { style: "display:grid;place-items:center;height:92px;margin:6px 0 4px;border-radius:14px;background:rgba(127,127,127,.12)" }, prev),
      row("보이기", "끄면 채팅 위 버튼이 사라져요. 관계도는 채팅 메뉴에서도 열 수 있어요.", sw),
      h("div", { style: "padding:12px 0;border-top:1px solid var(--rb-line,rgba(127,127,127,.15))" }, h("b", null, "크기"), h("div", { style: "margin-top:8px" }, sizeHost)),
      h("div", { style: "padding:12px 0;border-top:1px solid var(--rb-line,rgba(127,127,127,.15))" }, h("b", null, "투명도"), h("div", { class: "rb-muted", style: "font-size:12px" }, "평소 보이는 정도예요. 누르거나 마우스를 올리면 또렷해져요."), h("div", { style: "display:flex;gap:10px;align-items:center;margin-top:8px" }, opIn, opVal)),
      h("div", { class: "btns" }, btn("기본값으로", { onClick: () => apply({ ...FAB_LOOK_DEFAULT }) }), btn("닫기", { kind: "primary", onClick: () => done(null) }))));
  };
  const fabRow = h("button", { type: "button", class: "rb-srow", id: "rb-qs-fab", onClick: () => openFab().catch(failStory) },
    h("span", { class: "t" }, "플로팅 버튼 설정", h("small", null, "채팅 위 동그란 관계도 버튼 · 켜기·크기·투명도")), fabVal, h("span", { class: "go", "aria-hidden": "true" }, "›"));

  return fade(h("section", { class: "rb-card bordered rb-story-helper rb-qs-scroll" },
    fabRow,
    (() => { const row = storyRow("공정한 전개", "내 뜻대로만 흐르지 않게 해요.", fairOn, setFair); fairSw = row.querySelector("[role=switch]"); return row; })(),
    diceRow(ctx, { on: diceOn, setOn: setDice, fail: failStory }),
    storyRow("주사위 결과 표시", "응답 아래에 굴린 값과 판정을 보여줘요.", diceShowOn, setDiceShow),
    isBardHost(ctx.api) ? null : storyRow("모델 호출 표시", "모델·걸린 시간·토큰·들어간 로어북을 보여줘요.", callShowOn, setCallShow),
    storyRow("이야기 시간 자동 삽입", "이야기 속 시각을 AI에게 알려줘요.", stOn, setStory),
    ctx.imgFix ? storyRow("이미지 태그 자동 교정", "AI가 틀리게 쓴 에셋 이미지 태그를 이 봇의 실제 에셋 이름으로 고쳐요.", ctx.imgFix.isOn(), setImgFix) : null,
    ctx.imgFix ? storyRow("이미지 태그 상황 알림", "직전 옷·동작과 쓸 수 있는 태그를 AI에게 다시 알려줘요.", ctx.imgFix.isHintOn(), setImgHint) : null,
    ...(ctx.ext?.render?.("slot", "home.quick", ctx) ?? [])   // 2.2.21 애드온이 빠른 설정 줄을 더하는 자리(예: 장기기억의 캐릭터·장면 상태창)
  ));
}
