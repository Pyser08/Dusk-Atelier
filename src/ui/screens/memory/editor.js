// 기억 편집기 (v1.7.1, 고급 모드 전용): 저장된 기억(기록·상황·감정·기대)을 로어북 항목처럼 그 자리에서 고친다.
// 고친 칸은 잠겨서(🔒) 자동 기록이 덮지 않는다. 직전 수정 1건은 되돌릴 수 있다. 화면 로직은 engine/memoryedit.js(순수)에 있다.
import { h, replace, copyText } from "../../dom.js";
import { btn, chip, modal, note, confirmDialog, promptDialog, loading, segmented } from "../../kit.js";
import { fail, gradeBadge, at } from "./common.js";
import { loadReconciled } from "../../../data/memoryload.js";
import { editTarget, undoLast, setAct, setKind, setConf, setRecValid, setRecKeys, setText, setSelf, addRecord, setPov, setScene, setExp, addExp, deleteExp, setTag, trustBadges, lockedFields } from "../../../engine/memoryedit.js";
import { setLock } from "../../../engine/memorytrust.js";
import { EMO_TAGS, EMO_LABEL, summaryOf, tensionOf, undoConversion } from "../../../engine/memoryemo.js";

const CONF = [["", "미설정"], ["H", "높음"], ["M", "중간"], ["L", "낮음"]];
const sel = (opts, value, onChange, label) => h("select", { class: "rb-input rb-mem-edsel", "aria-label": label, onChange: (e) => onChange(e.target.value) }, opts.map(([v, l]) => h("option", { value: v, selected: (value ?? "") === v }, l)));
const area = (value, onSave, label, max) => h("textarea", { class: "rb-input rb-mem-edtxt", rows: 2, maxlength: max, "aria-label": label, onChange: (e) => onSave(e.target.value) }, value ?? "");
const line = (value, onSave, label, ph = "", max = 60) => h("input", { class: "rb-input", value: value ?? "", placeholder: ph, maxlength: max, "aria-label": label, onChange: (e) => onSave(e.target.value) });
const check = (on, label, onChange) => h("label", { class: "rb-mem-check" }, h("input", { type: "checkbox", checked: on, onChange: (e) => onChange(e.target.checked) }), label);
const lockMark = (r, f) => r.lock?.[f] ? h("span", { class: "rb-mem-lock", title: "내가 고친 칸이에요. 자동 기록이 덮지 않아요." }, "🔒") : null;
const badge = (b) => h("span", { class: ["rb-mem-tb", `k-${b.kind}`] }, b.text);

