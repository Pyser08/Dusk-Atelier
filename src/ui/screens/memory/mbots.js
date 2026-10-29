// 봇별 기억 (1.7.0 3단계, 계획 §3.2): 검색 · 봇마다 사용 스위치 · 눌러서 기록 보기.
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { badge, btn, switchEl, setSwitch } from "../../kit.js";
import { mem, loadBots, fail, avatar } from "./common.js";

const when = (ms) => ms ? new Date(ms).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "";

export async function renderMemoryBots(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  const [bots, idx, cur] = await Promise.all([loadBots(ctx), M.store.getIndex(), M.switches.currentChat()]);
  const stat = (id) => { const fs = Object.values(idx.folders).filter((f) => f.chaId === id); return { records: fs.reduce((n, f) => n + (f.counts?.records ?? 0), 0), at: fs.reduce((t, f) => Math.max(t, f.updatedAt ?? 0), 0) }; };
  const list = h("div", { class: "rb-mem-botlist rb-mbots", role: "list" });
  const paint = (q = m.search) => {
    m.search = q; const s = q.trim().toLowerCase();
    const rows = bots.filter((b) => !s || String(b.character.name ?? "").toLowerCase().includes(s)).map((b) => ({ b, st: stat(b.id) })).sort((x, y) => (y.b.id === cur?.chaId) - (x.b.id === cur?.chaId) || y.st.at - x.st.at || x.b.index - y.b.index);
    replace(list, rows.length ? rows.map(({ b, st }) => {
      const on = idx.bots[b.id]?.on !== false;
      const open = () => { m.botId = b.id; m.chatIndex = b.id === cur?.chaId ? cur.ti : 0; m.tab = "people"; m.personKey = ""; m.page = "detail"; redraw(); };
      const sw = switchEl(on, { label: `${b.character.name || "이름 없는 캐릭터"} 기억 사용`, onChange: async (v, el) => {
        setSwitch(el, v);
        try { await M.switches.setMemory(b.id, v); ctx.toast(v ? "이 봇에서 기억을 켰어요." : "이 봇에서 기억을 껐어요."); } catch (e) { fail(ctx)(e); }
      } });
      return h("div", { class: "rb-row rb-mbot", role: "listitem" },
        h("button", { type: "button", class: "rb-mbot-open", onClick: open },
          avatar(b.character.name),
          h("span", { class: "txt" }, h("span", { class: "name" }, b.character.name || "이름 없는 캐릭터", b.id === cur?.chaId ? badge("지금 채팅", "ok") : null),
            h("span", { class: "meta" }, `기억 ${st.records}건 · 채팅 ${b.character.chats?.length ?? 0}${st.at ? ` · ${when(st.at)}` : ""}`))),
        sw);
    }) : h("div", { class: "rb-empty" }, "검색 결과가 없어요."));
  };
  replace(host,
    h("div", { class: "rb-mem2-head" }, btn("← 기억으로", { size: "sm", onClick: () => { m.page = "home"; redraw(); } }), h("h2", { class: "rb-h2" }, "봇별 기억"), h("span", { class: "rb-muted" }, "봇마다 기억을 켜고 꺼요")),
    h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "봇 검색", value: m.search, "aria-label": "봇 검색", onInput: (e) => paint(e.target.value) })), list);
  paint();
}
