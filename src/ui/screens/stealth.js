// 더스크 스텔스 화면: 테마 5종 고르기 · 켜기/끄기 · 가짜 문구·옵션 고치기.
import { h, replace } from "../dom.js";
import { btn, segmented, note, toggleRow, confirmDialog } from "../kit.js";
import { PRESETS, PRESET_IDS, mergeLabels } from "../../data/stealth.js";
import { loadStealth, saveStealth, enableStealth, disableStealth } from "../../data/stealth-apply.js";
import { syncShell } from "../../data/stealth-shell.js";

var LABEL_FIELDS = [["title", "상단 제목 (비우면 봇 이름)"], ["sub", "상단 제목 뒤 글"], ["model", "입력창 옆 문구"], ["left", "입력창 왼쪽 아래 문구"], ["note", "화면 아래 안내 글"], ["tool", "답변 앞 작업 줄"], ["think", "생성 중 문구"], ["user", "사이드바 사용자 이름 (비우면 페르소나)"], ["plan", "사이드바 요금제 글"]];

export async function renderStealth(ctx) {
  let st = await loadStealth(ctx.api);
  let pick = st.active ?? "claude";
  const wrap = h("div", { class: "rb-section", style: "display:flex;flex-direction:column;gap:12px" });
  const persist = () => saveStealth(ctx.api, st).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }));
  const run = async (fn, okMsg) => {
    try { st = await fn(); await persist(); await syncShell(ctx.api, st).catch(() => {}); if (okMsg) ctx.toast(okMsg); }
    catch (e) { ctx.toast(`적용하지 못했어요: ${e?.message ?? e}`, { error: true }); }
    draw();
  };
  const refresh = () => st.active && run(() => enableStealth(ctx.api, st.active, st));   // 켜진 상태에서 옵션을 바꾸면 바로 다시 적용
  const apply = (id) => run(() => enableStealth(ctx.api, id, st), `${PRESETS[id].label} 모양을 켰어요. 새로고침하면 가장 확실해요`);
  const off = async () => {
    if (!await confirmDialog(ctx.win, { title: "스텔스 끄기", body: "리스 설정의 커스텀 CSS·채팅 HTML을 켜기 전 값으로 되돌려요.", ok: "끄기" })) return;
    run(() => disableStealth(ctx.api, st), "원래 모양으로 되돌렸어요");
  };

  function draw() {
    const L = mergeLabels(pick, st.labels?.[pick]);
    const cards = PRESET_IDS.map((id) => h("button", {
      type: "button", class: ["rb-card", "bordered"], "aria-pressed": id === pick ? "true" : "false",
      style: `text-align:left;cursor:pointer;${id === pick ? "outline:2px solid var(--rb-accent, #7a6cf0)" : ""}`,
      onClick: () => { pick = id; draw(); }
    }, h("b", null, PRESETS[id].label + (st.active === id ? "  ● 켜짐" : "")), h("small", { class: "rb-muted", style: "display:block" }, PRESETS[id].desc)));
    const fields = LABEL_FIELDS.map(([k, name]) => {
      const inp = h("input", { type: "text", class: "rb-input", value: L[k], maxlength: 80, placeholder: "비우면 이 장식을 빼요", "aria-label": name });
      inp.addEventListener("change", () => { st.labels = { ...st.labels, [pick]: { ...st.labels?.[pick], [k]: inp.value } }; persist(); });
      return h("label", { class: "rb-lfield" }, h("b", null, name), inp);
    });
    replace(wrap,
      h("h3", { class: "rb-h3" }, "더스크 스텔스"),
      h("p", { class: "rb-muted" }, "리스 채팅을 다른 AI 채팅 앱처럼 보이게 해요. 켜면 리스의 커스텀 CSS·채팅 HTML 칸을 쓰고, 끄면 원래 값으로 되돌려요."),
      h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px" }, ...cards),
      segmented([["auto", "기기 설정 따라"], ["light", "항상 밝게"], ["dark", "항상 어둡게"]], st.scheme, (v) => { st.scheme = v; persist(); refresh(); }, "밝기"),
      toggleRow("본문 이미지 숨기기", "일러스트가 화면에 보이지 않게 해요", st.hideImages, (v) => { st.hideImages = v; persist(); refresh(); }),
      toggleRow("사이드바 아바타 흐리게", "캐릭터 얼굴이 작게 보여도 알아보기 어렵게 해요", st.blurAvatars, (v) => { st.blurAvatars = v; persist(); refresh(); }),
      toggleRow("사이드바 숨기기", "왼쪽 목록을 통째로 숨겨요", st.hideSidebar, (v) => { st.hideSidebar = v; persist(); refresh(); }),
      h("h4", { class: "rb-h4" }, `${PRESETS[pick].label} 문구`),
      ...fields,
      h("div", { class: "rb-row", style: "display:flex;gap:8px" },
        btn(st.active === pick ? "문구·옵션 다시 적용" : `${PRESETS[pick].label} 켜기`, { kind: "primary", onClick: () => apply(pick) }),
        st.active ? btn("끄고 원래대로", { onClick: off }) : null),
      note("info", "화면에 안 바뀌면 리스를 새로고침해 주세요. 리스 업데이트로 화면 구조가 바뀌면 일부가 어긋날 수 있어요.")
    );
  }
  draw();
  replace(ctx.main, wrap);
}
