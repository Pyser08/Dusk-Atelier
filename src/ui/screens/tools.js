import { scanRisum } from '../../engine/formats/risum.js';
import { readZipDirectory, readZipEntry } from '../../engine/formats/zip.js';
import { readAssetBytes } from '../../engine/formats/bytes.js';
import { safeFileName } from '../../engine/export.js';
import { createZip } from '../../engine/zipwrite.js';
import { DISABLED_KEY, ORDER_KEY, commit, readDb } from '../../data/modules.js';
import { download, fmtBytes, h, pickFiles, replace } from '../dom.js';
import { icon } from '../icons.js';
import { btn, confirmDialog, note, progressBar } from '../kit.js';
import { defaultsMeta } from '../prefs.js';
import { PRESET_KEY, loadPresets, savePresets } from '../../data/presets.js';
import { INJECTED_KEY, loadPersonaMap, savePersonaMap } from '../../data/persona.js';
import { devToggleCard, isDev } from './devtools.js';
import { reload } from './modules.js';
import { renderUpdateSettings } from './updsettings.js';

function tile(ic, title, desc, onClick, id) {
  return h(
    "button",
    { type: "button", class: "rb-row", style: "background:var(--rb-surf);padding:16px", onClick, id },
    h("span", { style: "width:40px;height:40px;border-radius:12px;background:var(--rb-acc-soft);color:var(--rb-acc-text);display:flex;align-items:center;justify-content:center;flex-shrink:0" }, icon(ic, 20)),
    h("span", { class: "txt" }, h("span", { class: "name" }, title), h("span", { class: "meta", style: "white-space:normal" }, desc)),
    h("span", { style: "color:var(--rb-mute);display:flex" }, icon("chevron", 16))
  );
}
export function renderTools(ctx) {
  if (ctx.state.sub === "inspector") return renderInspector(ctx);
  if (ctx.state.sub === "cleanup") return renderCleanup(ctx);
  if (ctx.state.sub === "updset") return renderUpdateSettings(ctx);
  if (ctx.state.sub === "patchmaker") {
    ctx.go("dev", "patchmaker");
    return;
  }
  const dev = isDev(ctx);
  replace(ctx.main, h(
    "div",
    { class: "rb-section rb-scroll", style: "flex:1" },
    h("h2", { class: "rb-h2" }, "도구"),
    devToggleCard(ctx, () => {
      ctx.refreshTabs();
      renderTools(ctx);
    }),
    dev && h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-bottom:10px" },
      tile("code", "개발 탭 열기", "개발 중인 모듈·봇 모음, 검사·테스트, 패치 만들기·릴리스 기록", () => ctx.go("dev"), "rb-tool-dev")
    ),
    h(
      "div",
      { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px" },
      tile("palette", "색 바꾸기", "테마 색, 직접 고른 색, 밝기(RisuAI 따라가기/다크/라이트)", () => ctx.go("tools", "settings"), "rb-tool-settings"),
      tile("upload", "업데이트 가져오기", "모듈·캐릭터 파일로 기존 항목을 업데이트하거나 새로 넣기 (여러 파일 가능)", () => ctx.legacy.open(), "rb-tool-import"),
      tile("link", "다른 봇에서 가져오기 · 합치기", "다른 봇·모듈의 인물과 세계관을 가져오거나 두 봇을 합치기, 합친 출처만 업데이트·떼어내기 (AI 다듬기)", () => ctx.legacy.openMerge(), "rb-tool-merge"),
      tile("refresh", "업데이트 설정", "새로 가져온 봇 자동 감지, 받은 사본 정리, 채팅 백업", () => ctx.go("tools", "updset"), "rb-tool-updset"),
      tile("undo", "백업·되돌리기", "업데이트하기 전 상태로 되돌리기 (채팅은 그대로)", () => ctx.go("history"), "rb-tool-backups"),
      tile("download", "전체 백업", "모든 모듈(꺼진 것 포함)·에셋·프리셋·폴더·색 설정을 zip 한 파일로", () => fullBackup(ctx), "rb-tool-fullbackup"),
      tile("upload", "전체 복원", "전체 백업 zip에서 모듈과 설정을 되살리기", () => fullRestore(ctx), "rb-tool-restore"),
      tile("info", ".risum 인스펙터", "모듈 파일 안을 열어 보기: 필드별 크기, 압축률, 에셋 목록, ZIP 추출", () => ctx.go("tools", "inspector"), "rb-tool-inspector"),
      tile("trash", "설정 정리", "이 플러그인이 저장한 순서·폴더·프리셋·연결 정보를 골라서 지우기", () => ctx.go("tools", "cleanup"), "rb-tool-cleanup")
    )
  ));
}
async function fullBackup(ctx) {
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
async function fullRestore(ctx) {
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
async function renderCleanup(ctx) {
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
  const back = h("div", { style: "display:flex;align-items:center;gap:10px" }, btn("", { kind: "ghost", icon: "back", onClick: () => ctx.go("tools") }), h("div", null, h("span", { class: "rb-muted" }, "도구"), h("h2", { class: "rb-h2" }, "설정 정리")));
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
