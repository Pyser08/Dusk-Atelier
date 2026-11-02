// 기억 탭 → 스킬 (v1.8.1). 코코아전트 호환 스킬 세트를 가져와 정리 노트·기록하기·기억 분석 프롬프트 뒤에 붙인다. 추가 AI 호출 없음.
// 화면(1.8.3 목업 2): 켜기 카드('N개 중 M개 사용 중') · 내 스킬 한 목록(간단=줄마다 스위치, 고급=줄 아래 붙는 곳 칩 4개, ZIP·JSON·삭제는 ···)
// · 고급 묶음(옮겨오기·웹 도구·호출 기록)은 한 줄씩 접음. PC 2열. 일부만 다시 그린다(부분 갱신).
import { h, replace } from "../../dom.js";
import { advFold, btn, chip, iconBtn, note, openMenu, pageHead, toggleRow, emptyState, confirmDialog, promptDialog, loading, modal, switchEl, setSwitch } from "../../kit.js";
import { icon } from "../../icons.js";
import { mem, fail } from "./common.js";
import { SKILL_STAGES, SKILL_STAGE_LABEL } from "../../../engine/skillcfg.js";
import { buildSkillIndex, diagnoseSkillSet, normalizeSkillSet, SKILL_MD, SKILL_LIMITS } from "../../../engine/skills.js";
import { WEB_PROVIDERS, webReady, formatResults } from "../../../engine/websearch.js";
import { WEB_STAGES } from "../../../data/webtools.js";
import { recentCalls, clearCalls } from "../../../engine/skillhook.js";
import { readCocoa, suggestStageRefs, agentToSkillSet } from "../../../engine/cocoamigrate.js";

const TEMPLATE = (name) => `---\nname: ${name}\ndescription: 언제 쓰는 스킬인지 한 줄로 적어요\nskill_format: 2\ninject_order: 100\nsystem_prompt: |\n  여기에 프롬프트 뒤에 붙일 지침을 적어요.\n---\n# ${name}\n스킬 설명(주입되지 않는 본문)\n`;
const stageHint = { router: "관련 인물을 고르는 호출", director: "정리 노트를 만드는 호출", writer: "기록을 쓰는 호출", analysis: "Dusk 기억 분석 호출" };

export function saveBlob(ctx, name, data, type) {
  const w = ctx.win, url = w.URL.createObjectURL(new w.Blob([data], { type }));
  const a = h("a", { href: url, download: name }); a.click(); setTimeout(() => w.URL.revokeObjectURL(url), 4000);
}
const pickFile = (ctx, accept, onFile) => { const inp = h("input", { type: "file", accept }); inp.addEventListener("change", () => { const f = inp.files?.[0]; if (f) onFile(f); }); inp.click(); };

