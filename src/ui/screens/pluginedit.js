// 플러그인 코드 수정 창 (1.8.3) — 플러그인 탭의 ··· 메뉴 → '코드 수정'.
// 리스는 플러그인이 다른 플러그인을 고치지 못하게 막아서, 서버(Dusk Cellar)가 리스 설정 파일의 그 플러그인 코드만 대신 고친다.
// 단계: 코드 편집 → 변경 확인(바뀐 줄 미리 보기 + 백업 선택) → 적용 → 결과(되돌리기). 리스를 새로고침해야 새 코드가 돈다.
// 허락은 이 창의 확인이 대신한다(리스 암호를 다시 묻지 않는다 — 사용자 결정 2026-11-03).
import { fmtBytes, h, replace } from "../dom.js";
import { btn, confirmDialog, modal, note } from "../kit.js";
import { codeEditor } from "../codeedit.js";
import { createCellarPlugins, describeEditError, headerProblem, lineDiff } from "../../data/cellarplugins.js";
import { createCellarBackups } from "../../data/cellarbackup.js";

var BIG = 6e5;   // 이보다 큰 코드는 색 입히기 없이 보여 준다. 색 편집기는 글자를 칠 때마다 전체를 다시 칠해서 1MB에 4초, 2.3MB에 6초 멈춘다(측정)
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var MONO = 'ui-monospace,"Cascadia Code","D2Coding",Menlo,Consolas,monospace';
var ROW = { "+": "background:rgba(46,160,67,.18)", "-": "background:rgba(248,81,73,.18)", " ": "", "…": "color:var(--rb-sub);text-align:center" };

