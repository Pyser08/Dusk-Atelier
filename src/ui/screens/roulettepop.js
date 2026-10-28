// 봇 편집 도구 → 룰렛: 범주별로 무작위 특징을 뽑아 복사하거나 설명 끝에 붙인다.
import { h, replace, copyText } from '../dom.js';
import { btn, modal } from '../kit.js';
import { ROULETTE, DEFAULT_SLOTS, catById, spin, rouletteText } from '../../data/personaroulette.js';

export function openRoulette(ctx, { onInsert } = {}) {
  const groups = [...new Set(ROULETTE.map((c) => c.group))];
  let slots = DEFAULT_SLOTS.map((cat) => ({ cat, value: "", lock: false }));
  let busy = false;
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const list = h("div", { style: "display:flex;flex-direction:column;gap:8px" });
  const out = h("div", { class: "rb-muted", style: "font-size:12px;white-space:pre-wrap" });
  const paint = () => {
    replace(list, ...slots.map((sl, i) => {
      const sel = h("select", { class: "rb-input", "aria-label": `${i + 1}번 범주`, style: "flex:0 0 140px" },
        ...groups.map((g) => h("optgroup", { label: g }, ...ROULETTE.filter((c) => c.group === g).map((c) => h("option", { value: c.id, selected: c.id === sl.cat }, c.ko)))));
      sel.addEventListener("change", () => { sl.cat = sel.value; sl.value = ""; paint(); });
      return h("div", { "data-reel": i, style: "display:flex;align-items:center;gap:6px" },
        sel,
        h("button", { type: "button", class: "rb-input", title: "이 칸만 돌리기", style: "flex:1;text-align:left;cursor:pointer;min-height:34px", onClick: () => spinOne(i) }, sl.value || "?"),
        h("button", { type: "button", class: "rb-chip", "aria-pressed": sl.lock ? "true" : "false", title: "고정하면 전체 돌리기에서 제외", onClick: () => { sl.lock = !sl.lock; paint(); } }, sl.lock ? "🔒" : "🔓"),
        slots.length > 1 ? h("button", { type: "button", class: "rb-chip", "aria-label": "칸 빼기", onClick: () => { slots.splice(i, 1); paint(); } }, "×") : null);
    }));
    out.textContent = rouletteText(slots) || "레버를 당겨 보세요.";
  };
  async function spinOne(i) {
    const sl = slots[i], el = list.querySelector(`[data-reel="${i}"] button.rb-input`);
    const win = spin(sl.cat, sl.value);
    if (!reduce() && el) {
      const items = catById(sl.cat).items;
      for (let k = 0; k < 10; k++) { el.textContent = items[Math.floor(Math.random() * items.length)]; await new Promise((r) => setTimeout(r, 50 + k * 14)); }
    }
    sl.value = win;
    if (el) el.textContent = win;
    out.textContent = rouletteText(slots);
  }
  async function spinAll() {
    if (busy) return;
    const idx = slots.map((s, i) => (s.lock ? -1 : i)).filter((i) => i >= 0);
    if (!idx.length) return ctx.toast("모든 칸이 고정돼 있어요", { error: true });
    busy = true;
    await Promise.all(idx.map((i) => spinOne(i)));
    busy = false;
  }
  return modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "룰렛", style: "max-width:520px;width:100%" },
    h("h3", { class: "rb-h3" }, "🎰 룰렛"),
    h("p", { class: "rb-p rb-muted", style: "font-size:12px" }, "칸마다 범주를 고르고 돌려요. 칸을 누르면 그 칸만 돌아요."),
    list,
    h("div", { style: "display:flex;gap:6px;margin:10px 0;flex-wrap:wrap" },
      btn("전부 돌리기", { kind: "primary", size: "sm", icon: "refresh", onClick: spinAll }),
      btn("칸 추가", { size: "sm", icon: "plus", onClick: () => {
        if (slots.length >= 10) return ctx.toast("칸은 10개까지예요");
        const used = new Set(slots.map((x) => x.cat));
        slots.push({ cat: (ROULETTE.find((c) => !used.has(c.id)) ?? ROULETTE[0]).id, value: "", lock: false });
        paint();
      } })),
    out,
    h("div", { class: "btns" },
      btn("닫기", { onClick: () => done(null) }),
      btn("복사", { onClick: () => { const t = rouletteText(slots); if (!t) return ctx.toast("먼저 돌려 주세요", { error: true }); copyText(t); ctx.toast("복사했어요"); } }),
      onInsert ? btn("설명 끝에 넣기", { kind: "primary", onClick: () => { const t = rouletteText(slots); if (!t) return ctx.toast("먼저 돌려 주세요", { error: true }); onInsert(t); ctx.toast("설명 끝에 넣었어요"); done(null); } }) : null)
  ), paint());
}
