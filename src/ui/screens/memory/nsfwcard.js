// addon-rebuild: 인물 위키 NSFW 탭의 성인 프로필 카드 — 이 채팅 장기기억(folder.nsfw[문서 id]) 값. Erosync 프로필을 쓰지 않는다.
// 게이지·칩 모양은 예전 Erosync 카드와 같다(bar·eroDetailRows를 같이 씀).
import { memStore } from "./memstore.js";
import { h } from "../../dom.js";
import { btn, confirmDialog, modal, promptDialog } from "../../kit.js";
import { pickFiles } from "../../dom.js";
import { driveOf, emoTemp, RUNG_LABEL, KIND_LABEL } from "../../../engine/scenedrive.js";
import { tempPath } from "../../../engine/erosyncview.js";
import { TEMP_LINES } from "./erosynctempui.js";
import { bar, eroDetailRows } from "./erosyncwiki.js";
import { SEX_LABEL, AXIS_LABEL, SEX_KEYS, AXIS_KEYS, normalizeNsfw, normTags, cleanPosLabel, posKind, POS_KIND_LABEL, POS_GROUPS, posGroup } from "../../../engine/nsfwprofile.js";
import { profileText } from "../../../data/profileseed.js";
import { logEvent, logFailure } from "../../../data/memlog.js";
import { infoBtn, smoothPath } from "./lifecards.js";
// 성인 프로필 수치 설명(i 버튼)
const GAUGE_INFO = { "성적 관심": "얼마나 자주·강하게 성관계를 원하는지. 성욕 게이지가 오르는 기본 속도가 돼요.", "성적 즉흥성": "조건·관계·시간이 얼마나 적게 필요해도 응하는지. 장면 계획에서 한 번에 나아가는 폭이 돼요.", "성적 개방성": "성에 대해 얼마나 열려 있는지(말하기·새로운 시도).", "성적 추진력": "원하는 걸 얼마나 밀어붙이는지.", "주도성": "먼저 시작하고 제안하는 정도.", "즉흥성": "분위기에 따라 바로 움직이는 정도.", "직접성": "돌려 말하지 않고 원하는 걸 말하는 정도.", "지속성": "목표를 쉽게 접지 않는 정도.", "집착성": "한 사람·한 가지에 매달리는 정도.", "개방성": "남들 앞에서도 드러내는 정도.", "보복성": "당한 걸 갚으려는 정도.", "극단성": "선을 넘는 데까지 가는 정도." };

const note = (t) => h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, t);

// 게이지 목록: 성적 수치 + 8축, 이름이 겹치면(개방성 ↔ 성적 개방성) 더 긴 이름만
export function nsfwGauges(n) {
  const rows = [...SEX_KEYS.filter((k) => Number.isFinite(n?.sexual?.[k])).map((k) => ({ label: SEX_LABEL[k], value: n.sexual[k] })),
    ...AXIS_KEYS.filter((k) => Number.isFinite(n?.axes?.[k])).map((k) => ({ label: AXIS_LABEL[k], value: n.axes[k] }))];
  return rows.filter((r) => !rows.some((o) => o.label !== r.label && o.label.length > r.label.length && o.label.includes(r.label)));
}