// st: Cellar 상태(probeCellar 결과: url·via·features). p: 플러그인 목록의 한 줄(data/plugins.js listPlugins)
export async function openPluginEdit(ctx, p, st) {
  const conn = { url: st.url, via: st.via };
  const cp = createCellarPlugins(ctx.api, conn);
  const canBackup = Array.isArray(st.features) && st.features.includes("backup");
  const idx = p.dup ? p.order : void 0;   // 이름이 겹칠 때만 순서로 고른다(서버가 그 자리의 이름을 확인한다)
  let closed = false;
  await modal(ctx.win, (done) => {
    const body = h("div", { id: "rb-pe-body", style: "display:flex;flex-direction:column;gap:10px" });
    let orig = "", sha = "", cur = "", useBackup = false, last = null;
    const show = (...kids) => replace(body, ...kids);
    const closeBtn = (label = "닫기", kind = "") => btn(label, { kind, id: "rb-pe-close", onClick: () => done(true) });
    const actions = (...kids) => h("div", { class: "btns" }, ...kids);

    async function loadCode() {
      show(h("p", { class: "rb-muted", id: "rb-pe-st" }, "코드를 불러오는 중…"));
      try {
        const g = await cp.get(p.name, idx);
        orig = g.script; sha = g.sha256; cur = orig;
        viewEdit();
      } catch (e) { viewError(describeEditError(e), { retry: loadCode }); }
    }

    // ── 1. 편집 ──
    function viewEdit(problem = "") {
      const big = orig.length > BIG;
      const next = btn("변경 확인", { kind: "primary", id: "rb-pe-next", disabled: cur === orig, onClick: viewConfirm });
      const sync = (v) => { cur = v; next.disabled = v === orig; };
      let editor;
      if (big) {
        // 큰 코드: 색 없이 일반 입력칸 + 줄 번호만(줄 번호는 글자 하나 칠 때 줄 수가 바뀔 때만 다시 만든다)
        const FONT = `font:12.5px/1.6 ${MONO}`;
        const ta = h("textarea", { class: "rb-input", spellcheck: "false", wrap: "off", "aria-label": "플러그인 코드", style: `flex:1;min-width:0;box-sizing:border-box;min-height:300px;max-height:46vh;${FONT};white-space:pre;overflow:auto;padding:8px 10px;border-radius:0 8px 8px 0` });
        const gut = h("pre", { "aria-hidden": "true", id: "rb-pe-gutter", style: `margin:0;padding:8px 8px 24px 10px;${FONT};text-align:right;color:var(--rb-sub);background:var(--rb-bg2,rgba(127,127,127,.08));overflow:hidden;user-select:none;border-radius:8px 0 0 8px;min-width:4ch;box-sizing:border-box;max-height:46vh` });
        let lines = 0;
        const num = (v) => { let n = 1; for (let i = v.indexOf("\n"); i !== -1; i = v.indexOf("\n", i + 1)) n++; if (n === lines) return; lines = n; const a = new Array(n); for (let i = 0; i < n; i++) a[i] = i + 1; gut.textContent = a.join("\n"); };
        ta.value = cur; num(cur);
        ta.addEventListener("input", () => { sync(ta.value); num(ta.value); gut.scrollTop = ta.scrollTop; });
        ta.addEventListener("scroll", () => { gut.scrollTop = ta.scrollTop; });
        editor = h("div", { id: "rb-pe-editor", style: "display:flex;align-items:stretch" }, gut, ta);
      } else {
        editor = h("div", { id: "rb-pe-editor" }, codeEditor(cur, { onChange: sync, label: "플러그인 코드", minHeight: "300px", maxHeight: "46vh", lang: "js" }).el);
      }
      show(
        h("p", { class: "rb-muted" }, [p.name, p.version && `v${p.version}`, fmtBytes(orig.length)].filter(Boolean).join(" · ")),
        h("p", { class: "rb-p" }, "코드를 고치면 리스 설정 파일(settings/app.json)에 있는 이 플러그인의 코드만 바뀌어요. 다른 플러그인과 설정은 그대로예요. 맨 위의 머리말(//@name 등)은 그대로 두세요."),
        p.self ? note("warn", "지금 이 플러그인(Dusk Atelier) 자신을 고치고 있어요. 잘못 고치면 Atelier가 열리지 않을 수 있어요. 고치기 전에 설정 파일이 서버에 복사되니, 문제가 생기면 그 복사본으로 되돌릴 수 있어요.") : null,
        big ? note("info", `코드가 커서(${fmtBytes(orig.length)}) 색 표시 없이 줄 번호만 보여 줘요.`) : null,
        problem ? note("err", problem) : null,
        editor,
        actions(next, closeBtn())
      );
    }

    // ── 2. 변경 확인 ──
    function viewConfirm() {
      const problem = headerProblem(cur, p.name);
      if (problem) return viewEdit(problem);
      const d = lineDiff(orig, cur);
      if (d.same) return viewEdit("바뀐 내용이 없어요.");
      const diffBox = h("div", { id: "rb-pe-diff", style: `max-height:36vh;overflow:auto;border:1px solid var(--rb-line);border-radius:10px;font:12px/1.55 ${MONO}` },
        d.rows.map((r) => h("div", { style: `white-space:pre;padding:0 10px;display:flex;gap:10px;${ROW[r.t] ?? ""}` },
          r.t === "…" ? h("span", { style: "flex:1" }, `⋯ 바뀌지 않은 ${r.s}줄`) : [
            h("span", { style: "color:var(--rb-sub);min-width:4ch;text-align:right;user-select:none" }, String(r.n)),
            h("span", { style: "user-select:none" }, r.t),
            h("span", null, r.s || " ")
          ])));
      const box = h("input", { type: "checkbox", id: "rb-pe-backup", checked: useBackup, onChange: (e) => { useBackup = e.target.checked; } });
      show(
        h("p", { class: "rb-p", id: "rb-pe-sum" }, `바뀐 줄: +${d.added.toLocaleString()} −${d.removed.toLocaleString()}${d.truncated ? ` (앞쪽 ${d.rows.length}줄만 보여요)` : ""}`),
        diffBox,
        canBackup
          ? h("label", { class: "rb-p", style: "display:flex;gap:8px;align-items:flex-start" }, box, h("span", null, "고치기 전에 세이브 전체도 백업해요. 파일이 많으면 처음에 아주 오래 걸리고, 최근 5개만 보관해서 오래된 백업이 밀려나요. 설정 파일은 이 체크와 상관없이 항상 복사해 둬요."))
          : note("info", "이 서버는 세이브 백업을 지원하지 않아서 설정 파일만 복사해 둬요."),
        h("ul", { class: "rb-muted", style: "margin:0;padding-left:18px;line-height:1.7" },
          h("li", null, "고치기 전에 설정 파일을 서버에 복사해 둬요(최근 20개)."),
          h("li", null, "고친 뒤 리스를 새로고침해야 새 코드로 돌아요.")),
        actions(btn("뒤로", { id: "rb-pe-back", onClick: () => viewEdit() }), btn("고치기", { kind: "primary", id: "rb-pe-apply", onClick: doApply }))
      );
    }

    // ── 3. 적용 ──
    async function runBackup(setSt) {
      const bk = createCellarBackups(ctx.api, conn);
      try { await bk.create("플러그인 수정 전"); } catch (e) { if (!/이미 백업 중/.test(String(e?.message))) throw e; }   // 이미 도는 백업이 있으면 그걸 기다린다
      for (;;) {
        const { job } = await bk.list();
        if (!job || job.finishedAt) {
          if (job?.error) throw new Error(`세이브 백업에 실패했어요 · ${job.error}. 백업 없이 고치려면 '뒤로'에서 백업 체크를 끄세요.`);
          return;
        }
        setSt(`세이브 백업 중… ${job.done.toLocaleString()} / ${job.total.toLocaleString()}개`);
        await sleep(1000);
        if (closed) throw new Error("창을 닫아서 멈췄어요");
      }
    }
    async function doApply() {
      show(h("p", { class: "rb-p", id: "rb-pe-st" }, "준비 중…"));
      const setSt = (t) => { const el = body.querySelector("#rb-pe-st"); if (el) el.textContent = t; };
      try {
        let backedUp = false;
        if (canBackup && useBackup) { setSt("세이브 백업 중… (처음에는 오래 걸릴 수 있어요)"); await runBackup(setSt); backedUp = true; }
        if (closed) return;
        setSt("플러그인 코드를 고치는 중…");
        const r = await cp.apply([{ name: p.name, ...(idx === void 0 ? {} : { index: idx }), expectSha: sha, script: cur }]);
        last = { r, backedUp };
        viewDone(r, backedUp, false);
      } catch (e) { viewError(describeEditError(e), { back: viewConfirm }); }
    }

    // ── 4. 결과 ──
    function viewDone(r, backedUp, undone) {
      const res = r.results?.[0];
      const unsure = !r.adopted || r.stillPending;
      show(
        h("p", { class: "rb-p", id: "rb-pe-result", style: "font-weight:600" }, `${undone ? "이전 코드로 되돌렸어요" : "고쳤어요"} · ${p.displayName}`),
        res ? h("p", { class: "rb-muted" }, `코드 크기 ${fmtBytes(undone ? cur.length : orig.length)} → ${fmtBytes(res.bytes)}`) : null,
        h("p", { class: "rb-muted" }, `고치기 전 설정 파일 복사본: ${r.snapshot}${backedUp ? " · 세이브 백업도 해 뒀어요" : ""}`),
        unsure ? note("warn", "리스가 새 파일을 아직 받아들이지 않은 것 같아요. 리스 화면에 '외부 변경 검토' 창이 뜨면 받아들이기를 눌러 주세요.") : null,
        note("warn", "리스를 새로고침(F5 또는 앱 다시 시작)하면 새 코드로 돌아요. 열어 둔 다른 화면(다른 기기 포함)도 모두 새로고침해 주세요."),
        actions(undone ? null : btn("되돌리기", { id: "rb-pe-undo", onClick: undo }), closeBtn("닫기", "primary"))
      );
    }
    async function undo() {
      const ok = await confirmDialog(ctx.win, { title: "이전 코드로 되돌릴까요?", body: "방금 고친 코드를 처음 불러왔던 코드로 되돌려요. 리스를 새로고침해야 적용돼요.", ok: "되돌리기" });
      if (!ok || !last) return;
      show(h("p", { class: "rb-p", id: "rb-pe-st" }, "되돌리는 중…"));
      try {
        const r = await cp.apply([{ name: p.name, ...(idx === void 0 ? {} : { index: idx }), expectSha: last.r.results[0].newSha, script: orig }]);
        viewDone(r, false, true);
      } catch (e) { viewError(describeEditError(e), { back: () => viewDone(last.r, last.backedUp, false) }); }
    }

    // ── 오류 ──
    function viewError(d, { retry, back } = {}) {
      const soft = d.kind === "written" || d.kind === "pending";
      show(
        note(soft ? "warn" : "err", d.text),
        d.written ? h("p", { class: "rb-p" }, `파일은 이미 고쳐졌어요. 리스 화면에 '외부 변경 검토' 창이 뜨면 받아들이기를 눌러 주세요. 고치기 전 설정 파일 복사본: ${d.snapshot}`) : null,
        actions(
          d.kind === "conflict" ? btn("코드 다시 불러오기", { kind: "primary", id: "rb-pe-reload", onClick: loadCode }) : null,
          !d.written && d.kind !== "conflict" && (back || retry) ? btn(back ? "뒤로" : "다시 시도", { id: "rb-pe-retry", onClick: back ?? retry }) : null,
          closeBtn()
        )
      );
    }

    loadCode();
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": `${p.displayName} 코드 수정`, style: "width:min(820px,94vw);max-width:min(820px,94vw);max-height:92vh;overflow:auto" },
      h("h3", null, `코드 수정 · ${p.displayName}`),
      body);
  });
  closed = true;
}
