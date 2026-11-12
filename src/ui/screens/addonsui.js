// 홈 '애드온' 상자(2.1.0, 예전엔 설정 탭 카드): 카테고리별로 묶어 받기/업데이트/켜고 끄기/지우기.
// 머리 오른쪽 ‘불러오기’(커스텀 애드온 파일)·‘만들기’(AI로 만들기 창). 커스텀 애드온은 스위치 옆 ··· 메뉴로 내보내기·지우기.
// 데이터는 data/addons.js(공식 목록 + 커스텀), 묶음은 engine/addons.js(groupByCategory).
import { h, replace, download, pickFiles } from "../dom.js";
import { btn, switchEl, iconBtn, openMenu, confirmDialog, note } from "../kit.js";
import { rowState, groupByCategory } from "../../engine/addons.js";
import { openAddonMaker, confirmCustomImport } from "./addonmaker.js";

const STATE = { available: "받을 수 있어요", update: "새 버전이 있어요", installed: "켜져 있어요", off: "꺼져 있어요", "needs-core": "Dusk를 먼저 업데이트해야 해요" };
export const CUSTOM_NOTE = "직접 만들거나 받은 애드온이에요. 만든 애드온은 자유롭게 공유할 수 있어요. 괜찮은 기능은 Dusk 개발자가 제작자에게 공식 기능으로 넣고 싶다고 요청할 수도 있어요.";