// keep: { sexual } — 다시 뽑기로 정한 성적 수치처럼 새로 만든 뒤에도 남길 값. 태그는 늘 남긴다
export async function regenerate(env, doc, { keep = null, quiet = false } = {}) {
  const { ctx } = env, flow = ctx.memory?.flow, imp = flow?.tools?.()?.importer, rt = flow?.runtime?.();
  if (!imp?.runNsfw || !rt?.wiki) return ctx.toast("장기 기억 위키가 켜져 있어야 만들 수 있어요.", { error: true });
  // 방금 바뀐 성적 욕망·이상성향(다시 뽑기 등)이 들어 있는 저장본을 먼저 본다
  const stored = await memStore(ctx).getFolder(env.bot.id, env.chatItem.id).catch(() => null);
  const prof = stored?.wiki?.people?.profiles?.[doc.id] ?? rt.wiki.snapshot?.()?.people?.profiles?.[doc.id];
  if (!prof) return ctx.toast("이 인물은 기본 성격이 아직 없어요. 다음 턴에 기본 성격과 함께 만들어져요.", { error: true });
  if (!quiet) ctx.toast("성인 프로필을 만드는 중이에요…");
  const r = await imp.runNsfw([{ id: doc.id, name: doc.title || doc.id, profile: profileText(prof) }]).catch((e) => ({ byId: {}, failed: [{ id: doc.id, error: e?.message ?? String(e) }] }));
  const n = normalizeNsfw(r.byId[doc.id]);
  if (!n) {
    const msg = r.failed[0]?.error || "문제: 답의 nsfw 값이 비었거나 형식이 맞지 않아요", cen = /^\s*검열[:：]/.test(msg);
    logFailure({ area: "성인 프로필 만들기", title: `‘${doc.title}’ 성인 프로필 ${cen ? "— 검열" : "— 문제"}`, error: msg });
    return ctx.toast(cen ? "모델이 거절했어요(검열). 실패 기록에서 자세히 볼 수 있어요." : `만들지 못했어요 · ${msg.replace(/^문제[:：]\s*/, "")}`, { error: true });
  }
  await memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, (f) => { f.nsfw ??= {}; const old = f.nsfw[doc.id];
    f.nsfw[doc.id] = { ...n, human: n.human ?? old?.human, ext: n.ext ?? old?.ext, zones: n.zones ?? old?.zones, sexual: keep?.sexual ? { ...n.sexual, ...keep.sexual } : n.sexual, tags: normTags(old?.tags), log: [...(old?.log ?? []), { at: new Date().toISOString(), text: keep ? "다시 뽑기로 새로 만듦" : "다시 만듦" }].slice(-20) }; });
  logEvent({ area: "성인 프로필 만들기", title: `${doc.title} ${keep ? "다시 뽑기 반영" : "다시 만들기"} · 체위·장소·플레이 ${n.positions.length}` });
  env.redraw?.();
  return true;
}

