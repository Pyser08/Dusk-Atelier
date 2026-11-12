// 인물 위키의 '게이지' 블록: 보기 · + 추가(이름+설명 → AI 설계 또는 직접) · 관리(켜기/수정/삭제/내보내기) · 제안 · 되돌리기.
import { h } from "../../dom.js";
import { btn, modal, confirmDialog, switchEl, setSwitch, note } from "../../kit.js";
import { fail } from "./common.js";
import * as G from "../../../engine/gauge.js";
import { gaugeBoxHtml, shapeHtml } from "../../../engine/gaugeview.js";

const svc = (env) => env.ctx.memory?.gauge ?? null;
const chaOf = (env) => String(env.bot?.id ?? env.folder?.chaId ?? "");
const chatOf = (env) => String(env.folder?.chatId ?? "");
const modelOf = (env) => ({ ...env.idx?.settings?.model, timeoutSec: Number.isFinite(env.idx?.settings?.modelTimeoutSec) ? env.idx.settings.modelTimeoutSec : 600 });
const names = (doc, p) => [...new Set([p?.name, doc?.title, ...(p?.aliases ?? []), ...(doc?.aliases ?? [])].filter(Boolean))];
const field = (label, el, help) => h("label", { class: "rb-field", style: "display:block;margin:8px 0" }, h("span", { class: "rb-muted", style: "display:block;font-size:12px;margin-bottom:3px" }, label), el, help ? h("span", { class: "rb-muted", style: "display:block;font-size:11px" }, help) : null);
const html = (s) => { const d = h("div"); d.innerHTML = s; return d; };

// 값 보기: 현재 채팅 폴더 기준
function snapFor(env, defs, doc, p) {
  const ns = names(doc, p), out = [];
  for (const d of defs) {
    if (!G.appliesTo(d, ns[0] ?? "", ns[0] ? [ns[0]] : [])) continue;
    const who = ns.find((n) => env.folder?.gauge?.vals?.[d.id]?.[G.gkey(n)]) ?? ns[0];
    out.push({ g: d.id, who, v: G.valueOf(env.folder, d, who) });
  }
  return out;
}

// v1.8.3 인물 위키 요약용: 이 인물에게 적용되는 게이지 값만 가볍게(버튼 없이) 돌려준다.
export async function gaugeRows(env, doc, p) {
  const S = svc(env); if (!S) return [];
  const defs = await S.getDefs(chaOf(env)), by = new Map(defs.map((d) => [d.id, d]));
  return snapFor(env, defs, doc, p).map((s) => { const d = by.get(s.g); return { name: d.name, icon: d.look?.icon || "", hue: d.look?.hue ?? 265, v: s.v, min: d.min, max: d.max }; });
}

// v1.8.3 상세 정보 탭: 새 게이지 제안 카드만(없으면 빈 칸). 수락·나중에·거절 뒤 after().
export function gaugeSuggestBox(env, after = () => {}) {
  const S = svc(env), root = h("div", { class: "rb-wk3-sug" });
  if (!S) return root;
  const run = (pr) => Promise.resolve(pr).catch(fail(env.ctx));
  const paint = async () => {
    const defs = await S.getDefs(chaOf(env)), sug = await S.getSuggest(chaOf(env)), shown = G.shownSuggestion(sug);
    if (!shown) return root.replaceChildren();
    const done = async () => { await paint(); after(); };
    root.replaceChildren(h("div", { class: "rb-wk3-sugcard" }, h("b", null, `새 게이지 제안: ${shown.name}`), h("p", { class: "rb-muted" }, shown.desc || "(설명 없음)"), G.isDuplicateName(defs, shown.name) ? h("p", { class: "rb-muted" }, "비슷한 게이지가 이미 있어요.") : null,
      h("div", { class: "rb-mem-rowact" },
        btn("수락 (모든 인물에게)", { kind: "primary", size: "sm", onClick: () => run((async () => { env.ctx.toast("AI가 게이지를 설계하는 중…"); await S.acceptSuggestion(chaOf(env), shown.id, modelOf(env), env.bot?.character?.name); env.ctx.toast("게이지를 만들었어요."); await done(); })()) }),
        btn("나중에", { size: "sm", onClick: () => run(S.resolveSuggestion(chaOf(env), shown.id, "later").then(done)) }),
        btn("거절", { size: "sm", onClick: () => run(S.resolveSuggestion(chaOf(env), shown.id, "dismiss").then(done)) }))));
  };
  run(paint());
  return root;
}

