// 테마 스튜디오: 계열(일반 리스/포켓리스)별 테마 편집 · 실시간 미리보기 · 적용 · 공유
import { h, replace, download, pickFiles } from '../dom.js';
import { btn, iconBtn, note, segmented, confirmDialog, promptDialog, openMenu } from '../kit.js';
import { icon } from '../icons.js';
import { codeEditor } from '../codeedit.js';
import {
  TARGETS, TOKENS, loadThemes, saveThemes, newTheme, duplicateTheme, copyTokensTo, compileCss, lintCss, lintHtml,
  applyToDocument, writeToDatabase, restoreDatabase, exportTheme, parseThemeFile, probeSelectors, detectTarget
} from '../../data/themes.js';

// ── 계열 토글 (왔다갔다 + 미끄러지는 손잡이) ──
export function ensureStudioCss() {
  if (!document.getElementById("rb-ts-style")) document.head.appendChild(h("style", { id: "rb-ts-style" }, TTOG_CSS));
}
export function targetToggle(value, onChange) {
  ensureStudioCss();
  const ids = ["risu", "pocket"];
  const el = h("div", { class: "rb-ttog", role: "radiogroup", "aria-label": "테마 대상", dataset: { v: value } });
  const thumb = h("span", { class: "rb-ttog-thumb", "aria-hidden": "true" });
  el.appendChild(thumb);
  const set = (v, fire) => {
    if (el.dataset.v === v && !fire) return;
    el.dataset.v = v;
    el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === v ? "true" : "false"));
    thumb.classList.remove("bump");
    void thumb.offsetWidth;
    thumb.classList.add("bump");
    if (fire) onChange(v);
  };
  for (const id of ids) el.appendChild(h("button", { type: "button", role: "radio", dataset: { v: id }, onClick: () => el.dataset.v !== id && set(id, true) }, icon(id === "risu" ? "globe" : "message", 15), h("span", null, TARGETS[id].label)));
  // 키보드: 좌우 화살표로 왔다갔다
  el.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = el.dataset.v === "risu" ? "pocket" : "risu";
    set(next, true);
    el.querySelector(`button[data-v=${next}]`)?.focus();
  });
  set(value, false);
  el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === value ? "true" : "false"));
  return el;
}
export var TTOG_CSS = `
.rb-ttog{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:14px;background:var(--rb-surf);border:1px solid var(--rb-line);min-width:260px;isolation:isolate}
.rb-ttog button{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:7px;height:38px;border:0;background:transparent;color:var(--rb-sub);font-size:13.5px;cursor:pointer;border-radius:10px;transition:color .25s}
.rb-ttog button[aria-checked=true]{color:#fff;font-weight:700}
.rb-ttog-thumb{position:absolute;z-index:0;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:10px;background:linear-gradient(135deg,#4f7cf7,#7c5cf0);box-shadow:0 4px 14px rgba(124,92,240,.35);transition:transform .38s cubic-bezier(.34,1.45,.5,1)}
.rb-ttog[data-v=pocket] .rb-ttog-thumb{transform:translateX(100%)}
.rb-ttog-thumb.bump{animation:rb-ttog-bump .38s ease}
@keyframes rb-ttog-bump{0%{filter:brightness(1)}40%{filter:brightness(1.25);scale:1.04 .92}100%{filter:brightness(1);scale:1}}
@media (prefers-reduced-motion:reduce){.rb-ttog-thumb{transition:none}.rb-ttog-thumb.bump{animation:none}}
.rb-ts{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:14px;flex:1;min-height:0}
.rb-ts-col{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto}
.rb-ts-field{display:flex;align-items:center;gap:10px;font-size:13px}
.rb-ts-field>span{flex:1;min-width:0}
.rb-ts-field input[type=color]{width:44px;height:30px;border:1px solid var(--rb-line);border-radius:8px;background:none;padding:2px;cursor:pointer}
.rb-ts-field input[type=range]{flex:1.4}
.rb-ts-field input[type=text]{flex:1.4;height:30px;border-radius:8px;border:1px solid var(--rb-line);background:var(--rb-surf);color:var(--rb-text);padding:0 8px}
.rb-ts-field output{width:52px;text-align:right;color:var(--rb-sub);font-variant-numeric:tabular-nums}
.rb-ts-prev{display:flex;flex-direction:column;gap:8px;min-height:420px}
.rb-ts-frame{flex:1;display:flex;justify-content:center;background:repeating-conic-gradient(var(--rb-surf) 0 25%,transparent 0 50%) 0 0/18px 18px;border-radius:14px;padding:10px;min-height:400px}
.rb-ts-frame iframe{border:0;border-radius:12px;width:100%;height:100%;min-height:380px;background:#000;transition:width .35s cubic-bezier(.2,.7,.2,1)}
.rb-ts-frame.mobile iframe{width:380px;max-width:100%}
.rb-ts-errs{font-size:12.5px;color:#f0a0a0;line-height:1.6}
@media (max-width:760px){.rb-ts{grid-template-columns:1fr}.rb-ts-frame{min-height:340px}}
`;

