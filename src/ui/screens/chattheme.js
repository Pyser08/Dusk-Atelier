// 채팅 테마 (v1.7.0): 도구 안의 한 곳. 만든 테마 목록 · 켜기/끄기 · 코드/파일 내보내기·불러오기 · 빌더/스튜디오 오가기.
// 빌더·스튜디오 화면 맨 위에도 같은 탭줄(themeTabs)이 붙어 서로 바로 오갈 수 있다.
import { h, replace, download, pickFiles } from '../dom.js';
import { btn, iconBtn, segmented, note, confirmDialog, promptDialog, openMenu } from '../kit.js';
import { icon } from '../icons.js';
import { TARGETS, loadThemes, saveThemes, detectTarget, exportTheme, parseThemeFile, duplicateTheme, applyToDocument } from '../../data/themes.js';
import { shareCode, readShareCode, buildTheme, handoff } from '../../data/themebuilder.js';
import { targetToggle } from './themestudio.js';

var SUBS = { list: "chattheme", builder: "themebuilder", studio: "themestudio" };
/** 목록 | 빌더 | 스튜디오 탭줄. guard가 있으면(저장 안 한 변경 확인) 통과해야 이동한다. */
export function themeTabs(ctx, active, guard) {
  const seg = segmented([["list", "내 테마"], ["builder", "빌더"], ["studio", "스튜디오"]], active, async (v) => {
    if (v === active) return;
    if (guard && !await guard()) {
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", b.dataset.v === active ? "true" : "false"));
      return;
    }
    if (v === "builder") handoff.builder = null;
    ctx.go("tools", SUBS[v]);
  }, "채팅 테마 화면");
  seg.classList.add("rb-theme-tabs");
  seg.style.minWidth = "230px";
  return seg;
}