export function nsfwCard(env, card, doc) {
  const n = env.folder?.nsfw?.[doc?.id] ?? null;
  const acts = h("div", { class: "rb-mem-sact rb-ero-acts" },
    btn(n ? "다시 만들기" : "지금 만들기", { size: "sm", id: "rb-nsfw-regen", title: "이 인물의 성인 프로필을 위키 성격·성적 욕망·이상성향으로 다시 만들어요(호출 1번)", onClick: () => (n && n.by === "user" ? confirmDialog(env.ctx.win, { title: "직접 고친 값이 있어요", body: "다시 만들면 고친 값이 사라져요.", ok: "다시 만들기", danger: true }) : Promise.resolve(true)).then((ok) => ok && regenerate(env, doc)) }),
    btn(n ? "직접 고치기" : "직접 만들기", { size: "sm", id: "rb-nsfw-edit", onClick: () => openNsfwEditor(env, doc, n) }),
    n ? btn("내보내기", { size: "sm", id: "rb-nsfw-export", onClick: () => exportNsfw(env, doc) }) : null,
    btn("가져오기", { size: "sm", id: "rb-nsfw-import", onClick: () => importNsfw(env, doc) }));
  if (!n) return card("🔥 성인 프로필", [note("아직 없어요. 기본 성격을 만들 때 함께 만들어져요(장기 기억 설정의 ‘욕구 기록’이 켜져 있어야 해요). 이미 성격이 있는 인물은 다음 턴에 채워지거나 ‘지금 만들기’로 바로 만들 수 있어요."), acts], null, "rb-wk2-ero rb-nsfw-base");
  // 게이지: ‘성적 수치’와 ‘성향’ 두 묶음, 각 칸은 이름·값 알약·막대(넓으면 두 줄로)
  const SEXL = new Set(Object.values(SEX_LABEL)), gl = nsfwGauges(n);
  const gauge = (r, kind) => h("div", { class: ["rb-ng", kind], role: "img", "aria-label": `${r.label} ${r.value}/100` }, h("div", { class: "top" }, h("span", null, r.label, infoBtn(GAUGE_INFO[r.label])), h("b", null, String(r.value))), h("div", { class: "tr" }, h("i", { style: { width: `${Math.max(0, Math.min(100, r.value))}%` } })));
  const gblock = (title, list, kind) => list.length ? h("div", { class: "rb-ng-block" }, h("small", { class: "rb-ng-h" }, title), h("div", { class: "rb-ng-grid" }, list.map((r) => gauge(r, kind)))) : null;
  const gauges = [gblock("성적 수치", gl.filter((r) => SEXL.has(r.label)), "sex"), gblock("성향", gl.filter((r) => !SEXL.has(r.label)), "ax")].filter(Boolean);
  const pref = n.pref ? h("div", { class: "rb-ero-pref", role: "img", "aria-label": `끌리는 상대 · 여성 ${n.pref.f}% · 남성 ${n.pref.m}% · 그 외 ${n.pref.x}%` },
    h("small", { class: "rb-muted" }, "끌리는 상대"),
    h("div", { class: "bar" }, ...[["f", n.pref.f], ["m", n.pref.m], ["x", n.pref.x]].filter(([, v]) => v > 0).map(([k, v]) => h("i", { class: k, style: { flexGrow: v } }))),
    h("div", { class: "lg" }, h("span", { class: "f" }, `여성 ${n.pref.f}%`), h("span", { class: "m" }, `남성 ${n.pref.m}%`), h("span", { class: "x" }, `그 외 ${n.pref.x}%`))) : null;
  // 좋아하는·싫어하는 것을 체위·장소·플레이로 나눠 칩으로(값이 없는 갈래는 빼고, 하나도 없으면 빈 줄 안내는 eroDetailRows가 한다)
  // 2.2.22: 좋아하는·싫어하는 체위/플레이·장소 줄은 비어 있어도 늘 보이고, 줄마다 ‘+ 추가’로 바로 적는다(예전엔 값이 없으면 줄이 사라졌다)
  const kindOf = (p) => p.kind || posKind("", p.label);
  const addPos = (pref, g) => async () => {
    const v = await promptDialog(env.ctx.win, { title: `${pref === "preferred" ? "좋아하는" : "싫어하는"} ${g.label} 추가`, label: "쉼표로 여러 개(예: 기승위, 후배위)", ok: "추가" }); if (!v?.trim()) return;
    const labels = v.split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);
    save(env, doc, (cur) => { const c = cur ?? n, have = new Set((c.positions ?? []).map((p) => `${p.preference}|${cleanPosLabel(p.label)}`));
      const add = labels.filter((l) => !have.has(`${pref}|${cleanPosLabel(l)}`)).map((label) => ({ label, kind: g.id === "place" ? "place" : posKind("", label) === "position" ? "position" : "play", preference: pref }));
      return { ...c, positions: [...(c.positions ?? []), ...add], by: "user", log: [...(c.log ?? []), { at: new Date().toISOString(), text: `${g.label} ${pref === "preferred" ? "좋아함" : "싫어함"} 추가: ${labels.join(", ")}` }].slice(-20) }; });
  };
  const chipRow = (title, list, cls, id, pref, g) => h("div", { class: ["rb-wk2-ero-row", cls], "data-group": id }, h("small", { class: "rb-muted" }, title),
    h("div", { class: "rb-wk2-chips" }, list.length ? list.map((x) => h("span", { class: "rb-wk2-chip", title: x.reason || "" }, cleanPosLabel(x.label))) : h("small", { class: "rb-muted" }, "아직 없어요"),
      h("button", { type: "button", class: "rb-wk2-chip rb-pos-add", "aria-label": `${title} 추가`, onClick: addPos(pref, g) }, "+ 추가")));
  // addon-rebuild: 체위·플레이는 한 묶음(체위/플레이), 장소는 따로
  const grouped = POS_GROUPS.flatMap((g) => [chipRow(`좋아하는 ${g.label}`, n.positions.filter((p) => p.preference === "preferred" && posGroup(kindOf(p)) === g.id), "k-like", `like-${g.id}`, "preferred", g), chipRow(`싫어하는 ${g.label}`, n.positions.filter((p) => p.preference === "disliked" && posGroup(kindOf(p)) === g.id), "k-hate", `hate-${g.id}`, "disliked", g)]);
  // 유혹 방식 · 성적 농담: 빈도(자주/가끔/드물게)·직설 막대 + 방식 칩 + 주로 나오는 때
  const LV = (v) => !Number.isFinite(v) ? "" : v >= 70 ? "자주" : v >= 40 ? "가끔" : "드물게";
  const styleBox = (title, o, id) => o ? h("div", { class: "rb-ns-box", "data-box": id },
    h("div", { class: "hd" }, h("b", null, title), LV(o.frequency) ? h("span", { class: "rb-ac-badge on" }, LV(o.frequency)) : null,
      Number.isFinite(o.directness) ? h("span", { class: "dir", title: `직설 ${o.directness}` }, h("small", { class: "rb-muted" }, "직설"), h("span", { class: "tr" }, h("i", { style: { width: `${o.directness}%` } })), h("small", null, String(o.directness))) : null),
    o.styles?.length ? h("div", { class: "rb-wk2-chips" }, o.styles.map((x) => h("span", { class: "rb-wk2-chip" }, x))) : null,
    o.situations?.length ? h("ul", { class: "sit" }, o.situations.map((x) => h("li", null, x))) : null) : null;
  const boxes = [styleBox("유혹 방식", n.seduction, "seduction"), styleBox("성적 농담", n.humor, "humor")].filter(Boolean);
  const detail = [grouped.length ? h("div", { class: "rb-ns-pos" }, grouped) : eroDetailRows({ likes: [], dislikes: [] }), boxes.length ? h("div", { class: "rb-ns-boxes" }, boxes) : null].flat().filter(Boolean);
  const recent = (n.log ?? []).slice(-4).reverse();
  return card("🔥 성인 프로필", [h("div", { class: "rb-ng-wrap", id: "rb-nsfw-gauges" }, ...gauges, pref), ...detail,
    recent.length ? h("div", { class: "rb-wk2-ero-row", id: "rb-nsfw-log" }, h("small", { class: "rb-muted" }, "최근 변화"), ...recent.map((x) => h("small", null, x.text))) : null,
    n.by === "user" ? note("직접 고친 값이 있어요. 자동으로 다시 만들 때 덮지 않아요.") : note("이 채팅에서만 쓰는 값이에요. 대화에서 취향이 바뀌면 기록기가 이어서 고쳐요."), acts].filter(Boolean), h("small", { class: "rb-wk2-badge" }, "이 채팅"), "rb-wk2-ero rb-nsfw-base");
}

