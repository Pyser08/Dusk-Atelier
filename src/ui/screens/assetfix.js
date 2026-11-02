// v1.8.2 도구 탭 '에셋 태그 고치기' 창. 누를 때만 동작하고, 미리보기에서 고른 것만 저장된 채팅에 반영한다.
// 방식: 엔진이 못 고친 것만 보조모델에(그런 게 없으면 AI 호출 없음) / 상황까지 전부(고른 범위 태그 전체를 보조모델이 검토, 호출 1번)
import { h, replace } from "../dom.js";
import { btn, modal, note, segmented } from "../kit.js";
import { runAI } from "../../engine/runai.js";
import { loadPB } from "../../data/personabuilder.js";
import { getCfg as getModelCfg } from "../../data/modelhub.js";
import { scanReplies, aiItems, aiMessages, parseAiReply, changeRows, applyRows } from "../../engine/assetfix.js";
import { loadRange, applyFix, undoFix, lastUndo } from "../../data/assetfix.js";

const WHY = { case: "대소문자·띄어쓰기", fuzzy: "비슷한 이름으로", merged: "합친 태그 → 하나", default: "없는 키워드 → 기본 그림", template: "지침 원문 복사", unknown: "없는 캐릭터", exact: "" };
const LS_KEY = "dusk.assetfix.ui.v1";

