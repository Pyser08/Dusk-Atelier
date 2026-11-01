// 기억 탭 → 스킬 (v1.8.1). 코코아전트 호환 스킬 세트를 가져와 정리 노트·기록하기·기억 분석 프롬프트 뒤에 붙인다. 추가 AI 호출 없음.
// 화면: 켜기 토글 · 단계별 세트 고르기 · 세트 목록/편집 · 코코아전트에서 옮겨오기. 일부만 다시 그린다(부분 갱신).
import { h, replace } from "../../dom.js";
import { btn, chip, note, pageHead, toggleRow, emptyState, confirmDialog, promptDialog, loading, modal } from "../../kit.js";
import { mem, fail } from "./common.js";
import { SKILL_STAGES, SKILL_STAGE_LABEL } from "../../../engine/skillcfg.js";
import { buildSkillIndex, diagnoseSkillSet, normalizeSkillSet, SKILL_MD, SKILL_LIMITS } from "../../../engine/skills.js";
import { readCocoa, suggestStageRefs, agentToSkillSet } from "../../../engine/cocoamigrate.js";

const TEMPLATE = (name) => `---\nname: ${name}\ndescription: 언제 쓰는 스킬인지 한 줄로 적어요\nskill_format: 2\ninject_order: 100\nsystem_prompt: |\n  여기에 프롬프트 뒤에 붙일 지침을 적어요.\n---\n# ${name}\n스킬 설명(주입되지 않는 본문)\n`;
const stageHint = { router: "관련 인물을 고르는 호출", director: "정리 노트를 만드는 호출", writer: "기록을 쓰는 호출", analysis: "Dusk 기억 분석 호출" };

function saveBlob(ctx, name, data, type) {
  const w = ctx.win, url = w.URL.createObjectURL(new w.Blob([data], { type }));
  const a = h("a", { href: url, download: name }); a.click(); setTimeout(() => w.URL.revokeObjectURL(url), 4000);
}
const pickFile = (ctx, accept, onFile) => { const inp = h("input", { type: "file", accept }); inp.addEventListener("change", () => { const f = inp.files?.[0]; if (f) onFile(f); }); inp.click(); };