export function gaugeBlock(env, doc, p) {
  const S = svc(env), root = h("div", { class: "rb-gauge-block", style: "grid-column:1/-1" });
  if (!S) return root;
  const run = (pr) => Promise.resolve(pr).catch(fail(env.ctx));
  const paint = async () => {
    const defs = await S.getDefs(chaOf(env)), sug = await S.getSuggest(chaOf(env));
    const kids = [];
    const shown = G.shownSuggestion(sug);
    if (shown) {
      const dup = G.isDuplicateName(defs, shown.name);
      kids.push(h("div", { class: "rb-card pad", style: "border:1px solid rgba(180,160,255,.5);background:linear-gradient(135deg,rgba(124,92,240,.18),rgba(18,16,31,.4))" },
        h("b", null, `✦ 새 게이지 제안: ${shown.name}`), h("p", { class: "rb-muted", style: "margin:4px 0" }, shown.desc || "(설명 없음)"), dup ? h("p", { class: "rb-muted" }, "⚠ 비슷한 게이지가 이미 있어요.") : null,
        h("div", { style: "display:flex;gap:6px;flex-wrap:wrap" },
          btn("수락 (모든 인물에게)", { kind: "primary", size: "sm", onClick: () => run((async () => { env.ctx.toast("AI가 게이지를 설계하는 중…"); await S.acceptSuggestion(chaOf(env), shown.id, modelOf(env), env.bot?.character?.name); env.ctx.toast("게이지를 만들었어요."); await paint(); })()) }),
          btn("나중에", { size: "sm", onClick: () => run(S.resolveSuggestion(chaOf(env), shown.id, "later").then(paint)) }),
          btn("거절", { size: "sm", onClick: () => run(S.resolveSuggestion(chaOf(env), shown.id, "dismiss").then(paint)) }))));
    }
    const snap = snapFor(env, defs, doc, p);
    if (snap.length) { const box = html(gaugeBoxHtml({ snap, items: [] }, defs).trim()); kids.push(box); }
    else kids.push(h("p", { class: "rb-muted", style: "margin:4px 0" }, "만든 게이지가 없어요. 아래 + 로 만들어 보세요."));
    kids.push(h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" },
      btn("+ 게이지 추가", { size: "sm", kind: "primary", onClick: () => run(openCreate(env).then((ok) => ok && paint())) }),
      btn("게이지 관리", { size: "sm", onClick: () => run(openManager(env).then(paint)) })));
    root.replaceChildren(...kids);
  };
  run(paint());
  return root;
}

// ── + 추가: 이름+설명만 받는다. AI가 나머지를 설계하거나, 직접 입력.
export async function openCreate(env) {
  const S = svc(env), cha = chaOf(env);
  return modal(env.ctx.win, (done) => {
    const name = h("input", { class: "rb-input", maxlength: 24, placeholder: "예: 경계심", "aria-label": "게이지 이름", "data-autofocus": "" }), desc = h("textarea", { class: "rb-input", rows: 3, maxlength: 200, placeholder: "어떤 상태를 재는 건지 자연스럽게 적어 주세요.", "aria-label": "설명" });
    const msg = h("div"), busy = { v: false };
    const go = async (manual) => {
      if (busy.v) return; busy.v = true; msg.replaceChildren(note("info", manual ? "열어 주세요…" : "AI가 범위·변화 규칙·프롬프트를 설계하는 중…"));
      try {
        const draft = manual ? G.normalizeDef({ name: name.value, desc: desc.value }) : await S.design({ bot: env.bot?.character?.name, name: name.value, desc: desc.value }, modelOf(env));
        busy.v = false; const saved = await openEditor(env, draft, { isNew: true }); if (saved) done(true); else msg.replaceChildren();
      } catch (e) { busy.v = false; msg.replaceChildren(note("err", e?.message ?? String(e))); }
    };
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(480px,94vw)" }, h("h3", null, "게이지 추가"),
      h("p", { class: "rb-muted" }, "이름과 설명만 적으면 AI가 나머지를 설계해요. 저장하기 전에 직접 고칠 수 있어요."),
      field("이름", name), field("설명", desc), msg,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("직접 입력", { onClick: () => go(true) }), btn("AI로 설계", { kind: "primary", onClick: () => go(false) })));
  });
}