// ── 미리보기용 가짜 채팅 (계열별 구조) ──
var SAMPLE = [
  ["char", "어서 와. *창밖을 보며 찻잔을 내려놓는다.* **오늘은** 조금 늦었네? \"기다렸어.\""],
  ["user", "미안, 길이 좀 막혔어."],
  ["char", "*고개를 젓는다.* 괜찮아. \"앉아, 차가 식기 전에.\""]
];
var md = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/"(.+?)"/g, '<q class="quote">"$1"</q>');
function cls(sel) {
  // 셀렉터 첫 갈래에서 클래스 이름만 뽑아 가짜 DOM에 붙인다
  const first = String(sel || "").split(",")[0];
  return [...first.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).join(" ");
}
function mockDoc(theme) {
  const s = theme.selectors;
  const role = (r) => r === "user" ? cls(s.user) || cls(s.chat) : cls(s.bot) || cls(s.chat);
  const tpl = theme.html.trim();
  const msg = ([r, text]) => {
    const body = `<div class="${cls(s.text)}">${md(text)}</div>`;
    const inner = tpl ? tpl.replace(/\{\{\s*(slot|chat|content)[^}]*\}\}/gi, body).replace(/\{\{\s*char\s*\}\}/gi, r === "user" ? "나" : "아리아").replace(/\{\{\s*role\s*\}\}/gi, r) : `<b style="font-size:12px;opacity:.7">${r === "user" ? "나" : "아리아"}</b>${body}`;
    return `<div class="${cls(s.chat)} ${role(r)}" data-role="${r}" style="padding:12px 14px">${inner}</div>`;
  };
  const pocket = theme.target === "pocket";
  const head = pocket ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--risu-theme-borderc)"><span style="width:30px;height:30px;border-radius:50%;background:var(--dusk-accent)"></span><b>아리아</b></div>` : `<div style="width:56px;flex:none;background:var(--risu-theme-darkbg);border-right:1px solid var(--risu-theme-borderc)"></div>`;
  const list = `<div class="${cls(s.list)}" style="flex:1;overflow:auto;padding:14px">${SAMPLE.map(msg).join("")}</div>`;
  const input = `<div style="padding:10px;border-top:1px solid var(--risu-theme-borderc)"><textarea class="${cls(s.input)}" rows="1" style="width:100%;box-sizing:border-box;padding:9px">메시지 입력…</textarea></div>`;
  const layout = pocket ? `<div style="display:flex;flex-direction:column;height:100vh">${head}${list}${input}</div>` : `<div style="display:flex;height:100vh">${head}<div style="flex:1;display:flex;flex-direction:column">${list}${input}</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0}</style><style>${compileCss(theme).replace(/<\/style/gi, "<\\/style")}</style></head><body>${layout}</body></html>`;
}

