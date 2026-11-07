// 더스크 스텔스 화면: 테마 5종 고르기 · 켜기/끄기 · 가짜 문구·옵션 고치기.
import { h, replace } from "../dom.js";
import { btn, segmented, note, toggleRow, confirmDialog } from "../kit.js";
import { PRESETS, PRESET_IDS, mergeLabels } from "../../data/stealth.js";
import { loadStealth, saveStealth, enableStealth, disableStealth, runDiagnosis } from "../../data/stealth-apply.js";
import { syncShell, setDuskOpen } from "../../data/stealth-shell.js";

// 진단 결과는 화면 밖에 둔다: '5초 뒤 진단'은 창을 닫았다 다시 여는데, 다시 열면 이 화면을 새로 그려 결과가 사라졌다
let diag = "", redraw = null;   // redraw: 지금 떠 있는 화면의 다시 그리기(진단이 끝났을 때 새로 연 화면에 보이게)
// 플러그인 iframe에서는 clipboard API가 막히는 판이 있다 → 숨긴 글상자를 골라 복사 명령으로 한 번 더
async function copyText(win, text) {
  try { await win.navigator.clipboard.writeText(text); return true; } catch { /* 아래로 */ }
  const d = win.document, ta = d.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;width:1px;height:1px";
  d.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  try { return d.execCommand("copy"); } catch { return false; } finally { ta.remove(); }
}

var LABEL_FIELDS = [["title", "상단 제목 (비우면 봇 이름)"], ["sub", "상단 제목 뒤 글"], ["model", "입력창 옆 문구"], ["left", "입력창 왼쪽 아래 문구"], ["note", "화면 아래 안내 글"], ["tool", "답변 앞 작업 줄"], ["think", "생성 중 문구"], ["user", "사이드바 사용자 이름 (비우면 페르소나)"], ["plan", "사이드바 요금제 글"]];

export async function renderStealth(ctx) {
  setDuskOpen(true);   // 이 화면은 Dusk 창 안 → 닫힐 때(hideContainer) 다시 보인다
  let st = await loadStealth(ctx.api);
  let pick = st.active ?? "claude";
  const wrap = h("div", { class: "rb-section rb-scroll", style: "flex:1;min-height:0;gap:12px" });   // rb-main은 넘치는 걸 자르므로 화면 자체가 스크롤 상자여야 한다
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

  const diagnose = async (delay = 0) => {
    diag = delay ? `${delay}초 뒤 진단해요 — 지금 Dusk 창을 닫고 채팅 화면을 보여 주세요. 끝나면 다시 열어 결과를 확인하세요.` : "진단 중…"; redraw?.();
    if (delay) await new Promise((r) => setTimeout(r, delay * 1000));
    try {
      const r = await runDiagnosis(ctx.api);
      diag = [`계열: ${r.target ?? "알 수 없음"}`, ...Object.entries(r.counts).map(([k, v]) => `${k}: ${v}`), ...(r.db ? [`리스 설정: 채팅 테마 ${r.db.theme || "(없음)"}, 커스텀 CSS ${r.db.cssLen}자, 채팅 HTML ${r.db.htmlLen}자`] : []), "", ...r.lines, ...(r.db?.fold ? ["", ...r.db.fold] : []), ...(r.db?.layout ? ["", ...r.db.layout] : [])].join("\n");
    } catch (e) { diag = `진단하지 못했어요: ${e?.message ?? e}`; }
    redraw?.();
  };
  function draw() {
    const L = mergeLabels(pick, st.labels?.[pick]);
    const cards = PRESET_IDS.map((id) => h("button", {
      type: "button", class: ["rb-card", "bordered"], "aria-pressed": id === pick ? "true" : "false",
      style: `text-align:left;cursor:pointer;padding:14px 16px;display:flex;flex-direction:column;gap:6px;${id === pick ? "outline:2px solid var(--rb-accent, #7a6cf0)" : ""}`,
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
      toggleRow("이미지 접기", "답변의 큰 이미지를 ‘파일 N개 읽음, 명령어 N개 실행함’ 줄 아래로 접어요. 누르면 펼쳐져요", st.hideImages, (v) => { st.hideImages = v; persist(); refresh(); }),
      toggleRow("사이드바 아바타 흐리게", "캐릭터 얼굴이 작게 보여도 알아보기 어렵게 해요", st.blurAvatars, (v) => { st.blurAvatars = v; persist(); refresh(); }),
      toggleRow("최소 모드 (스크롤 문제 점검용)", "화면 전체·입력창 꾸밈을 빼고 말풍선만 꾸며요. 켜 둔 상태면 바로 적용돼요. 스크롤이 되는지 알려 주세요", !!st.minimal, (v) => { st.minimal = v; persist(); refresh(); }),
      toggleRow("사이드바 숨기기", "왼쪽 목록을 통째로 숨겨요", st.hideSidebar, (v) => { st.hideSidebar = v; persist(); refresh(); }),
      h("h4", { class: "rb-h4" }, `${PRESETS[pick].label} 문구`),
      ...fields,
      h("div", { class: "rb-row", style: "display:flex;gap:8px" },
        btn(st.active === pick ? "문구·옵션 다시 적용" : `${PRESETS[pick].label} 켜기`, { kind: "primary", onClick: () => apply(pick) }),
        st.active ? btn("끄고 원래대로", { onClick: off }) : null),
      h("div", { class: "rb-row", style: "display:flex;gap:8px" }, btn("화면 진단", { onClick: () => diagnose(0) }), btn("5초 뒤 진단", { onClick: () => diagnose(5) }), diag && !/중…|뒤 진단해요/.test(diag) ? btn("결과 복사", { onClick: async () => { if (await copyText(globalThis, diag)) ctx.toast("진단 결과를 복사했어요"); else ctx.toast("복사하지 못했어요. 결과 글을 길게 눌러 복사해 주세요.", { error: true }); } }) : null),
      diag ? h("pre", { class: "rb-muted", style: "white-space:pre-wrap;font-size:12px;margin:0;user-select:text" }, diag) : null,
      note("info", "화면에 안 바뀌면 리스를 새로고침해 주세요. 리스 업데이트로 화면 구조가 바뀌면 일부가 어긋날 수 있어요.")
    );
  }
  redraw = draw;
  draw();
  replace(ctx.main, wrap);
}
