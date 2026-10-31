// 자동 기록·인물 추적 설정: 기억 탭에서 재사용한다. 기존 위키 화면의 설정과 저장 동작을 그대로 유지한다.
import { h } from "../../dom.js";
import { btn, switchEl, setSwitch } from "../../kit.js";
import { avatar, fail } from "./common.js";
import { openWriter } from "./writerui.js";
import { openTracking } from "./trackui.js";
import { conflictBox } from "./conflictui.js";
import { tracked } from "./settingstools.js";
import { advancedPot } from "../pot.js";
import { maybePromptIntro } from "../promptstab.js";

export async function autoTrackingBox(env) {
  const { ctx } = env, M = ctx.memory;
  const docs = Object.values(env.folder.wiki?.documents ?? {}).filter((d) => d?.type === "Character");
  const potState = M.switches?.state ? await M.switches.state(env.bot.id) : null;
  const trackingStore = M.flow?.settings ? tracked(ctx, await M.flow.settings().catch(() => null)) : null;
  const charRows = await Promise.all(docs.map(async (d) => ({ d, on: await M.switches.charOn(env.bot.id, env.chatItem.id, d.id) })));
  const pot = potState?.pot;
  const trackOn = trackingStore ? trackingStore.rawSnapshot().autoWriterEnabled !== false : true;
  const setTrack = (v) => {
    try { trackingStore?.update((x) => { x.autoWriterEnabled = v; }); ctx.toast(v ? "새 인물도 자동으로 추적해요." : "고른 인물만 추적해요."); }
    catch (e) { fail(ctx)(e); }
    env.redraw?.();
  };
  const setPot = async (v, el) => {
    if (el) setSwitch(el, v);
    try { await M.switches.setPot(env.bot.id, v); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 리수폿을 켰어요." : "이 채팅에서 리수폿을 껐어요."); }
    catch (e) { fail(ctx)(e); }
    env.redraw?.();
  };
  const charList = charRows.map(({ d, on }) => h("div", { class: "rb-pot-charrow" }, avatar(d.title), h("span", { class: "n" }, d.title),
    switchEl(on, { label: `${d.title} 위키 사용`, onChange: async (v, el) => {
      setSwitch(el, v);
      try { await M.switches.setChar(env.bot.id, env.chatItem.id, d.id, v); }
      catch (e) { fail(ctx)(e); }
    } })));
  const cur = { chaId: env.bot.id, ti: env.chatItem.index, chatId: env.chatItem.id, botName: env.bot.character?.name ?? "", chatName: env.chatItem.name ?? "" };
  const adv = h("div"); let loaded = false;
  const advanced = h("details", { class: "rb-mem-man", onToggle: (e) => {
    if (e.target.open && !loaded) { loaded = true; Promise.resolve(advancedPot(ctx, env, cur, env.idx, () => env.redraw?.())).then((nodes) => adv.replaceChildren(...nodes)).catch(fail(ctx)); }
  } }, h("summary", null, "리수폿 고급 설정"), adv);
  return h("section", { class: "rb-card rb-mem-sec rb-wk-integrated" },
    h("h3", null, "자동 기록 · 인물 추적"),
    h("div", { class: "rb-mem-shead" }, h("b", null, "리수폿 사용"), h("span", { style: "flex:1" }),
      switchEl(pot?.on !== false, { label: "이 채팅에서 리수폿 사용", onChange: (v, el) => setPot(v, el) })),
    h("div", { class: "rb-mem-shead" }, h("b", null, "새 인물 자동 추적"), h("span", { style: "flex:1" }),
      switchEl(trackOn, { label: "새 인물 자동 추적", onChange: (v, el) => { setSwitch(el, v); setTrack(v); } })),
    h("div", { class: "rb-mem-sact" }, btn("지금 기록", { onClick: () => openWriter(env).catch(fail(ctx)) }), btn("추적 인물 고르기", { onClick: () => openTracking(env).catch(fail(ctx)) })),
    conflictBox(env),
    h("details", { class: "rb-mem-man" }, h("summary", null, `캐릭터별 위키 사용 · ${docs.length}명`),
      docs.length ? h("div", { class: "rb-pot-charlist" }, charList) : h("p", { class: "rb-muted" }, "아직 위키 인물이 없어요.")),
    advanced);
}
