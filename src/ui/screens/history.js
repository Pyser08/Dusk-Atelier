import { createStore } from '../../engine/store.js';
import { fmtBytes, fmtWhen, h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, chip, confirmDialog, segmented } from '../kit.js';
import { diffSummary } from './editor.js';

export async function renderHistory(ctx) {
  const st = ctx.state;
  const store = createStore(ctx.api);
  const [backups, history] = await Promise.all([store.listBackups(), store.listHistory()]);
  const all = [...backups.map((b) => ({ ...b, hasFile: true })), ...history.map((b) => ({ ...b, hasFile: false }))].sort((a, b) => b.t - a.t);
  const targets = /* @__PURE__ */ new Map();
  for (const b of all) if (!targets.has(b.target)) targets.set(b.target, { target: b.target, kind: b.kind, name: b.name, items: [] });
  for (const b of all) targets.get(b.target).items.push(b);
  const groups = [...targets.values()];
  if (st.histTarget && !targets.has(st.histTarget)) st.histTarget = null;
  st.histKind ??= "all";
  const q = st.search.trim().toLowerCase();
  const shownGroups = groups.filter((g) => (st.histKind === "all" || g.kind === st.histKind) && (!q || String(g.name).toLowerCase().includes(q)));
  const cur = st.histTarget ? targets.get(st.histTarget) : null;
  const keep = ctx.prefs.ui?.keepBackups ?? 5;
  const side = h(
    "div",
    { class: "rb-list rb-scroll", style: "padding-top:8px" },
    h(
      "button",
      { type: "button", class: "rb-row", "aria-selected": !cur ? "true" : "false", onClick: () => {
        st.histTarget = null;
        renderHistory(ctx);
      } },
      h("span", { style: "display:flex;color:var(--rb-acc-text)" }, icon("history", 18)),
      h("div", { class: "txt" }, h("span", { class: "name" }, "전체 기록"), h("span", { class: "meta" }, `${all.length}개`))
    ),
    shownGroups.map((g) => h(
      "button",
      { type: "button", class: "rb-row", "aria-selected": cur === g ? "true" : "false", onClick: () => {
        st.histTarget = g.target;
        renderHistory(ctx);
      } },
      h("span", { style: "display:flex;color:var(--rb-sub)" }, icon(g.kind === "character" ? "character" : "module", 18)),
      h("div", { class: "txt" }, h("span", { class: "name" }, g.name || "(이름 없음)"), h("span", { class: "meta" }, `${g.items.length}개 · 최근 ${fmtWhen(g.items[0].t)}`))
    ))
  );
  const items = cur ? cur.items : all.slice(0, 200);
  const timeline = h("div", { style: "display:flex;flex-direction:column" }, items.map((b, i) => entry(ctx, b, i === 0 && !!cur, !cur)));
  const pane = h(
    "div",
    { class: "rb-section rb-scroll rb-hist-pane", style: "flex:1;min-height:0" },
    h(
      "div",
      { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
      h(
        "div",
        { style: "flex:1;min-width:200px" },
        h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", title: "도구로 돌아가기", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구 › 기록"), h("h2", { class: "rb-h2" }, cur ? cur.name : "버전 타임라인"))),
        h("p", { class: "rb-p" }, cur ? "이 항목을 업데이트·편집하기 전 상태들이에요. 되돌려도 채팅은 그대로예요." : "업데이트·편집·삭제 전에 자동으로 저장한 상태들이에요.")
      ),
      h(
        "label",
        { class: "rb-field", style: "width:230px" },
        h("span", { class: "rb-label" }, "항목마다 보관할 백업 수"),
        segmented([["3", "3"], ["5", "5"], ["10", "10"], ["20", "20"]], String(keep), async (v) => {
          await ctx.prefs.saveUi({ keepBackups: Number(v) });
          ctx.toast(`항목마다 ${v}개씩 보관해요 (다음 백업부터)`);
        }, "보관 수")
      )
    ),
    items.length ? timeline : h("div", { class: "rb-empty" }, "아직 기록이 없어요. 이 플러그인으로 업데이트·편집하면 쌓여요."),
    h("p", { class: "rb-muted" }, '백업은 서버에 파일로 저장돼 다른 기기에서도 보여요. 오래된 백업은 보관 수를 넘으면 파일은 지우고 요약만 남겨요. RisuAI의 "사용하지 않는 에셋 정리"를 하면 백업 파일이 지워질 수 있어요.')
  );
  const left = h(
    "div",
    { style: "width:300px;flex-shrink:0;border-right:1px solid var(--rb-line2);display:flex;flex-direction:column;min-height:0" },
    h("div", { class: "rb-chips", style: "padding:14px 12px 4px" }, chip("전체", { pressed: st.histKind === "all", onClick: () => {
      st.histKind = "all";
      renderHistory(ctx);
    } }), chip("모듈", { pressed: st.histKind === "module", onClick: () => {
      st.histKind = "module";
      renderHistory(ctx);
    } }), chip("캐릭터", { pressed: st.histKind === "character", onClick: () => {
      st.histKind = "character";
      renderHistory(ctx);
    } })),
    side
  );
  replace(ctx.main, h("div", { class: "rb-hist-root", style: "flex:1;display:flex;min-height:0;flex-wrap:wrap" }, ctx.isMobile() ? null : left, pane));
  ctx.state.histCount = all.length;
}
function entry(ctx, b, first, showName) {
  const diffBox = h("div");
  return h(
    "div",
    { style: "display:flex;gap:14px" },
    h(
      "div",
      { style: "display:flex;flex-direction:column;align-items:center;width:14px" },
      h("span", { style: `width:14px;height:14px;border-radius:999px;margin-top:4px;flex-shrink:0;${first ? "background:var(--rb-deco-grad)" : b.hasFile ? "box-shadow:inset 0 0 0 2px var(--rb-line3)" : "box-shadow:inset 0 0 0 2px var(--rb-line);opacity:.6"}` }),
      h("span", { style: "width:2px;flex:1;background:var(--rb-line)" })
    ),
    h(
      "div",
      { style: "flex:1;padding-bottom:18px;display:flex;flex-direction:column;gap:6px;min-width:0" },
      h(
        "div",
        { style: "display:flex;gap:8px;align-items:baseline;flex-wrap:wrap" },
        showName ? h("b", { style: "font-size:14px" }, b.name) : null,
        h("span", { style: "font-size:13px;font-weight:600;color:var(--rb-sub)" }, b.note || "업데이트 전"),
        badge(b.kind === "character" ? "캐릭터" : "모듈", b.kind === "character" ? "acc" : "acc2"),
        h("span", { class: "rb-muted" }, fmtWhen(b.t)),
        b.hasFile && b.size ? h("span", { class: "rb-muted" }, fmtBytes(b.size)) : null,
        !b.hasFile ? badge("요약만 남음", "mute") : null,
        b.src === "tide" ? badge("RisuTide", "mute") : null
      ),
      b.summary ? h("span", { class: "rb-muted" }, b.summary) : null,
      b.hasFile ? h(
        "div",
        { style: "display:flex;gap:6px;flex-wrap:wrap" },
        btn("이 시점으로 되돌리기", { size: "sm", icon: "undo", onClick: async () => {
          if (!await confirmDialog(ctx.win, { title: `${b.name}을(를) 이 시점으로 되돌릴까요?`, body: `${fmtWhen(b.t)} ${b.note || ""} 상태로 돌아가요. 지금 상태도 먼저 백업해요. 채팅은 그대로예요.`, ok: "되돌리기" })) return;
          await ctx.legacy.restore(b);
        } }),
        b.kind === "module" ? btn("지금과 비교", { size: "sm", onClick: async () => {
          try {
            const snap = await createStore(ctx.api).loadBackup(b);
            const now = (await ctx.svc.load()).entries.find((e) => e.module.id === b.target)?.module;
            const lines = now ? diffSummary(snap, now) : ["지금은 이 모듈이 없어요 (지워졌어요). 되돌리면 다시 생겨요."];
            replace(diffBox, h("div", { class: "rb-card pad", style: "font-size:13px;display:flex;flex-direction:column;gap:4px" }, h("b", null, "이 시점 → 지금"), lines.length ? lines.map((l) => h("span", null, l)) : h("span", { class: "rb-muted" }, "차이가 없어요")));
          } catch (e) {
            ctx.toast(e?.message ?? String(e), { error: true });
          }
        } }) : null,
        b.src === "tide" ? null : btn("지우기", { size: "sm", kind: "ghost", icon: "trash", onClick: async () => {
          if (!await confirmDialog(ctx.win, { title: "이 백업을 지울까요?", body: "지우면 이 시점으로 되돌릴 수 없어요.", ok: "삭제", danger: true })) return;
          await createStore(ctx.api).removeBackup(b.id);
          renderHistory(ctx);
        } })
      ) : null,
      diffBox
    )
  );
}
