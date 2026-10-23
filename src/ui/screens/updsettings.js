// 도구 → 업데이트 설정: 새 봇 자동 감지, 받은 사본 정리, 채팅 백업
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { iconBtn, setSwitch, switchEl } from '../kit.js';
import { persistentWrites, watchDefaults } from '../watch.js';

export async function renderUpdateSettings(ctx) {
  const ui = watchDefaults(ctx.prefs.ui);
  const node = await persistentWrites(ctx.api);
  const row = (key, ic, title, desc, extra) => {
    const sw = switchEl(ui[key], {
      label: title, onChange: async (on, el) => {
        ui[key] = on;
        setSwitch(el, on);
        await ctx.prefs.saveUi({ [key]: on }).catch(() => {
        });
        if (key === "autoDetect") ctx.watcher?.setEnabled(on);
        ctx.toast(on ? `${title}: 켰어요` : `${title}: 껐어요`);
      }
    });
    return h(
      "div",
      { class: "rb-row", style: "background:var(--rb-surf);padding:16px;cursor:default;align-items:flex-start" },
      h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 20)),
      h("span", { class: "txt" }, h("span", { class: "name" }, title), h("span", { class: "meta", style: "white-space:normal" }, desc), extra ? h("span", { class: "meta", style: "white-space:normal;color:var(--rb-warn)" }, extra) : null),
      sw
    );
  };
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1;max-width:760px" },
    h("div", { style: "display:flex;align-items:center;gap:10px" }, iconBtn("back", "도구로 돌아가기", { onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "업데이트 설정"))),
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:10px" },
      row("autoDetect", "refresh", "새로 가져온 봇 자동 감지", "리스에서 봇을 가져오면 기존 봇의 새 버전인지 확인하고 \"이어 붙일까요?\"라고 물어요. 메인 화면 접근을 허락하면 + 메뉴에 'Dusk Atelier로 업데이트' 버튼이 생기고, 가져오기를 누를 때만 자주 확인해요(평소엔 10초마다 봇 목록만). 허락하지 않으면 3초마다 봇 목록만 비교해요."),
      row("trashCopies", "trash", "이어 붙인 뒤 받은 사본을 휴지통으로", "업데이트가 끝나면 새로 가져온 사본 봇을 휴지통으로 옮겨요. 대화가 생긴 사본은 건드리지 않아요.", node ? null : "이 앱(원본 RisuAI 웹·데스크톱)에서는 자동 정리가 안 돼요. 사본은 직접 지워 주세요."),
      row("chatBackup", "message", "업데이트 전 백업에 채팅도 넣기", "바꾸기 전 백업에 채팅까지 담아요. 같은 내용은 한 번만 저장하지만 채팅이 많으면 백업이 커져요. 되돌릴 때 백업에만 있는 채팅을 새 채팅으로 덧붙여요(지금 채팅은 그대로).")
    )
  ));
}