export async function renderMemorySkills(ctx, host, { redraw, standalone = false, openAi = null }) {
  const S = ctx.skills, m = mem(ctx), st = m.skills ??= { open: "", file: "" };
  const back = standalone ? undefined : { onClick: () => { m.page = "home"; redraw(); }, label: "기억으로" };
  if (!S) return replace(host, pageHead("코코아", { back }), emptyState({ icon: "info", title: "스킬 기능이 아직 준비되지 않았어요", text: "플러그인을 다시 불러와 주세요." }));
  const dt = (k) => h("div", { "data-tour": k }), topH = dt("sk-toggle"), stagesH = dt("sk-stages"), libH = dt("sk-lib"), cocoaH = dt("sk-cocoa"), webH = dt("sk-web"), callsH = dt("sk-calls");
  // 고급 묶음: 한 줄씩 접어 둔다(목업 2). 요약 줄은 그릴 때 채운다.
  const grp = (id, title, body) => { const sub = h("small"); const d = h("details", { class: "rb-card bordered rb-mem-grp", dataset: { g: id } }, h("summary", null, h("span", { class: "t" }, h("b", null, title), sub), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))), h("div", { class: "rb-mem-foldbody" }, body)); d.sub = sub; return d; };
  const gCocoa = grp("cocoa", "코코아전트에서 옮겨오기", cocoaH), gWeb = grp("web", "웹 도구 (검색·페이지 읽기)", webH), gCalls = grp("calls", "최근 호출 기록", callsH);
  gCocoa.sub.textContent = "같은 기기에 남은 스킬·설정을 읽어 와요";
  const adv = ctx.prefs.advanced ? h("section", { class: "rb-mem-folds", "aria-label": "고급" }, h("h3", { class: "rb-h3" }, "고급"), gCocoa, ctx.web ? gWeb : null, gCalls) : advFold(ctx, "memory", true);
  replace(host, h("div", { class: "rb-mem2-grid has-adv rb-sk3" }, h("div", { class: "rb-mem2-main" }, pageHead("코코아", { back }), topH, libH), h("div", { class: "rb-mem2-side" }, adv)));
  const run = (p) => p.catch(fail(ctx));

  const usedIds = (cfg) => new Set(SKILL_STAGES.flatMap((g) => cfg.stages[g].map((r) => r.id)));
  async function drawTop() {
    const [cfg, lib] = [await S.getCfg(), await S.getLibrary()];
    const used = lib.sets.filter((x) => usedIds(cfg).has(x.id) || SKILL_STAGES.some((g) => cfg.stages[g].some((r) => r.name.toLowerCase() === x.name.toLowerCase()))).length;
    const sw = switchEl(cfg.on, { label: "코코아 기능 켜기", onChange: (v, el) => { setSwitch(el, v); run(S.saveCfg({ ...cfg, on: v }).then(() => { ctx.toast(v ? "스킬 주입을 켰어요." : "스킬 주입을 껐어요."); return drawTop(); })); } });
    replace(topH, h("section", { class: "rb-card bordered rb-sk-top" },
      h("div", { class: "t" }, h("b", null, "코코아 기능"), h("small", null, `스킬 ${lib.sets.length}개 중 ${used}개 사용 중 · 따로 AI를 부르지 않아요`)), sw));
  }
  // 예전 '사용할 스킬'·'어느 호출에 붙일까요' 카드는 내 스킬 목록 한 곳으로 합쳤다(1.8.3). 부르는 곳은 그대로 두고 목록을 다시 그린다.
  async function drawStages() { await Promise.all([drawTop(), drawLib()]); }

  async function drawLib() {
    const lib = await S.getLibrary();
    if (st.open) { const set = lib.sets.find((x) => x.id === st.open); if (set) return drawEditor(set); st.open = ""; }
    const imp = () => pickFile(ctx, ".zip,.json,application/json,application/zip", (f) => run((async () => {
      const r = await S.readFile(f);
      if (r.kind === "library") { const n = await S.importLibrary(r.library, "new"); ctx.toast(`세트 ${n.count}개를 가져왔어요.`); }
      else {
        const exists = lib.sets.some((x) => x.name.toLowerCase() === r.set.name.toLowerCase());
        const over = exists ? await confirmDialog(ctx.win, { title: `'${r.set.name}' 세트가 이미 있어요`, body: "덮어쓰면 기존 내용이 바뀌어요. 취소하면 가져오지 않아요.", ok: "덮어쓰기", cancel: "취소" }) : false;
        if (exists && !over) return;
        const res = await S.importSet(r.set, over ? "overwrite" : "new");
        if (res.error) throw new Error(res.error);
        ctx.toast(r.warnings.length ? `가져왔어요. 확인할 것 ${r.warnings.length}건: ${r.warnings[0]}` : "가져왔어요.");
      }
      await Promise.all([drawLib(), drawStages()]);
    })()));
    const exp = async () => { saveBlob(ctx, "dusk-skills.json", await S.exportLibrary(), "application/json"); };
    const newSet = () => run((async () => {
      const name = (await promptDialog(ctx.win, { title: "새 스킬 세트", label: "세트 이름", ok: "만들기" }))?.trim(); if (!name) return;
      const set = normalizeSkillSet({ name, files: [{ path: `${name}/SKILL.md`, content: TEMPLATE(name) }] }, lib.sets.length);
      await S.importSet(set, "new"); await Promise.all([drawLib(), drawStages()]);
    })());
    const cfg = await S.getCfg();
    const has = (stage, set) => cfg.stages[stage].some((r) => r.id === set.id || r.name.toLowerCase() === set.name.toLowerCase());
    const setRef = (stage, set, on) => run((async () => {
      const stages = { ...cfg.stages, [stage]: cfg.stages[stage].filter((r) => r.id !== set.id && r.name.toLowerCase() !== set.name.toLowerCase()) };
      if (on) stages[stage].push({ id: set.id, name: set.name });
      await S.saveCfg({ ...cfg, stages }); await drawStages();
    })());
    // 간단 모드: 줄마다 스위치 하나. 켜면 정리 노트·기록하기 두 호출에 붙는다.
    const basic = ["director", "writer"];
    const basicOn = (set) => basic.every((g) => has(g, set));
    const toggleSet = (set, v) => run((async () => {
      const stages = { ...cfg.stages };
      for (const g of basic) { stages[g] = stages[g].filter((r) => r.id !== set.id && r.name.toLowerCase() !== set.name.toLowerCase()); if (v) stages[g].push({ id: set.id, name: set.name }); }
      await S.saveCfg({ ...cfg, stages }); await drawStages();
    })());
    const delSet = (set) => run((async () => { if (!await confirmDialog(ctx.win, { title: `'${set.name}' 삭제`, body: "세트 안의 파일이 모두 지워져요.", ok: "삭제", cancel: "취소", danger: true })) return; await S.saveLibrary({ ...lib, sets: lib.sets.filter((x) => x.id !== set.id) }); await drawStages(); })());
    const row = (set) => {
      const n = buildSkillIndex([set]).length;
      const where = SKILL_STAGES.filter((g) => has(g, set)).map((g) => SKILL_STAGE_LABEL[g]);
      const sub = ctx.prefs.advanced ? `붙는 곳: ${where.length ? where.join(" · ") : "쓰지 않음"} · 스킬 ${n}개` : `${basicOn(set) ? "사용 중" : "쓰지 않음"} · 스킬 ${n}개`;
      const open = () => { st.open = set.id; st.file = ""; run(drawLib()); };
      const more = iconBtn("more", `${set.name} 더 보기`, { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
        { label: "열어서 고치기", icon: "edit", onClick: open },
        { label: "ZIP으로 내보내기", icon: "download", onClick: () => saveBlob(ctx, `${set.name}.zip`, S.zipOfSet(set), "application/zip") },
        { label: "JSON으로 내보내기", icon: "download", onClick: () => saveBlob(ctx, `${set.name}.json`, S.exportSet(set), "application/json") },
        "sep",
        { label: "삭제", icon: "trash", danger: true, onClick: () => delSet(set) }
      ]) });
      const sw = ctx.prefs.advanced ? null : switchEl(basicOn(set), { label: `${set.name} 사용`, onChange: (v, el) => { setSwitch(el, v); toggleSet(set, v); } });
      return h("li", { class: "rb-sk-row", dataset: { id: set.id } },
        h("div", { class: "rb-sk-rowmain" },
          h("button", { type: "button", class: "rb-sk-open", onClick: open, "aria-label": `${set.name} 열기` }, h("b", null, set.name), h("small", null, sub)),
          sw, more),
        ctx.prefs.advanced ? h("div", { class: "rb-chips rb-sk-stages", role: "group", "aria-label": `${set.name} 붙는 곳` }, SKILL_STAGES.map((g) => chip(SKILL_STAGE_LABEL[g], { pressed: has(g, set), onClick: () => setRef(g, set, !has(g, set)) }))) : null);
    };
    const headMore = iconBtn("more", "스킬 더 보기", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
      { label: "새 세트 직접 만들기", icon: "plus", onClick: newSet },
      lib.sets.length ? { label: "전체 내보내기", icon: "download", onClick: () => run(exp()) } : null
    ]) });
    replace(libH, h("section", { class: "rb-card bordered pad rb-sk-card" },
      h("div", { class: "rb-sk-bar" }, h("b", null, `내 스킬 ${lib.sets.length}개`), h("span", { class: "rb-spacer" }),
        openAi ? btn("AI로 만들기", { size: "sm", icon: "sparkle", onClick: openAi, id: "rb-sk-ai" }) : null,
        btn("가져오기", { size: "sm", kind: "primary", icon: "upload", onClick: imp, id: "rb-sk-import" }), headMore),
      lib.sets.length ? h("ul", { class: "rb-sk-list" }, lib.sets.map(row)) : emptyState({ icon: "info", title: "아직 스킬 세트가 없어요", text: "ZIP/JSON을 가져오거나 AI로 만들거나 코코아전트에서 옮겨 올 수 있어요." }),
      cfg.on ? null : note("warn", "코코아 기능이 꺼져 있어서 지금은 아무것도 붙지 않아요."),
      h("p", { class: "rb-muted rb-sk-hint" }, ctx.prefs.advanced ? "줄을 누르면 열어서 고쳐요. ··· 에 ZIP·JSON 내보내기, 삭제가 있어요. 칩으로 붙일 호출을 골라요." : "줄을 누르면 열어서 고쳐요. ··· 에 ZIP·JSON 내보내기, 삭제가 있어요. 켜면 정리 노트·기록하기에 붙어요.")));
  }

  function drawEditor(set) {
    const file = set.files.find((f) => f.path === st.file) ?? set.files.find((f) => f.path.endsWith(`/${SKILL_MD}`)) ?? set.files[0];
    const ta = h("textarea", { class: "rb-input", rows: 16, spellcheck: false, style: "height:auto;padding:10px 14px;resize:vertical;font-family:var(--rb-mono, monospace)" });
    ta.value = file?.content ?? "";
    const save = () => run((async () => {
      const files = set.files.map((f) => f.path === file.path ? { ...f, content: ta.value } : f);
      await S.importSet({ ...set, files }, "overwrite"); ctx.toast("저장했어요."); await Promise.all([drawLib(), drawStages()]);
    })());
    const addFile = () => run((async () => {
      const p = (await promptDialog(ctx.win, { title: "새 파일", label: `경로 (예: 폴더/${SKILL_MD})`, ok: "만들기" }))?.trim(); if (!p) return;
      if (set.files.length >= SKILL_LIMITS.filesPerSet) throw new Error(`파일은 세트마다 ${SKILL_LIMITS.filesPerSet}개까지예요.`);
      const files = [...set.files, { path: p, content: p.endsWith(SKILL_MD) ? TEMPLATE(p.split("/")[0] || set.name) : "" }];
      await S.importSet({ ...set, files }, "overwrite"); st.file = p; await drawLib();
    })());
    const delFile = () => run((async () => {
      if (!file || !await confirmDialog(ctx.win, { title: `${file.path} 삭제`, body: "이 파일만 지워져요.", ok: "삭제", cancel: "취소", danger: true })) return;
      await S.importSet({ ...set, files: set.files.filter((f) => f.path !== file.path) }, "overwrite"); st.file = ""; await drawLib();
    })());
    const diag = diagnoseSkillSet(set);
    const prev = () => run((async () => {
      const cfg = await S.getCfg(), lines = [];
      for (const stage of SKILL_STAGES) { const { block } = await S.previewFor(stage); lines.push(`── ${SKILL_STAGE_LABEL[stage]} ──\n${block || "(붙는 글 없음)"}`); }
      const box = h("textarea", { class: "rb-input", rows: 14, readOnly: true, style: "height:auto;width:100%" }); box.value = (cfg.on ? "" : "※ 주입이 꺼져 있어요(미리보기는 켠 것처럼 보여 줘요)\n\n") + lines.join("\n\n");
      modal(ctx.win, (close) => h("div", { class: "rb-card pad rb-sk-card" }, h("b", null, "모델이 받는 추가 글"), box, btn("닫기", { onClick: close })));
    })());
    replace(libH, h("section", { class: "rb-card bordered pad rb-sk-card" },
      h("div", { class: "rb-sk-bar" }, btn("‹ 목록", { size: "sm", onClick: () => { st.open = ""; run(drawLib()); } }), h("b", null, set.name), h("span", { class: "rb-spacer" }),
        iconBtn("more", "세트 더 보기", { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
          { label: "주입 미리보기", icon: "eye", onClick: prev },
          { label: "ZIP으로 내보내기", icon: "download", onClick: () => saveBlob(ctx, `${set.name}.zip`, S.zipOfSet(set), "application/zip") },
          { label: "JSON으로 내보내기", icon: "download", onClick: () => saveBlob(ctx, `${set.name}.json`, S.exportSet(set), "application/json") }
        ]) })),
      diag.length ? h("ul", { class: "rb-muted" }, diag.map((d) => h("li", null, `${d.level === "warn" ? "⚠ " : ""}${d.text}`))) : note("ok", "진단: 문제 없어요."),
      h("div", { class: "rb-chips" }, set.files.map((f) => chip(f.path, { pressed: f === file, onClick: () => { st.file = f.path; run(drawLib()); } })), btn("+ 파일", { size: "sm", onClick: addFile })),
      file ? h("div", null, ta, h("div", { class: "rb-sk-bar" }, btn("저장", { kind: "primary", onClick: save }), btn("파일 삭제", { kind: "danger", onClick: delFile }))) : h("p", { class: "rb-muted" }, "파일이 없어요.")));
  }

  // 코코아전트에서 옮겨오기: 같은 저장소에 남은 라이브러리·파이프라인 프리셋을 읽기만 한다.
  function drawCocoa(found) {
    const box = (checked, label, text) => { const c = h("input", { type: "checkbox", checked }); return { c, el: h("label", { class: "rb-check" }, c, h("span", null, label, text ? h("small", { class: "rb-muted" }, ` ${text}`) : null)) }; };
    if (!found) {
      return replace(cocoaH, h("section", { class: "rb-card bordered pad rb-sk-card" }, h("b", null, "코코아전트에서 옮겨오기"),
        h("p", { class: "rb-muted" }, "같은 기기·브라우저에 코코아전트를 쓴 기록이 있으면 스킬 세트와 에이전트 설정을 읽어 와요. 코코아전트 데이터는 바꾸지 않아요."),
        btn("찾아보기", { onClick: () => run((async () => { replace(cocoaH, loading("찾는 중")); const raw = await S.readCocoaRaw(); const r = readCocoa(raw); drawCocoa(r.library.sets.length || r.agents.length ? r : { empty: true }); })()) })));
    }
    if (found.empty) return replace(cocoaH, h("section", { class: "rb-card bordered pad rb-sk-card" }, h("b", null, "코코아전트에서 옮겨오기"), note("info", "코코아전트 기록을 찾지 못했어요. 다른 기기에서 쓰셨다면 거기서 스킬을 ZIP/JSON으로 내보내 위의 '가져오기'로 넣어 주세요."), btn("다시 찾기", { onClick: () => drawCocoa(null) })));
    const sets = found.library.sets, active = found.agents.filter((a) => a.active), sug = suggestStageRefs(found.agents), hasSug = SKILL_STAGES.some((s) => sug[s].length);
    const bSets = box(sets.length > 0, `스킬 세트 ${sets.length}개 가져오기`, "이미 있는 이름은 건너뛰어요");
    const bAssign = box(hasSug, "에이전트에 붙였던 스킬을 단계에 연결", hasSug ? SKILL_STAGES.filter((s) => sug[s].length).map((s) => `${SKILL_STAGE_LABEL[s]}: ${sug[s].map((r) => r.name).join(", ")}`).join(" · ") : "연결할 것이 없어요");
    const conv = active.filter((a) => a.enabled && Object.keys(a.texts).length).map((a) => ({ a, b: box(false, `'${a.name}'의 프롬프트를 스킬로 변환`, `${Object.keys(a.texts).join(", ")} · 기본값이 섞여 있을 수 있어요`) }));
    const go = () => run((async () => {
      const lib = await S.getLibrary(), have = new Set(lib.sets.map((x) => x.name.toLowerCase())); let added = 0, skipped = 0;
      const add = async (set) => { if (have.has(set.name.toLowerCase())) { skipped++; return; } const r = await S.importSet(set, "new"); if (r.changed) { added++; have.add(set.name.toLowerCase()); } else if (r.error) throw new Error(r.error); };
      if (bSets.c.checked) for (const set of sets) await add(set);
      for (const { a, b } of conv) if (b.c.checked) { const set = agentToSkillSet(a); if (set) await add(set); }
      if (bAssign.c.checked) {
        const cfg = await S.getCfg(), stages = { ...cfg.stages }, cur = await S.getLibrary();
        for (const s of SKILL_STAGES) for (const r of sug[s]) { const hit = cur.sets.find((x) => x.id === r.id || x.name.toLowerCase() === r.name.toLowerCase()); if (hit && !stages[s].some((x) => x.id === hit.id)) stages[s] = [...stages[s], { id: hit.id, name: hit.name }]; }
        await S.saveCfg({ ...cfg, stages });
      }
      ctx.toast(`옮겼어요. 새 세트 ${added}개${skipped ? `, 이미 있어 건너뜀 ${skipped}개` : ""}. 스킬 주입은 위에서 직접 켜 주세요.`);
      await Promise.all([drawTop(), drawStages(), drawLib()]); drawCocoa(null);
    })());
    replace(cocoaH, h("section", { class: "rb-card bordered pad rb-sk-card" }, h("b", null, "코코아전트에서 옮겨오기"),
      h("p", { class: "rb-muted" }, `찾았어요: 스킬 세트 ${sets.length}개 · 에이전트 ${found.agents.length}개 (사용 중인 프리셋 ${active.length}개).`),
      bSets.el, bAssign.el, conv.length ? h("div", null, h("small", { class: "rb-muted" }, "에이전트 프롬프트(선택)"), conv.map((x) => x.b.el)) : null,
      h("div", { class: "rb-sk-bar" }, btn("옮기기", { kind: "primary", onClick: go }), btn("닫기", { onClick: () => drawCocoa(null) }))));
  }


  // 웹 검색·가져오기 도구: 기본 꺼짐. 켠 단계에서만 모델이 도구를 부를 수 있고, 부르면 AI 호출이 늘어난다.
  async function drawWeb() {
    const W = ctx.web; if (!W) return replace(webH);
    const c = await W.getCfg(), P = WEB_PROVIDERS[c.provider], save = (patch) => run(W.saveCfg({ ...c, ...patch }).then(drawWeb));
    gWeb.sub.textContent = c.on ? `켜짐 · ${P?.label ?? c.provider}` : "꺼짐 · 켜면 그 단계 호출이 1~2번 늘어요";
    const field = (label, key, type = "text", ph = "") => { const el = h("input", { class: "rb-input", type, placeholder: ph, "aria-label": label, autocomplete: "off" }); el.value = c[key] ?? ""; el.addEventListener("change", () => save({ [key]: el.value })); return h("label", { class: "rb-field" }, h("small", { class: "rb-muted" }, label), el); };
    const test = () => run((async () => {
      const q = (await promptDialog(ctx.win, { title: "시험 검색", label: "검색어", value: "서울", ok: "검색" }))?.trim(); if (!q) return;
      const list = await W.search(q); const box = h("textarea", { class: "rb-input", rows: 10, readOnly: true, style: "height:auto;width:100%" }); box.value = formatResults(list);
      modal(ctx.win, (close) => h("div", { class: "rb-card pad rb-sk-card" }, h("b", null, `'${q}' 결과 ${list.length}건`), box, btn("닫기", { onClick: close })));
    })());
    replace(webH, h("section", { class: "rb-card bordered pad rb-sk-card" }, h("b", null, "웹 도구 (검색·페이지 읽기)"),
      toggleRow("웹 도구 사용", "켠 단계에서 모델이 필요하다고 판단하면 검색·페이지 읽기를 요청해요. 요청이 있으면 그 단계의 AI 호출이 1~2번 늘어요.", c.on, (v) => save({ on: v })),
      h("div", { class: "rb-chips" }, WEB_STAGES.map((s) => chip(SKILL_STAGE_LABEL[s], { pressed: c.stages.includes(s), onClick: () => save({ stages: c.stages.includes(s) ? c.stages.filter((x) => x !== s) : [...c.stages, s] }) }))),
      h("div", { class: "rb-chips" }, Object.entries(WEB_PROVIDERS).map(([id, p]) => chip(p.label, { pressed: id === c.provider, onClick: () => save({ provider: id }) }))),
      P.needsKey ? field("API 키 (이 기기에만 저장돼요)", "key", "password") : null, P.needsUrl ? field("서버 주소", "baseUrl", "text", "https://…") : null, c.provider === "wikipedia" ? field("언어 코드", "lang", "text", "ko") : null,
      webReady(c) ? note("warn", webReady(c)) : note("info", "페이지 읽기는 http/https 공개 주소만 가능하고, 내부 주소·로그인 정보가 든 주소는 막아요."),
      h("div", { class: "rb-sk-bar" }, btn("시험 검색", { onClick: test, disabled: !!webReady(c) }))));
  }
  // 이번 접속 동안의 호출 기록: 스킬 글이 실제로 붙었는지, 도구가 쓰였는지 확인용(저장하지 않아요).
  function drawCalls() {
    const list = recentCalls(), t = (ms) => new Date(ms).toLocaleTimeString("ko-KR", { hour12: false });
    gCalls.sub.textContent = list.length ? `이번 접속 ${list.length}건` : "아직 없어요";
    replace(callsH, h("section", { class: "rb-card bordered pad rb-sk-card" }, h("div", { class: "rb-sk-bar" }, h("b", null, "최근 호출 기록"), h("span", { class: "rb-spacer" }), btn("새로고침", { size: "sm", onClick: drawCalls }), btn("비우기", { size: "sm", onClick: () => { clearCalls(); drawCalls(); } })),
      list.length ? h("ul", { class: "rb-mem-reclist" }, list.slice(0, 12).map((e) => h("li", null, h("div", { class: "txt" }, h("b", null, SKILL_STAGE_LABEL[e.stage] ?? e.stage), h("div", { class: "rb-muted" }, `${t(e.at)} · ${e.chars ? `스킬 글 ${e.chars}자 붙음` : "붙은 스킬 글 없음"}${e.tools?.length ? ` · 도구 ${e.tools.join(", ")}` : ""}`)))))
        : h("p", { class: "rb-muted" }, "아직 호출이 없어요. 대화를 진행하면 여기에 쌓여요.")));
  }
  await Promise.all([drawTop(), drawStages(), drawLib(), drawWeb()]);
  drawCocoa(null); drawCalls();
}