export function memoryEditor(ctx, cur, { redraw }) {
  const M = ctx.memory, st = ctx.state.memEd ??= { tab: "rec", q: "", open: {}, more: {}, openP: {} };
  const body = h("div", { class: "rb-mem-edbody" });
  let folder = null;

  const mutate = async (fn) => {
    let res = { ok: true };
    try { await M.store.updateFolder(cur.chaId, cur.chatId, (f) => { res = fn(f) ?? { ok: true }; }); } catch (e) { fail(ctx)(e); return false; }
    if (!res.ok) { ctx.toast(res.why, { error: true, seconds: 8 }); }
    await draw();
    return res.ok;
  };
  const edit = (loc, fn, label) => mutate((f) => editTarget(f, loc, fn, label));

  async function load() {
    const chat = await ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
    folder = await loadReconciled(M.store, cur.chaId, cur.chatId, chat?.message ?? []);
  }

  // ── 기록 ──
  function recCard(pk, r) {
    const loc = { kind: "rec", pk, id: r.id }, open = !!st.open[r.id];
    const sc = (folder.scenes ?? []).find((s) => s.id === r.sit);
    const head = h("div", { class: "rb-mem-edhead" }, gradeBadge(r.g), r.pin ? "📌" : null, lockMark(r, "act"), ...trustBadges(r).map(badge),
      h("span", { style: "flex:1" }), btn(open ? "접기" : "자세히", { size: "sm", onClick: () => { st.open[r.id] = !open; draw(); } }));
    const ctrls = h("div", { class: "rb-mem-edctrl" },
      h("label", null, "구분", sel([["", "미설정"], ["f", "사실"], ["i", "추론"]], r.kd, (v) => edit(loc, (x) => setKind(x, v || null), "구분"), "구분"), lockMark(r, "kd")),
      h("label", null, "사실 확신도", sel(CONF, r.fc, (v) => edit(loc, (x) => setConf(x, "fc", v || null), "사실확실성"), "사실확실성"), lockMark(r, "fc")),
      r.kd === "i" ? h("label", null, "해석 확신도", sel(CONF, r.ic, (v) => edit(loc, (x) => setConf(x, "ic", v || null), "해석확실성"), "해석확실성"), lockMark(r, "ic")) : null,
      check(r.valid !== false, "현재 적용", (v) => edit(loc, (x) => setRecValid(x, v), "유효"))
    );
    const detail = !open ? null : h("div", { class: "rb-mem-eddetail" },
      h("div", { class: "rb-muted" }, [r.at != null ? `출처 ${at(r.at)}` : "출처 없음", r.mid ? `메시지 ${String(r.mid).slice(0, 8)}` : "", r.hs?.length ? `출처 응답 ${r.hs.length}개` : "", (r.m ?? 1) > 1 ? `반복 ${r.m}회(같은 응답은 한 번만 셈)` : "", sc ? `상황 ${sc.place || sc.sum.slice(0, 12)}` : ""].filter(Boolean).join(" · ")),
      r.attr ? h("div", { class: "rb-muted" }, `속성 · ${r.attr.c}/${r.attr.k} = ${r.attr.v}${r.attr.cond ? ` (${r.attr.cond})` : ""}${r.attr.tm === "past" ? " · 과거" : ""}`) : null,
      r.hist?.length ? h("div", null, h("b", null, "이전 → 현재"), h("ul", { class: "rb-mem-edhist" }, [...r.hist].reverse().map((x, i) => h("li", { class: "rb-muted" }, `${i === 0 ? "최근 · " : ""}이전: ${x.act}${x.v ? ` [${x.v}]` : ""} → 현재: ${r.act}${x.why ? ` · 이유 ${x.why}` : ""}`)))) : null,
      r.inv ? h("div", { class: "rb-muted" }, `종료 이유: ${r.inv.why}${r.inv.by ? " · 대체 기록 있음" : ""}`) : null,
      h("div", { class: "rb-mem-edkeys" }, h("b", null, "검색 키"), ...(r.keys ?? []).map((k) => chip(`${k} ✕`, { onClick: () => edit(loc, (x) => setRecKeys(x, (x.keys ?? []).filter((y) => y !== k)), "검색 키") })),
        (r.keys ?? []).length < 4 ? h("input", { class: "rb-input", style: "max-width:150px", placeholder: "키 추가 후 Enter", "aria-label": "검색 키 추가", onKeydown: (e) => { if (e.key === "Enter" && e.target.value.trim()) edit(loc, (x) => setRecKeys(x, [...(x.keys ?? []), e.target.value]), "검색 키"); } }) : null),
      h("label", { class: "rb-mem-field" }, h("span", null, "행동·사건 본문", lockMark(r, "act")), area(r.act, (v) => edit(loc, (x) => setAct(x, v), "본문"), "기록 본문", 80)),
      h("label", { class: "rb-mem-field" }, h("span", null, "패턴 (같은 일이 다른 상황에서도 반복될 때)", lockMark(r, "pat")), line(r.pat, (v) => edit(loc, (x) => setText(x, "pat", v, 40), "패턴"), "패턴", "", 40)),
      h("label", { class: "rb-mem-field" }, h("span", null, "의미 (추정) — 근거가 있을 때만", lockMark(r, "mean")), line(r.mean, (v) => edit(loc, (x) => setText(x, "mean", v, 60), "의미"), "의미", "", 60)),
      selfBox(loc, r),
      lockedFields(r).length ? h("div", { class: "rb-mem-edlocks" }, h("span", { class: "rb-muted" }, "잠긴 칸 (자동 갱신 안 함)"), ...lockedFields(r).map((f) => chip(`🔓 ${f}`, { onClick: () => edit(loc, (x) => setLock(x, f, false), "잠금 해제") }))) : null);
    return h("li", { class: ["rb-mem-edrec", r.valid === false && "ended"], dataset: { rid: r.id } }, head, area(r.act, (v) => edit(loc, (x) => setAct(x, v), "본문"), "기록 본문", 80), ctrls, detail);
  }
  function selfBox(loc, r) {
    const f = h("input", { class: "rb-input", value: r.self?.feel ?? "", placeholder: "자기 해석 (본인이 느끼는 기분)", maxlength: 40, "aria-label": "자기 해석" }),
      c = h("input", { class: "rb-input", value: r.self?.cause ?? "", placeholder: "추정 원인 (단정 금지)", maxlength: 60, "aria-label": "추정 원인" }),
      s = sel(CONF.slice(1), r.self?.ic ?? "M", () => {}, "해석 확신도");
    return h("div", { class: "rb-mem-field" }, h("span", null, "자기 감정 인식", lockMark(r, "self")), f, c, h("div", { class: "rb-mem-edrow" }, s, btn("저장", { size: "sm", onClick: () => edit(loc, (x) => setSelf(x, { feel: f.value, cause: c.value, ic: s.value }), "자기 해석") }), r.self ? btn("지우기", { size: "sm", onClick: () => edit(loc, (x) => setSelf(x, null), "자기 해석") }) : null));
  }
  function tabRec() {
    const q = st.q.trim().toLowerCase(), people = Object.entries(folder.people ?? {});
    const search = h("input", { class: "rb-input", placeholder: "기록·인물 검색", value: st.q, "aria-label": "기록 검색", onChange: (e) => { st.q = e.target.value; draw(); } });
    const groups = people.map(([pk, p]) => {
      const all = (p.records ?? []).filter((r) => !r.orphan).slice().reverse();
      const rows = q ? all.filter((r) => r.act.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) : all;
      if (q && !rows.length) return null;
      const lim = st.more[pk] ?? 12, shown = rows.slice(0, lim);
      return h("details", { class: "rb-mem-edperson", open: !!q || people.length === 1 || !!st.openP[pk], onToggle: (e) => { st.openP[pk] = e.target.open; } }, h("summary", null, `${p.name} · ${all.length}건`),
        h("ul", { class: "rb-mem-edlist" }, shown.map((r) => recCard(pk, r))),
        rows.length > lim ? btn(`더 보기 (${rows.length - lim})`, { size: "sm", onClick: () => { st.more[pk] = lim + 12; draw(); } }) : null,
        btn("+ 기록 추가", { size: "sm", onClick: async () => {
          const v = await promptDialog(ctx.win, { title: `${p.name} 기록 추가`, label: "행동·사건 (80자)", ok: "추가" }); if (!v?.trim()) return;
          mutate((f) => { addRecord(f, p.name, v, "B"); });
        } }));
    }).filter(Boolean);
    return h("div", null, search, groups.length ? groups : h("p", { class: "rb-muted" }, "고칠 기록이 없어요."),
      btn("+ 다른 인물 기록 추가", { size: "sm", onClick: async () => {
        const n = await promptDialog(ctx.win, { title: "인물 이름", label: "이름", ok: "다음" }); if (!n?.trim()) return;
        const v = await promptDialog(ctx.win, { title: `${n.trim()} 기록 추가`, label: "행동·사건 (80자)", ok: "추가" }); if (!v?.trim()) return;
        mutate((f) => { addRecord(f, n, v, "B"); });
      } }));
  }

  // ── 상황·관점 ──
  function tabScene() {
    const scenes = (folder.scenes ?? []).filter((s) => !s.orphan).slice().reverse().slice(0, st.more.scenes ?? 8);
    if (!scenes.length) return h("p", { class: "rb-muted" }, "아직 상황이 없어요.");
    return h("ul", { class: "rb-mem-edlist" }, scenes.map((s) => {
      const loc = { kind: "scene", id: s.id }, pov = [...(s.pov ?? [])];
      while (pov.length < 2) pov.push({ who: "", view: "", why: "" });
      const rows = pov.map((p) => ({ who: h("input", { class: "rb-input", value: p.who, placeholder: "인물", maxlength: 60, "aria-label": "인물" }), view: h("input", { class: "rb-input", value: p.view, placeholder: "인식 (한 줄)", maxlength: 40, "aria-label": "인식" }), why: h("input", { class: "rb-input", value: p.why ?? "", placeholder: "관점이 갈리는 이유 (선택)", maxlength: 40, "aria-label": "이유" }) }));
      return h("li", { class: "rb-mem-edrec" }, h("div", { class: "rb-mem-edhead" }, `#${s.at != null ? s.at + 1 : "-"} ${s.place || ""}`, s.pov?.length ? h("span", { class: "rb-muted" }, s.pov.map((x) => `${x.who}:${x.view}`).join(" / ")) : null),
        area(s.sum, (v) => edit(loc, (x) => setScene(x, "sum", v), "상황 요약"), "상황 요약", 400),
        line(s.place, (v) => edit(loc, (x) => setScene(x, "place", v), "장소"), "장소", "장소", 80),
        h("div", { class: "rb-mem-field" }, h("span", null, "인물별 관점 (직접 관여한 두 사람, 실제로 다를 때만)"), rows.map((r) => h("div", { class: "rb-mem-edrow" }, r.who, r.view, r.why)),
          h("div", { class: "rb-mem-edrow" }, btn("관점 저장", { size: "sm", onClick: () => edit(loc, (x) => setPov(x, rows.map((r) => ({ who: r.who.value, view: r.view.value, why: r.why.value }))), "관점") }), s.pov?.length ? btn("관점 지우기", { size: "sm", onClick: () => edit(loc, (x) => setPov(x, []), "관점") }) : null)));
    }));
  }

  // ── 감정 ──
  function tabEmo() {
    const pairs = Object.entries(folder.emo ?? {});
    const addPair = btn("+ 관계 추가", { size: "sm", onClick: async () => {
      const a = await promptDialog(ctx.win, { title: "감정을 가진 쪽", label: "이름", ok: "다음" }); if (!a?.trim()) return;
      const b = await promptDialog(ctx.win, { title: "감정의 대상", label: "이름 (사용자는 {{user}})", value: "{{user}}", ok: "추가" }); if (!b?.trim()) return;
      mutate((f) => { f.emo ??= {}; const k = a.trim().toLowerCase().replace(/\s+/g, "") + ">" + b.trim().toLowerCase().replace(/\s+/g, ""); f.emo[k] ??= { from: a.trim(), to: b.trim(), tags: {}, log: [] }; });
    } });
    const conv = folder.emoConv?.length ? h("div", { class: "rb-mem-edconv" }, note("info", `호감도에서 변환한 애정 값이 ${folder.emoConv.length}건 있어요. 위키 원본은 그대로예요.`),
      btn("변환 되돌리기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "호감도 변환을 되돌릴까요?", body: "변환으로 생긴 애정 값만 지워요. 직접 정한 값은 남고, 다시 자동 변환하지 않아요.", ok: "되돌리기" })) mutate((f) => { undoConversion(f); }); } })) : null;
    if (!pairs.length) return h("div", null, h("p", { class: "rb-muted" }, "아직 감정 기록이 없어요. 게이지 0~10 · 비어 있으면 '미설정'(모름)이고 0은 '없음'이에요."), conv, addPair);
    return h("div", null, conv, pairs.map(([k, p]) => {
      const tension = tensionOf(p.tags).length, sum = summaryOf(p.tags);
      const rows = EMO_TAGS.map((t) => {
        const v = p.tags?.[t], val = h("b", { class: "rb-mem-edval" }, v == null ? "미설정" : String(v));
        const rng = h("input", { type: "range", min: 0, max: 10, step: 1, value: v ?? 0, class: ["rb-mem-edrange", v == null && "unset"], "aria-label": EMO_LABEL[t], onInput: (e) => { val.textContent = e.target.value; }, onChange: (e) => mutate((f) => { setTag(f, p.from, p.to, t, Number(e.target.value)); f.undo = { loc: { kind: "emo", k }, before: structuredClone(p), label: "감정", at_ms: Date.now() }; }) });
        return h("div", { class: "rb-mem-edgauge" }, h("span", null, EMO_LABEL[t]), rng, val, p.lock?.[t] ? h("span", { class: "rb-mem-lock", title: "직접 정한 값(자동 갱신 안 함)" }, "🔒") : null,
          v != null ? btn("미설정", { size: "sm", title: "모름으로 되돌리고 잠금 해제", onClick: () => mutate((f) => { setTag(f, p.from, p.to, t, null); f.undo = { loc: { kind: "emo", k }, before: structuredClone(p), label: "감정", at_ms: Date.now() }; }) }) : null);
      });
      return h("section", { class: "rb-card rb-mem-edpair" }, h("div", { class: "rb-mem-edhead" }, h("b", null, `${p.from} → ${p.to}`), h("span", { class: "rb-muted" }, sum || "모두 미설정"), tension ? h("span", { class: "rb-mem-tb k-hold" }, "감정 어긋남") : null),
        rows, (p.log ?? []).filter((x) => !x.orphan).length ? h("details", { class: "rb-mem-man" }, h("summary", null, "변화 이력"), h("ul", { class: "rb-mem-edhist" }, (p.log ?? []).filter((x) => !x.orphan).slice(-6).reverse().map((x) => h("li", { class: "rb-muted" }, `${Object.entries(x.t).map(([t, v]) => `${EMO_LABEL[t]} ${x.from?.[t] ?? "미설정"}→${v ?? "미설정"}`).join(", ")} · ${x.why}`)))) : null);
    }), addPair);
  }

  // ── 기대 불일치 ──
  function tabExp() {
    const pairs = Object.entries(folder.exp ?? {});
    const add = btn("+ 관계 추가", { size: "sm", onClick: async () => {
      const a = await promptDialog(ctx.win, { title: "첫째 인물", label: "이름", ok: "다음" }); if (!a?.trim()) return;
      const b = await promptDialog(ctx.win, { title: "둘째 인물", label: "이름", ok: "추가" }); if (!b?.trim()) return;
      mutate((f) => { if (!addExp(f, a, b)) return { ok: false, why: "서로 다른 두 인물 이름이 필요해요." }; });
    } });
    const hints = (folder.hints ?? []).length ? note("info", `감정이 어긋난 인물: ${folder.hints.map((x) => x.person).join(", ")} — 다음 분석 때 자기 감정 인식 기록을 유도해요.`) : null;
    if (!pairs.length) return h("div", null, hints, h("p", { class: "rb-muted" }, "아직 기대 불일치가 없어요. 관계 단위로 두 사람의 기대가 어긋날 때만 남겨요."), add);
    return h("div", null, hints, pairs.map(([k, e]) => {
      const loc = { kind: "exp", k }, ed = (patch) => edit(loc, (x) => setExp(x, patch), "기대");
      return h("section", { class: "rb-card rb-mem-edpair" }, h("div", { class: "rb-mem-edhead" }, h("b", null, `${e.a} ↔ ${e.b}`), e.lock ? h("span", { class: "rb-mem-lock", title: "직접 고친 값(자동 갱신 안 함)" }, "🔒") : null, h("span", { style: "flex:1" }),
        btn("삭제", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: "두 사람의 기대 기록을 지워요.", ok: "삭제", danger: true })) mutate((f) => { deleteExp(f, k); }); } })),
        h("div", { class: "rb-mem-edrow" }, line(e.ae, (v) => ed({ ae: v }), `${e.a}의 기대`, `${e.a}의 기대`, 40), check(e.as, "말함", (v) => ed({ as: v }))),
        h("div", { class: "rb-mem-edrow" }, line(e.be, (v) => ed({ be: v }), `${e.b}의 기대`, `${e.b}의 기대`, 40), check(e.bs, "말함", (v) => ed({ bs: v }))),
        check(e.gap, "기대가 어긋남", (v) => ed({ gap: v })), e.gap ? line(e.viol, (v) => ed({ viol: v }), "기대 위반 인식", "기대 위반 인식 (한 줄)", 60) : null);
    }), add);
  }

  async function preview() {
    const r = await M.injector.preview().catch((e) => ({ ok: false, why: e?.message }));
    modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "다음 요청에 들어갈 기억", style: "max-width:560px;display:flex;flex-direction:column;gap:10px" },
      h("b", null, "다음 요청에 들어갈 기억"), h("p", { class: "rb-muted" }, !r.ok ? r.why : r.injected ? `약 ${r.manifest?.tokens ?? "?"} 토큰 · 위치 ${r.position}` : "지금은 넣을 내용이 없어요."),
      r.text ? h("pre", { class: "rb-mem-edpre" }, r.text) : null, h("button", { class: "rb-btn primary", type: "button", onClick: () => done(true) }, "닫기")));
  }
  async function copyJson() {
    const { undo, ...data } = folder;  // 되돌리기 슬롯은 빼고 내보낸다
    ctx.toast(await copyText(JSON.stringify(data, null, 1)) ? "이 채팅의 기억을 JSON으로 복사했어요. 측정·검증 도구에 붙여 넣으세요." : "복사하지 못했어요. 브라우저가 클립보드를 막았을 수 있어요.", { error: !0 });
  }

  async function draw() {
    try { await load(); } catch (e) { return replace(body, note("err", e?.message ?? String(e))); }
    const u = folder.undo;
    const tabs = segmented([["rec", "기록"], ["scene", "상황·관점"], ["emo", "감정"], ["exp", "기대"]], st.tab, (v) => { st.tab = v; draw(); }, "편집 종류");
    replace(body,
      h("div", { class: "rb-mem-edbar" }, tabs, h("span", { style: "flex:1" }),
        btn(u ? `되돌리기 · ${u.label || "수정"}` : "되돌리기", { size: "sm", disabled: !u, onClick: () => mutate((f) => undoLast(f)) }),
        btn("들어갈 내용 보기", { size: "sm", onClick: preview }), btn("JSON 복사", { size: "sm", onClick: copyJson })),
      st.tab === "rec" ? tabRec() : st.tab === "scene" ? tabScene() : st.tab === "emo" ? tabEmo() : tabExp());
  }

  let loaded = !!st.openBox;
  if (loaded) { replace(body, loading("불러오는 중")); draw(); }  // 다시 그려질 때 열려 있던 상태 그대로 내용을 채운다
  return h("details", { class: "rb-card rb-mem-ed", open: !!st.openBox, onToggle: (e) => { st.openBox = e.target.open; if (e.target.open && !loaded) { loaded = true; replace(body, loading("불러오는 중")); draw(); } } },
    h("summary", null, h("b", null, "기억 편집기"), h("small", { class: "rb-muted" }, " 저장된 기억을 로어북처럼 고쳐요")),
    h("p", { class: "rb-muted rb-mem-edhelp" }, "고친 칸은 🔒 잠겨서 자동 기록이 덮어쓰지 않아요. 수정은 이 채팅에만 적용되고, 직전 1건은 되돌릴 수 있어요."),
    body);
}