// ── 고치기 창: 성적 수치·8가지 성향·끌리는 상대·체위·장소·유혹·성적 농담 전부 ──
const save = (env, doc, fn) => Promise.resolve().then(() => memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, (f) => { f.nsfw ??= {}; f.nsfw[doc.id] = fn(f.nsfw[doc.id]); })).then(() => env.redraw?.()).catch((e) => env.ctx.toast?.(e?.message ?? String(e), { error: true }));
export function openNsfwEditor(env, doc, n0) {
  const n = n0 ?? normalizeNsfw({ sexual: { eroticInterest: 50 } }, { by: "user" });
  const numIn = (k, v) => h("input", { type: "number", min: 0, max: 100, step: 1, value: Number.isFinite(v) ? v : "", "data-k": k, class: "rb-input", style: "width:72px" });
  const row = (label, el) => h("label", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px" }, h("span", null, label), el);
  const kindOf = (p) => p.kind || posKind("", p.label), join = (pref, g) => n.positions.filter((p) => p.preference === pref && posGroup(kindOf(p)) === g).map((p) => cleanPosLabel(p.label)).join(", ");
  const ta = (k, v, ph) => h("textarea", { class: "rb-input", rows: 2, "data-k": k, placeholder: ph, style: "width:100%" }, v);
  return modal(env.ctx.win, (done) => {
    const box = h("div", { class: "rb-dialog", id: "rb-nsfw-editor", role: "dialog", "aria-modal": "true", "aria-label": "성인 프로필 고치기", style: "width:min(560px,94vw);max-height:86vh;overflow:auto;display:flex;flex-direction:column;gap:10px" },
      h("h3", { class: "rb-h3" }, `${doc.title} · 성인 프로필 고치기`),
      h("b", null, "성적 수치"), ...SEX_KEYS.map((k) => row(SEX_LABEL[k], numIn(k, n.sexual?.[k]))),
      h("b", null, "8가지 성향"), ...AXIS_KEYS.map((k) => row(AXIS_LABEL[k], numIn(k, n.axes?.[k]))),
      h("b", null, "끌리는 상대(%)"), row("여성", numIn("pf", n.pref?.f)), row("남성", numIn("pm", n.pref?.m)), row("그 외", numIn("px", n.pref?.x)),
      ...POS_GROUPS.flatMap((g) => [h("b", null, `좋아하는 ${g.label} (쉼표로)`), ta(`like-${g.id}`, join("preferred", g.id), g.id === "place" ? "샤워실, 차 안" : "기승위, 후배위, 목 애무, 눈 가리기"),
        h("b", null, `싫어하는 ${g.label} (쉼표로)`), ta(`hate-${g.id}`, join("disliked", g.id), "")]),
      h("b", null, "유혹 방식 (쉼표로)"), ta("sed", (n.seduction?.styles ?? []).join(", "), ""),
      h("b", null, "성적 농담 (쉼표로)"), ta("hum", (n.humor?.styles ?? []).join(", "), ""),
      h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;gap:6px" }, btn("취소", { onClick: () => done(false) }), btn("저장", { kind: "primary", id: "rb-nsfw-editor-save", onClick: async () => {
        const val = (k) => box.querySelector(`[data-k="${k}"]`)?.value ?? "", num = (k) => { const v = val(k); return v === "" ? undefined : Number(v); };
        const split = (k) => val(k).split(/[,，\n]/).map((x) => x.trim()).filter(Boolean);
        const raw = { sexual: Object.fromEntries(SEX_KEYS.map((k) => [k, num(k)])), axes: Object.fromEntries(AXIS_KEYS.map((k) => [k, num(k)])), pref: { f: num("pf"), m: num("pm"), x: num("px") ?? 0 },
          // 체위/플레이 칸은 이름으로 체위·플레이를 짐작해 저장(장소 칸은 장소)
          positions: POS_GROUPS.flatMap((g) => { const kindFor = (label) => (g.id === "place" ? "place" : posKind("", label) === "position" ? "position" : "play"); return [...split(`like-${g.id}`).map((label) => ({ label, kind: kindFor(label), preference: "preferred" })), ...split(`hate-${g.id}`).map((label) => ({ label, kind: kindFor(label), preference: "disliked" }))]; }),
          seduction: { ...(n.seduction ?? {}), styles: split("sed") }, humor: { ...(n.humor ?? {}), styles: split("hum") }, tags: n.tags, human: n.human, ext: n.ext, zones: n.zones };
        const next = normalizeNsfw(raw, { by: "user", log: [...(n.log ?? []), { at: new Date().toISOString(), text: "직접 고침" }] });
        if (!next) return env.ctx.toast("값이 하나도 없어요.", { error: true });
        await save(env, doc, (cur) => ({ ...(cur ?? {}), ...next })); done(true);   // 2.2.22: 고치기 창에 없는 값(강제 피임·체형·피임·속도·욕망 스위치 등)은 그대로 둔다
      } })));
    return box;
  });
}

