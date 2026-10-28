// 기억 탭 홈: 켜기 스위치 + 상태 카드 하나. 이번 턴 진행 점 5개와 최근 기록 3줄.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, switchEl, setSwitch, note } from "../../kit.js";
import { mem, fail, gradeBadge, at, potOn } from "./common.js";
import { stepsOf } from "../../../engine/flowsteps.js";
import { firstRunFeatures } from "../../../engine/firstrun.js";
import { openSetup } from "./setup.js";
import { guideBtn } from "./guide.js";

async function recentLines(M, n = 3) {
  const idx = await M.store.getIndex();
  const folders = Object.values(idx.folders ?? {}).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 3);
  const rows = [];
  for (const f of folders) {
    const fo = await M.store.getFolder(f.chaId, f.chatId).catch(() => null);
    for (const p of Object.values(fo?.people ?? {})) for (const r of p.records ?? []) if (!r.orphan) rows.push({ who: p.name, ms: r.at_ms ?? 0, at: r.at, act: r.act, g: r.g });
  }
  return rows.sort((a, b) => b.ms - a.ms).slice(0, n);
}

export async function renderMemoryHome(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory, idx = await M.store.getIndex();
  if (!potOn(idx.settings)) return replace(host);
  const backend = M.backend(idx.settings), flow = idx.settings.flow ?? {}, canFlow = !!M.flow;
  const on = flow.on === true && canFlow;
  const setOn = async (v, el) => {
    setSwitch(el, v);
    try {
      if (v && !flow.setupDone) { const st = await M.flow.settings(); st.update((x) => { x.features = firstRunFeatures(x.features); }); }
      await M.store.updateIndex((i) => { i.settings.flow = { ...(i.settings.flow ?? {}), on: v, mode: i.settings.flow?.mode ?? "fast" }; });
      const ok = await M.flow.apply();
      if (v && !ok) ctx.toast("기억을 켜지 못했어요. 리스를 다시 불러온 뒤 다시 눌러 주세요.", { error: true, seconds: 8 });
      else ctx.toast(v ? "장기기억을 켰어요. 다음 응답부터 기록돼요." : "장기기억을 껐어요.");
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const sw = switchEl(on, { label: "장기기억 켜기", disabled: !canFlow, onChange: setOn });
  const last = M.flow?.last?.() ?? null, steps = stepsOf({ on, mode: flow.mode, last, inject: M.injector?.lastRequest?.() ?? null, session: M.runner?.session?.() ?? null, lastSuccessAt: idx.status?.lastSuccessAt ?? 0 });
  const dots = h("ol", { class: "rb-mem-flowsteps", "aria-label": "이번 턴 진행" }, steps.map((s) => h("li", { class: ["rb-mem-flowstep", `is-${s.state}`], title: s.hint || s.label }, h("i", { "aria-hidden": "true" }), h("span", null, s.label))));
  const recent = h("ul", { class: "rb-mem-reclist rb-mem-recent" });
  const card = h("section", { class: ["rb-card", "rb-mem-home", on && "on"] },
    h("div", { class: "rb-mem-homehead" }, icon("brain", 22), h("div", { class: "t" }, h("b", null, "장기기억 ", guideBtn(ctx, "home", { redraw })), h("small", { class: "rb-muted" }, !canFlow ? "리수폿 기능을 사용할 수 없어요. 플러그인을 다시 불러와 주세요." : on ? `켜져 있어요 · ${flow.mode === "accurate" ? "더 정확하게" : "빠르게"}` : "꺼져 있어요. 스위치만 켜도 바로 써요.")), sw),
    on ? dots : null, recent,
    h("div", { class: "rb-mem-sact" }, btn(on ? "설정 열기" : "처음 설정하기", { kind: on ? "" : "primary", icon: "sliders", onClick: async () => { if (on) { m.globalOpen = true; return redraw(); } if (!M.flow || !canFlow) { m.globalOpen = true; return redraw(); } if (await openSetup(ctx)) redraw(); } })),
    idx.status?.lastError ? note("warn", `마지막 오류: ${String(idx.status.lastError).slice(0, 90)}`) : null);
  replace(host, card);
  recentLines(M).then((rows) => replace(recent, rows.length ? rows.map((r) => h("li", { class: "rb-mem-rec" }, gradeBadge(r.g), h("div", { class: "txt" }, h("div", null, `${r.who}: ${r.act}`), h("div", { class: "rb-muted" }, at(r.at))))) : h("li", { class: "rb-muted" }, "아직 쌓인 기록이 없어요."))).catch(() => {});
}
