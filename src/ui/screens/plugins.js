// 플러그인 탭: 설치된 플러그인 목록, 업데이트 확인, 코드 편집.
// RisuAI(원본)는 플러그인이 다른 플러그인을 직접 바꾸지 못하게 막는다 (setDatabaseLite는 plugins를 버리고,
// setDatabase로 넣으면 기존 목록이 통째로 바뀐다). 그래서 바꾼 코드는 파일로 저장하고,
// 사용자가 설정 → 플러그인에서 그 파일을 추가해 교체한다 (같은 이름이면 리스가 교체할지 묻는다).
import { copyText, download, h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { badge, btn, confirmDialog, iconBtn, note } from '../kit.js';
import { isDev } from './devtools.js';

var SELF = "dusk_atelier";

export function compareVersions(a, b) {
  const pa = String(a ?? "0").split(".").map((x) => parseInt(x, 10) || 0);
  const pb = String(b ?? "0").split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
export function readHeader(code) {
  const meta = { name: "", displayName: "", api: "", version: "", updateURL: "" };
  for (const line of String(code ?? "").split("\n").slice(0, 80)) {
    const t = line.trim();
    if (t.startsWith("//@name")) meta.name ||= t.slice(7).trim();
    else if (t.startsWith("//@display-name")) meta.displayName ||= t.slice(15).trim();
    else if (t.startsWith("//@api")) meta.api ||= t.slice(6).trim();
    else if (t.startsWith("//@version")) meta.version ||= t.slice(10).trim();
    else if (t.startsWith("//@update-url")) meta.updateURL ||= t.split(/\s+/)[1] ?? "";
  }
  return meta;
}
async function fetchText(ctx, url, head) {
  const opts = head ? { headers: { Range: "bytes=0-512" } } : {};
  let res = null;
  try {
    res = await fetch(url, opts);
  } catch {
    res = null;
  }
  if ((!res || !res.ok) && typeof ctx.api.nativeFetch === "function") {
    try {
      res = await ctx.api.nativeFetch(url, opts);
    } catch {
      res = null;
    }
  }
  if (!res || !(res.status >= 200 && res.status < 300)) throw new Error(`주소를 열지 못했어요${res ? ` (${res.status})` : ""}`);
  return await res.text();
}
async function checkOne(ctx, p) {
  const st = ctx.state;
  st.plugUpd ??= {};
  if (!p.updateURL) return null;
  try {
    const head = await fetchText(ctx, p.updateURL, true);
    const v = /\/\/@version\s+([^\s]+)/.exec(head)?.[1] ?? "";
    st.plugUpd[p.name] = { version: v, newer: !!v && compareVersions(v, p.versionOfPlugin || "0.0.0") > 0, at: Date.now() };
  } catch (e) {
    st.plugUpd[p.name] = { error: e?.message ?? String(e), at: Date.now() };
  }
  return st.plugUpd[p.name];
}
function fileName(p) {
  return `${String(p.name || "plugin").replace(/[\\/:*?"<>|\s]+/g, "_")}.js`;
}
var GUIDE = "RisuAI 설정 → 플러그인에서 이 파일을 추가하세요. 이름이 같으면 리스가 교체할지 물어봐요. 교체하면 설정값(인자)이 처음 값으로 돌아가니, 플러그인 탭의 설정값을 보고 다시 넣어 주세요.";
function sizeLabel(n) {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}

export async function renderPlugins(ctx) {
  const st = ctx.state;
  replace(ctx.main, h("div", { class: "rb-empty" }, "플러그인을 불러오는 중…"));
  const db = await ctx.api.getDatabase(["plugins"]);
  st.plugins = (Array.isArray(db?.plugins) ? db.plugins : []).filter(Boolean);
  st.plugDrafts ??= {};
  st.plugUpd ??= {};
  ctx.setNavCount("plugins", st.plugins.length);
  draw(ctx);
  const due = st.plugins.filter((p) => p.updateURL && !(Date.now() - (st.plugUpd[p.name]?.at ?? 0) < 6 * 3600e3));
  if (due.length) {
    await Promise.all(due.map((p) => checkOne(ctx, p)));
    if (st.tab === "plugins") draw(ctx);
  }
}
function draw(ctx) {
  const st = ctx.state, list = st.plugins;
  if (!st.plugSel || !list.some((p) => p.name === st.plugSel)) st.plugSel = list[0]?.name ?? null;
  const box = h("div", { class: "rb-list rb-scroll", role: "listbox", "aria-label": "플러그인 목록", style: "padding-top:12px" });
  for (const p of list) {
    const u = st.plugUpd[p.name];
    const row = h(
      "div",
      {
        class: ["rb-row", p.enabled === false && "off"],
        role: "option",
        tabindex: "0",
        "aria-selected": st.plugSel === p.name ? "true" : "false",
        dataset: { id: p.name },
        onClick: () => {
          st.plugSel = p.name;
          box.querySelectorAll(".rb-row").forEach((r) => r.setAttribute("aria-selected", "false"));
          row.setAttribute("aria-selected", "true");
          detail(ctx, p);
          if (ctx.isMobile()) ctx.openSheet();
        },
        onKeydown: (ev) => {
          if (ev.target === row && (ev.key === "Enter" || ev.key === " ")) {
            ev.preventDefault();
            row.click();
          }
        }
      },
      h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-surf2);display:flex;align-items:center;justify-content:center;color:var(--rb-sub);flex-shrink:0" }, icon("plug", 18)),
      h(
        "div",
        { class: "txt" },
        h(
          "div",
          { class: "ttl" },
          h("span", { class: "name" }, p.displayName || p.name),
          p.name === SELF && badge("이 플러그인", "acc"),
          p.enabled === false && badge("꺼짐", "mute"),
          u?.newer && badge(`새 버전 ${u.version}`, "ok"),
          st.plugDrafts[p.name] != null && badge("수정 중", "warn")
        ),
        h("span", { class: "meta" }, [p.versionOfPlugin ? `v${p.versionOfPlugin}` : "버전 없음", `API ${p.version ?? "?"}`, sizeLabel(p.script?.length ?? 0), p.updateURL ? "업데이트 주소 있음" : null].filter(Boolean).join(" · "))
      )
    );
    box.appendChild(row);
  }
  if (!list.length) box.appendChild(h("div", { class: "rb-empty" }, "설치된 플러그인이 없어요."));
  const withUrl = list.filter((p) => p.updateURL).length;
  const checkBtn = btn("업데이트 확인", { size: "sm", icon: "refresh", disabled: !withUrl, onClick: async () => {
    checkBtn.disabled = true;
    await Promise.all(list.filter((p) => p.updateURL).map((p) => checkOne(ctx, p)));
    const n = list.filter((p) => st.plugUpd[p.name]?.newer).length;
    ctx.toast(n ? `새 버전이 있는 플러그인 ${n}개` : "모두 최신이에요");
    draw(ctx);
  } });
  replace(
    ctx.main,
    h("div", { class: "rb-chips" }, h("span", { class: "rb-muted" }, `플러그인 ${list.length}개 · 업데이트 주소 있음 ${withUrl}개`), h("div", { class: "rb-spacer" }), checkBtn),
    box
  );
  const sel = list.find((p) => p.name === st.plugSel);
  if (sel) detail(ctx, sel);
  else ctx.showDetail(h("div", { class: "rb-empty" }, "플러그인을 고르면 여기에 자세히 보여요."));
}
function detail(ctx, p) {
  const st = ctx.state, u = st.plugUpd[p.name];
  const args = Object.entries(p.realArg ?? {});
  const updBox = h("div", { class: "rb-card" });
  const paintUpd = () => {
    const cur = st.plugUpd[p.name];
    replace(
      updBox,
      h("div", { class: "rb-kv" }, h("span", null, "업데이트 주소"), h("small", { class: "rb-muted", style: "word-break:break-all;text-align:right;max-width:70%" }, p.updateURL || "없음")),
      p.updateURL ? h(
        "div",
        { class: "rb-kv" },
        h("span", null, !cur ? "아직 확인하지 않았어요" : cur.error ? `확인 실패: ${cur.error}` : cur.newer ? `새 버전 ${cur.version}이 있어요` : `최신이에요${cur.version ? ` (${cur.version})` : ""}`),
        cur?.newer && !isDev(ctx) ? null : cur?.newer ? btn("새 버전 파일 받기", { size: "sm", icon: "download", onClick: async () => {
          try {
            const code = await fetchText(ctx, p.updateURL, false);
            const m = readHeader(code);
            if (m.name && m.name !== p.name) throw new Error(`받은 파일의 이름(${m.name})이 지금 플러그인(${p.name})과 달라요`);
            download(fileName(p), code, "text/javascript");
            ctx.toast("새 버전 파일을 받았어요. 설정 → 플러그인에서 추가하면 교체돼요.", { seconds: 8 });
          } catch (e) {
            ctx.toast(`받지 못했어요: ${e?.message ?? e}`, { error: true });
          }
        } }) : btn("확인", { size: "sm", icon: "refresh", onClick: async () => {
          await checkOne(ctx, p);
          paintUpd();
          draw(ctx);
        } })
      ) : null,
      cur?.newer ? h("div", { class: "rb-kv" }, h("span", { class: "rb-muted", style: "font-size:12.5px" }, "RisuAI 설정 → 플러그인에서 이 플러그인 옆 초록색 + 버튼을 누르면 업데이트돼요. 업데이트하면 설정값이 처음 값으로 돌아가니, 아래 설정값을 먼저 복사해 두세요.")) : null
    );
  };
  paintUpd();
  ctx.showDetail(
    h(
      "div",
      { style: "display:flex;flex-direction:column;gap:6px" },
      h("span", { style: "font-size:12px;color:var(--rb-acc-text)" }, [p.name, p.versionOfPlugin && `v${p.versionOfPlugin}`, `API ${p.version ?? "?"}`].filter(Boolean).join(" · ")),
      h("h2", { class: "rb-h2" }, p.displayName || p.name),
      p.enabled === false ? note("info", "꺼진 플러그인이에요. 켜고 끄는 것은 RisuAI 설정 → 플러그인에서 해요.") : null,
      st.plugDrafts[p.name] != null ? note("warn", "편집하던 내용이 있어요. 파일로 저장해서 설정에서 추가해야 반영돼요.") : null
    ),
    h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "업데이트"), updBox),
    h(
      "div",
      { class: "rb-field" },
      h(
        "div",
        { style: "display:flex;align-items:center" },
        h("span", { class: "rb-label", style: "flex:1" }, `설정값 (인자 ${args.length}개)`),
        args.length ? h("a", { href: "#", style: "font-size:12px;color:var(--rb-acc-text)", onClick: async (ev) => {
          ev.preventDefault();
          ctx.toast(await copyText(args.map(([k, v]) => `${k} = ${v}`).join("\n")) ? "설정값을 복사했어요" : "복사하지 못했어요");
        } }, "복사") : null
      ),
      h("div", { class: "rb-card", style: "max-height:220px;overflow:auto" }, args.length ? args.map(([k, v]) => h("div", { class: "rb-kv" }, h("span", null, k), h("small", { class: "rb-muted", style: "word-break:break-all;text-align:right;max-width:60%" }, String(v) === "" ? "(비어 있음)" : String(v)))) : h("div", { class: "rb-kv" }, h("span", { class: "rb-muted" }, "설정값이 없어요")))
    ),
    p.updateURL ? null : note("info", "업데이트 주소가 없는 플러그인이라 새 버전을 확인할 수 없어요. 새 버전은 만든 사람이 알려 주는 곳에서 받아 설정 → 플러그인에 추가하세요."),
    h("div", { style: "flex:1" }),
    !isDev(ctx) ? null : h(
      "div",
      { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("코드 편집", { kind: "primary", size: "lg", icon: "edit", onClick: () => openCodeEditor(ctx, p) }),
      btn("파일로 받기", { size: "lg", icon: "download", onClick: () => {
        download(fileName(p), p.script ?? "", "text/javascript");
        ctx.toast("지금 설치된 코드를 받았어요");
      } })
    )
  );
}
function openCodeEditor(ctx, p) {
  const st = ctx.state;
  const original = p.script ?? "";
  const ta = h("textarea", { class: "rb-textarea", spellcheck: "false", "aria-label": `${p.name} 코드`, style: "flex:1;min-height:0;height:100%;resize:none;border-radius:0;border:0;white-space:pre;overflow:auto" });
  ta.value = st.plugDrafts[p.name] ?? original;
  const titleB = h("b", null, p.displayName || p.name);
  const warnEl = h("div", { style: "padding:0 16px" });
  const panel = h("div", { class: "rb-full", role: "dialog", "aria-label": `${p.name} 코드 편집` });
  const dirty = () => ta.value !== original;
  const check = () => {
    const m = readHeader(ta.value);
    const errs = [];
    if (m.name !== p.name) errs.push(m.name ? `//@name이 '${m.name}'(으)로 바뀌어서 교체가 아니라 새 플러그인으로 들어가요.` : "//@name 줄이 없어요. 리스가 파일을 받지 않아요.");
    if (m.api !== "3.0") errs.push("//@api 3.0 줄이 없어요. 원본 RisuAI는 3.0만 받아요.");
    if (m.updateURL && !m.version) errs.push("업데이트 주소가 있으면 //@version도 있어야 해요.");
    if (m.version && new TextEncoder().encode(ta.value.slice(0, ta.value.indexOf("//@version"))).length > 480) errs.push("//@version은 파일 앞 512바이트 안에 있어야 해요.");
    replace(warnEl, errs.length ? errs.map((e) => note("warn", e)) : null);
    titleB.textContent = (p.displayName || p.name) + (dirty() ? " •" : "");
    return errs;
  };
  let t = null;
  ta.addEventListener("input", () => {
    st.plugDrafts[p.name] = ta.value;
    clearTimeout(t);
    t = setTimeout(check, 200);
  });
  ta.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab" && !ev.shiftKey) {
      ev.preventDefault();
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText("\t", s, e, "end");
      ta.dispatchEvent(new Event("input"));
    }
  });
  const save = () => {
    const errs = check();
    const go = () => {
      download(fileName(p), ta.value, "text/javascript");
      ctx.toast(GUIDE, { seconds: 12 });
    };
    if (errs.length) confirmDialog(ctx.win, { title: "그래도 저장할까요?", body: errs.join("\n"), ok: "저장" }).then((ok) => ok && go());
    else go();
  };
  const close = async () => {
    if (dirty() && !await confirmDialog(ctx.win, { title: "편집기를 닫을까요?", body: "고친 내용은 이 창을 다시 열 때까지 남아 있어요. 반영하려면 파일로 저장해서 설정에서 추가하세요.", ok: "닫기" })) return;
    if (!dirty()) delete st.plugDrafts[p.name];
    panel.remove();
    draw(ctx);
  };
  panel.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !ctx.win.querySelector(".rb-modal, .rb-menu")) {
      ev.stopPropagation();
      close();
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      save();
    }
  });
  panel.append(
    h(
      "div",
      { class: "rb-full-head" },
      iconBtn("back", "닫기", { onClick: () => close() }),
      h("div", { class: "ttl" }, h("small", null, "플러그인 코드"), titleB),
      btn("처음 코드로", { size: "sm", kind: "ghost", onClick: async () => {
        if (!dirty() || await confirmDialog(ctx.win, { title: "고친 내용을 버릴까요?", body: "설치된 코드로 되돌려요.", ok: "되돌리기", danger: true })) {
          ta.value = original;
          delete st.plugDrafts[p.name];
          check();
        }
      } }),
      btn("복사", { size: "sm", onClick: async () => ctx.toast(await copyText(ta.value) ? "코드를 복사했어요" : "복사하지 못했어요") }),
      btn("파일로 저장", { kind: "primary", icon: "download", onClick: save })
    ),
    warnEl,
    h("div", { style: "flex:1;min-height:0;display:flex;padding:0" }, ta)
  );
  ctx.win.appendChild(panel);
  check();
  ta.focus();
}