// ── 편집(새 초안 포함). 저장해야만 만들어진다.
export async function openEditor(env, draft, { isNew = false } = {}) {
  const S = svc(env), cha = chaOf(env);
  return modal(env.ctx.win, (done) => {
    const i = (key, extra = {}) => h("input", { class: "rb-input", value: draft[key] ?? "", ...extra }), ta = (key, rows = 2) => h("textarea", { class: "rb-input", rows, maxlength: 400 }, draft[key] ?? "");
    const name = i("name", { maxlength: 24 }), desc = i("desc", { maxlength: 200 }), min = i("min", { type: "number" }), max = i("max", { type: "number" }), init = i("init", { type: "number" }), step = i("step", { type: "number", min: 1 });
    const measure = ta("measure"), rule = ta("rule"), update = ta("update");
    const hue = h("input", { type: "range", min: 0, max: 359, value: draft.look.hue, "aria-label": "색" }), shape = h("select", { class: "rb-input" }, G.SHAPES.map((s) => h("option", { value: s, selected: s === draft.look.shape }, { orb: "구슬", ring: "고리", bar: "막대", ticks: "눈금" }[s]))), icon = i("icon", { maxlength: 4 });
    icon.value = draft.look.icon ?? "";
    const L = draft.look, c1 = h("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(L.c1) ? L.c1 : "#7c5cf0", "aria-label": "시작 색" }), c2 = h("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(L.c2) ? L.c2 : "#c9b8ff", "aria-label": "끝 색" });
    const useC = { v: !!(L.c1 || L.c2) }; [c1, c2].forEach((e) => e.addEventListener("input", () => { useC.v = true; }));
    const cCard = h("textarea", { class: "rb-input", rows: 2, maxlength: 700 }, L.card ?? ""), cFill = h("textarea", { class: "rb-input", rows: 2, maxlength: 700 }, L.fill ?? ""), cTrack = h("textarea", { class: "rb-input", rows: 2, maxlength: 700 }, L.track ?? "");
    const regen = h("span");
    const prev = h("div"), msg = h("div");
    const cur = () => ({ ...draft, name: name.value, desc: desc.value, min: min.value, max: max.value, init: init.value, step: step.value, measure: measure.value, rule: rule.value, update: update.value, look: { hue: +hue.value, shape: shape.value, icon: icon.value, c1: useC.v ? c1.value : "", c2: useC.v ? c2.value : "", text: L.text, card: cCard.value, fill: cFill.value, track: cTrack.value } });
    const redraw = () => { try { const d = G.normalizeDef(cur(), { id: draft.id }); prev.replaceChildren(html(gaugeBoxHtml({ snap: [{ g: d.id, who: "미리보기", v: d.init }, { g: d.id, who: "다른 인물", v: Math.min(d.max, d.init + d.step) }], items: [] }, [d]).trim())); msg.replaceChildren(); } catch (e) { msg.replaceChildren(note("err", e.message)); } };
    [name, desc, min, max, init, step, hue, shape, icon, c1, c2, cCard, cFill, cTrack].forEach((el) => el.addEventListener("input", redraw)); redraw();
    const save = async () => {
      try { const d = G.normalizeDef(cur(), { id: draft.id }); if (isNew) await S.addDef(cha, { ...d, on: false }); else await S.updateDef(cha, d.id, d); S.invalidate(); done(true); }
      catch (e) { msg.replaceChildren(note("err", e?.message ?? String(e))); }
    };
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, isNew ? "게이지 만들기 (아직 저장 전)" : "게이지 수정"),
      prev, field("이름", name), field("설명", desc),
      h("div", { style: "display:grid;grid-template-columns:repeat(4,1fr);gap:6px" }, field("최소", min), field("최대", max), field("처음 값", init), field("한 번에 최대", step)),
      field("무엇을 볼까 (측정)", measure), field("어떻게 움직일까 (변화 규칙)", rule), field("변화 쓰는 법 (갱신)", update),
      h("div", { style: "display:grid;grid-template-columns:1fr 1fr 70px;gap:6px;align-items:end" }, field("색", hue), field("모양", shape), field("아이콘", icon)),
      h("details", { open: !!(L.card || L.fill || L.track) }, h("summary", null, "디자인 (CSS) — AI가 만든 걸 고칠 수 있어요"),
        h("div", { style: "display:flex;gap:10px;align-items:center" }, h("span", { class: "rb-muted" }, "그라데이션"), c1, c2, btn("디자인만 AI로 다시", { size: "sm", onClick: async () => { try { msg.replaceChildren(note("info", "AI가 디자인을 다시 만드는 중…")); const d = await S.design({ bot: env.bot?.character?.name, name: name.value, desc: desc.value }, modelOf(env)); const l = d.look; hue.value = l.hue; shape.value = l.shape; icon.value = l.icon; c1.value = /^#[0-9a-f]{6}$/i.test(l.c1) ? l.c1 : c1.value; c2.value = /^#[0-9a-f]{6}$/i.test(l.c2) ? l.c2 : c2.value; useC.v = !!(l.c1 || l.c2); L.text = l.text; cCard.value = l.card; cFill.value = l.fill; cTrack.value = l.track; redraw(); } catch (e) { msg.replaceChildren(note("err", e?.message ?? String(e))); } } })),
        field("카드 CSS", cCard, "예: background:linear-gradient(135deg,#1b1038,#401a5a);border-radius:16px;box-shadow:0 0 18px #a06cff88"), field("채워진 부분 CSS", cFill), field("빈 칸 CSS", cTrack),
        h("p", { class: "rb-muted", style: "font-size:11px" }, "안전을 위해 url(), var(), 주석 등은 자동으로 빠져요.")),
      isNew ? h("p", { class: "rb-muted" }, "저장하면 꺼진 상태로 만들어져요. 켜야 8번째 응답마다 자동으로 갱신돼요.") : null, msg,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: save })));
  });
}

// ── 관리
export async function openManager(env) {
  const S = svc(env), cha = chaOf(env), chat = chatOf(env), run = (pr) => Promise.resolve(pr).catch(fail(env.ctx));
  return modal(env.ctx.win, (done) => {
    const listEl = h("div"), sugEl = h("div"), top = h("div");
    const paint = async () => {
      const defs = await S.getDefs(cha), sug = await S.getSuggest(cha);
      listEl.replaceChildren(...(defs.length ? defs.map((d) => h("div", { class: "rb-card", style: "display:flex;gap:8px;align-items:center;margin:6px 0;padding:10px 12px" },
        h("div", { style: "flex:none;width:46px" }, html(shapeHtml({ ...d, look: { ...d.look, shape: d.look.shape === "bar" || d.look.shape === "ticks" ? "orb" : d.look.shape } }, d.init))),
        h("div", { style: "flex:1;min-width:0" }, h("b", null, `${d.look.icon || "✦"} ${d.name}`), h("div", { class: "rb-muted", style: "font-size:12px" }, `${d.min}~${d.max}${d.src === "user" ? "" : " · AI"}${d.on ? "" : " · 꺼짐"}`)),
        switchEl(d.on, { label: "자동 갱신", onChange: (on, el) => { setSwitch(el, on); run(S.updateDef(cha, d.id, { on }).then(paint)); } }),
        btn("수정", { size: "sm", onClick: () => run(openEditor(env, d).then(paint)) }),
        btn("삭제", { size: "sm", onClick: () => run((async () => { if (await confirmDialog(env.ctx.win, { title: "게이지 삭제", body: `"${d.name}"와 모든 채팅의 값·기록이 지워져요.`, ok: "삭제", danger: true })) { await S.removeDef(cha, d.id); await paint(); } })()) }))) : [h("p", { class: "rb-muted" }, "게이지가 없어요.")]));
      sugEl.replaceChildren(h("div", { class: "rb-card pad" }, h("div", { style: "display:flex;gap:8px;align-items:center" }, h("div", { style: "flex:1" }, h("b", null, "게이지 자동 제안"), h("div", { class: "rb-muted", style: "font-size:12px" }, "하루 2개까지, 4시간 간격, 한 번에 1개만. 직접 만든 건 이 개수에 안 들어가요.")), switchEl(!!sug.on, { label: "자동 제안", onChange: (on, el) => { setSwitch(el, on); run(S.setSuggestOn(cha, on)); } }))));
    };
    const exp = async () => { const defs = await S.getDefs(cha); const text = G.exportDefs(defs); try { await env.ctx.win.navigator.clipboard.writeText(text); env.ctx.toast("JSON을 복사했어요."); } catch { const a = h("a", { href: "data:application/json;charset=utf-8," + encodeURIComponent(text), download: "dusk-gauges.json" }); a.click(); } };
    const imp = () => { const inp = h("input", { type: "file", accept: ".json,application/json" }); inp.addEventListener("change", () => run((async () => { const f = inp.files?.[0]; if (!f) return; const defs = await S.getDefs(cha); const list = G.importDefs(await f.text(), defs); for (const d of list) await S.addDef(cha, d); env.ctx.toast(`${list.length}개 가져왔어요 (꺼진 상태).`); await paint(); })())); inp.click(); };
    const undo = () => run((async () => { if (!chat) return env.ctx.toast("이 채팅에는 기록이 없어요."); const r = await S.undo(cha, chat); env.ctx.toast(r ? `되돌렸어요 (${r.restored}개${r.skipped ? `, 그 뒤 바뀐 ${r.skipped}개는 그대로` : ""}).` : "되돌릴 변경이 없어요."); })());
    paint();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(520px,96vw);max-height:90vh;overflow:auto" }, h("h3", null, "게이지 관리"),
      h("p", { class: "rb-muted" }, "정의는 봇마다 하나, 값과 기록은 인물·채팅마다 따로예요."), listEl, sugEl,
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" }, btn("내보내기", { size: "sm", onClick: () => run(exp()) }), btn("가져오기", { size: "sm", onClick: imp }), btn("마지막 변경 되돌리기", { size: "sm", onClick: undo })),
      h("div", { class: "rb-dialog-actions" }, btn("닫기", { kind: "primary", onClick: () => done(true) })));
  });
}
