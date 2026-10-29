import { scanRisum } from '../../engine/formats/risum.js';
import { readZipDirectory, readZipEntry } from '../../engine/formats/zip.js';
import { readAssetBytes } from '../../engine/formats/bytes.js';
import { safeFileName } from '../../engine/export.js';
import { createZip } from '../../engine/zipwrite.js';
import { DISABLED_KEY, ORDER_KEY, commit, readDb } from '../../data/modules.js';
import { download, fmtBytes, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, confirmDialog, guidePanel, note, openMenu, progressBar } from '../kit.js';
import { defaultsMeta } from '../prefs.js';
import { PRESET_KEY, loadPresets, savePresets } from '../../data/presets.js';
import { INJECTED_KEY, loadPersonaMap, savePersonaMap } from '../../data/persona.js';
import { isDev } from './devtools.js';
import { reload } from './modules.js';
import { renderPresets } from './presets.js';
import { renderLoreLog } from './lorelog.js';
import { renderPersonaBuilder } from './personabuilder.js';

export function tile(ic, title, desc, onClick, id) {
  return h(
    "button",
    { type: "button", class: "rb-row", style: "background:var(--rb-surf);padding:16px", onClick, id },
    h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 20)),
    h("span", { class: "txt" }, h("span", { class: "name" }, title), h("span", { class: "meta", style: "white-space:normal" }, desc)),
    h("span", { style: "color:var(--rb-mute);display:flex" }, icon("chevron", 16))
  );
}
// Special thanks — RisuTide (대표 이모지: 🌊)
function thanksCard() {
  const wave = (o, d) => `<path d="M0 ${18 + o} C 40 ${8 + o}, 80 ${28 + o}, 120 ${18 + o} S 200 ${8 + o}, 240 ${18 + o} S 320 ${28 + o}, 360 ${18 + o} S 440 ${8 + o}, 480 ${18 + o} V 60 H 0 Z" fill="currentColor" opacity="${d}"/>`;
  const box = h(
    "div",
    { class: "rb-thanks", id: "rb-thanks" },
    h("div", { class: "rb-thanks-waves", "aria-hidden": "true", ref: (el) => el.innerHTML = `<svg viewBox="0 0 480 60" preserveAspectRatio="none">${wave(6, 0.18)}${wave(14, 0.28)}${wave(22, 0.45)}</svg>` }),
    h(
      "div",
      { class: "rb-thanks-body" },
      h("span", { class: "rb-thanks-emoji", "aria-hidden": "true" }, "🌊"),
      h(
        "div",
        null,
        h("span", { class: "rb-thanks-kicker" }, "SPECIAL THANKS"),
        h("b", { class: "rb-thanks-title" }, "RisuTide"),
        h("span", { class: "rb-thanks-text" }, "채팅을 지키는 업데이트, 꼼꼼한 비교 검토, 다른 봇에서 가져오기·합치기까지 — Dusk Atelier의 업데이트 기능은 RisuTide에서 이어받았어요. 기꺼이 코드를 넘겨주신 RisuTide 개발자님께 깊이 감사드려요.")
      )
    )
  );
  return box;
}
// 이식 크레딧 카드 — 원작자 이름은 적지 않고 원문 글 링크만 둔다 (RisuTide 감사 카드와 같은 결: 어두운 그라데이션 + 움직이는 배경)
const CREDITS = [
  { key: "pot", emoji: "📜", kicker: "PORTED WITH PERMISSION", name: "Risupot", desc: "위키 기억 기능의 바탕이에요. 허락을 받아 옮겨 왔어요.", url: "https://arca.live/b/characterai/185024906" },
  { key: "arcana", emoji: "🃏", kicker: "PORTED WITH PERMISSION", name: "Arcana Card", desc: "기억 카드의 바탕이에요. 허락을 받아 옮겨 왔어요.", url: "https://arca.live/b/characterai/185793481" },
  { key: "bb", emoji: "🛠️", kicker: "PORTED WITH PERMISSION", name: "봇빌더", desc: "AI로 제작 기능을 허락받고 옮겨 왔어요.", url: "https://arca.live/b/characterai/187289284" }
];
const STAR_POS = [[8, 22, 0], [18, 70, 1.1], [31, 36, 0.5], [44, 80, 1.7], [57, 18, 0.9], [66, 58, 2.1], [78, 30, 0.3], [88, 74, 1.4], [94, 20, 1.9]];
function creditFx(key) {
  const fx = h("div", { class: "rb-cr-fx", "aria-hidden": "true" }, h("i", { class: "rb-cr-glow" }), h("i", { class: "rb-cr-shine" }));
  STAR_POS.forEach(([x, y, d], n) => fx.appendChild(h("i", { class: "rb-cr-star", style: `left:${x}%;top:${y}%;animation-delay:${d}s;${n % 3 === 0 ? "width:5px;height:5px" : ""}` })));
  return fx;
}
function creditCards() {
  return h(
    "div",
    { class: "rb-credits" },
    ...CREDITS.map((c, i) =>
      h(
        "div",
        { class: "rb-cr", "data-credit": c.key, style: `--rb-ci:${i + 1}` },
        creditFx(c.key),
        h(
          "div",
          { class: "rb-cr-body" },
          h("span", { class: "rb-cr-emoji", "aria-hidden": "true" }, c.emoji),
          h(
            "div",
            { class: "rb-cr-txt" },
            h("span", { class: "rb-cr-kicker" }, c.kicker),
            h("b", { class: "rb-cr-title" }, c.name),
            h("span", { class: "rb-cr-desc" }, c.desc),
            h("a", { class: "rb-cr-link", href: c.url, target: "_blank", rel: "noopener noreferrer" }, "원문 글 보기 ↗")
          )
        )
      )
    )
  );
}
export function renderTools(ctx) {
  if (ctx.state.sub === "inspector") return renderInspector(ctx);
  if (ctx.state.sub === "presets") return renderPresets(ctx);
  if (ctx.state.sub === "lorelog") return renderLoreLog(ctx);
  if (ctx.state.sub === "personabuilder") return renderPersonaBuilder(ctx);
  if (ctx.state.sub === "patchmaker") {
    ctx.go("dev", "patchmaker");
    return;
  }

  const tile2 = (ic, title, desc, onClick, id) => h(
    "button",
    { type: "button", class: "rb-ttile", onClick, id },
    h("span", { class: "ico" }, icon(ic, 22)),
    h("b", null, title),
    h("small", null, desc)
  );
  const content = h(
    "div",
    { class: "rb-section", style: "flex:1;min-width:0" },
    h(
      "div",
      { class: "rb-tgrid" },
      tile2("preset", "프리셋", "모듈 조합을 저장하고 공유해요", () => ctx.go("tools", "presets"), "rb-tool-presets"),
      tile2("character", "페르소나 빌더", "양식으로 페르소나를 만들어요", () => ctx.go("tools", "personabuilder"), "rb-tool-personabuilder"),
      tile2("book", "로어북 로그", "응답에 들어간 로어북 보기", () => ctx.go("tools", "lorelog"), "rb-tool-lorelog"),
      tile2("info", ".risum 인스펙터", "모듈 파일 안을 열어 봐요", () => ctx.go("tools", "inspector"), "rb-tool-inspector"),
      tile2("download", "전체 백업·복원", "설정과 데이터를 저장·복원", (ev) => openMenu(ctx.win, ev.currentTarget, [
        { label: "백업 만들기", icon: "download", onClick: () => fullBackup(ctx) },
        { label: "백업에서 복원", icon: "upload", onClick: () => fullRestore(ctx) }
      ]), "rb-tool-backup"),
      tile2("history", "기록·되돌리기", "봇·모듈 변경을 되돌려요", () => ctx.go("settings", "history"), "rb-tool-history")
    ),
    h("section", { class: "rb-thanks-sec" }, h("h2", { class: "rb-label" }, "도움 주신 분들"), thanksCard(), creditCards())
  );
  const adv = ctx.prefs.uiMode === "advanced";
  const guide = adv ? guidePanel("어떤 도구가 맞을까요?", "하고 싶은 일로 골라 보세요.", [
    { label: "모듈 켜기 조합을 저장하고 싶어요", text: "프리셋", onClick: () => ctx.go("tools", "presets") },
    { label: "페르소나 설명을 양식으로 만들고 싶어요", text: "페르소나 빌더", onClick: () => ctx.go("tools", "personabuilder") },
    { label: "응답에 어떤 로어북이 들어갔는지 보고 싶어요", text: "로어북 로그", onClick: () => ctx.go("tools", "lorelog") },
    { label: "모듈 파일 안을 열어 보고 싶어요", text: ".risum 인스펙터", onClick: () => ctx.go("tools", "inspector") }
  ]) : null;
  replace(ctx.main, h("div", { class: "rb-scroll rb-twocol" }, content, guide));
}
export async function fullBackup(ctx) {
  const db = await readDb(ctx.api, ["modules", "pluginCustomStorage", "enabledModules"]);
  const on = db.modules ?? [], off = db.pluginCustomStorage?.[DISABLED_KEY] ?? [];
  const paths = /* @__PURE__ */ new Map();
  for (const m of [...on, ...off]) {
    for (const a of m.assets ?? []) if (a?.[1]) paths.set(a[1], a[2]);
    if (m.icon) paths.set(m.icon, "png");
  }
  const mode = await new Promise((resolve) => {
    const back2 = h("div", { class: "rb-modal" });
    const done = (v) => {
      back2.remove();
      resolve(v);
    };
    back2.appendChild(h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "전체 백업" },
      h("h3", { class: "rb-h3" }, "전체 백업"),
      h("p", { class: "rb-p" }, `모듈 ${on.length + off.length}개 · 에셋 ${paths.size}개`),
      h("div", { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:6px" }, h("b", null, "빠른 백업 — 몇 초"), h("span", { class: "rb-muted" }, "모듈 내용·켜짐·순서·프리셋·폴더·색 설정만 담아요. 에셋 파일은 서버에 그대로 있으니 같은 서버에서 되살릴 때 충분해요.")),
      h("div", { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:6px" }, h("b", null, "에셋까지 — 시간이 걸려요"), h("span", { class: "rb-muted" }, "에셋 파일도 모두 담아요. 다른 서버로 옮기거나 서버 정리에 대비할 때 쓰세요.")),
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("빠른 백업", { kind: "primary", onClick: () => done("quick") }), btn("에셋까지", { onClick: () => done("full") }))
    ));
    ctx.win.appendChild(back2);
  });
  if (!mode) return;
  if (mode === "quick") paths.clear();
  const bar = progressBar(0), txt = h("span", { class: "rb-muted" }, "준비 중…");
  const back = h("div", { class: "rb-modal" }, h("div", { class: "rb-dialog" }, h("h3", { class: "rb-h3" }, "전체 백업 만드는 중"), bar, txt));
  ctx.win.appendChild(back);
  try {
    const zip = createZip();
    const [presets, persona] = await Promise.all([loadPresets(ctx.api), loadPersonaMap(ctx.api)]);
    zip.add("manifest.json", JSON.stringify({
      type: "rbm-backup",
      v: 1,
      created: Date.now(),
      withAssets: mode === "full",
      modules: on,
      disabledModules: off,
      enabledModules: db.enabledModules ?? [],
      prefs: { ui: ctx.prefs.ui, meta: ctx.prefs.meta, presets, persona: persona.map }
    }, null, 1));
    const list = [...paths.keys()];
    let done = 0, missing = 0, i = 0;
    const started = Date.now();
    await Promise.all(Array.from({ length: Math.min(16, list.length) }, async () => {
      while (i < list.length) {
        const p = list[i++];
        const d = await ctx.assets.read(p).catch(() => null);
        if (d?.length) zip.add(`files/${p}`, d);
        else missing++;
        done++;
        bar.set(done / list.length * 100);
        const per = (Date.now() - started) / done;
        txt.textContent = `에셋 ${done}/${list.length} · ${fmtBytes(zip.size)} · 남은 시간 약 ${Math.ceil(per * (list.length - done) / 1e3)}초`;
      }
    }));
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    download(`dusk-atelier-backup-${stamp}${mode === "quick" ? "-quick" : ""}.zip`, zip.blob());
    back.remove();
    ctx.toast(`전체 백업을 내려받았어요${missing ? ` (읽지 못한 에셋 ${missing}개)` : ""}`);
  } catch (e) {
    back.remove();
    ctx.toast(`백업하지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
export async function fullRestore(ctx) {
  const [f] = await pickFiles({ accept: ".zip,application/zip" });
  if (!f) return;
  let entries, man;
  try {
    entries = await readZipDirectory(f);
    const me = entries.find((e) => e.name === "manifest.json");
    if (!me) throw new Error("전체 백업 파일이 아니에요 (manifest.json 없음)");
    man = JSON.parse(new TextDecoder().decode(await readZipEntry(f, me)));
    if (man?.type !== "rbm-backup") throw new Error("전체 백업 파일이 아니에요");
  } catch (e) {
    ctx.toast(e?.message ?? String(e), { error: true });
    return;
  }
  const mods = [...(man.modules ?? []).map((m) => ({ m, on: true })), ...(man.disabledModules ?? []).map((m) => ({ m, on: false }))];
  const mode = await new Promise((resolve) => {
    const back2 = h("div", { class: "rb-modal" });
    const done = (v) => {
      back2.remove();
      resolve(v);
    };
    back2.appendChild(h(
      "div",
      { class: "rb-dialog", role: "dialog", "aria-label": "전체 복원" },
      h("h3", { class: "rb-h3" }, "전체 복원"),
      h("p", { class: "rb-p" }, `${new Date(man.created).toLocaleString()} 백업 · 모듈 ${mods.length}개 · 파일 ${entries.length - 1}개`),
      h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "merge", checked: true }), h("span", null, "합치기 — 없는 모듈은 추가, 같은 id는 백업 것으로")),
      h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "add" }), h("span", null, "없는 것만 추가 — 지금 있는 모듈은 그대로")),
      h("label", { class: "rb-check" }, h("input", { type: "radio", name: "m", value: "replace" }), h("span", null, "통째로 바꾸기 — 지금 모듈 목록을 백업 것으로")),
      h("label", { class: "rb-check" }, h("input", { type: "checkbox", name: "prefs", checked: true }), h("span", null, "프리셋·폴더·색·페르소나 연결도 되살리기")),
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }), btn("복원", { kind: "primary", onClick: () => done({ mode: back2.querySelector("input[name=m]:checked").value, prefs: back2.querySelector("input[name=prefs]").checked }) }))
    ));
    ctx.win.appendChild(back2);
  });
  if (!mode) return;
  if (mode.mode === "replace" && !await confirmDialog(ctx.win, { title: "지금 모듈 목록을 바꿀까요?", body: "백업에 없는 모듈은 목록에서 빠져요.", ok: "바꾸기", danger: true })) return;
  const bar = progressBar(0), txt = h("span", { class: "rb-muted" }, "파일 올리는 중…");
  const back = h("div", { class: "rb-modal" }, h("div", { class: "rb-dialog" }, h("h3", { class: "rb-h3" }, "복원하는 중"), bar, txt));
  ctx.win.appendChild(back);
  try {
    const files = entries.filter((e) => e.name.startsWith("files/"));
    const remap = /* @__PURE__ */ new Map();
    let i = 0, done = 0;
    await Promise.all(Array.from({ length: Math.min(12, files.length) }, async () => {
      while (i < files.length) {
        const e = files[i++];
        let key = null, err;
        for (let a = 0; a < 3 && !key; a++) {
          try {
            key = await ctx.api.saveAsset(await readAssetBytes(f, { source: "zip", entry: e }));
          } catch (x) {
            err = x;
            await new Promise((r) => setTimeout(r, 600 * (a + 1)));
          }
        }
        if (!key) throw new Error(`파일을 올리지 못했어요: ${e.name} (${err?.message ?? err})`);
        remap.set(e.name.slice(6), key);
        done++;
        bar.set(done / files.length * 100);
        txt.textContent = `파일 ${done}/${files.length}`;
      }
    }));
    const fix = (m) => JSON.parse(JSON.stringify(m), (k, v) => typeof v === "string" && remap.has(v) ? remap.get(v) : v);
    txt.textContent = "모듈 저장 중…";
    await commit(ctx.api, (d) => {
      if (mode.mode === "replace") d.entries = [];
      for (const { m, on } of mods) {
        const mm = fix(m);
        const e = d.entries.find((x) => x.module.id === mm.id);
        if (e) {
          if (mode.mode !== "add") {
            e.module = mm;
            e.enabled = on || mm.assets?.length > 0;
          }
        } else d.entries.push({ module: mm, enabled: on || mm.assets?.length > 0 });
      }
      if (mode.mode === "replace" || mode.mode === "merge") d.enabledModules = [.../* @__PURE__ */ new Set([...mode.mode === "merge" ? d.enabledModules : [], ...man.enabledModules ?? []])];
    }, { chars: mode.mode === "replace" });
    if (mode.prefs && man.prefs) {
      if (man.prefs.meta) await ctx.prefs.saveMeta({ ...defaultsMeta(), ...man.prefs.meta });
      if (man.prefs.ui?.theme) {
        await ctx.prefs.saveUi({ theme: man.prefs.ui.theme });
        ctx.applyTheme();
      }
      if (man.prefs.presets?.presets) await savePresets(ctx.api, man.prefs.presets);
      if (man.prefs.persona) {
        const p = await loadPersonaMap(ctx.api);
        p.map = man.prefs.persona;
        await savePersonaMap(ctx.api, p);
        ctx.onPersonaChanged?.();
      }
    }
    back.remove();
    await reload(ctx).catch(() => {
    });
    ctx.toast(`복원했어요 (모듈 ${mods.length}개, 파일 ${files.length}개)`);
  } catch (e) {
    back.remove();
    ctx.toast(`복원하지 못했어요: ${e?.message ?? e}`, { error: true });
  }
}
async function renderInspector(ctx) {
  const st = ctx.state;
  const pick = async () => {
    const [f] = await pickFiles({ accept: ".risum" });
    if (!f) return;
    try {
      st.insp = { file: f, scan: await scanRisum(f), mainSize: null };
    } catch (e) {
      ctx.toast(`분석하지 못했어요: ${e?.message ?? e}`, { error: true });
      return;
    }
    renderInspector(ctx);
  };
  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, ".risum 인스펙터")));
  back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
  if (!st.insp) {
    replace(ctx.main, h(
      "div",
      { class: "rb-section rb-scroll", style: "flex:1" },
      back,
      h("p", { class: "rb-p" }, ".risum 파일을 고르면 설치하지 않고 안을 보여 줘요. 무엇이 파일을 크게 만드는지 찾을 때 좋아요."),
      btn(".risum 파일 고르기", { kind: "primary", icon: "upload", onClick: pick })
    ));
    return;
  }
  const { file, scan } = st.insp;
  const m = scan.module;
  const json = JSON.stringify({ module: m, type: "risuModule" });
  const fields = Object.keys(m).map((k) => [k, new TextEncoder().encode(JSON.stringify(m[k]) ?? "").length]).sort((a, b) => b[1] - a[1]);
  const assetBytes = scan.assets.reduce((s, a) => s + a.size, 0);
  const big = fields[0]?.[1] || 1;
  const kv = (k, v) => h("div", { class: "rb-kv" }, h("span", null, k), h("span", null, v));
  const extract = async () => {
    const zip = createZip();
    zip.add("module.json", JSON.stringify({ ...m, type: "risuModule" }, null, 2));
    for (const a of scan.assets) zip.add(`assets/${safeFileName(a.name || String(a.index))}.${a.ext || "png"}`, await readAssetBytes(file, { ...a, source: void 0 }));
    download(`${safeFileName(m.name)}-extracted.zip`, zip.blob());
  };
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    back,
    h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, btn("다른 파일", { icon: "upload", onClick: pick }), btn("ZIP으로 풀기", { kind: "primary", icon: "download", onClick: () => extract().catch((e) => ctx.toast(e.message, { error: true })) })),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px" },
      h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "파일 정보"), h(
        "div",
        { class: "rb-card" },
        kv("파일명", file.name),
        kv("파일 크기", fmtBytes(file.size)),
        kv("모듈 이름", m.name ?? ""),
        kv("형식", ".risum v0 (유효)"),
        kv("모듈 JSON", fmtBytes(json.length)),
        kv("에셋", `${scan.assets.length}개 · ${fmtBytes(assetBytes)}`),
        kv("로어북 · 정규식 · 트리거", `${m.lorebook?.length ?? 0} · ${m.regex?.length ?? 0} · ${m.trigger?.length ?? 0}`),
        kv("저수준 접근", m.lowLevelAccess ? "사용" : "없음")
      )),
      h("div", { class: "rb-field" }, h("span", { class: "rb-label" }, "필드별 크기 (큰 순)"), h(
        "div",
        { class: "rb-card pad", style: "display:flex;flex-direction:column;gap:8px" },
        fields.slice(0, 14).map(([k, n]) => h(
          "div",
          { style: "display:flex;flex-direction:column;gap:4px" },
          h("div", { style: "display:flex;font-size:13px" }, h("span", { style: "flex:1" }, k), h("span", { class: "rb-muted" }, fmtBytes(n))),
          h("div", { class: "rb-progress", style: "height:6px" }, h("i", { style: { width: `${Math.max(2, n / big * 100)}%` } }))
        ))
      ))
    ),
    h(
      "div",
      { class: "rb-field" },
      h("span", { class: "rb-label" }, `에셋 (${scan.assets.length}개, 큰 순)`),
      h("div", { class: "rb-card" }, [...scan.assets].sort((a, b) => b.size - a.size).slice(0, 200).map((a) => kv(`${a.name || "(이름 없음)"}.${a.ext}`, fmtBytes(a.size))))
    )
  ));
}
export async function renderCleanup(ctx) {
  const db = await readDb(ctx.api, ["modules", "pluginCustomStorage"]);
  const presets = await loadPresets(ctx.api), persona = await loadPersonaMap(ctx.api);
  const meta = ctx.prefs.meta;
  const opts = [
    ["order", "정렬 순서 초기화", `이 플러그인이 기억한 모듈 순서(${(db.pluginCustomStorage?.[ORDER_KEY] ?? []).length}개)를 지워요`],
    ["enableAll", "꺼진 모듈 모두 켜기", `꺼짐 보관함의 ${(db.pluginCustomStorage?.[DISABLED_KEY] ?? []).length}개를 다시 켜요 (이 플러그인을 지우기 전에 하세요. 꺼진 모듈은 이 플러그인 보관함에만 있어요)`],
    ["assetFolders", "에셋 폴더 정보 지우기", `${Object.keys(meta.moduleAssetFolders ?? {}).length}개 모듈의 에셋 폴더 구분을 지워요 (에셋은 남아요)`],
    ["presets", "프리셋 초기화", `${Object.keys(presets.presets).length}개 프리셋과 디바이스 페어를 지워요`],
    ["persona", "페르소나 연결 초기화", `${Object.values(persona.map).reduce((s, x) => s + x.length, 0)}개 연결을 지워요`],
    ["charLinks", "캐릭터 연결 초기화", "모든 캐릭터·채팅에 연결된 모듈 목록을 비워요 (캐릭터를 다 읽어서 시간이 걸려요)"],
    ["folders", "모듈 목록 폴더·이름 색 지우기", `폴더 ${meta.folders.length}개, 이름 색 ${Object.keys(meta.nameColors).length}개`]
  ];
  const checks = /* @__PURE__ */ new Map();
  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("settings") }), h("div", null, h("span", { class: "rb-muted" }, "설정"), h("h2", { class: "rb-h2" }, "설정 정리")));
  back.querySelector("button").setAttribute("aria-label", "도구로 돌아가기");
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    back,
    note("warn", "골라서 지운 정보는 되돌릴 수 없어요. 모듈 내용(로어북·에셋)은 지우지 않아요."),
    h("div", { class: "rb-card" }, opts.map(([k, label, desc]) => {
      const c = h("input", { type: "checkbox" });
      checks.set(k, c);
      return h("label", { class: "rb-kv", style: "cursor:pointer" }, c, h("span", null, label, h("br"), h("small", { class: "rb-muted" }, desc)));
    })),
    h("div", null, btn("정리 실행", { kind: "danger", icon: "trash", onClick: async () => {
      const sel = [...checks].filter(([, c]) => c.checked).map(([k]) => k);
      if (!sel.length) {
        ctx.toast("정리할 항목을 골라 주세요");
        return;
      }
      if (!await confirmDialog(ctx.win, { title: `${sel.length}가지를 정리할까요?`, body: sel.map((k) => "• " + opts.find((o) => o[0] === k)[1]).join("\n"), ok: "정리", danger: true })) return;
      try {
        if (sel.some((k) => ["order", "enableAll", "charLinks"].includes(k))) {
          await commit(ctx.api, (d) => {
            for (const e of d.entries) {
              if (sel.includes("enableAll")) e.enabled = true;
            }
            if (sel.includes("charLinks")) d.characters.forEach((c, i) => {
              if (!c) return;
              if (c.modules?.length) {
                c.modules = [];
                d.changedChars.add(i);
              }
              for (const ch of c.chats ?? []) if (ch?.modules?.length) {
                ch.modules = [];
                d.changedChars.add(i);
              }
            });
          }, { chars: sel.includes("charLinks") });
          if (sel.includes("order")) await ctx.api.setDatabaseLite({ [ORDER_KEY]: [] });
        }
        if (sel.includes("assetFolders")) await ctx.prefs.saveMeta({ ...ctx.prefs.meta, moduleAssetFolders: {} });
        if (sel.includes("presets")) await ctx.api.pluginStorage.setItem(PRESET_KEY, JSON.stringify({ active: "기본", presets: {} }));
        if (sel.includes("persona")) {
          await savePersonaMap(ctx.api, { map: {}, injectedIndex: {} });
          await ctx.api.setDatabaseLite({ [INJECTED_KEY]: {} });
          ctx.onPersonaChanged?.();
        }
        if (sel.includes("folders")) await ctx.prefs.saveMeta({ ...ctx.prefs.meta, folders: [], mapping: {}, nameColors: {} });
        ctx.toast("정리했어요");
        await reload(ctx).catch(() => {
        });
        renderCleanup(ctx);
      } catch (e) {
        ctx.toast(`정리하지 못했어요: ${e?.message ?? e}`, { error: true });
      }
    } }))
  ));
}