// ── 화면 ──
export async function renderThemeStudio(ctx) {
  const data = await loadThemes(ctx.api);
  const rootDoc = await ctx.api.getRootDocument?.().catch(() => null) ?? null;
  const here = await detectTarget(rootDoc);
  if (!data.target) data.target = here;
  let target = data.target;
  let cur = null, dirty = false, mobile = false, tab = "tokens";
  const persist = () => saveThemes(ctx.api, data).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }));
  const list = () => data.themes[target];

  const wrap = h("div", { class: "rb-section", style: "flex:1;display:flex;flex-direction:column;gap:12px;min-height:0" });
  const iframe = h("iframe", { title: "테마 미리보기", sandbox: "allow-same-origin" });
  const frame = h("div", { class: "rb-ts-frame" }, iframe);
  const errsEl = h("div", { class: "rb-ts-errs" });
  let previewTimer = 0;
  const preview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      if (!cur) return;
      iframe.srcdoc = mockDoc(cur);
      const errs = [...lintCss(cur.css).map((e) => `CSS ${e.line}줄: ${e.msg}`), ...lintHtml(cur.html).map((e) => `HTML: ${e.msg}`)];
      replace(errsEl, ...errs.map((e) => h("div", null, "⚠ " + e)));
    }, 120);
  };
  const touch = () => {
    dirty = true;
    cur.updated = Date.now();
    saveBtn.disabled = false;
    preview();
  };
  const saveBtn = btn("저장", { kind: "primary", icon: "check", onClick: async () => {
    await persist();
    dirty = false;
    saveBtn.disabled = true;
    if (data.active[target] === cur.id) applyLive(cur);
    ctx.toast("테마를 저장했어요");
  } });
  saveBtn.disabled = true;
  const applyLive = (t) => {
    if (t && t.target !== here && !data.forceApply) return false;
    applyToDocument(rootDoc, t).catch(() => {
    });
    return true;
  };

  const pick = (t) => {
    cur = t;
    dirty = false;
    saveBtn.disabled = true;
    draw();
  };
  const guardSwitch = async () => !dirty || await confirmDialog(ctx.win, { title: "저장하지 않은 변경", body: "저장하지 않고 넘어갈까요?", ok: "넘어가기", danger: true });

  // 계열 토글
  const tog = targetToggle(target, async (v) => {
    if (!await guardSwitch()) {
      tog.querySelector(`button[data-v=${target}]`)?.click();
      return;
    }
    target = data.target = v;
    await persist();
    cur = list().find((x) => x.id === data.active[target]) ?? list()[0] ?? null;
    dirty = false;
    saveBtn.disabled = true;
    wrap.animate?.([{ opacity: 0.4, transform: `translateX(${v === "pocket" ? 10 : -10}px)` }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)" });
    draw();
  });

  const doNew = async () => {
    if (!await guardSwitch()) return;
    const name = await promptDialog(ctx.win, { title: `새 ${TARGETS[target].label} 테마`, label: "이름", value: "새 테마" });
    if (!name) return;
    const t = newTheme(target, name);
    list().push(t);
    await persist();
    pick(t);
  };
  const doImport = async () => {
    const [f] = await pickFiles({ accept: ".json,.dtheme" });
    if (!f) return;
    const r = parseThemeFile(await f.text(), target);
    if (r.error && !r.theme) return ctx.toast(r.error, { error: true });
    if (r.error) {
      // 다른 계열 테마: 그쪽 목록에 넣을지 묻는다
      const ok = await confirmDialog(ctx.win, { title: "다른 계열 테마", body: r.error + " 그 계열 목록에 추가할까요? (구조가 달라 이 계열에는 적용할 수 없어요)", ok: `${TARGETS[r.target].label}에 추가` });
      if (!ok) return;
      data.themes[r.target].push(r.theme);
      await persist();
      return ctx.toast(`${TARGETS[r.target].label} 목록에 추가했어요. 위 토글로 전환해 보세요.`);
    }
    list().push(r.theme);
    await persist();
    pick(r.theme);
    ctx.toast("테마를 가져왔어요");
  };
  const doApply = async (t) => {
    if (dirty) await persist(), dirty = false, saveBtn.disabled = true;
    if (t.target !== here) {
      const ok = await confirmDialog(ctx.win, { title: "계열이 달라요", body: `지금 화면은 ${TARGETS[here].label} 계열로 보여요. ${TARGETS[t.target].label} 테마를 켜면 모양이 깨질 수 있어요. 그래도 켤까요?`, ok: "켜기", danger: true });
      if (!ok) return;
      data.forceApply = true;
    }
    data.active[target] = t.id;
    await persist();
    if (!await applyToDocument(rootDoc, t).catch(() => false)) ctx.toast("리스 화면에 붙이지 못했어요. [리스 설정에 저장]을 써 주세요.", { error: true });
    ctx.toast(`'${t.name}' 테마를 켰어요`, { action: { label: "되돌리기", run: async () => {
      data.active[target] = null;
      await persist();
      await applyToDocument(rootDoc, null).catch(() => {
      });
      draw();
    } } });
    draw();
  };
  const doOff = async () => {
    data.active[target] = null;
    data.forceApply = false;
    await persist();
    await applyToDocument(rootDoc, null).catch(() => {
    });
    draw();
  };
  const doWriteDb = async (t) => {
    const ok = await confirmDialog(ctx.win, { title: "리스 설정에 저장", body: "리스의 커스텀 CSS" + (t.html.trim() ? "·채팅 HTML" : "") + " 칸을 이 테마로 바꿔요. 지금 값은 백업해 두고 바로 되돌릴 수 있어요. Dusk를 지워도 테마가 남아요.", ok: "저장" });
    if (!ok) return;
    try {
      const before = await writeToDatabase(ctx.api, t);
      data.dbBackup = { ...data.dbBackup, [t.target]: before };
      await persist();
      ctx.toast("리스 설정에 저장했어요", { seconds: 10, action: { label: "되돌리기", run: () => restoreDatabase(ctx.api, t.target, before).then(() => ctx.toast("되돌렸어요")) } });
    } catch (e) {
      ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true });
    }
  };
  const themeMenu = (t, anchor) => openMenu(ctx.win, anchor, [
    { label: "이름 바꾸기", icon: "edit", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "이름 바꾸기", label: "이름", value: t.name });
      if (n) t.name = n, await persist(), draw();
    } },
    { label: "복제", icon: "split", onClick: async () => {
      const d = duplicateTheme(t);
      list().push(d);
      await persist();
      pick(d);
    } },
    { label: `${TARGETS[t.target === "risu" ? "pocket" : "risu"].label}로 색만 복사`, icon: "refresh", onClick: async () => {
      const other = t.target === "risu" ? "pocket" : "risu";
      data.themes[other].push(copyTokensTo(t, other));
      await persist();
      ctx.toast(`색·글꼴만 ${TARGETS[other].label} 목록에 복사했어요 (구조는 달라서 CSS·HTML은 안 넘겨요)`, { seconds: 6 });
    } },
    { label: "내보내기 (.json)", icon: "download", onClick: () => download(`${t.name}.${t.target}.dtheme.json`, exportTheme(t), "application/json") },
    { label: "CSS만 받기", icon: "code", onClick: () => download(`${t.name}.css`, compileCss(t), "text/css") },
    { label: "리스 설정에 저장", icon: "upload", onClick: () => doWriteDb(t) },
    { label: "삭제", icon: "trash", danger: true, onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: "테마 삭제", body: `'${t.name}'을(를) 지울까요?`, ok: "삭제", danger: true })) return;
      data.themes[target] = list().filter((x) => x !== t);
      if (data.active[target] === t.id) await doOff();
      await persist();
      if (cur === t) cur = list()[0] ?? null;
      draw();
    } }
  ]);

  // 편집 필드
  const fieldsFor = (group) => TOKENS.filter((f) => f.group === group).map((f) => {
    const v = cur.tokens[f.k];
    if (f.type === "color") return h("label", { class: "rb-ts-field" }, h("span", null, f.label), h("input", { type: "color", value: v, onInput: (e) => {
      cur.tokens[f.k] = e.target.value;
      touch();
    } }));
    if (f.type === "font") return h("label", { class: "rb-ts-field" }, h("span", null, f.label), h("input", { type: "text", value: v, placeholder: "기본 글꼴", onInput: (e) => {
      cur.tokens[f.k] = e.target.value.trim();
      touch();
    } }));
    const out = h("output", null, v + f.unit);
    return h("label", { class: "rb-ts-field" }, h("span", null, f.label), h("input", { type: "range", min: f.min, max: f.max, step: f.step, value: v, onInput: (e) => {
      cur.tokens[f.k] = Number(e.target.value);
      out.textContent = e.target.value + f.unit;
      touch();
    } }), out);
  });
  const group = (title, ...kids) => h("div", { class: "rb-card pad bordered", style: "display:flex;flex-direction:column;gap:9px" }, h("b", { style: "font-size:13.5px" }, title), ...kids);
  const tokensPane = () => h("div", { style: "display:flex;flex-direction:column;gap:10px" }, ...["색", "글자", "말풍선"].map((g) => group(g, ...fieldsFor(g))), btn("기본값으로", { size: "sm", icon: "refresh", onClick: () => {
    for (const f of TOKENS) cur.tokens[f.k] = f.def;
    touch();
    draw();
  } }));
  const cssPane = () => {
    const ed = codeEditor(cur.css, { lang: "text", label: "커스텀 CSS", minHeight: 260, placeholder: "/* 여기 쓴 CSS가 토큰 CSS 뒤에 붙어요 */", onChange: (v) => {
      cur.css = v;
      touch();
    } });
    return h("div", { style: "display:flex;flex-direction:column;gap:8px" }, note("info", "토큰으로 만든 CSS 뒤에 붙어 덮어써요. var(--dusk-accent), var(--dusk-accent2), var(--dusk-radius)를 쓸 수 있어요."), ed.el, h("details", null, h("summary", { style: "cursor:pointer;font-size:13px" }, "만들어지는 전체 CSS 보기"), h("pre", { style: "white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto" }, compileCss(cur))));
  };
  const htmlPane = () => {
    const ed = codeEditor(cur.html, { lang: "text", label: "채팅 HTML", minHeight: 220, placeholder: '<div class="card">{{char}}<div>{{slot}}</div></div>', onChange: (v) => {
      cur.html = v;
      touch();
    } });
    return h("div", { style: "display:flex;flex-direction:column;gap:8px" }, note("info", "메시지 하나를 감싸는 틀이에요. {{slot}} = 메시지 내용, {{char}} = 이름, {{role}} = user/char. 비워 두면 기본 모양을 써요. 리스 설정에 저장하면 커스텀 HTML 테마로 켜져요."), ed.el);
  };
  const selPane = () => {
    const res = h("div", { class: "rb-muted", style: "font-size:12.5px;line-height:1.7" });
    const rows = Object.entries(cur.selectors).map(([k, sel]) => h("label", { class: "rb-ts-field" }, h("span", null, { chat: "메시지", user: "내 메시지", bot: "봇 메시지", text: "본문", list: "채팅 목록", input: "입력창" }[k] ?? k), h("input", { type: "text", value: sel, onInput: (e) => {
      cur.selectors[k] = e.target.value;
      touch();
    } })));
    return h("div", { style: "display:flex;flex-direction:column;gap:8px" }, note("warn", `${TARGETS[target].label} 화면에서 테마가 꾸미는 자리예요. 리스가 업데이트돼 테마가 안 먹으면 여기를 고쳐요.`), group("셀렉터", ...rows), h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("지금 화면에서 찾기", { size: "sm", icon: "search", onClick: async () => {
      if (!rootDoc) return replace(res, "리스 화면을 읽을 수 없어요.");
      replace(res, "찾는 중…");
      const r = await probeSelectors(rootDoc, cur.selectors);
      replace(res, ...Object.entries(r).map(([k, n]) => h("div", null, `${n > 0 ? "✓" : n < 0 ? "✕" : "·"} ${k}: ${n < 0 ? "셀렉터 오류" : n + "개"}`)), h("div", null, "채팅 화면을 연 상태에서 눌러야 정확해요."));
    } }), btn("기본값", { size: "sm", onClick: () => {
      cur.selectors = { ...TARGETS[target].selectors };
      touch();
      draw();
    } })), res);
  };

  function draw() {
    const items = list();
    const listEl = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;align-items:center" }, ...items.map((t) => {
      const on = data.active[target] === t.id;
      return h("div", { class: "rb-chip", "aria-pressed": cur === t ? "true" : "false", style: "display:inline-flex;align-items:center;gap:6px;padding:0 4px 0 12px;height:34px;border-radius:999px;border:1px solid var(--rb-line);background:" + (cur === t ? "var(--rb-acc-soft)" : "var(--rb-surf)") },
        h("span", { style: `width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${t.tokens.accent2},${t.tokens.accent})` }),
        h("button", { type: "button", style: "border:0;background:none;color:inherit;cursor:pointer;font-size:13px", onClick: async () => cur !== t && await guardSwitch() && pick(t) }, t.name + (on ? " · 켜짐" : "")),
        iconBtn("more", "테마 메뉴", { onClick: (e) => themeMenu(t, e.currentTarget) }));
    }), btn("새 테마", { size: "sm", icon: "plus", onClick: doNew }), btn("가져오기", { size: "sm", icon: "upload", onClick: doImport }));

    const top = h("div", { style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
      iconBtn("back", "설정으로", { onClick: () => ctx.go("settings") }),
      h("h2", { class: "rb-h2", style: "margin:0" }, "테마 스튜디오"),
      h("div", { style: "flex:1" }),
      tog);
    const hint = here !== target ? note("warn", `지금 화면은 ${TARGETS[here].label} 계열이에요. ${TARGETS[target].label} 테마는 만들고 내보낼 수 있지만 여기서 켜면 모양이 깨질 수 있어요.`) : null;
    if (!cur) {
      replace(wrap, top, hint, listEl, h("div", { class: "rb-card pad bordered", style: "text-align:center;padding:40px 20px" }, h("b", null, `${TARGETS[target].label} 테마가 아직 없어요`), h("div", { class: "rb-muted", style: "margin:6px 0 14px" }, "새로 만들거나 테마 파일을 가져와요."), btn("새 테마 만들기", { kind: "primary", icon: "plus", onClick: doNew })));
      return;
    }
    const tabs = segmented([["tokens", "색·글자"], ["css", "CSS"], ["html", "채팅 HTML"], ["sel", "셀렉터"]], tab, (v) => {
      tab = v;
      replace(pane, panes[v]());
    }, "편집 항목");
    const panes = { tokens: tokensPane, css: cssPane, html: htmlPane, sel: selPane };
    const pane = h("div", null, panes[tab]());
    const on = data.active[target] === cur.id;
    const actions = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, saveBtn, on ? btn("끄기", { icon: "x", onClick: doOff }) : btn("켜기", { icon: "zap", onClick: () => doApply(cur) }), btn("리스 설정에 저장", { icon: "upload", onClick: () => doWriteDb(cur) }));
    frame.classList.toggle("mobile", mobile);
    const viewSeg = segmented([["pc", "PC"], ["mobile", "모바일"]], mobile ? "mobile" : "pc", (v) => {
      mobile = v === "mobile";
      frame.classList.toggle("mobile", mobile);
    }, "미리보기 크기");
    replace(wrap, top, hint, listEl, h("div", { class: "rb-ts" },
      h("div", { class: "rb-ts-col" }, tabs, pane, errsEl, actions),
      h("div", { class: "rb-ts-prev" }, h("div", { style: "display:flex;align-items:center;gap:10px" }, h("b", { style: "font-size:13.5px;flex:1" }, `미리보기 · ${TARGETS[target].label}`), h("div", { style: "width:180px" }, viewSeg)), frame)));
    preview();
  }

  cur = list().find((x) => x.id === data.active[target]) ?? list()[0] ?? null;
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-direction:column;padding:4px" }, wrap));
  draw();
}

// 시작할 때: 켜 둔 테마를 화면에 다시 입힌다
export async function restoreActiveTheme(api) {
  const data = await loadThemes(api);
  const doc = await api.getRootDocument?.().catch(() => null);
  if (!doc) return;
  const here = await detectTarget(doc);
  const pickT = data.forceApply ? data.target ?? here : here;
  const t = data.themes[pickT]?.find((x) => x.id === data.active[pickT]);
  if (t) await applyToDocument(doc, t);
}
