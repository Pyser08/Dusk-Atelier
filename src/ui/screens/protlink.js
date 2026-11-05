// 관리 → ProtLink+ (v1.9.2): Proton Drive 링크를 캐릭터·모듈·플러그인에 연결해 두고, 새 파일이 올라오면 알려 주고 받아서 Dusk 업데이트로 넘긴다.
import { fmtBytes, guessKind, KIND_LABEL, KINDS, fitFiles, rankTargets } from "../../engine/protlink.js";
import { h, replace } from "../dom.js";
import { icon } from "../icons.js";
import { btn, confirmDialog, emptyState, iconBtn, modal, openMenu, pageHead, promptDialog, segmented, statusCard, toggleRow } from "../kit.js";

const ago = (t) => {
  const d = Date.now() - t;
  if (!t || d < 0) return "";
  if (d < 60e3) return "방금";
  if (d < 3600e3) return `${Math.round(d / 60e3)}분 전`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}시간 전`;
  return `${Math.round(d / 86400e3)}일 전`;
};
const KIND_OPTS = KINDS.map((k) => [k, KIND_LABEL[k]]);

// ── 링크 추가 창: 주소 → 파일 확인 → 어디에 연결할지 고르기
export function addLinkDialog(ctx, pl) {
  const ac = new AbortController();
  return modal(ctx.win, (done) => {
    const box = h("div", { class: "rb-dialog rb-pl-add", role: "dialog", "aria-modal": "true", "aria-label": "링크 추가", style: "max-width:560px;width:100%;display:grid;gap:12px" });
    const st = { url: "", password: "", info: null, kind: "character", q: "", pick: null, name: "", targets: [], busy: false, msg: "" };
    const cancel = () => { ac.abort(); done(null); };
    function step1() {
      const url = h("input", { class: "rb-input", id: "rb-pl-url", placeholder: "https://drive.proton.me/urls/…#…", value: st.url, "aria-label": "Proton Drive 공유 링크", "data-autofocus": "1" });
      const pw = h("input", { class: "rb-input", id: "rb-pl-pw", type: "password", placeholder: "비밀번호 (걸려 있을 때만)", value: st.password, "aria-label": "링크 비밀번호" });
      const msg = h("p", { class: "rb-muted", id: "rb-pl-msg", style: "margin:0;white-space:normal" }, st.msg);
      const go = btn(st.busy ? "확인하는 중…" : "링크 열기", { kind: "primary", id: "rb-pl-open", disabled: st.busy, onClick: async () => {
        st.url = url.value.trim(); st.password = pw.value;
        if (!st.url) { msg.textContent = "링크를 붙여 넣어 주세요."; return; }
        st.busy = true; st.msg = "링크 안을 확인하고 있어요…"; step1();
        try {
          const r = await pl.inspect(st.url, st.password, ac.signal);
          st.busy = false;
          if (r.status === "password") { st.msg = "이 링크는 비밀번호가 필요해요. 위 칸에 적어 주세요."; return step1(); }
          if (r.status === "wrongPassword") { st.msg = "비밀번호가 맞지 않아요."; return step1(); }
          st.info = r; st.name = r.rootName || ""; st.kind = guessKind(r.files) ?? "character"; st.msg = "";
          await loadTargets(); step2();
        } catch (e) { st.busy = false; if (ac.signal.aborted) return; st.msg = e?.message ?? String(e); step1(); }
      } });
      replace(box, h("h3", { class: "rb-h3" }, "링크 추가"), h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, "Proton Drive 공유 링크를 붙여 넣으면 안에 든 파일을 확인하고, 어느 캐릭터·모듈·플러그인에 연결할지 물어봐요."), url, pw, msg,
        h("div", { class: "btns" }, btn("취소", { onClick: cancel }), go));
      url.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) go.click(); });
    }
    async function loadTargets() { try { st.targets = rankTargets([st.info.rootName, ...st.info.files.map((f) => f.name)], await pl.targets(st.kind)); } catch { st.targets = []; } st.pick = st.targets[0]?.score >= 70 ? st.targets[0].id : null; }
    function step2() {
      const rel = fitFiles(st.info.files, st.kind);
      const q = st.q.trim().toLowerCase();
      const list = st.targets.filter((t) => !q || t.name.toLowerCase().includes(q)).slice(0, 40);
      const rows = list.map((t) => h("button", { type: "button", role: "radio", class: "rb-opt", "aria-checked": String(st.pick === t.id), "data-id": t.id, onClick: () => { st.pick = t.id; step2(); } },
        h("b", null, t.name), h("small", null, [t.reason, t.extra].filter(Boolean).join(" · ") || " ")));
      const search = h("input", { class: "rb-input", id: "rb-pl-q", placeholder: `${KIND_LABEL[st.kind]} 이름 검색`, value: st.q, "aria-label": "연결할 항목 검색" });
      search.addEventListener("input", () => { st.q = search.value; const pos = search.selectionStart; step2(); const n = box.querySelector("#rb-pl-q"); n?.focus(); n?.setSelectionRange(pos, pos); });
      const name = h("input", { class: "rb-input", id: "rb-pl-name", value: st.name, placeholder: "링크 이름", "aria-label": "링크 이름" });
      name.addEventListener("input", () => { st.name = name.value; });
      const pick = st.targets.find((t) => t.id === st.pick);
      replace(box,
        h("h3", { class: "rb-h3" }, "어디에 연결할까요?"),
        h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, `‘${st.info.rootName || "이름 없는 링크"}’ 안에 파일 ${st.info.files.length}개가 있어요. 연결하면 다음부터 이 링크의 새 파일을 그 항목의 업데이트로 받아요.`),
        segmented(KIND_OPTS, st.kind, async (k) => { st.kind = k; st.q = ""; await loadTargets(); step2(); }, "연결할 종류"),
        h("p", { class: "rb-muted", id: "rb-pl-files", style: "margin:0;white-space:normal" }, rel.length ? `이 종류에 맞는 파일 ${rel.length}개: ${rel.slice(0, 3).map((f) => `${f.name}${f.size != null ? ` (${fmtBytes(f.size)})` : ""}`).join(", ")}${rel.length > 3 ? " …" : ""}` : `이 링크에는 ${KIND_LABEL[st.kind]}에 맞는 파일이 아직 없어요. 연결해 두면 올라올 때 알려 드려요.`),
        search,
        h("div", { class: "rb-opts", id: "rb-pl-targets", style: "max-height:240px;overflow:auto" }, ...(rows.length ? rows : [h("p", { class: "rb-muted", style: "margin:8px" }, st.targets.length ? "검색 결과가 없어요." : `연결할 ${KIND_LABEL[st.kind]}이(가) 없어요.`)])),
        name,
        h("div", { class: "btns" }, btn("뒤로", { onClick: step1 }),
          btn("연결 없이 한 번만 받기", { id: "rb-pl-once", disabled: !rel.length, onClick: () => done({ once: true, url: st.url, password: st.password, files: rel }) }),
          btn("연결하기", { kind: "primary", id: "rb-pl-save", disabled: !pick, onClick: () => done({ url: st.url, password: st.password, name: st.name.trim() || st.info.rootName, kind: st.kind, target: { id: pick.id, name: pick.name }, files: st.info.files }) })));
    }
    step1();
    return box;
  }).finally(() => ac.abort());
}

export async function renderProtLink(ctx) {
  const pl = ctx.protlink;
  const body = h("div", { class: "rb-flds", id: "rb-protlink-body", style: "display:grid;gap:12px" });
  const head = h("div", { id: "rb-protlink-head" });
  replace(ctx.main, h("div", { class: "rb-section" }, head, body));
  if (!pl) { replace(body, emptyState({ title: "ProtLink+를 쓸 수 없어요", text: "이 환경에서는 ProtLink+가 준비되지 않았어요." })); return; }
  const busy = new Set();
  const fail = (e) => ctx.toast(e?.message ?? String(e), { error: true });
  async function applyLink(it) {
    if (busy.has(it.id)) return;
    busy.add(it.id); await paint();
    try {
      const r = await pl.apply(it.id, { onProgress: (p) => { const el = body.querySelector(`[data-id="${it.id}"] .pl-prog`); if (el) el.textContent = `받는 중 ${p.index + 1}/${p.count} · ${p.name}${p.total ? ` · ${Math.round((p.done / p.total) * 100)}%` : ""}`; } });
      ctx.toast(r.kind === "plugin" ? `${r.names.join(", ")} 파일을 저장했어요. 리스에서 플러그인으로 넣어 주세요.` : "받았어요. 열린 가져오기 창에서 업데이트를 이어 가요.");
    } catch (e) { fail(e); } finally { busy.delete(it.id); await paint(); }
  }
  async function checkLink(it) {
    if (busy.has(it.id)) return;
    busy.add(it.id); await paint();
    try { const s = await pl.check(it.id); ctx.toast(s.error ? s.error : s.update ? `새 파일 ${s.pending.length}개가 있어요.` : "새 파일이 없어요.", s.error ? { error: true } : {}); } catch (e) { fail(e); } finally { busy.delete(it.id); await paint(); }
  }
  async function relink(it) {
    const kind = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "연결 바꾸기", style: "display:grid;gap:12px" },
      h("h3", { class: "rb-h3" }, "연결 바꾸기"), h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, "어떤 종류에 다시 연결할까요? 연결을 바꾸면 이 링크의 기준 목록을 새로 잡아요."),
      h("div", { class: "btns" }, ...KINDS.map((k) => btn(KIND_LABEL[k], { id: `rb-pl-kind-${k}`, kind: k === it.kind ? "primary" : "", onClick: () => done(k) })), btn("취소", { onClick: () => done(null) }))));
    if (!kind) return;
    const targets = rankTargets([it.name], await pl.targets(kind));
    const id = await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "연결할 항목", style: "display:grid;gap:12px;max-width:520px;width:100%" },
      h("h3", { class: "rb-h3" }, `연결할 ${KIND_LABEL[kind]}`),
      h("div", { class: "rb-opts", style: "max-height:300px;overflow:auto" }, ...targets.slice(0, 60).map((t) => h("button", { type: "button", class: "rb-opt", "data-id": t.id, onClick: () => done(t) }, h("b", null, t.name), h("small", null, [t.reason, t.extra].filter(Boolean).join(" · ") || " ")))),
      h("div", { class: "btns" }, btn("취소", { onClick: () => done(null) }))));
    if (!id) return;
    try { await pl.relink(it.id, kind, { id: id.id, name: id.name }); await paint(); } catch (e) { fail(e); }
  }
  async function add() {
    const r = await addLinkDialog(ctx, pl);
    if (!r) return;
    try {
      if (r.once) {
        const names = await pl.once(r.url, r.password, r.files, {});
        ctx.toast(`${names.join(", ")} 받았어요.`);
      } else { await pl.add(r); ctx.toast("연결했어요. 새 파일이 올라오면 알려 드려요."); }
    } catch (e) { fail(e); }
    await paint();
  }
  async function paint() {
    const on = pl.on(), running = pl.isRunning();
    const original = on ? await pl.originalInstalled().catch(() => false) : false;
    replace(head, pageHead("ProtLink+", { sub: "Proton Drive 링크로 업데이트 받기", sw: { on, label: "ProtLink+", text: "사용", onChange: async (v) => { await pl.set(v); await paint(); } } }));
    const kids = [];
    if (original) kids.push(statusCard("err", "원래 ‘ProtLink+’ 플러그인이 같이 켜져 있어요. 업데이트 알림이 두 번 떠서, 원래 플러그인을 끄면 여기서 쓸 수 있어요."));
    else if (!on) kids.push(statusCard("off", "꺼져 있어요. 위 스위치를 켜면 링크를 연결하고 업데이트를 받을 수 있어요."));
    else if (!running) kids.push(statusCard(pl.lastError() ? "err" : "prep", pl.lastError() || "시작하는 중이에요.", pl.lastError() ? { label: "다시 시도", onClick: async () => { await pl.boot(); await paint(); } } : undefined));
    if (on && running) {
      const r = await pl.list();
      const upd = r.items.filter((x) => x.update).length;
      kids.push(statusCard("on", upd ? `새 파일이 올라온 링크가 ${upd}개 있어요.` : r.items.length ? "연결한 링크를 확인했어요." : "링크를 연결해 보세요.", { label: "링크 추가", kind: "primary", onClick: add }));
      const rows = r.items.map((it) => {
        const b = busy.has(it.id);
        const state = it.error ? h("span", { class: "rb-pl-err", style: "color:var(--rb-err,#c0392b)" }, `확인 실패 · ${it.error}`) : it.update ? h("b", { style: "color:var(--rb-ok)" }, `새 파일 ${it.pending.length}개 · ${it.pending.slice(0, 2).join(", ")}${it.pending.length > 2 ? " …" : ""}`) : h("span", { class: "rb-muted" }, `최신 상태${it.checkedAt ? ` · ${ago(it.checkedAt)} 확인` : ""}`);
        return h("div", { class: "rb-card bordered rb-scard", "data-id": it.id, style: "display:grid;gap:8px" },
          h("div", { style: "display:flex;align-items:center;gap:8px" }, h("span", { class: "ico", "aria-hidden": "true" }, icon("link", 18)), h("b", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, it.name),
            iconBtn("more", `${it.name} 더 보기`, { onClick: (ev) => openMenu(ctx.win, ev.currentTarget, [
              { label: "지금 확인", icon: "refresh", onClick: () => checkLink(it) },
              { label: "연결 바꾸기", icon: "link", onClick: () => relink(it) },
              { label: "이름 바꾸기", icon: "edit", onClick: async () => { const n = await promptDialog(ctx.win, { title: "링크 이름", value: it.name }); if (n) { await pl.rename(it.id, n).catch(fail); await paint(); } } },
              { label: "연결 해제", icon: "trash", danger: true, onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 링크를 지울까요?", body: "연결 정보만 지워요. 이미 받은 항목은 그대로예요.", ok: "지우기", danger: true })) { await pl.remove(it.id).catch(fail); await paint(); } } }]) })),
          h("div", { class: "rb-muted", style: "white-space:normal" }, `${KIND_LABEL[it.kind]} → `, h("b", null, it.target?.name || "(연결 없음)")),
          h("div", { style: "white-space:normal" }, state),
          h("div", { class: "pl-prog rb-muted", style: "font-size:12px" }, b ? "처리하는 중…" : ""),
          h("div", { class: "rb-actions" }, btn(it.kind === "plugin" ? "받아서 저장" : "받아서 업데이트", { kind: it.update ? "primary" : "", size: "sm", disabled: b, id: `rb-pl-apply-${it.id}`, onClick: () => applyLink(it) }),
            btn("확인", { size: "sm", disabled: b, onClick: () => checkLink(it) })));
      });
      kids.push(...(rows.length ? rows : [h("p", { class: "rb-muted", id: "rb-pl-empty", style: "white-space:normal;margin:0" }, "아직 연결한 링크가 없어요. ‘링크 추가’를 눌러 Proton Drive 링크를 넣어 보세요.")]));
      kids.push(h("section", { class: "rb-card bordered rb-scard", id: "rb-pl-settings" }, h("span", { class: "h" }, "설정"),
        toggleRow("시작할 때 새 파일 확인", "리스를 켠 뒤 잠시 있다가 연결한 링크에 새 파일이 있는지 한 번 확인해요.", pl.settings().check, async (v) => { await pl.setSettings({ check: v }); })));
      kids.push(h("p", { class: "rb-muted", style: "white-space:normal;margin:0" }, "캐릭터·모듈은 받으면 가져오기 창으로 넘어가 연결한 항목을 맨 위 후보로 보여 줘요(영향 미리보기 → 백업 → 적용). 플러그인은 리스가 목록을 바꾸지 못하게 막혀 있어서 파일로 저장돼요. 리스에서 플러그인으로 넣어 주세요."));
    }
    replace(body, ...kids);
  }
  await paint();
}
