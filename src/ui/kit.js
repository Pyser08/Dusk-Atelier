import { h, motion } from './dom.js';
import { icon } from './icons.js';

export function btn(label, { kind = "", size = "", icon: ic, onClick, title, disabled, id, labelClass } = {}) {
  return h(
    "button",
    { type: "button", class: ["rb-btn", kind, size], onClick, title, disabled, id },
    ic ? icon(ic, 16) : null,
    label ? h("span", { class: labelClass }, label) : null
  );
}
export function iconBtn(name, label, { onClick, boxed, id } = {}) {
  return h("button", { type: "button", class: ["rb-icon-btn", boxed && "boxed"], "aria-label": label, title: label, onClick, id }, icon(name, 18));
}
export function switchEl(on, { label, onChange, disabled } = {}) {
  const el = h(
    "button",
    { type: "button", class: "rb-switch", role: "switch", "aria-checked": on ? "true" : "false", "aria-label": label, disabled },
    h("span")
  );
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    if (el.disabled) return;
    onChange?.(el.getAttribute("aria-checked") !== "true", el);
  });
  return el;
}
export var setSwitch = (el, on) => el.setAttribute("aria-checked", on ? "true" : "false");
export function chip(label, { pressed, count, onClick } = {}) {
  return h(
    "button",
    { type: "button", class: "rb-chip", "aria-pressed": pressed ? "true" : "false", onClick },
    label,
    count !== void 0 ? h("small", null, String(count)) : null
  );
}
export var badge = (label, kind = "mute") => h("span", { class: ["rb-badge", `k-${kind}`] }, label);
export function progressBar(pct = 0) {
  const i = h("i");
  const el = h("div", { class: "rb-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, i);
  el.set = (p) => {
    const v = Math.max(0, Math.min(100, p));
    i.style.width = v + "%";
    el.setAttribute("aria-valuenow", String(Math.round(v)));
  };
  el.set(pct);
  return el;
}
export var note = (kind, text) => h("div", { class: ["rb-note", kind], role: kind === "err" ? "alert" : "status" }, icon(kind === "err" ? "alert" : kind === "warn" ? "alert" : "info", 18), h("span", null, text));
export function toast(host, text, { action, seconds = 4, error = false } = {}) {
  let box = host.querySelector(":scope > .rb-toasts");
  if (!box) {
    box = h("div", { class: "rb-toasts", "aria-live": "polite" });
    host.appendChild(box);
  }
  let left = action ? seconds : 0;
  const actBtn = action ? h("button", { type: "button", class: "act" }) : null;
  const el = h(
    "div",
    { class: ["rb-toast", error && "err"], role: error ? "alert" : "status" },
    icon(error ? "alert" : "check", 18),
    h("span", null, text),
    actBtn
  );
  let timer = null;
  let closing = false;
  const close = () => {
    clearInterval(timer);
    if (closing) return;
    closing = true;
    const out = motion(el, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(6px) scale(.98)" }], { duration: 140, fill: "forwards" });
    if (out) out.finished.then(() => el.remove(), () => el.remove());
    else el.remove();
  };
  const paint = () => {
    if (actBtn) actBtn.textContent = `${action.label} · ${left}초`;
  };
  if (actBtn) {
    actBtn.addEventListener("click", async () => {
      clearInterval(timer);
      actBtn.disabled = true;
      actBtn.textContent = "처리 중…";
      try {
        await action.run();
      } finally {
        close();
      }
    });
    paint();
    timer = setInterval(() => {
      left--;
      if (left <= 0) close();
      else paint();
    }, 1e3);
  } else timer = setInterval(close, seconds * 1e3);
  box.appendChild(el);
  return { close };
}
function modal(host, build) {
  return new Promise((resolve) => {
    const prevFocus = host.ownerDocument.activeElement;
    const back = h("div", { class: "rb-modal" });
    const done = (v) => {
      back.remove();
      host.ownerDocument.removeEventListener("keydown", onKey, true);
      prevFocus?.focus?.();
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        done(null);
      }
    };
    const box = build(done);
    back.appendChild(box);
    back.addEventListener("mousedown", (e) => {
      if (e.target === back) done(null);
    });
    host.ownerDocument.addEventListener("keydown", onKey, true);
    host.appendChild(back);
    (box.querySelector("[data-autofocus]") ?? box.querySelector("input,button.primary,button"))?.focus();
  });
}
export function confirmDialog(host, { title, body, ok = "확인", cancel = "취소", danger = false }) {
  return modal(host, (done) => h(
    "div",
    { class: "rb-dialog", role: "alertdialog", "aria-modal": "true", "aria-label": title },
    h("h3", { class: "rb-h3" }, title),
    body ? h("p", { class: "rb-p", style: "white-space:pre-line" }, body) : null,
    h(
      "div",
      { class: "btns" },
      btn(cancel, { onClick: () => done(false) }),
      btn(ok, { kind: danger ? "danger" : "primary", onClick: () => done(true) })
    )
  )).then((v) => v === true);
}
export function promptDialog(host, { title, label, value = "", ok = "확인", placeholder = "" }) {
  let input;
  return modal(host, (done) => {
    input = h("input", { class: "rb-input", value, placeholder, "aria-label": label ?? title, "data-autofocus": "1" });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        done(input.value);
      }
    });
    setTimeout(() => input.select(), 0);
    return h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("h3", { class: "rb-h3" }, title),
      label ? h("span", { class: "rb-label" }, label) : null,
      input,
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn(ok, { kind: "primary", onClick: () => done(input.value) }))
    );
  });
}
export function folderDialog(host, { title, name = "", items, checked = [], ok = "만들기", withName = true, noun = "항목", current = null, othersMode = "hide", onOthersMode }) {
  const sel = new Set(checked);
  const isOther = (it) => !!it.folder && it.folder !== current;
  let others = othersMode === "hide" ? "hide" : "show";
  return modal(host, (done) => {
    const nameInput = withName ? h("input", { class: "rb-input", value: name, placeholder: "폴더 이름", "aria-label": "폴더 이름", "data-autofocus": "1" }) : null;
    const q = h("input", { class: "rb-input", type: "search", placeholder: `${noun} 찾기`, "aria-label": `${noun} 찾기`, style: "height:38px" });
    const count = h("span", { class: "rb-muted" });
    const list = h("div", { class: "rb-scroll rb-pick", role: "group", "aria-label": `넣을 ${noun}`, style: "max-height:min(46vh,380px);overflow:auto;border:1px solid var(--rb-line);border-radius:12px;padding:4px;overscroll-behavior:contain" });
    const rows = items.map((it) => {
      const cb = h("input", { type: "checkbox", checked: sel.has(it.id) });
      cb.addEventListener("change", () => {
        if (cb.checked) sel.add(it.id);
        else sel.delete(it.id);
        paintCount();
      });
      const r = h(
        "label",
        { class: "rb-check", style: "display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;cursor:pointer" },
        cb,
        h("span", { style: "flex:1;min-width:0;display:flex;flex-direction:column" }, h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, it.label || "(이름 없음)"), it.sub ? h("small", { class: "rb-muted" }, it.sub) : null)
      );
      r.dataset.q = `${it.label ?? ""} ${it.sub ?? ""}`.toLowerCase();
      r._cb = cb;
      r._id = it.id;
      r._other = isOther(it);
      return r;
    });
    list.append(...rows);
    if (!rows.length) list.appendChild(h("div", { class: "rb-empty" }, `넣을 ${noun}이(가) 없어요`));
    const visibleRows = () => rows.filter((r) => !r.hidden);
    const paintCount = () => {
      count.textContent = `${sel.size}개 고름`;
    };
    const all = btn("보이는 것 모두", { size: "sm", onClick: () => {
      const v = visibleRows();
      const on = v.some((r) => !r._cb.checked);
      for (const r of v) {
        r._cb.checked = on;
        if (on) sel.add(r._id);
        else sel.delete(r._id);
      }
      paintCount();
    } });
    const filter = () => {
      const v = q.value.trim().toLowerCase();
      for (const r of rows) r.hidden = others === "hide" && r._other || !!v && !r.dataset.q.includes(v);
    };
    q.addEventListener("input", filter);
    const otherCount = rows.filter((r) => r._other).length;
    const othersCtl = otherCount ? h(
      "div",
      { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" },
      h("span", { class: "rb-muted", style: "flex:1;min-width:140px" }, `다른 폴더에 든 ${noun} ${otherCount}개 (고르면 이 폴더로 옮겨져요)`),
      h("div", { class: "rb-seg-nowrap", style: "flex:1 1 300px" }, segmented([["show", "보이기 (골라서 옮기기)"], ["hide", "숨기기"]], others, (v) => {
        others = v;
        if (v === "hide") {
          for (const r of rows) if (r._other) {
            r._cb.checked = false;
            sel.delete(r._id);
          }
        }
        filter();
        paintCount();
        onOthersMode?.(v);
      }, `다른 폴더에 든 ${noun}`))
    ) : null;
    filter();
    paintCount();
    const submit = () => {
      const n = nameInput ? nameInput.value.trim() : name;
      if (withName && !n) {
        nameInput.focus();
        return;
      }
      done({ name: n, ids: items.map((i) => i.id).filter((id) => sel.has(id)) });
    };
    nameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        submit();
      }
    });
    return h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title, style: "width:min(560px,100%)" },
      h("h3", { class: "rb-h3" }, title),
      nameInput ? h("label", { class: "rb-field" }, h("span", { class: "rb-label" }, "이름"), nameInput) : null,
      h("div", { style: "display:flex;gap:8px;align-items:center" }, h("span", { class: "rb-label", style: "flex:1" }, `넣을 ${noun} 고르기 (나중에 바꿀 수 있어요)`), count),
      othersCtl,
      h("div", { style: "display:flex;gap:8px" }, h("div", { style: "flex:1" }, q), all),
      list,
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn(ok, { kind: "primary", onClick: submit }))
    );
  });
}
export function colorDialog(host, { title, swatches, value, previewText }) {
  return modal(host, (done) => {
    let cur = value || "";
    const prev = h("span", { style: "font-size:15px;font-weight:600" }, previewText ?? "미리보기");
    const paint = () => {
      prev.style.color = cur || "var(--rb-text)";
      sw.forEach((b) => b.setAttribute("aria-pressed", b.dataset.c === cur ? "true" : "false"));
      custom.value = cur || "#c4b1ff";
    };
    const sw = swatches.map((c) => h("button", { type: "button", class: "rb-swatch", style: { background: c }, "aria-label": `색 ${c}`, dataset: { c }, onClick: () => {
      cur = c;
      paint();
    } }));
    const custom = h("input", { type: "color", "aria-label": "직접 고르기" });
    custom.addEventListener("input", () => {
      cur = custom.value;
      paint();
    });
    const box = h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("h3", { class: "rb-h3" }, title),
      h("div", { class: "rb-card pad" }, prev),
      h("div", { class: "rb-swatches" }, sw, h("label", { class: "rb-color", style: "height:36px" }, custom, h("span", null, "직접"))),
      h(
        "div",
        { class: "btns" },
        btn("기본값", { kind: "ghost", onClick: () => done("") }),
        btn("취소", { onClick: () => done(null) }),
        btn("적용", { kind: "primary", onClick: () => done(cur) })
      )
    );
    paint();
    return box;
  });
}
export function openMenu(host, anchor, items) {
  host.querySelector(":scope > .rb-menu")?.remove();
  const menu = h("div", { class: "rb-menu", role: "menu" });
  const close = () => {
    menu.remove();
    host.ownerDocument.removeEventListener("mousedown", onDown, true);
    host.ownerDocument.removeEventListener("keydown", onKey, true);
    anchor.focus?.();
  };
  const onDown = (e) => {
    if (!menu.contains(e.target)) close();
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const bs = [...menu.querySelectorAll("button")];
      const i = bs.indexOf(host.ownerDocument.activeElement);
      bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
    }
  };
  for (const it of items) {
    if (!it) continue;
    if (it === "sep") {
      menu.appendChild(h("hr"));
      continue;
    }
    menu.appendChild(h(
      "button",
      { type: "button", role: "menuitem", class: it.danger ? "danger" : "", onClick: () => {
        close();
        it.onClick?.();
      } },
      it.icon ? icon(it.icon, 16) : null,
      it.label
    ));
  }
  host.appendChild(menu);
  const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), mr = menu.getBoundingClientRect();
  let left = ar.right - hr.left - mr.width, top = ar.bottom - hr.top + 6;
  if (left < 8) left = 8;
  if (top + mr.height > hr.height - 8) top = Math.max(8, ar.top - hr.top - mr.height - 6);
  menu.style.left = left + "px";
  menu.style.top = top + "px";
  setTimeout(() => {
    host.ownerDocument.addEventListener("mousedown", onDown, true);
    host.ownerDocument.addEventListener("keydown", onKey, true);
    menu.querySelector("button")?.focus();
  }, 0);
  return { close };
}
export function folderPickPrefs(ctx) {
  return { othersMode: ctx.prefs.meta.folderPickOthers === "hide" ? "hide" : ctx.prefs.meta.folderPickOthers ? "show" : "hide", onOthersMode: (v) => {
    ctx.svc.meta((m) => {
      m.folderPickOthers = v;
    }).catch(() => {
    });
  } };
}
export function segmented(options, value, onChange, label) {
  const el = h("div", { class: "rb-seg", role: "radiogroup", "aria-label": label });
  const paint = (v) => el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === v ? "true" : "false"));
  for (const [v, text] of options) el.appendChild(h("button", { type: "button", role: "radio", dataset: { v }, onClick: () => {
    paint(v);
    onChange(v);
  } }, text));
  paint(value);
  return el;
}

// 불러오는 동안 보여 줄 자리표시. 목록 모양(rows)이면 줄 모양이 반짝이고, 아니면 작은 원이 돈다.
// 짧게 끝나는 로딩에서 깜빡이지 않도록 0.12초 뒤에 나타난다.
export function loading(label = "불러오는 중", { rows = 0 } = {}) {
  const box = h("div", { class: "rb-loading", role: "status", "aria-label": label });
  for (let i = 0; i < rows; i++) {
    box.appendChild(h(
      "div",
      { class: "rb-skel-row", style: { "--d": `${i * 60}ms` } },
      h("i", { class: "rb-skel", style: "width:40px;height:40px;border-radius:12px;flex-shrink:0" }),
      h("div", { style: "flex:1;display:flex;flex-direction:column;gap:8px" }, h("i", { class: "rb-skel", style: `height:12px;width:${38 + i * 7 % 24}%` }), h("i", { class: "rb-skel", style: `height:10px;width:${22 + i * 5 % 16}%` }))
    ));
  }
  box.appendChild(h("div", { class: "rb-loading-label" }, spinner(), h("span", null, label)));
  return box;
}
export function spinner() {
  return h("span", { class: "rb-spin", "aria-hidden": "true" });
}