// ── 선호·금기 태그(직접 적은 글만). 금기는 장면 계획·RP에 ‘절대 넘지 않음’으로 들어간다 ──
export function nsfwTagsCard(env, card, doc) {
  const n = env.folder?.nsfw?.[doc?.id]; const t = normTags(n?.tags);
  const likes = h("input", { class: "rb-input", id: "rb-nsfw-tags-likes", value: t.likes.join(", "), placeholder: "예: 목덜미, 느린 전개" });
  const limits = h("input", { class: "rb-input", id: "rb-nsfw-tags-limits", value: t.limits.join(", "), placeholder: "예: 공개된 장소" });
  const chips = h("div", { class: "rb-wk2-chips", id: "rb-nsfw-tags-chips" }, ...t.likes.map((x) => h("span", { class: "rb-wk2-chip", "data-kind": "like" }, x)), ...t.limits.map((x) => h("span", { class: "rb-wk2-chip", "data-kind": "limit", style: "border-color:var(--rb-warn)" }, `금기 · ${x}`)));
  return card("선호·금기 태그", [note("직접 적은 글만 써요. 선호는 성적인 장면에, 금기는 언제나 ‘절대 넘지 않는 선’으로 들어가요."), chips,
    h("label", null, h("small", { class: "rb-muted" }, "선호"), likes), h("label", null, h("small", { class: "rb-muted" }, "금기"), limits),
    h("div", { class: "rb-mem-sact" }, btn("태그 저장", { size: "sm", id: "rb-nsfw-tags-save", onClick: () => save(env, doc, (cur) => ({ ...(cur ?? normalizeNsfw({ sexual: {} }) ?? { sexual: {}, axes: {}, pref: null, positions: [], seduction: null, humor: null, by: "user", at: new Date().toISOString(), log: [] }), tags: normTags({ likes: likes.value, limits: limits.value }) })) }))], null, "rb-wk2-ero rb-nsfw-base");
}

