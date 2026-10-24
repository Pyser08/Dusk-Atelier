// 도구 → 업데이트 설정: 새 봇 자동 감지, 받은 사본 정리, 채팅 백업
import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, iconBtn, setSwitch, switchEl } from '../kit.js';
import { persistentWrites, watchDefaults } from '../watch.js';

function statusCard(ctx) {
  const w = ctx.watcher;
  const txt = h("span", { class: "meta", style: "white-space:normal" });
  const paint = () => {
    const s = w?.status;
    if (!s) return txt.textContent = "감지가 아직 시작되지 않았어요.";
    if (!s.enabled) return txt.textContent = "자동 감지가 꺼져 있어요.";
    const ago = s.lastAt ? Math.max(0, Math.round((Date.now() - s.lastAt) / 1e3)) : null;
    txt.textContent = [
      ago === null ? "아직 확인 전" : `마지막 확인 ${ago}초 전`,
      `봇 ${s.chars}개 · 모듈 ${s.mods}개 지켜보는 중`,
      s.mode === "dom" ? "+ 메뉴 버튼 켜짐" : "+ 메뉴 버튼 없음(메인 화면 접근 미허락)",
      s.found ? `지금까지 찾은 새 버전 ${s.found}개` : "",
      s.lastError ? `문제: ${s.lastError}` : ""
    ].filter(Boolean).join(" · ");
  };
  paint();
  const t = setInterval(() => {
    if (!txt.isConnected) return clearInterval(t);
    paint();
  }, 1e3);
  return h(
    "div",
    { class: "rb-row", style: "background:var(--rb-surf);padding:16px;cursor:default;align-items:center" },
    h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-ok-soft,rgba(95,211,181,.13));color:var(--rb-ok,#5fd3b5);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon("info", 20)),
    h("span", { class: "txt" }, h("span", { class: "name" }, "감지 상태"), txt),
    btn("지금 확인", { size: "sm", icon: "refresh", onClick: async () => {
      await w?.check(true);
      paint();
      ctx.toast(w?.status?.lastError ? `확인하지 못했어요: ${w.status.lastError}` : "확인했어요");
    } })
  );
}
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
        if (key === "quickImport") ctx.quickImport?.setEnabled(on);
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
    h("div", { style: "display:flex;align-items:center;gap:10px" }, iconBtn("back", "설정으로 돌아가기", { onClick: () => ctx.go("settings") }), h("div", null, h("span", { class: "rb-muted" }, "설정"), h("h2", { class: "rb-h2" }, "업데이트 설정"))),
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:10px" },
      row("autoDetect", "refresh", "새로 가져온 봇 자동 감지", "리스에서 봇을 가져오면 기존 봇의 새 버전인지 확인하고 \"이어 붙일까요?\"라고 물어요. 몇 초마다 봇 목록과 봇 목록 끝을 가볍게 확인하고, 모듈은 20초마다(가져오기 직후엔 3초마다) 확인해요. 리스 메인 화면에 끌어다 놓아 가져와도 잡혀요. 메인 화면 접근을 허락하면 + 메뉴에 'Dusk Atelier로 업데이트' 버튼도 생겨요."),
      row("trashCopies", "trash", "이어 붙인 뒤 받은 사본을 휴지통으로", "업데이트가 끝나면 새로 가져온 사본 봇을 휴지통으로 옮겨요. 대화가 생긴 사본은 건드리지 않아요.", node ? null : "이 앱(원본 RisuAI 웹·데스크톱)에서는 자동 정리가 안 돼요. 사본은 직접 지워 주세요."),
      statusCard(ctx),
      row("quickImport", "upload", "PC 메인 화면에 빠른 가져오기 상자", "리스 화면 오른쪽 아래에 작은 상자를 띄워요. 누르면 Dusk 가져오기 화면이 열리고, 거기에 끌어 놓으면 에셋을 여러 개씩 동시에 올려서 리스 기본 가져오기보다 빨라요. 리스는 상자 위에 놓은 파일을 플러그인에 넘겨주지 않아서, 꼭 누른 뒤 열린 화면에 놓아야 해요. 메인 화면 접근을 허락해야 보이고, 모바일에서는 띄우지 않아요(+ 메뉴의 버튼을 쓰세요). ×로 닫으면 다음에 리스를 열 때까지 숨겨요."),
      row("chatBackup", "message", "업데이트 전 백업에 채팅도 넣기", "바꾸기 전 백업에 채팅까지 담아요. 같은 내용은 한 번만 저장하지만 채팅이 많으면 백업이 커져요. 되돌릴 때 백업에만 있는 채팅을 새 채팅으로 덧붙여요(지금 채팅은 그대로).")
    )
  ));
}