export function addonBox(ctx) {
  const A = ctx.addons;
  if (!A) return null;
  const body = h("div", { class: "rb-addons", id: "rb-addons" });
  const fail = (e) => ctx.toast(`애드온: ${e?.message ?? e}`, { error: true });
  const busy = async (fn) => { try { await fn(); } catch (e) { fail(e); } await paint(); };
  const getting = (id) => () => { const p = busy(() => A.install(id)); paint(); return p; };
  const getAll = (ids) => async () => {
    const p = A.installMany(ids); paint();
    const r = await p, bad = r.filter((x) => !x.ok);
    ctx.toast(bad.length ? `${r.length - bad.length}개 받았어요 · 실패 ${bad.map((x) => `${x.id}(${x.error})`).join(", ")}` : `${r.length}개 모두 받았어요`, bad.length ? { error: true } : undefined);
    await paint();
  };
  const openBtn = (id, custom) => { const pg = A.page?.(id, custom); return pg ? btn("열기", { size: "sm", onClick: () => pg.open() }) : null; };

  // 커스텀 애드온 불러오기: 파일 고르기 → 안내 → 확인 → 넣기
  async function importFile() {
    const [f] = await pickFiles({ accept: ".js,.mjs,text/javascript" });
    if (!f) return;
    const code = await f.text();
    const meta = await confirmCustomImport(ctx, code);
    if (meta) { ctx.toast(`‘${meta.name}’ v${meta.version}을(를) 불러왔어요`); await paint(); }
  }
  async function customMenu(anchor, a) {
    openMenu(ctx.win, anchor, [
      { icon: "download", label: "내보내기(파일)", onClick: () => busy(async () => { const { name, code } = await A.exportCustom(a.id); download(name, code, "text/javascript"); ctx.toast("파일로 내보냈어요. 자유롭게 공유해도 돼요."); }) },
      { icon: "sparkle", label: "AI로 고치기", onClick: async () => { const { code } = await A.exportCustom(a.id).catch(() => ({})); openAddonMaker(ctx, { existing: code, onDone: paint }); } },
      "sep",
      { icon: "trash", label: "지우기", danger: true, onClick: async () => { if (await confirmDialog(ctx.win, { title: `‘${a.name}’ 지우기`, body: "이 애드온 코드를 지워요. 애드온이 저장해 둔 값은 남아요.", ok: "지우기", danger: true })) busy(() => A.removeCustom(a.id)); } }
    ]);
  }

  // 2.1.5 박스형: 애드온 하나 = 작은 카드(이름·상태 칩·스위치 / 설명 두 줄 / 버전·작동 / 버튼). 긴 목록 대신 격자로 한눈에.
  const CHIP = { available: "new", update: "upd", installed: "on", off: "off", "needs-core": "warn" };
  const SHORT = { available: "받기 전", update: "새 버전", installed: "켜짐", off: "꺼짐", "needs-core": "코어 업데이트 필요" };
  const tile = ({ id, custom, name, desc, chip, chipText, chipTitle, meta, sw, acts, on }) => h("div", { class: ["rb-addon-tile", on && "is-on"], dataset: { addon: id, ...(custom ? { custom: "1" } : {}) } },
    h("div", { class: "rb-addon-tt" }, h("b", { title: name }, name), h("span", { class: "sp" }), sw),
    h("div", { class: "rb-addon-sub" }, chipText ? h("span", { class: `rb-addon-chip c-${chip}`, title: chipTitle ?? chipText }, chipText) : null, meta ? h("small", { class: "rb-addon-meta" }, meta) : null),
    desc ? h("p", { class: "rb-addon-desc", title: desc }, desc) : null,
    acts.some(Boolean) ? h("div", { class: "rb-addon-acts" }, ...acts) : null);
  const officialRow = (a, idx, core) => {
    const cur = idx[a.id], st = rowState(a, cur, core), on = !!cur && cur.on !== false, going = !!A.installing?.(a.id);
    const meta = [cur ? `v${cur.version}` : `v${a.version}`, cur?.pendingRestart ? "새로고침하면 새 버전이 적용돼요" : "", cur?.rolledBack ? `v${cur.rolledBack}에서 오류가 나 되돌렸어요` : "", cur?.error ? `오류: ${cur.error}` : "", cur && on ? (A.running(a.id) ? "작동 중" : "멈춤") : ""].filter(Boolean).join(" · ");
    return tile({ id: a.id, name: a.name, desc: a.desc, chip: CHIP[st] ?? "off", chipText: SHORT[st] ?? STATE[st], chipTitle: STATE[st], meta, on: cur && on,
      sw: cur ? switchEl(on, { label: `${a.name} 켜기`, onChange: (v) => busy(() => A.setOn(a.id, v)) }) : null,
      acts: [
        going ? h("small", { class: "rb-muted" }, cur ? "업데이트하는 중…" : "받는 중…") : null,
        !going && !cur && st === "available" ? btn("받기", { size: "sm", kind: "primary", onClick: getting(a.id) }) : null,
        !going && st === "update" ? btn("업데이트", { size: "sm", kind: "primary", onClick: getting(a.id) }) : null,
        cur && on ? openBtn(a.id, false) : null,
        cur ? btn("지우기", { size: "sm", onClick: () => busy(() => A.remove(a.id)) }) : null] });
  };
  const customRow = (a) => {
    const on = a.on !== false;
    const meta = [`v${a.version}`, a.author ? `만든 사람 ${a.author}` : "", a.error ? `오류: ${a.error}` : on ? (A.runningCustom(a.id) ? "작동 중" : "멈춤") : "꺼져 있어요"].filter(Boolean).join(" · ");
    return tile({ id: `custom-${a.id}`, custom: true, name: a.name, desc: a.desc, chip: a.error ? "warn" : on ? "on" : "off", chipText: a.error ? "오류" : on ? "켜짐" : "꺼짐", meta, on,
      sw: switchEl(on, { label: `${a.name} 켜기`, onChange: (v) => busy(() => A.setCustomOn(a.id, v)) }),
      acts: [on ? openBtn(a.id, true) : null, iconBtn("more", `${a.name} 메뉴`, { onClick: (e) => customMenu(e.currentTarget, a) })] });
  };

  async function paint() {
    const idx = await A.getIndex();
    let list = A.manifest();
    if (!list) {
      replace(body, h("p", { class: "rb-muted" }, "목록 불러오는 중…"));
      list = await A.loadManifest().catch((e) => { replace(body, h("p", { class: "rb-muted" }, `목록을 받지 못했어요: ${e?.message ?? e}`)); return null; });
      list ??= [];   // 목록이 없어도 커스텀 애드온은 보여 준다
    }
    const customs = Object.values(await A.customs?.().catch(() => ({})) ?? {}).map((c) => ({ ...c, custom: true }));
    const core = A.core?.() ?? ctx.version;
    const groups = groupByCategory([...list, ...customs], { keepCustom: !!A.customs });
    const err = A.lastError();
    const todo = list.filter((a) => !A.installing?.(a.id) && ["available", "update"].includes(rowState(a, idx[a.id], core))).map((a) => a.id);
    const allBtn = todo.length > 1 ? btn(`모두 받기·업데이트 (${todo.length})`, { size: "sm", kind: "primary", id: "rb-addon-all", onClick: getAll(todo) }) : null;
    replace(body,
      ...groups.map(({ cat, items }) => h("div", { class: ["rb-addon-cat", cat.id === "custom" && "is-custom"], dataset: { cat: cat.id } },
        h("h3", { class: "rb-addon-cath" }, cat.name, h("small", null, String(items.length))),
        cat.id === "custom" ? h("p", { class: "rb-muted rb-addon-note", id: "rb-addon-custom-note" }, CUSTOM_NOTE) : null,
        cat.id === "custom" && !items.length ? h("p", { class: "rb-muted rb-addon-empty" }, "아직 없어요. 오른쪽 위 ‘불러오기’로 파일을 넣거나 ‘만들기’로 AI와 함께 만들어요.") : null,
        items.length ? h("div", { class: "rb-addon-grid" }, ...items.map((a) => (a.custom ? customRow(a) : officialRow(a, idx, core)))) : null)),
      err ? h("p", { class: "rb-muted" }, `업데이트 확인 실패: ${err}`) : null,
      h("div", { class: "rb-addon-foot" }, allBtn, btn("업데이트 확인", { size: "sm", id: "rb-addon-check", onClick: () => busy(async () => { const r = await A.check({ force: true, fresh: true }); ctx.toast(r.error ? `확인 실패: ${r.error}` : r.updates.length ? `${r.updates.length}개 업데이트했어요` : "모두 최신이에요"); }) })));
  }
  paint();
  // 켜고 끄기·시작이 끝나면(다른 곳에서 바뀌어도) 다시 그린다. 상자가 화면에서 빠지면 구독도 끊는다.
  const unsub = A.subscribe?.(() => { if (!body.isConnected) { unsub?.(); return; } paint().catch(() => {}); });
  const head = h("div", { class: "rb-addon-head" },
    h("div", { class: "rb-addon-top" },
      h("h2", null, "애드온"),
      A.customs ? h("div", { class: "rb-addon-tools" },
        btn("불러오기", { size: "sm", icon: "upload", id: "rb-addon-import", onClick: () => importFile().catch(fail) }),
        btn("만들기", { size: "sm", kind: "primary", icon: "sparkle", id: "rb-addon-make", onClick: () => openAddonMaker(ctx, { onDone: paint }) })) : null),
    h("small", { class: "rb-muted" }, "필요한 기능만 받아서 써요. 리스 플러그인 목록에는 안 뜨고, 자동으로 업데이트돼요."));
  return h("section", { class: "rb-addonbox rb-card bordered", id: "rb-addonbox", "aria-label": "애드온" }, head, body);
}

// 예전 이름(설정 탭 카드) — 다른 곳에서 부르면 홈 상자로 가는 안내만 남긴다
export function addonCard(ctx, card) {
  if (!ctx.addons) return null;
  return card("애드온", note("info", "애드온은 홈으로 옮겼어요."), h("div", { style: "display:flex;justify-content:flex-end;padding-top:6px" }, btn("홈에서 보기", { size: "sm", icon: "home", onClick: () => ctx.go("home") })));
}
