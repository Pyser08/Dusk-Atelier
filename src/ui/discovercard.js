// 홈의 '다음에 맛볼 기능' 카드(2.0.0). 한 번에 하나만 권하고, '해 보기'를 누르면 그 화면으로 가서 화면 안내를 띄운다.
// 필요한 애드온이 없으면 받고 나서 연다. 상태는 prefs.ui.discover {seen, off, snoozeUntil}, 방문은 prefs.ui.visited.
import { h } from "./dom.js";
import { btn } from "./kit.js";
import { icon } from "./icons.js";
import { pickDiscover, needsAddon, SNOOZE_MS } from "../engine/discover.js";
import { runScreenTour } from "./screentours.js";

const ADDON_SVC = ["memory", "cards", "erosync", "protlink", "widgets", "aibuild", "chattheme"];

export async function discoverStats(ctx) {
  const ui = ctx.prefs.ui ?? {}, M = ctx.memory, s = { opens: ui.opens ?? 0, records: 0, wikiDocs: 0, hasChat: false, memoryOn: true, advanced: ctx.prefs.advanced === true, visited: new Set(ui.visited ?? []), addons: new Set(ADDON_SVC.filter((id) => ctx.ext?.get?.("svc", id))) };
  try {
    const cur = M ? await M.switches.currentChat() : null;
    if (cur) {
      s.hasChat = true;
      const [sw, f] = await Promise.all([M.switches.state(cur.chaId), M.store.getFolder(cur.chaId, cur.chatId).catch(() => null)]);
      s.memoryOn = !!sw?.memory?.on;
      s.records = Object.values(f?.people ?? {}).reduce((n, p) => n + (p?.records?.length ?? 0), 0);
      s.wikiDocs = Object.values(f?.wiki?.documents ?? {}).filter((d) => d?.type === "Character").length;
    }
  } catch { /* 숫자 없이 */ }
  return s;
}

export async function discoverCard(ctx, { onChange = () => {} } = {}) {
  const st = ctx.prefs.ui?.discover ?? {}, s = await discoverStats(ctx), f = pickDiscover(s, st);
  if (!f) return null;
  const save = (patch) => ctx.prefs.saveUi({ discover: { ...(ctx.prefs.ui?.discover ?? {}), ...patch } }).catch(() => {});
  const need = needsAddon(f, s);
  const msg = h("small", { class: "rb-muted", "aria-live": "polite" }, "");
  const tryIt = async () => {
    try {
      if (need) {
        if (!ctx.addons) return ctx.toast?.("이 환경에서는 애드온을 받을 수 없어요.", { error: true });
        msg.textContent = "애드온을 받는 중…";
        await ctx.addons.install(f.needs);
      }
      await save({ seen: [...new Set([...(st.seen ?? []), f.id])] });
      if (f.go.page) { const m = ctx.state.mem ??= {}; m.page = f.go.page; }
      ctx.go(f.go.tab);
      setTimeout(() => { try { runScreenTour(ctx); } catch { /* 안내 없이 */ } }, 900);
    } catch (e) { msg.textContent = `열지 못했어요: ${e?.message ?? e}`; }
  };
  return h("section", { class: "rb-card bordered rb-discover", id: "rb-discover", "data-discover": f.id, "aria-label": "다음에 맛볼 기능" },
    h("div", { class: "rb-discover-head", style: "display:flex;gap:10px;align-items:flex-start" },
      h("span", { class: "rb-mem-av sm", "aria-hidden": "true" }, icon(f.icon, 18)),
      h("span", { style: "flex:1;min-width:0" }, h("small", { class: "rb-muted" }, "다음에 맛볼 기능"), h("b", { style: "display:block" }, f.title), h("small", { style: "display:block;white-space:normal" }, f.text))),
    h("div", { class: "rb-mem-sact", style: "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" },
      btn(need ? "받고 해 보기" : "해 보기", { kind: "primary", size: "sm", id: "rb-discover-go", onClick: tryIt }),
      btn("나중에", { size: "sm", id: "rb-discover-later", onClick: async () => { await save({ snoozeUntil: Date.now() + SNOOZE_MS }); onChange(); } }),
      btn("이건 됐어요", { size: "sm", kind: "ghost", id: "rb-discover-skip", onClick: async () => { await save({ seen: [...new Set([...(st.seen ?? []), f.id])] }); onChange(); } }),
      btn("그만 보기", { size: "sm", kind: "ghost", id: "rb-discover-off", title: "설정 → ‘기능 맛보기 다시 켜기’로 되돌려요", onClick: async () => { await save({ off: true }); onChange(); } })),
    msg);
}