export async function renderChatTheme(ctx) {
  const data = await loadThemes(ctx.api);
  const rootDoc = await ctx.api.getRootDocument?.().catch(() => null) ?? null;
  const here = await detectTarget(rootDoc, ctx.api);
  if (!data.target) data.target = here;
  let target = data.target;
  const persist = () => saveThemes(ctx.api, data).catch((e) => ctx.toast(`저장하지 못했어요: ${e?.message ?? e}`, { error: true }));
  const list = () => data.themes[target];
  const wrap = h("div", { class: "rb-section", style: "flex:1;display:flex;flex-direction:column;gap:12px;min-height:0" });

  const apply = async (t) => {
    if (t.target !== here) {
      const ok = await confirmDialog(ctx.win, { title: "계열이 달라요", body: `지금 화면은 ${TARGETS[here].label} 계열로 보여요. ${TARGETS[t.target].label} 테마를 켜면 모양이 깨질 수 있어요. 그래도 켤까요?`, ok: "켜기", danger: true });
      if (!ok) return;
      data.forceApply = true;
    }
    data.active[t.target] = t.id;
    await persist();
    if (!await applyToDocument(rootDoc, t).catch(() => false)) ctx.toast("리스 화면에 붙이지 못했어요. 스튜디오의 [리스 설정에 저장]을 써 주세요.", { error: true });
    else ctx.toast(`'${t.name}' 테마를 켰어요`);
    draw();
  };
  const off = async () => {
    data.active[target] = null;
    data.forceApply = false;
    await persist();
    await applyToDocument(rootDoc, null).catch(() => {});
    draw();
  };
  const copyCode = async (t) => {
    const code = shareCode(t.builder, t.name);
    try {
      await navigator.clipboard.writeText(code);
      ctx.toast("공유 코드를 복사했어요. 받은 사람은 '코드로 불러오기'에 붙여 넣으면 돼요");
    } catch {
      await promptDialog(ctx.win, { title: "공유 코드", label: "아래 글자를 복사해 주세요", value: code, ok: "닫기" });
    }
  };
  const importCode = async () => {
    const text = await promptDialog(ctx.win, { title: "공유 코드 불러오기", label: "DTB 로 시작하는 코드를 붙여 넣어요", placeholder: "DTB2:…", ok: "불러오기" });
    if (!text) return;
    try {
      const r = readShareCode(text);
      const t = buildTheme(r.choice, target);
      if (r.name) t.name = r.name;
      list().push(t);
      await persist();
      ctx.toast(`'${t.name}'을(를) ${TARGETS[target].label} 목록에 추가했어요`);
      draw();
    } catch (e) {
      ctx.toast(e?.message ?? String(e), { error: true });
    }
  };
  const importFile = async () => {
    const [f] = await pickFiles({ accept: ".json,.dtheme" });
    if (!f) return;
    const r = parseThemeFile(await f.text());
    if (!r.theme) return ctx.toast(r.error, { error: true });
    data.themes[r.theme.target].push(r.theme);
    await persist();
    if (r.theme.target !== target) ctx.toast(`${TARGETS[r.theme.target].label} 목록에 추가했어요. 위 토글로 바꿔 보세요.`);
    else ctx.toast("테마를 가져왔어요");
    draw();
  };
  const menu = (t, anchor) => openMenu(ctx.win, anchor, [
    { label: "이름 바꾸기", icon: "edit", onClick: async () => {
      const n = await promptDialog(ctx.win, { title: "이름 바꾸기", label: "이름", value: t.name });
      if (n) t.name = n, await persist(), draw();
    } },
    { label: "복제", icon: "split", onClick: async () => {
      list().push(duplicateTheme(t));
      await persist();
      draw();
    } },
    t.builder ? { label: "공유 코드 복사", icon: "link", onClick: () => copyCode(t) } : null,
    { label: "파일로 내보내기 (.json)", icon: "download", onClick: () => download(`${t.name}.${t.target}.dtheme.json`, exportTheme(t), "application/json") },
    { label: "삭제", icon: "trash", danger: true, onClick: async () => {
      if (!await confirmDialog(ctx.win, { title: "테마 삭제", body: `'${t.name}'을(를) 지울까요?`, ok: "삭제", danger: true })) return;
      data.themes[target] = list().filter((x) => x !== t);
      if (data.active[target] === t.id) await off();
      await persist();
      draw();
    } }
  ].filter(Boolean));

  const card = (t) => {
    const on = data.active[target] === t.id;
    return h(
      "div",
      { class: "rb-card pad bordered", style: "display:flex;align-items:center;gap:12px;flex-wrap:wrap" },
      h("span", { style: `flex:none;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${t.tokens.accent2},${t.tokens.accent})` }),
      h("div", { style: "flex:1;min-width:150px" },
        h("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, h("b", null, t.name), on ? h("span", { class: "rb-badge ok" }, "켜짐") : null),
        h("div", { class: "rb-muted", style: "font-size:12.5px" }, t.builder ? "빌더로 만든 테마" : "스튜디오에서 직접 만든 테마")),
      h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;align-items:center" },
        on ? btn("끄기", { size: "sm", icon: "x", onClick: off }) : btn("켜기", { size: "sm", kind: "primary", icon: "zap", onClick: () => apply(t) }),
        t.builder ? btn("빌더에서 고치기", { size: "sm", icon: "brush", onClick: () => {
          handoff.builder = t.id;
          ctx.go("tools", "themebuilder");
        } }) : null,
        btn("스튜디오에서 고치기", { size: "sm", icon: "code", onClick: () => {
          handoff.studio = t.id;
          ctx.go("tools", "themestudio");
        } }),
        t.builder ? btn("코드 복사", { size: "sm", icon: "link", onClick: () => copyCode(t) }) : null,
        iconBtn("more", "테마 메뉴", { onClick: (e) => menu(t, e.currentTarget) }))
    );
  };

  function draw() {
    const tog = targetToggle(target, async (v) => {
      target = data.target = v;
      await persist();
      draw();
    });
    const top = h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
      iconBtn("back", "도구로", { onClick: () => ctx.go("tools") }),
      h("h2", { class: "rb-h2", style: "margin:0" }, "채팅 테마"),
      themeTabs(ctx, "list"),
      h("div", { style: "flex:1" }),
      tog);
    const hint = here !== target ? note("warn", `지금 화면은 ${TARGETS[here].label} 계열이에요. ${TARGETS[target].label} 테마는 만들고 내보낼 수 있지만 여기서 켜면 모양이 깨질 수 있어요.`) : null;
    const acts = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" },
      btn("빌더로 새로 만들기", { kind: "primary", icon: "brush", id: "rb-ct-new", onClick: () => {
        handoff.builder = null;
        ctx.go("tools", "themebuilder");
      } }),
      btn("스튜디오 열기", { icon: "code", onClick: () => ctx.go("tools", "themestudio") }),
      btn("코드로 불러오기", { icon: "download", id: "rb-ct-code", onClick: importCode }),
      btn("파일 가져오기", { icon: "upload", onClick: importFile }));
    const items = list();
    const body = items.length
      ? h("div", { style: "display:flex;flex-direction:column;gap:10px" }, ...items.map(card))
      : h("div", { class: "rb-card pad bordered", style: "text-align:center;padding:36px 20px" }, h("b", null, `${TARGETS[target].label} 테마가 아직 없어요`), h("div", { class: "rb-muted", style: "margin:6px 0 0" }, "빌더로 스타일·색만 고르면 바로 만들어져요."));
    replace(wrap, top, hint, acts, h("div", { class: "rb-muted", style: "font-size:12.5px" }, `${TARGETS[target].label} 테마 ${items.length}개`), body);
  }
  replace(ctx.main, h("div", { class: "rb-scroll", style: "flex:1;display:flex;flex-direction:column;padding:4px" }, wrap));
  draw();
}
