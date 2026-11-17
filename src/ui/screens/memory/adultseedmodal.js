// 2.2.6 ‘처음 등장 때 성인 항목 무작위로’ 설정 창(임베딩 창처럼 기억 옵션 줄에서 연다).
// 켜기 · 무작위로 정할 것(월경 · 성적 관심/성적 항목 · 성적 욕망 · 이상성향) · 성향 분류별 항목 켜고 끄기 · 직접 항목 넣기.
import { h } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, modal, switchEl, setSwitch, note } from "../../kit.js";
import { readSeedOpt, saveSeedOpt } from "../../../data/adultseed.js";
import { poolOf, normalizeSeedOpt, DESIRE_CATS, KINK_CATS, CUSTOM_CAT } from "../../../engine/adultseed.js";
import { ensureMemAddonCss } from "./memaddoncss.js";

export const seedLine = (o) => !o.on ? "꺼짐" : `켜짐 · ${[o.cycle && "월경", o.sexual && "성적 수치", o.desires && "성적 욕망·이상성향", o.lewd && "음란도", o.first && "첫인상"].filter(Boolean).join("·") || "고른 항목 없음"}`;

// 기억 옵션에 넣는 줄(누르면 창). onSaved(opt)로 줄 글자를 바꾼다.
export function adultSeedRow(ctx) {
  const sub = h("small", null, "켠 뒤 처음 나오는 인물에게 성인 항목을 무작위로 정해 줘요 · 꺼짐");
  const row = h("button", { type: "button", class: "rb-srow", id: "rb-adult-seed-row", onClick: () => openAdultSeedModal(ctx, { onSaved: (o) => { sub.textContent = `처음 나오는 인물에게 성인 항목을 무작위로 · ${seedLine(o)}`; } }) },
    h("span", { class: "t" }, "처음 등장 때 성인 항목 무작위로", sub), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
  readSeedOpt(ctx.api).then((o) => { sub.textContent = `처음 나오는 인물에게 성인 항목을 무작위로 · ${seedLine(o)}`; }).catch(() => {});
  return row;
}

export async function openAdultSeedModal(ctx, { onSaved = null } = {}) {
  ensureMemAddonCss(ctx);
  let o = normalizeSeedOpt(await readSeedOpt(ctx.api));
  const msg = h("div", { "aria-live": "polite" });
  const sw = (label, key, hint, id) => h("div", { class: "rb-srow rb-seed-sw" }, h("span", { class: "t" }, label, hint ? h("small", null, hint) : null),
    switchEl(o[key], { label, onChange: (v, el) => { setSwitch(el, v); o[key] = v; if (key === "desires") o.kinks = v; paintPools(); } }));
  const poolsEl = h("div", { class: "rb-seed-pools" });
  const kindBox = (kind, title) => {
    const box = h("section", { class: "rb-seed-kind", id: `rb-seed-${kind}` });
    const groups = poolOf(o, kind);
    const head = h("div", { class: "rb-seed-kh" }, h("b", null, title), h("small", { class: "rb-muted" }, `${groups.reduce((n, g) => n + g.on.length, 0)} / ${groups.reduce((n, g) => n + g.items.length, 0)}개 켜짐`));
    const chips = groups.map((g) => h("div", { class: "rb-seed-cat" },
      h("div", { class: "rb-seed-ch" }, h("span", null, g.label),
        h("button", { type: "button", class: "rb-wk2-link", onClick: () => { const allOn = g.on.length === g.items.length; o.off = allOn ? [...new Set([...o.off, ...g.items])] : o.off.filter((t) => !g.items.includes(t)); paintPools(); } }, g.on.length === g.items.length ? "모두 끄기" : "모두 켜기")),
      h("div", { class: "rb-seed-chips" }, g.items.map((t) => {
        const on = !o.off.includes(t), mine = o.custom.some((c) => c.kind === kind && c.text === t);
        return h("span", { class: ["rb-seed-chip", on && "on", mine && "mine"] },
          h("button", { type: "button", "aria-pressed": String(on), onClick: () => { o.off = on ? [...o.off, t] : o.off.filter((x) => x !== t); paintPools(); } }, t),
          mine ? h("button", { type: "button", class: "x", "aria-label": `${t} 지우기`, onClick: () => { o.custom = o.custom.filter((c) => !(c.kind === kind && c.text === t)); o.off = o.off.filter((x) => x !== t); paintPools(); } }, "×") : null);
      }))));
    // 직접 넣기: 분류 고르고 글 적기
    const cats = (kind === "kink" ? KINK_CATS : DESIRE_CATS).map(([id, label]) => [id, label]).concat([[CUSTOM_CAT, "직접 넣은 항목"]]);
    const sel = h("select", { class: "rb-input", "aria-label": "분류" }, cats.map(([id, label]) => h("option", { value: id }, label)));
    const inp = h("input", { class: "rb-input", maxlength: 120, placeholder: kind === "kink" ? "예) 가죽 옷차림에 끌린다" : "예) 비 오는 날 분위기에 약하다", "aria-label": "직접 넣을 항목" });
    const addIt = () => { const t = inp.value.trim(); if (!t) return; if (o.custom.some((c) => c.kind === kind && c.text === t) || poolOf(o, kind).some((g) => g.items.includes(t))) { msg.replaceChildren(note("warn", "이미 있는 항목이에요.")); return; } o.custom = [...o.custom, { kind, cat: sel.value, text: t }]; inp.value = ""; paintPools(); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); addIt(); } });
    box.append(head, ...chips, h("div", { class: "rb-seed-add" }, sel, inp, btn("추가", { size: "sm", onClick: addIt })));
    return box;
  };
  function paintPools() {
    const kids = [];
    if (o.desires) kids.push(kindBox("desire", "성적 욕망 항목"));
    if (o.kinks) kids.push(kindBox("kink", "이상성향 항목"));
    if (!kids.length) kids.push(h("p", { class: "rb-muted" }, "성적 욕망·이상성향을 켜면 어떤 항목에서 고를지 정할 수 있어요."));
    poolsEl.replaceChildren(...kids);
  }
  paintPools();
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-seed-dlg", role: "dialog", "aria-modal": "true", "aria-label": "처음 등장 때 성인 항목 무작위로" },
    h("h3", { class: "rb-h3" }, "처음 등장 때 성인 항목 무작위로"),
    h("p", { class: "rb-muted" }, "켠 뒤 처음 나오는 인물마다 아래에서 고른 것을 무작위로 정해 줘요. 같은 이름이면 늘 같은 결과라 다시 계산해도 맛이 바뀌지 않아요. 켜기 전부터 있던 인물·직접 고친 인물은 건드리지 않아요."),
    sw("사용", "on", null),
    h("h4", { class: "rb-seed-h4" }, "무작위로 정할 것"),
    sw("월경", "cycle", "Erosync를 켜 둔 경우에만 여성 인물의 Erosync 월경 추적을 켜요(Dusk 월경·임신 기록과는 따로)."),
    sw("성적 수치", "sexual", "성인 프로필의 성적 관심·즉흥성·개방성·추진력을 무작위로 정해요."),
    sw("성적 욕망 · 이상성향", "desires", "성적 욕망 1~2개와 이상성향 1개를 늘 함께 정해 인물 위키에 바로 반영해요(거부·삭제·다시 뽑기는 나중에)."),
    sw("음란도", "lewd", "끄면 0에서 시작해요. 켜면 인물마다 무작위로 정해요(인물 위키 수치)."),
    sw("첫인상", "first", "끄면 0(특별한 끌림·거부감 없음)에서 시작해요. 켜면 {{user}}에 대한 첫 끌림/거부감(-3~+3)을 무작위로 정해요."),
    poolsEl, msg,
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;flex-wrap:wrap" },
      btn("닫기", { onClick: () => done(null) }),
      btn("저장", { kind: "primary", id: "rb-seed-save", onClick: async () => {
        try { o = await saveSeedOpt(ctx.api, o); onSaved?.(o); ctx.toast(o.on ? "저장했어요. 이제부터 처음 나오는 인물에게 무작위로 정해 줘요." : "저장했어요 (꺼짐)."); done(o); }
        catch (e) { msg.replaceChildren(note("err", String(e?.message ?? e))); }
      } }))));
}
