// 모듈 연결 (v1.7.0 5단계): 전역 · 페르소나 · 캐릭터 · 지금 채팅.
// 개발자 모드의 오른쪽 패널, 일반 모드의 PC 팝오버, 모바일 시트가 같은 내용을 쓴다.
import { loadCharacters, moduleFlags } from '../../data/modules.js';
import { loadPersonaMap, setPersonaLink } from '../../data/persona.js';
import { h, replace } from '../dom.js';
import { btn, popover, setSwitch, sheet, spinner, switchEl } from '../kit.js';

var muted = (text) => h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, text));
var loadingRow = (text) => h("div", { class: "rb-kv" }, h("span", { class: "rb-muted", style: "display:flex;align-items:center;gap:8px" }, spinner(), text));

/** 연결 영역 한 덩어리. refresh: 전역 스위치를 바꾼 뒤 목록을 다시 읽는 함수 */
export function moduleLinks(ctx, e, { refresh, refreshDetail } = {}) {
  const st = ctx.state, data = st.modData, m = e.module;
  const f = moduleFlags(m, data.globalOn);
  const globalSw = switchEl(f.global, { label: "글로벌 활성화", disabled: !e.enabled, onChange: async (on) => {
    setSwitch(globalSw, on);
    try {
      await ctx.svc.run("setGlobal", m.id, on);
      await refresh?.();
    } catch (err) {
      setSwitch(globalSw, !on);
      ctx.toast(err?.message ?? String(err), { error: true });
    }
  } });
  const links = h("div", { class: "rb-card" }, h("div", { class: "rb-kv" }, h("span", null, "글로벌 활성화", h("br"), h("small", { class: "rb-muted" }, "모든 캐릭터·채팅에서 켜짐")), globalSw));
  const personaBox = h("div", { class: "rb-card" }, loadingRow("불러오는 중"));
  const charBox = h("div", { class: "rb-card" });
  const chatBox = h("div", { class: "rb-card" });
  (async () => {
    const [db, pm] = await Promise.all([ctx.api.getDatabase(["personas"]), loadPersonaMap(ctx.api)]);
    const personas = (db?.personas ?? []).filter((p) => p?.id);
    const linked = (p) => (pm.map[p.id] ?? []).includes(m.id);
    personas.sort((a, b) => Number(linked(b)) - Number(linked(a)));
    const box = h("div", { class: "rb-scroll", style: "max-height:232px;overflow:auto;overscroll-behavior:contain", id: "rb-persona-box" });
    const q = personas.length > 6 ? h("input", { class: "rb-input", type: "search", placeholder: `페르소나 ${personas.length}개에서 찾기`, "aria-label": "페르소나 찾기", style: "height:36px;border-radius:0;border-width:0 0 1px 0" }) : null;
    const rows = personas.length ? personas.map((p) => {
      const on = (pm.map[p.id] ?? []).includes(m.id);
      const sw = switchEl(on, { label: `${p.name} 페르소나에 연결`, disabled: !e.enabled, onChange: async (v) => {
        setSwitch(sw, v);
        try {
          await setPersonaLink(ctx.api, p.id, m.id, v, data.entries.map((x) => x.module.id));
          ctx.onPersonaChanged?.();
          ctx.toast(v ? `'${p.name}' 페르소나를 쓰면 켜져요` : `'${p.name}' 연결을 풀었어요`);
        } catch (err) {
          setSwitch(sw, !v);
          ctx.toast(err?.message ?? String(err), { error: true });
        }
      } });
      const r = h("div", { class: "rb-kv" }, h("span", null, p.name || "(이름 없음)"), sw);
      r.dataset.name = String(p.name ?? "").toLowerCase();
      return r;
    }) : [muted("페르소나가 없어요")];
    box.append(...rows);
    q?.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      for (const r of rows) r.hidden = !!v && !r.dataset.name?.includes(v);
    });
    replace(personaBox, q, box);
  })().catch(() => replace(personaBox, muted("페르소나를 읽지 못했어요")));
  const loadChars = async () => {
    replace(charBox, loadingRow("캐릭터 불러오는 중"));
    const db = await ctx.api.getDatabase(["characters"]);
    db.characters = (await loadCharacters(ctx.api, db?.characters)).list;
    const chars = (db?.characters ?? []).map((ch, i) => ({ ch, i })).filter((x) => x.ch && !x.ch.trashTime && x.ch.type !== "group");
    const linked = chars.filter((x) => x.ch.modules?.includes(m.id));
    const filterBox = h("input", { class: "rb-input", style: "height:36px;margin:8px 14px;width:calc(100% - 28px)", placeholder: "캐릭터 검색", "aria-label": "캐릭터 검색" });
    const listEl = h("div", { class: "rb-scroll", style: "max-height:240px" });
    const paint = () => {
      const q = filterBox.value.trim().toLowerCase();
      replace(listEl, chars.filter((x) => !q || String(x.ch.name ?? "").toLowerCase().includes(q)).slice(0, 200).map(({ ch, i }) => {
        const on = ch.modules?.includes(m.id) ?? false;
        const sw = switchEl(on, { label: `${ch.name}에 연결`, disabled: !e.enabled, onChange: async (v) => {
          setSwitch(sw, v);
          try {
            await ctx.svc.run("setCharacterLink", i, m.id, v);
            ch.modules = v ? [...ch.modules ?? [], m.id] : (ch.modules ?? []).filter((x) => x !== m.id);
          } catch (err) {
            setSwitch(sw, !v);
            ctx.toast(err?.message ?? String(err), { error: true });
          }
        } });
        return h("div", { class: "rb-kv" }, h("span", null, ch.name || "(이름 없음)"), sw);
      }));
    };
    filterBox.addEventListener("input", paint);
    replace(charBox, h("div", { class: "rb-kv" }, h("span", null, `연결된 캐릭터 ${linked.length}명`), h("span", null, linked.slice(0, 3).map((x) => x.ch.name).join(", ") + (linked.length > 3 ? " 외" : ""))), filterBox, listEl);
    paint();
  };
  replace(charBox, h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "캐릭터 목록은 눌러서 불러와요"), btn("불러오기", { size: "sm", onClick: () => loadChars().catch((err) => ctx.toast(err?.message ?? String(err), { error: true })) })));
  (async () => {
    const ci = await ctx.api.getCurrentCharacterIndex(), chi = await ctx.api.getCurrentChatIndex?.();
    if (ci < 0 || chi === void 0 || chi < 0) {
      replace(chatBox, muted("열린 채팅이 없어요"));
      return;
    }
    const chat = await ctx.api.getChatFromIndex(ci, chi);
    const on = chat?.modules?.includes(m.id);
    replace(chatBox, h(
      "div",
      { class: "rb-kv" },
      h("span", null, on ? "이 채팅에서 켜짐" : "이 채팅에는 따로 연결 안 됨", h("br"), h("small", { class: "rb-muted" }, "채팅 연결 추가는 RisuAI 채팅 화면에서 해요")),
      on ? btn("이 채팅에서 해제", { size: "sm", onClick: async () => {
        await ctx.svc.run("unlinkChat", ci, chi, m.id);
        ctx.toast("이 채팅에서 해제했어요");
        refreshDetail?.();
      } }) : null
    ));
  })().catch(() => replace(chatBox, muted("채팅 정보를 읽지 못했어요")));
  return h(
    "div",
    { class: "rb-field rb-modlinks" },
    h("span", { class: "rb-label" }, "연결"),
    links,
    h("span", { class: "rb-label", style: "margin-top:6px" }, "페르소나 — 그 페르소나를 쓰는 동안 자동으로 켜짐"),
    personaBox,
    h("span", { class: "rb-label", style: "margin-top:6px" }, "캐릭터 — 그 캐릭터의 모든 채팅에서 켜짐"),
    charBox,
    h("span", { class: "rb-label", style: "margin-top:6px" }, "지금 채팅"),
    chatBox
  );
}

/** 일반 모드: PC는 줄 옆 팝오버, 모바일은 아래에서 올라오는 시트 */
export function openModuleLinks(ctx, e, anchor, { refresh } = {}) {
  const title = `${e.module.name || "모듈"} 연결`;
  const content = () => moduleLinks(ctx, e, { refresh });
  if (ctx.isMobile()) return sheet(ctx.win, content(), { title });
  return popover(ctx.win, anchor, content(), { width: 380, title });
}
