// 도구 → 로어북 로그: 응답마다 어떤 로어북이 들어갔는지
import { h, replace } from '../dom.js';
import { btn, confirmDialog, segmented } from '../kit.js';

const fmt = (t) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function currentChatId(api) {
  try {
    const ci = await api.getCurrentCharacterIndex();
    const hi = await api.getCurrentChatIndex();
    if (!(ci >= 0) || !(hi >= 0)) return null;
    const chat = await api.getChatFromIndex(ci, hi);
    return chat?.id ?? `${ci}:${hi}`;
  } catch {
    return null;
  }
}

export async function renderLoreLog(ctx) {
  const st = ctx.state;
  st.loreLog ??= { scope: "chat", q: "", open: null };
  const ui = st.loreLog;
  const recs = (await ctx.loreLog?.list().catch(() => [])) ?? [];
  const chatId = await currentChatId(ctx.api);
  if (ui.scope === "chat" && !chatId) ui.scope = "all";
  const q = ui.q.trim().toLowerCase();
  const shown = recs
    .filter((r) => ui.scope === "all" || r.chatId === chatId)
    .filter((r) => !q || (r.entries ?? []).some((x) => x.n.toLowerCase().includes(q)) || String(r.input ?? "").toLowerCase().includes(q) || String(r.char ?? "").toLowerCase().includes(q))
    .reverse();

  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "로어북 로그")));
  back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");

  const search = h("input", { class: "rb-input", type: "search", placeholder: "로어북 이름·입력으로 찾기", value: ui.q, style: "flex:1;min-width:180px" });
  let t = null;
  search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      ui.q = search.value;
      renderLoreLog(ctx).then(() => {
        const s = ctx.main.querySelector('input[type="search"]');
        s?.focus();
        s?.setSelectionRange?.(s.value.length, s.value.length);
      });
    }, 250);
  });
  const scope = segmented([["chat", "지금 채팅"], ["all", "전체"]], ui.scope, (v) => {
    ui.scope = v;
    renderLoreLog(ctx);
  }, "범위");
  const clear = btn("모두 지우기", { kind: "ghost", icon: "trash", disabled: !recs.length, onClick: async () => {
    const ok = await confirmDialog(ctx.win, { title: "로어북 로그 지우기", body: `기록 ${recs.length}개를 모두 지울까요? 채팅은 그대로예요.`, ok: "지우기", danger: true });
    if (!ok) return;
    await ctx.loreLog.clear();
    ctx.toast("로어북 로그를 지웠어요");
    renderLoreLog(ctx);
  } });

  const card = (r) => {
    const open = ui.open === r.id;
    const list = r.entries ?? [];
    const head = h(
      "button",
      { type: "button", class: "rb-row", style: "background:transparent;padding:12px 14px;align-items:flex-start", "aria-expanded": open ? "true" : "false", onClick: () => {
        ui.open = open ? null : r.id;
        renderLoreLog(ctx);
      } },
      h(
        "span",
        { class: "txt" },
        h("span", { class: "name", style: "white-space:normal;word-break:keep-all" }, r.input ? `“${r.input.length > 80 ? r.input.slice(0, 80) + "…" : r.input}”` : "(입력 없음 · 다시 생성)"),
        h("span", { class: "meta" }, `${fmt(r.at)} · ${r.char || "?"}${ui.scope === "all" && r.chat ? ` · ${r.chat}` : ""}${r.turn ? ` · ${r.turn}턴` : ""}`)
      ),
      h("span", { class: "rb-badge", style: `background:var(--rb-acc-soft);color:var(--rb-acc-text)` }, `로어북 ${list.length}`)
    );
    const body = open && h(
      "div",
      { style: "padding:0 14px 12px;display:flex;flex-direction:column" },
      list.length ? list.map((x) => h(
        "div",
        { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0;border-top:1px dashed var(--rb-line)" },
        h("b", { style: "flex:1;min-width:140px;font-size:13.5px;word-break:keep-all" }, x.n),
        h("span", { class: "rb-muted", style: "font-size:12px" }, x.s),
        h("span", { class: "rb-badge", style: "background:var(--rb-surf2,var(--rb-surf));color:var(--rb-acc-text)" }, x.w)
      )) : h("div", { class: "rb-muted", style: "padding:6px 0" }, "들어간 로어북이 없어요"),
      h("div", { class: "rb-muted", style: "font-size:12px;margin-top:6px" }, r.method === "prompt" ? "보낸 프롬프트에서 직접 확인했어요." : "이 리스에서는 프롬프트를 볼 수 없어 키·규칙으로 추정했어요. 실제와 조금 다를 수 있어요.")
    );
    return h("div", { class: "rb-card bordered", style: "display:flex;flex-direction:column" }, head, body);
  };

  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1;max-width:820px" },
    back,
    h("p", { class: "rb-p" }, "응답마다 어떤 로어북 항목이 들어갔는지 남겨요. AI 응답 아래 [📖 로어북] 버튼으로도 볼 수 있어요. 끄기·버튼 숨기기는 설정 탭에서."),
    h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px" }, h("div", { style: "min-width:200px" }, scope), search, clear),
    shown.length
      ? h("div", { style: "display:flex;flex-direction:column;gap:8px" }, shown.slice(0, 150).map(card))
      : h("div", { class: "rb-card pad bordered rb-muted", style: "text-align:center" }, recs.length ? "조건에 맞는 기록이 없어요" : "아직 기록이 없어요. 채팅을 한 번 보내 보세요.")
  ));
}
