import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { badge } from "../../kit.js";
import { mem, loadBots, fail } from "./common.js";

export async function renderBotList(ctx, host, { open, redraw }) {
  const m = mem(ctx);
  const [bots, idx] = await Promise.all([loadBots(ctx), ctx.memory.store.getIndex()]);
  const stat = (id) => { const fs = Object.values(idx.folders).filter((f) => f.chaId === id); return { records: fs.reduce((n, f) => n + (f.counts?.records ?? 0), 0), at: fs.reduce((t, f) => Math.max(t, f.updatedAt ?? 0), 0) }; };
  const list = h("div", { class: "rb-mem-botlist", role: "list" });
  const paint = (q = m.search) => {
    m.search = q; const s = q.trim().toLowerCase();
    const rows = bots.filter((b) => !s || String(b.character.name ?? "").toLowerCase().includes(s)).map((b) => ({ b, st: stat(b.id) })).sort((x, y) => y.st.at - x.st.at || x.b.index - y.b.index);
    replace(list, rows.length ? rows.map(({ b, st }) => {
      const on = idx.bots[b.id]?.on !== false && !idx.bots[b.id]?.paused && idx.settings.autoRecord !== false;
      return h("button", { type: "button", role: "listitem", class: ["rb-row", b.id === m.botId && "is-active"], "aria-pressed": b.id === m.botId ? "true" : "false", onClick: () => open(b.id) },
        h("span", { class: ["rb-mem-dot", on && "on"], title: on ? "자동 기록 켜짐" : "자동 기록 꺼짐" }),
        h("span", { class: "txt" }, h("span", { class: "name" }, b.character.name || "이름 없는 캐릭터"), h("span", { class: "meta" }, `${b.character.chats?.length ?? 0}개 채팅`)),
        st.records ? badge(`기록 ${st.records}`, "acc") : null);
    }) : h("div", { class: "rb-empty" }, "검색 결과가 없어요."));
  };
  replace(host, h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "봇 검색", value: m.search, "aria-label": "봇 검색", onInput: (e) => paint(e.target.value) })), list);
  paint();
}