export async function renderMemorySkills(ctx, host, { redraw }) {
  const S = ctx.skills, m = mem(ctx), st = m.skills ??= { open: "", file: "" };
  const back = { onClick: () => { m.page = "home"; redraw(); }, label: "기억으로" };
  if (!S) return replace(host, pageHead("스킬", { back }), emptyState({ icon: "info", title: "스킬 기능이 아직 준비되지 않았어요", text: "플러그인을 다시 불러와 주세요." }));
  const topH = h("div"), stagesH = h("div"), libH = h("div"), cocoaH = h("div");
  replace(host, pageHead("스킬", { sub: "코코아전트 스킬과 호환돼요", back }), topH, stagesH, libH, cocoaH);
  const run = (p) => p.catch(fail(ctx));

  async function drawTop() {
    const cfg = await S.getCfg();
    replace(topH, h("section", { class: "rb-card" },
      toggleRow("스킬 주입", "켜면 아래에서 고른 단계의 프롬프트 뒤에 스킬 지침이 붙어요. 장기기억·코코아전트와 따로 켜고 꺼도 돼요.", cfg.on, (v) => run(S.saveCfg({ ...cfg, on: v }).then(() => { ctx.toast(v ? "스킬 주입을 켰어요." : "스킬 주입을 껐어요."); return drawStages(); }))),
      note("info", "별도 AI 호출은 만들지 않아요. 이미 하는 호출의 글만 늘어나서 토큰은 그만큼 더 써요.")));
  }
  async function drawStages() {
    const [cfg, lib] = [await S.getCfg(), await S.getLibrary()];
    const setRef = (stage, set, on) => run((async () => {
      const refs = cfg.stages[stage].filter((r) => r.id !== set.id && r.name.toLowerCase() !== set.name.toLowerCase());
      if (on) refs.push({ id: set.id, name: set.name });
      await S.saveCfg({ ...cfg, stages: { ...cfg.stages, [stage]: refs } }); await drawStages();
    })());
    const has = (stage, set) => cfg.stages[stage].some((r) => r.id === set.id || r.name.toLowerCase() === set.name.toLowerCase());
    replace(stagesH, h("section", { class: "rb-card" }, h("b", null, "어느 호출에 붙일까요"),
      lib.sets.length ? SKILL_STAGES.map((stage) => h("div", { class: "rb-field" }, h("div", null, h("b", null, SKILL_STAGE_LABEL[stage]), h("small", { class: "rb-muted" }, ` ${stageHint[stage]}`)),
        h("div", { class: "rb-chips" }, lib.sets.map((set) => chip(set.name, { pressed: has(stage, set), onClick: () => setRef(stage, set, !has(stage, set)) })))))
        : h("p", { class: "rb-muted" }, "세트를 가져오면 여기서 고를 수 있어요."),
      cfg.on ? null : note("warn", "스킬 주입이 꺼져 있어서 지금은 아무것도 붙지 않아요.")));
  }

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
    replace(libH, h("section", { class: "rb-card" },
      h("div", { class: "rb-row" }, h("b", null, `스킬 세트 ${lib.sets.length}개`), h("span", { class: "rb-spacer" }), btn("가져오기", { size: "sm", kind: "primary", icon: "upload", onClick: imp }), btn("새 세트", { size: "sm", onClick: newSet }), lib.sets.length ? btn("전체 내보내기", { size: "sm", onClick: () => run(exp()) }) : null),
      lib.sets.length ? h("ul", { class: "rb-mem-reclist" }, lib.sets.map((set) => {
        const n = buildSkillIndex([set]).length;
        return h("li", null, h("div", { class: "txt" }, h("b", null, set.name), h("div", { class: "rb-muted" }, `스킬 ${n}개 · 파일 ${set.files.length}개`)),
          btn("열기", { size: "sm", onClick: () => { st.open = set.id; st.file = ""; run(drawLib()); } }),
          btn("삭제", { size: "sm", kind: "danger", onClick: () => run((async () => { if (!await confirmDialog(ctx.win, { title: `'${set.name}' 삭제`, body: "세트 안의 파일이 모두 지워져요.", ok: "삭제", cancel: "취소", danger: true })) return; await S.saveLibrary({ ...lib, sets: lib.sets.filter((x) => x.id !== set.id) }); await Promise.all([drawLib(), drawStages()]); })()) }));
      })) : emptyState({ icon: "info", title: "아직 스킬 세트가 없어요", text: "ZIP/JSON을 가져오거나 코코아전트에서 옮겨 올 수 있어요." })));
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
      modal(ctx.win, (close) => h("div", { class: "rb-card" }, h("b", null, "모델이 받는 추가 글"), box, btn("닫기", { onClick: close })));
    })());
    replace(libH, h("section", { class: "rb-card" },
      h("div", { class: "rb-row" }, btn("← 목록", { size: "sm", onClick: () => { st.open = ""; run(drawLib()); } }), h("b", null, set.name), h("span", { class: "rb-spacer" }),
        btn("ZIP 내보내기", { size: "sm", onClick: () => saveBlob(ctx, `${set.name}.zip`, S.zipOfSet(set), "application/zip") }), btn("JSON 내보내기", { size: "sm", onClick: () => saveBlob(ctx, `${set.name}.json`, S.exportSet(set), "application/json") }), btn("주입 미리보기", { size: "sm", onClick: prev })),
      diag.length ? h("ul", { class: "rb-muted" }, diag.map((d) => h("li", null, `${d.level === "warn" ? "⚠ " : ""}${d.text}`))) : note("ok", "진단: 문제 없어요."),
      h("div", { class: "rb-chips" }, set.files.map((f) => chip(f.path, { pressed: f === file, onClick: () => { st.file = f.path; run(drawLib()); } })), btn("+ 파일", { size: "sm", onClick: addFile })),
      file ? h("div", null, ta, h("div", { class: "rb-row" }, btn("저장", { kind: "primary", onClick: save }), btn("파일 삭제", { kind: "danger", onClick: delFile }))) : h("p", { class: "rb-muted" }, "파일이 없어요.")));
  }

  // 코코아전트에서 옮겨오기: 같은 저장소에 남은 라이브러리·파이프라인 프리셋을 읽기만 한다.
  function drawCocoa(found) {
    const box = (checked, label, text) => { const c = h("input", { type: "checkbox", checked }); return { c, el: h("label", { class: "rb-check" }, c, h("span", null, label, text ? h("small", { class: "rb-muted" }, ` ${text}`) : null)) }; };
    if (!found) {
      return replace(cocoaH, h("section", { class: "rb-card" }, h("b", null, "코코아전트에서 옮겨오기"),
        h("p", { class: "rb-muted" }, "같은 기기·브라우저에 코코아전트를 쓴 기록이 있으면 스킬 세트와 에이전트 설정을 읽어 와요. 코코아전트 데이터는 바꾸지 않아요."),
        btn("찾아보기", { onClick: () => run((async () => { replace(cocoaH, loading("찾는 중")); const raw = await S.readCocoaRaw(); const r = readCocoa(raw); drawCocoa(r.library.sets.length || r.agents.length ? r : { empty: true }); })()) })));
    }
    if (found.empty) return replace(cocoaH, h("section", { class: "rb-card" }, h("b", null, "코코아전트에서 옮겨오기"), note("info", "코코아전트 기록을 찾지 못했어요. 다른 기기에서 쓰셨다면 거기서 스킬을 ZIP/JSON으로 내보내 위의 '가져오기'로 넣어 주세요."), btn("다시 찾기", { onClick: () => drawCocoa(null) })));
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
    replace(cocoaH, h("section", { class: "rb-card" }, h("b", null, "코코아전트에서 옮겨오기"),
      h("p", { class: "rb-muted" }, `찾았어요: 스킬 세트 ${sets.length}개 · 에이전트 ${found.agents.length}개 (사용 중인 프리셋 ${active.length}개).`),
      bSets.el, bAssign.el, conv.length ? h("div", null, h("small", { class: "rb-muted" }, "에이전트 프롬프트(선택)"), conv.map((x) => x.b.el)) : null,
      h("div", { class: "rb-row" }, btn("옮기기", { kind: "primary", onClick: go }), btn("닫기", { onClick: () => drawCocoa(null) }))));
  }

  await Promise.all([drawTop(), drawStages(), drawLib()]);
  drawCocoa(null);
}