// ── 내보내기·가져오기(이 인물 성인 프로필 파일) ──
const slug = (s) => String(s || "profile").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);
export function exportNsfw(env, doc) {
  const n = env.folder?.nsfw?.[doc.id]; if (!n) return env.ctx.toast("내보낼 성인 프로필이 없어요.", { error: true });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([JSON.stringify({ kind: "dusk-nsfw", v: 1, name: doc.title, nsfw: n }, null, 1)], { type: "application/json" })), download: `dusk-nsfw-${slug(doc.title)}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  env.ctx.toast(`${doc.title}의 성인 프로필을 내보냈어요`);
}
export async function importNsfw(env, doc) {
  try {
    const [file] = await pickFiles({ accept: ".json" }); if (!file) return;
    const o = JSON.parse(await file.text());
    const n = normalizeNsfw(o?.kind === "dusk-nsfw" ? o.nsfw : o, { by: "user" });
    if (!n) throw new Error("성인 프로필 파일이 아니에요.");
    if (!(await confirmDialog(env.ctx.win, { title: `${doc.title}에게 불러올까요?`, body: `${o?.name && o.name !== doc.title ? `파일은 ‘${o.name}’의 프로필이에요. ` : ""}이 채팅의 성인 프로필을 파일 값으로 덮어써요.`, ok: "불러오기" }))) return;
    await save(env, doc, () => ({ ...n, tags: normTags(o?.nsfw?.tags ?? o?.tags) }));
    env.ctx.toast("성인 프로필을 불러왔어요");
  } catch (e) { env.ctx.toast(String(e?.message ?? e), { error: true }); }
}

// ── 지금 상태: 이 인물이 노리는 것·이 인물을 노리는 쪽·쉬는 턴(장면 판단) ──
export function nsfwStatusCard(env, card, doc) {
  if (!doc) return null;   // 위키 문서가 아직 없는 인물
  const d = driveOf(env.folder?.drive, doc.title);
  if (!d.aiming.length && !d.aimedAt.length && !d.restLeft) return card("지금 상태", [note("아직 장면 계획이 없어요. 성인 항목이 켜져 있으면 대화에서 이 인물이 누군가를 원할 때 생겨요.")], null, "rb-nsfw-base");
  const rung = (g) => h("span", { class: "track", role: "img", "aria-label": `단계 ${g.rung ?? 0}/5`, style: "display:inline-block;width:80px;height:6px;border-radius:3px;background:var(--rb-line2);overflow:hidden;vertical-align:middle;margin:0 6px" }, h("i", { style: { display: "block", height: "100%", width: `${((g.rung ?? 0) / 5) * 100}%`, background: "var(--rb-accent, #e07aa6)" } }));
  const li = (g, who) => h("li", { "data-k": "goal" }, h("b", null, who), ` · ${KIND_LABEL[g.kind] ?? g.kind}`, rung(g), h("small", { class: "rb-muted" }, `${RUNG_LABEL[g.rung ?? 0]} · 욕구 ${g.desire}${g.last ? ` · 마지막 반응 ${g.last === "yes" ? "받아 줌" : g.last === "no" ? "밀어냄" : "멈춤"}` : ""}`), g.move ? h("div", null, h("small", null, `다음 수: ${g.move}`)) : null);
  return card("지금 상태", [h("ul", { class: "rb-mem-reclist", id: "rb-nsfw-status" },
    ...d.aiming.map((g) => li(g, `→ ${g.target === "{{user}}" ? "나" : g.target}`)), ...d.aimedAt.map((g) => li(g, `${g.actor} →`)),
    d.restLeft ? h("li", { "data-k": "rest" }, `집착 방지로 ${d.restLeft}턴 쉬는 중`) : null),
    ...(d.log.length ? [h("small", { class: "rb-muted" }, "최근: " + d.log.map((x) => x.text).join(" · "))] : [])], null, "rb-nsfw-base");
}

// ── 관계 온도(장기기억 감정 기록으로, AI 호출 없음) ──
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); for (const c of kids) if (c) e.append(c); return e; };
export function nsfwTempCard(env, card, doc) {
  if (!doc) return null;
  const list = emoTemp(env.folder, doc.title); if (!list.length) return null;
  const w = 300, hh = 96, padR = 34;
  const rows = list.map((t) => {
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${hh}`, role: "img", "aria-label": `${t.toName}에 대한 관계 온도`, class: "rb-tg" });
    const defs = svgEl("defs"); svg.append(defs);
    for (const y of [0, 25, 50, 75, 100]) svg.append(svgEl("line", { x1: 0, x2: w - padR, y1: 4 + (hh - 8) * (1 - y / 100), y2: 4 + (hh - 8) * (1 - y / 100), class: y === 50 ? "mid" : "grid" }));
    for (const [k, label, color] of TEMP_LINES) {
      const xy = tempPath(t.points, k, w - padR, hh - 8).split(" ").filter(Boolean).map((pt) => pt.split(",").map(Number)).map(([x, y]) => [x, y + 4]);
      if (!xy.length) continue;
      const gid = `rbTg${k}${Math.random().toString(36).slice(2, 6)}`;
      defs.append(svgEl("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, svgEl("stop", { offset: 0, "stop-color": color, "stop-opacity": 0.22 }), svgEl("stop", { offset: 1, "stop-color": color, "stop-opacity": 0 })));
      const d = smoothPath(xy), end = xy.at(-1);
      svg.append(svgEl("path", { d: `${d} L${end[0]},${hh} L${xy[0][0]},${hh} Z`, fill: `url(#${gid})` }));
      svg.append(svgEl("path", { d, fill: "none", stroke: color, "stroke-width": 2.2, "stroke-linecap": "round", "vector-effect": "non-scaling-stroke", "data-k": k }, svgEl("title", {}, label)));
      svg.append(svgEl("circle", { cx: end[0], cy: end[1], r: 3, fill: color }));
      const val = Math.round(100 - ((end[1] - 4) / (hh - 8)) * 100);
      svg.append(svgEl("text", { x: end[0] + 6, y: end[1] + 3.5, fill: color, class: "v" }, String(val)));
    }
    return h("div", { class: "rb-tgrow" }, h("div", { class: "hd" }, h("b", null, t.toName), h("small", { class: "rb-muted" }, `${t.points.length}번 기록`)), svg);
  });
  const legend = h("div", { class: "rb-tglegend" }, ...TEMP_LINES.map(([k, l, c]) => h("span", { style: { "--c": c } }, l)));
  return card("📈 관계 온도", [legend, ...rows, note("장기 기억 감정 게이지가 기록될 때마다의 값이에요(0~100). AI를 더 부르지 않아요.")], null, "rb-nsfw-base");
}