export async function openAssetFix(ctx, deps = {}) {
  const run = deps.runAI ?? runAI;
  const ais = await loadPB(ctx.api).then((d) => ({ ais: d.ais, ai: d.ai })).catch(() => ({ ais: [{ id: "default", name: "기본", mode: "submodel" }], ai: "default" }));
  const apis = await getModelCfg(ctx.api).then((c) => c.presets ?? []).catch(() => []);
  let ui = { n: 10, mode: "unresolved", instr: "" };
  try { ui = { ...ui, ...JSON.parse(await ctx.api.pluginStorage.getItem(LS_KEY) || "{}") }; } catch { /* 기본값 */ }
  const saveUi = () => ctx.api.pluginStorage.setItem(LS_KEY, JSON.stringify(ui)).catch(() => {});

  return modal(ctx.win, (done) => {
    let ctrl = null;
    const body = h("div", { style: "display:flex;flex-direction:column;gap:10px" });
    const optsAll = [{ v: "main", label: "리스 메인 모델", pick: { mode: "model" } }, ...ais.ais.map((a) => ({ v: `pb:${a.id}`, label: a.id === "default" ? "리스 보조 모델 (기본)" : a.name, pick: a })), ...apis.map((p) => ({ v: `api:${p.id}`, label: `내 API · ${p.name}`, pick: { mode: "custom", presetId: p.id } }))];
    const sel = h("select", { class: "rb-input", "aria-label": "AI 모델", style: "max-width:260px" }, ...optsAll.map((o) => h("option", { value: o.v, selected: o.v === `pb:${ais.ai}` }, o.label)));
    const pick = () => (optsAll.find((o) => o.v === sel.value) ?? optsAll[0]).pick;
    const close = () => { ctrl?.abort(); done(null); };
    const fail = (e) => replace(body, note("err", e?.message ?? String(e)), h("div", { class: "btns" }, btn("처음으로", { onClick: start }), btn("닫기", { onClick: close })));

    async function start() {
      const nIn = h("input", { class: "rb-input", type: "number", min: 1, max: 50, value: ui.n, "aria-label": "고칠 응답 수", style: "width:80px", onInput: (e) => { ui.n = Math.max(1, Math.min(50, Number(e.target.value) || 1)); } });
      const instr = h("input", { class: "rb-input", value: ui.instr, placeholder: "예) NSFW 태그는 real 형태만 있어요 (선택)", "aria-label": "봇 규칙", onInput: (e) => { ui.instr = e.target.value; } });
      const modeSeg = segmented([["unresolved", "엔진이 못 고친 것만"], ["all", "상황까지 전부"]], ui.mode, (v) => { ui.mode = v; replace(modeNote, modeText()); }, "고치는 방식");
      const modeText = () => ui.mode === "all" ? "고른 응답의 태그를 보조모델이 모두 보고 상황에 안 맞는 것만 바꾸자고 해요. 누를 때마다 AI를 한 번 불러요." : "이름이 틀린 태그는 엔진이 고치고, 엔진이 못 고친 것(없는 키워드·못 알아본 태그·3번 연속 같은 태그)만 보조모델에 물어요. 그런 게 없으면 AI를 부르지 않아요.";
      const modeNote = h("small", { class: "rb-muted" }, modeText());
      const undo = await lastUndo(ctx.api);
      replace(body,
        h("p", { class: "rb-p" }, "지금 열린 채팅의 이미지 태그를 검사해요. 이 단계에서는 아무것도 바뀌지 않고, 미리보기에서 고른 것만 적용돼요."),
        h("label", { class: "rb-mem-field row" }, h("span", null, "최근 응답"), nIn, h("span", { class: "rb-muted" }, "개 (1~50)")),
        h("div", { style: "display:flex;flex-direction:column;gap:4px" }, modeSeg, modeNote),
        h("label", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:4px" }, h("span", null, "AI 모델"), sel),
        h("label", { class: "rb-mem-field", style: "flex-direction:column;align-items:stretch;gap:4px" }, h("span", null, "봇 규칙 (선택)"), instr, h("small", { class: "rb-muted" }, "지침에 있는 특별한 규칙을 적어 주면 AI가 참고해요.")),
        h("div", { class: "btns" },
          undo ? btn("마지막 적용 되돌리기", { onClick: () => doUndo() }) : null,
          btn("닫기", { onClick: close }),
          btn("검사 시작", { kind: "primary", id: "rb-af-start", onClick: () => { saveUi(); scan(); } })));
    }

    async function scan() {
      ctrl = new AbortController();
      replace(body, h("p", { class: "rb-p" }, "태그를 검사하는 중…"), h("div", { class: "btns" }, btn("취소", { onClick: () => { ctrl.abort(); start(); } })));
      try {
        const idx = await ctx.imgFix?.assetIndex?.();
        if (!idx?.size) throw new Error("이 봇(과 연결된 모듈)에 에셋이 없어서 고칠 수 없어요.");
        const range = await loadRange(ctx.api, ui.n);
        if (!range.picks.length) throw new Error("고칠 AI 응답이 없어요.");
        const sc = scanReplies(range.picks, idx, { before: range.before });
        const req = aiItems(sc, idx, { mode: ui.mode });
        let ai = [], notes = [];
        if (req.items.length) {
          replace(body, h("p", { class: "rb-p" }, `AI가 태그 ${req.items.length}개를 보는 중…`), h("div", { class: "btns" }, btn("취소", { onClick: () => { ctrl.abort(); start(); } })));
          try {
            const raw = await run(ctx.api, aiMessages(req, { instruction: ui.instr }), pick(), ctrl.signal);
            ai = parseAiReply(raw, req); notes = ai.notes ?? [];
          } catch (e) {
            if (ctrl.signal.aborted) return;
            notes.push(`AI 검토 실패 — 엔진이 고친 것만 보여요: ${e?.message ?? e}`);
          }
        }
        if (req.skipped) notes.push(`태그가 많아서 최근 ${req.items.length}개만 AI가 봤어요.`);
        preview(range, sc, changeRows(sc, ai), notes, req.items.length);
      } catch (e) { if (!ctrl.signal.aborted) fail(e); }
    }

    function preview(range, sc, rows, notes, asked) {
      if (!rows.length) {
        replace(body, note("info", asked ? "AI가 보기에도 바꿀 태그가 없어요." : "고칠 태그가 없어요."), ...notes.map((t) => note("warn", t)), h("div", { class: "btns" }, btn("처음으로", { onClick: start }), btn("닫기", { onClick: close })));
        return;
      }
      const checks = new Map();
      const list = h("div", { class: "rb-card", style: "max-height:46vh;overflow:auto" }, ...rows.map((r) => {
        const cb = h("input", { type: "checkbox", checked: true, "aria-label": `${r.from} 바꾸기` });
        checks.set(r.id, cb);
        const pos = range.picks.findIndex((p) => p.key === r.key);
        return h("label", { class: "rb-row", style: "display:flex;gap:8px;align-items:flex-start;padding:8px 10px" }, cb,
          h("span", { style: "display:flex;flex-direction:column;gap:2px;min-width:0" },
            h("small", { class: "rb-muted" }, `응답 ${pos + 1}/${range.picks.length} · ${r.by === "ai" ? "AI" : "엔진"}${r.why ? ` · ${WHY[r.why] ?? r.why}` : ""}`),
            h("code", { style: "word-break:break-all" }, r.from),
            h("code", { style: "word-break:break-all" }, "→ ", r.to ?? "(지움)")));
      }));
      replace(body,
        h("p", { class: "rb-p" }, `바꿀 태그 ${rows.length}개 (AI ${rows.filter((r) => r.by === "ai").length} · 엔진 ${rows.filter((r) => r.by === "engine").length}). 고른 것만 저장된 채팅에 반영돼요.`),
        ...notes.map((t) => note("warn", t)),
        list,
        h("div", { class: "btns" },
          btn("처음으로", { onClick: start }),
          btn("적용", { kind: "primary", id: "rb-af-apply", onClick: async () => {
            const ids = rows.filter((r) => checks.get(r.id)?.checked).map((r) => r.id);
            if (!ids.length) { ctx.toast("고른 태그가 없어요", { error: true }); return; }
            try {
              const res = await applyFix(ctx.api, ctx.memory?.store, range, applyRows(sc, rows, ids));
              ctx.toast(`응답 ${res.changed}개의 태그를 고쳤어요${res.skipped ? ` · 그새 바뀐 응답 ${res.skipped}개는 건너뜀` : ""}`, { action: res.changed ? { label: "되돌리기", onClick: () => doUndo(true) } : undefined, seconds: 8 });
              done(true);
            } catch (e) { fail(e); }
          } })));
    }

    async function doUndo(fromToast = false) {
      try {
        const r = await undoFix(ctx.api, ctx.memory?.store);
        ctx.toast(`되돌렸어요 (응답 ${r.restored}개${r.skipped ? ` · 그 뒤에 바뀐 ${r.skipped}개는 그대로` : ""})`);
        if (!fromToast) start();
      } catch (e) { ctx.toast(e?.message ?? String(e), { error: true }); }
    }

    start();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "에셋 태그 고치기", style: "max-width:620px" },
      h("h3", { class: "rb-h3" }, "에셋 태그 고치기"), body);
  });
}