// ── 성적 욕망·이상성향 직접 쓰기(인물 위키 프로필 칸). 저장하면 성인 프로필도 새로 만들지 묻는다 ──
export function nsfwDesireCard(env, card, doc) {
  const prof = env.folder?.wiki?.people?.profiles?.[doc?.id];
  if (!prof) return card("성적 욕망 · 이상성향", [note("이 인물은 기본 성격이 아직 없어요. 기본 성격이 만들어지면 여기서 직접 쓸 수 있어요.")], null, "rb-nsfw-base");
  const row = (field, title) => {
    const cur = String(prof[field]?.text ?? "").trim();
    return h("div", { class: "rb-wk2-ero-row", "data-field": field }, h("small", { class: "rb-muted" }, title),
      h("p", { class: "rb-wk2-p", style: "white-space:pre-wrap;margin:0" }, cur || "아직 없어요."),
      h("div", { class: "rb-mem-sact" }, btn(cur ? "직접 고치기" : "직접 쓰기", { size: "sm", id: `rb-nsfw-write-${field}`, onClick: () => writeDesire(env, doc, field, title, cur) })));
  };
  return card("성적 욕망 · 이상성향", [note("원하는 내용을 그대로 적어도 돼요. 적은 글은 인물 위키에 반영되고, 성인 프로필(체위·장소·플레이)의 바탕이 돼요."), row("sexualDesire", "성적 욕망"), row("paraphilia", "이상성향")], null, "rb-nsfw-base");
}
async function writeDesire(env, doc, field, title, cur) {
  const ta = h("textarea", { class: "rb-input", rows: 6, id: "rb-nsfw-desire-text", style: "width:100%" }, cur);
  const ok = await modal(env.ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": `${title} 쓰기`, style: "width:min(520px,94vw);display:flex;flex-direction:column;gap:10px" },
    h("h3", { class: "rb-h3" }, `${doc.title} · ${title}`), ta,
    h("div", { class: "rb-mem-edrow", style: "justify-content:flex-end;gap:6px" }, btn("취소", { onClick: () => done(false) }), btn("저장", { kind: "primary", id: "rb-nsfw-desire-save", onClick: () => done(true) }))));
  if (!ok) return;
  const text = String(ta.value ?? "").trim().slice(0, 700);
  try {
    const { updatePeopleSexualField } = await import("../../../engine/pot/people-profile.js");
    await memStore(env.ctx).updateFolder(env.bot.id, env.chatItem.id, (f) => { f.wiki = updatePeopleSexualField(f.wiki, doc.id, field, text, { manualEdited: true }); });
    // 장기 기억 위키 쪽(작동 중인 위키)에도 같은 글을 넣는다(다음 기록이 옛 글로 덮지 않게)
    try { const st = env.ctx.memory?.flow?.runtime?.()?.wiki?.requireStore?.(); if (st) { st.replace((v) => updatePeopleSexualField(v, doc.id, field, text, { manualEdited: true })); await st.flush?.(); } } catch { /* 위키가 꺼져 있으면 저장본만 */ }
    logEvent({ area: "성적 욕망·이상성향", title: `${doc.title} ${title} 직접 씀` });
  } catch (e) { return env.ctx.toast(String(e?.message ?? e), { error: true }); }
  env.redraw?.();
  if (await confirmDialog(env.ctx.win, { title: "성인 프로필도 새로 만들까요?", body: "적은 내용을 바탕으로 체위·장소·플레이·유혹 등을 다시 만들어요(호출 1번). 성적 수치와 태그는 그대로 둬요.", ok: "새로 만들기" })) {
    const n = env.folder?.nsfw?.[doc.id];
    await regenerate(env, doc, { keep: n?.sexual ? { sexual: n.sexual } : null });
  }
}
