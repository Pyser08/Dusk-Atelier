// v1.8.3 인물 위키 개편: 머리 + 탭(요약 / 관계 / 상세 정보 / 기록). 넓은 화면(@container memwrap ≥1100px)은 요약을 왼쪽에 고정하고 오른쪽에 탭.
// 관계 탭은 상대를 고르면 그 둘 사이의 관계 진도·감정·호칭과 말투·둘만의 추억·기대 차이·오해를 카드로 모아 보여 주고 고치게 한다.
// 기존 위키 블록(기본 성격·수치·항목 묶음·위키 패널)은 '상세 정보', 문서 관리·이야기 기록은 '기록' 탭으로 옮긴다(기능은 그대로).
import { h, replace } from "../../dom.js";
import { userLabel } from "./username.js";
import { userNsfwDoc, setUserNsfwNames } from "../../../engine/usernsfw.js";
import { userKeySet } from "../../../engine/memoryuser.js";
import { btn, modal, confirmDialog } from "../../kit.js";
import { mem, avatar, fail } from "./common.js";
import { editFolder } from "./people.js";
import { nsfwCard, nsfwStatusCard, nsfwTempCard, nsfwTagsCard } from "./nsfwcard.js";
import { adultCandCard } from "./adultcands.js";
import { marksCard, compatCard, statusCard, fertilityCard, outfitCard, raceCard, diaryCard } from "./extracards.js";   // 0.3.22 몸 흔적·궁합
import { subTabs } from "./subtabs.js";
import { lustCard, moodCard, bodyCard, humanCard, heatOf, heatFx, compareCard } from "./lifecards.js";
import { eroLoad, eroInfoCard, eroSumCard, eroPairCard, eroPartnerCards, eroSummaryCard } from "./erosyncwiki.js";
import { eroPerson, eroPersonByName } from "../../../engine/erosyncview.js";
import { EMO_TAGS, EMO_LABEL, GAUGE_MAX, setTag, tagsFor } from "../../../engine/memoryemo.js";
import { isLover, loverPairs, setLover, pairKey } from "../../../engine/lover.js";
import { timeline, eventText, isSecret, setSecret, unrequited } from "../../../engine/romance.js";
import { ensureMemAddonCss, wkLayoutOf } from "./memaddoncss.js";
import { parseCycleBody } from "../../../engine/pot/cycle-tracking.js";
import { TIE_KINDS, TIE_GROUPS, tiesBetween, setTies } from "../../../engine/ties.js";
import { extraOf } from "../../../engine/memextra.js";
import { editForm } from "./editrows.js";
import { ignoreKeyOf, addIgnore, dropIgnore } from "../../../engine/memedit.js";
import { keyOf, intimacyOf, setIntimacy, INTIM_MAX, INTIM_WORDS, setUserNames, nowOf, counterparts, pairView, changesOf, currentAttrs, momentsOf, returnGap, setTalk, toggleTalkLock, deleteTalk, editBond, deleteBond, resolveBelief, deleteBelief, resolveRift, deleteRift, setFace, deleteFace } from "../../../engine/memoryhuman.js";

const TONE = { formal: "존댓말", casual: "반말", mixed: "섞어 씀" };
// 인간다움 탭 재편(11-21 확정안): 요약 / 기본(성격·수치·상태이상·옷차림·종족) / 마음(감정·사람다움) / 관계(관계·마음 흐름) / 기억(기록 묶음·일기·이야기 기록) / 성인(따로)
const TABS = [["sum", "요약"], ["base", "기본"], ["mind", "마음"], ["rel", "관계"], ["mem", "기억"], ["nsfw", "성인"]];
const OLD_TAB = { info: "base", log: "mem" };   // 예전에 열어 둔 탭 이름
const GRADE_TIP = { A: "가장 중요한 순간", B: "중요한 순간", C: "보통", D: "사소한 일" };
const batchim = (w) => { const c = String(w ?? "").trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const subj = (name) => name + (batchim(name) ? "이" : "가");   // 받침 따라 이/가
const topic = (name) => name + (batchim(name) ? "은" : "는");   // 은/는
const obj = (name) => { const c = String(name ?? "").trim().slice(-1).charCodeAt(0); return name + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "을" : "를"); };
const shown = (n) => (n === "{{user}}" ? userLabel() : n);   // {{user}}는 페르소나 이름으로(모르면 '나')

const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const pct = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / Math.max(1, max - min)) * 100));

// parts: { r, doc, p, header(액션 버튼 묶음 또는 null), metrics:[{label,slot,value,min,max,stage,targets}], gauges:()=>Promise<[{name,icon,hue,v,min,max}]>, infoBlocks:[], logBlocks:[] }
export function personTabs(env, parts) {
  const { ctx } = env, m = mem(ctx), f = env.folder;
  ensureMemAddonCss(ctx);
  const { r, doc, p } = parts;
  const selfNames = [...new Set([r.name, doc?.title, ...(doc?.aliases ?? []), p?.name, ...(p?.aliases ?? [])].filter(Boolean))];
  const me = selfNames[0], now = nowOf(f), pk = r.id;
  const root = h("div", { class: "rb-wk2" });
  // 개편 시안 고르기(목업): m.wkLayout = "A" | "B" | "C" | "" (지금 화면)
  const lay = wkLayoutOf(m), fam = lay.slice(0, 1), sub = lay.slice(1);   // B1~B4: B안 갈래
  const tabs = (m.wkTab2 ??= {}), withSel = (m.wkWith ??= {}), rev = (m.wkFeelRev ??= {});
  const run = (pr) => Promise.resolve(pr).catch(fail(ctx));
  const save = (fn, ok) => editFolder(env, fn).then(() => ok && ctx.toast(ok));
  // 인간다움 2단계: 추억·갈등·오해 직접 추가·고치기, 지우면 무시 목록(기록기가 바로 다시 안 만듦). 고친 값은 잠그지 않음
  const HF = {
    bond: { box: "bonds", title: "둘만의 추억", fields: [{ k: "moment", label: "추억", len: 80 }, { k: "hook", label: "떠올릴 계기(예: 우산, 비)", len: 30, need: false }] },
    rift: { box: "rifts", title: "갈등", fields: [{ k: "about", label: "무엇 때문에", len: 80 }, { k: "state", label: "상태", type: "select", def: "open", opts: [["open", "안 풀림"], ["apologized", "사과함"], ["resolved", "화해함"]] }, { k: "grudge", label: "앙금", type: "select", def: "none", opts: [["none", "없음"], ["some", "조금"], ["deep", "깊음"]] }] },
    belief: { box: "beliefs", title: "오해", fields: [{ k: "thinks", label: "잘못 알고 있는 것", len: 80 }, { k: "truth", label: "실제로는", len: 80 }] },
  };
  // 관계 연표(전환점): 기록된 사건은 숨기기, 직접 적은 전환점은 고치기·지우기
  const tlSig = (e) => `${e.kind}|${e.at ?? ""}|${e.when ?? ""}|${[e.a, e.b].map((x) => String(x ?? "")).sort().join("+")}`;
  const samePair = (e, a, b) => [e.a, e.b].map((x) => String(x ?? "").replace(/\s+/g, "")).sort().join("|") === [a, b].map((x) => String(x ?? "").replace(/\s+/g, "")).sort().join("|");
  const TLF = [{ k: "when", label: "언제(예: 2025-03-14, 비워도 돼요)", len: 20, need: false }, { k: "note", label: "무슨 일", len: 60 }];
  const tlCard = (tl, other) => (tl.length || local) ? card("관계 연표", tl.length ? h("ol", { class: "rb-wk2-tl", id: "rb-rel-timeline" }, tl.map((e) => h("li", null,
    h("small", { class: "rb-muted" }, e.when || (e.at != null ? `#${e.at + 1} 응답` : "")), h("span", null, e.kind === "note" ? e.note : eventText(e)),
    local ? h("span", { class: "rb-er-acts" }, e.kind === "note" ? h("button", { type: "button", class: "rb-bzb", title: "고치기", "aria-label": "전환점 고치기", onClick: () => run(editForm(ctx.win, "전환점 고치기", TLF, e).then((v) => v && save((fo) => { const o = (fo.tlUser ?? []).find((y) => y.id === e.id); if (o) Object.assign(o, v); }, "고쳤어요."))) }, "✎") : null,
      h("button", { type: "button", class: "rb-bzb", title: e.kind === "note" ? "지우기" : "연표에서 숨기기", "aria-label": "전환점 지우기", onClick: () => save((fo) => { if (e.kind === "note") fo.tlUser = (fo.tlUser ?? []).filter((y) => y.id !== e.id); else fo.tlHide = [...new Set([...(fo.tlHide ?? []), tlSig(e)])].slice(-200); }, "지웠어요.") }, "✕")) : null))) : h("p", { class: "rb-muted" }, "아직 전환점이 없어요."),
    local ? btn("+ 전환점", { size: "sm", onClick: () => run(editForm(ctx.win, "전환점 추가", TLF).then((v) => v && save((fo) => { fo.tlUser = [...(fo.tlUser ?? []), { id: `utl${Date.now().toString(36)}`, kind: "note", a: me, b: other, ...v, at: turnNow(fo), user: true }].slice(-60); }, "추가했어요."))) }) : null, "rb-wk2-tlcard") : null;
  const local = env.backend?.id === "local";
  const editExp = (x) => run(editForm(ctx.win, "기대 차이 고치기", [{ k: "ae", label: `${shown(x.a)}의 기대`, len: 80 }, { k: "as", label: "말로 했나요", type: "select", opts: [["", "말하지 않음"], ["1", "말로 함"]] }, { k: "be", label: `${shown(x.b)}의 기대`, len: 80 }, { k: "bs", label: "말로 했나요", type: "select", opts: [["", "말하지 않음"], ["1", "말로 함"]] }], { ...x, as: x.as ? "1" : "", bs: x.bs ? "1" : "" })
    .then((v) => v && save((fo) => { for (const o of Object.values(fo.exp ?? {})) if (o.a === x.a && o.b === x.b) Object.assign(o, { ae: v.ae, be: v.be, as: !!v.as, bs: !!v.bs, user: true }); }, "고쳤어요.")));
  const turnNow = (fo) => (Number.isInteger(fo?.cursor?.at) ? fo.cursor.at : 0);
  const addHuman = (kind, other) => run(editForm(ctx.win, `${HF[kind].title} 추가`, kind === "belief" ? [{ k: "who", label: "누가 잘못 알고 있나요", type: "select", def: other, opts: [[other, shown(other)], [me, shown(me)]] }, ...HF[kind].fields] : HF[kind].fields).then((v) => v && save((fo) => {
    const item = { id: `u${kind}${Date.now().toString(36)}`, ...(kind === "belief" ? { open: true } : { a: me, b: other }), ...v, at: turnNow(fo), at_ms: Date.now(), user: true };
    dropIgnore(fo, ignoreKeyOf({ ...item, kind })); (fo[HF[kind].box] ??= []).push(item);
  }, "추가했어요.")));
  const editHuman = (kind, x) => run(editForm(ctx.win, `${HF[kind].title} 고치기`, HF[kind].fields, x).then((v) => v && save((fo) => {
    const o = (fo[HF[kind].box] ?? []).find((y) => y.id === x.id); if (o) Object.assign(o, v, { user: true });
  }, "고쳤어요.")));
  const ignoreHuman = (fo, kind, x) => addIgnore(fo, ignoreKeyOf({ ...x, kind }), { turn: turnNow(fo) });
  // Erosync(켜져 있을 때만): 읽어 오면 한 번 다시 그린다. 이름이 맞는 인물에게만 칸이 생긴다.
  let ero = null;
  const eroSelf = () => (ero ? eroPerson(ero, selfNames) : null);
  eroLoad(ctx).then((snap) => { if (snap) { ero = snap; if (eroSelf()) paint(); } }).catch(() => {});

  setUserNames(f, [userLabel(), ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.title, ...(ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.aliases ?? [])]);   // 페르소나 이름으로 따로 쌓인 기록도 {{user}} 한 사람으로
  const people = counterparts(f, selfNames, now);
  // 유저({{user}})는 관계 한눈에·관계 목록에서 늘 맨 위
  { const uk = userKeySet([userLabel(), ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.title, ...(ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.aliases ?? [])].filter(Boolean)), isU = (x) => uk.has(String(x?.name ?? "").toLowerCase().replace(/\s+/g, "")); people.sort((a, b) => isU(b) - isU(a)); }
  // 성별 색: folder.orient(Erosync에서 옮겨 온 성별) 또는 Erosync 인물의 gender. 여 = 분홍, 남 = 파랑
  const docGender = (name) => { const d = Object.values(f.wiki?.documents ?? {}).find((x) => x?.type === "Character" && [x.title, ...(x.aliases ?? [])].some((n) => nk(n) === nk(name))); return d ? f.gender?.[d.id]?.g : null; };
  const genderOf = (name) => { const g = docGender(name) ?? f.orient?.[nk(name)]?.g ?? (ero ? eroPersonByName(ero, name)?.gender : null); return g === "f" || g === "m" ? g : ""; };
  const gcls = (name) => (lay && genderOf(name) ? `g-${genderOf(name)}` : null);
  const person = p ?? { name: me, records: [] };
  const gap = returnGap(person, f.scenes ?? [], now + 1);
  const attrs = currentAttrs(person);
  const subline = attrs.slice(0, 2).map((a) => a.v).join(" · ") || (doc?.tags ?? []).slice(0, 2).join(" · ");

  // ── 요약 ──
  const card = (title, kids, extra, cls) => h("section", { class: ["rb-wk2-card", cls] }, h("div", { class: "rb-wk2-ch" }, h("b", null, title), h("span", { style: "flex:1" }), extra ?? null), kids);
  const profileText = (env.folder.wiki?.people?.profiles?.[doc?.id]?.summary) || p?.digest || "";
  // 2.2.30: 관계 진도(처음 봄→아주 가까움) 대신 관계 종류(가족·동료·주종·사제 …). 진도는 짐작이라 가족도 ‘처음 봄’으로 나와 몰입을 깼다
  const tiesWith = (other) => { const T = extraOf(f).ties, K = keyOf(f); for (const n of selfNames) { const t = tiesBetween(T, n, other, K); if (t.length) return t; } return []; };
  const tieText = (other) => tiesWith(other).map((t) => t.label).join(" · ");
  // 관계 종류 직접 고치기(저장하면 잠겨서 AI가 바꾸지 않음)
  const editTies = (other, cur) => run(modal(ctx.win, (done) => {
    const it = intimacyOf(f, me, other, now), intim = h("input", { class: "rb-input", type: "number", min: 0, max: INTIM_MAX, placeholder: `자동(${it.manual ? "-" : it.v})`, value: it.manual ? it.v : "", style: "width:110px", "aria-label": "친밀도" });
    const rows = TIE_KINDS.map((k) => {
      const had = cur.find((t) => t.id === k.id), cb = h("input", { type: "checkbox", checked: !!had, "aria-label": k.ko });
      const sel = k.up ? h("select", { class: "rb-input", style: "width:auto;padding:2px 6px", "aria-label": `${k.ko} 위쪽` }, h("option", { value: "" }, "위아래 모름"), h("option", { value: me, selected: had?.up && keyOf(f)(had.up) === keyOf(f)(me) }, `${subj(shown(me))} ${k.up[0]}`), h("option", { value: other, selected: had?.up && keyOf(f)(had.up) === keyOf(f)(other) }, `${subj(shown(other))} ${k.up[0]}`)) : null;
      return { k, cb, sel, el: h("label", { style: "display:flex;align-items:center;gap:8px;padding:3px 0" }, cb, h("span", { style: "min-width:96px" }, k.ko), sel) };
    });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(440px,94vw)" }, h("h3", null, `${shown(me)} ↔ ${shown(other)} 관계`), h("p", { class: "rb-muted" }, "여러 개 고를 수 있어요. 저장하면 잠겨서 AI가 바꾸지 않아요."),
      h("label", { class: "rb-mem-field", style: "display:flex;align-items:center;gap:8px" }, h("span", null, `친밀도 (0~${INTIM_MAX}, 비우면 자동)`), intim),
      h("div", { class: "rb-tie-groups", style: "max-height:46vh;overflow:auto" }, TIE_GROUPS.map(([g, gl]) => h("fieldset", { class: "rb-tie-g" }, h("legend", null, gl), rows.filter((x) => x.k.g === g).map((x) => x.el)))),
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ list: rows.filter((x) => x.cb.checked).map((x) => ({ id: x.k.id, up: x.sel?.value ?? "" })), intim: intim.value.trim() }) })));
  }).then((r) => r && save((fo) => { const e = extraOf(fo); setTies(e.ties, me, other, r.list); fo.extra = e; setIntimacy(fo, me, other, r.intim === "" ? null : r.intim); }, "관계를 저장했어요.")));
  const goPair = (name) => { withSel[pk] = name; tabs[pk] = "rel"; paint(); };
  // 수치(리수폿 호감도·첫인상·음란도·의심도 등)와 직접 만든 게이지
  const metrics = parts.metrics ?? [];
  const metricRow = (x, withTarget) => h("div", { class: "rb-wk2-num" }, h("span", { class: "n" }, x.label, withTarget && x.targets.length ? h("small", { class: "rb-muted" }, ` · ${x.targets.map(shown).join(" → ")}`) : null),
    h("span", { class: "track", role: "progressbar", "aria-label": x.label, "aria-valuemin": x.min, "aria-valuemax": x.max, "aria-valuenow": x.value }, h("i", { style: { width: `${pct(x.value, x.min, x.max)}%` } })),
    h("small", { class: "v" }, `${x.value}/${x.max}`), x.stage ? h("small", { class: "rb-muted s" }, x.stage) : null);
  let gauges = null;   // 한 번만 불러온다
  const gaugeBox = h("div", { class: "rb-wk2-nums" });
  const fillGauges = () => {
    const rows = (gauges ?? []).map((g) => h("div", { class: "rb-wk2-num g" }, h("span", { class: "n" }, g.icon ? g.icon + " " : "", g.name),
      h("span", { class: "track", role: "progressbar", "aria-label": g.name, "aria-valuemin": g.min, "aria-valuemax": g.max, "aria-valuenow": g.v }, h("i", { style: { width: `${pct(g.v, g.min, g.max)}%`, background: `hsl(${g.hue} 70% 62%)` } })),
      h("small", { class: "v" }, `${g.v}/${g.max}`)));
    gaugeBox.replaceChildren(...rows);
    numCard.hidden = !metrics.length && !rows.length;
  };
  const numCard = card("수치 한눈에", [h("div", { class: "rb-wk2-nums" }, metrics.map((x) => metricRow(x, true))), gaugeBox],
    h("button", { type: "button", class: "rb-wk2-link", onClick: () => { tabs[pk] = "base"; paint(); } }, "자세히"));
  numCard.hidden = !metrics.length;
  if (parts.gauges) Promise.resolve().then(parts.gauges).then((g) => { gauges = g ?? []; fillGauges(); }).catch(() => {});
  const glanceCard = () => people.length ? card("관계 한눈에", h("div", { class: "rb-wk2-glance" }, (lay === "B4" ? people : people.slice(0, 6)).map((x) => h("button", { type: "button", class: ["rb-wk2-gl", selfNames.some((n) => isLover(f, n, x.name)) && "lover", gcls(x.name)], "aria-pressed": lay === "B4" && x.name === (withSel[pk] ?? people[0]?.name) ? "true" : null, onClick: () => goPair(x.name) }, avatar(shown(x.name), ""), h("b", null, shown(x.name)), tieText(x.name) ? h("small", { class: "rb-wk2-tie" }, tieText(x.name)) : null))), h("small", { class: "rb-muted" }, "누르면 관계 탭")) : null;
  // what: "all"(예전·모바일 요약 탭) | "side"(B4 PC 왼쪽 열: 수치·관계 한눈에) | "tab"(B4 PC 요약 탭: 나머지를 꾸며서)
  const summary = (what = "all") => {
    const prof = () => card(`지금의 ${me}`, [profileText ? h("p", { class: "rb-wk2-p" }, profileText) : h("p", { class: "rb-muted" }, "아직 요약이 없어요. 상세 정보에서 기본 성격을 만들거나 ‘요약 정리’를 눌러 보세요."),
      attrs.length ? h("div", { class: "rb-wk2-chips" }, attrs.map((a) => h("span", { class: "rb-wk2-chip" }, h("small", null, a.label), " ", a.v))) : null], null, "rb-sum-prof");
    const eroS = () => { const e = eroSelf(); return e ? eroSumCard(ctx, card, ero, e) : null; };
    const chg = () => changesOf(person).length ? card("이전과 달라진 점", h("div", { class: "rb-wk2-chg" }, changesOf(person).map((c) => h("div", { class: "rb-sum-chgrow" }, h("small", null, c.label), h("span", null, h("s", null, c.from), h("i", { class: "arr", "aria-hidden": "true" }, "→"), h("b", null, c.to))))), null, "rb-sum-chg") : null;
    const mom = () => p ? card("기억에 남은 순간", h("div", { class: "rb-wk2-mom" }, momentsOf(person, now).map(({ r: rec, earlier, vague }) => h("div", { class: ["rb-wk2-mrow", vague && "vague"] }, h("span", { class: `rb-wk2-g g-${rec.g}`, title: GRADE_TIP[rec.g] ?? "" }, rec.g ?? "-"),
      h("span", { class: "t" }, rec.act, earlier ? h("small", { class: "tag old" }, "예전 모습") : null, vague ? h("small", { class: "tag" }, "흐릿한 기억 · 곧 잊혀요") : null)))),
      null, "rb-wk2-moments") : null;
    if (what === "side") return h("div", { class: "rb-wk2-sum side" }, glanceCard(), numCard);   // 관계 한눈에(상대 고르기)를 프로필 바로 아래에
    if (what === "tab") return h("div", { class: "rb-wk2-sum rb-sum-tab" }, prof(), chg(), eroS(), mom());
    if (what === "log") return chg() || mom() ? h("div", { class: "rb-wk2-sum rb-sum-tab rb-sum-log" }, chg(), mom()) : null;   // B4 기록 탭 맨 위: 달라진 점·기억에 남은 순간
    return h("div", { class: ["rb-wk2-sum", lay === "B4" && "rb-sum-tab"] }, prof(), numCard, eroS(), chg(), glanceCard(), mom());
  };

  // ── 관계 ──
  const loverWith = (other) => selfNames.some((n) => isLover(f, n, other));
  // 2.2.30 친밀도 고리(두 사람 공통) · 관계 카드(친밀도 + 양쪽 호감 마주 보기 막대 + 관계 종류)
  const intimRing = (other, big) => { const it = intimacyOf(f, me, other, now), r = 34, c = 2 * Math.PI * r;
    return h("div", { class: ["rb-gx-ring", "e-intim-c", big && "big"], title: it.manual ? "직접 정한 값" : "함께한 장면·추억·감정·관계 종류로 계산해요", role: "progressbar", "aria-label": "친밀도", "aria-valuemin": 0, "aria-valuemax": INTIM_MAX, "aria-valuenow": it.v },
      h("svg", { viewBox: "0 0 84 84", "aria-hidden": "true", ref: (el) => { el.innerHTML = `<circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" style="stroke-dasharray:${c};--off:${c * (1 - it.v / INTIM_MAX)}"/>`; } }),
      h("div", { class: "in" }, h("b", null, String(it.v)), h("small", null, "친밀도")), it.manual ? h("small", { class: "lk", title: "직접 정한 값" }, "🔒") : null); };
  const relMeter = (v, other) => {
    const it = intimacyOf(f, me, other, now), side = (back, t) => (back ? v.feel.ba : v.feel.ab)?.tags?.[t] ?? 0, known = (back, t) => (back ? v.feel.ba : v.feel.ab)?.stored?.[t] != null;
    const fly = (t, label) => h("div", { class: ["rb-rm-row", `e-${t}-c`] },
      h("b", { class: "v" }, known(false, t) ? String(side(false, t)) : "—"),
      h("span", { class: "t l", role: "img", "aria-label": `${me} → ${shown(other)} ${label} ${side(false, t)}` }, h("i", { style: { width: `${side(false, t) * 10}%` } })),
      h("small", { class: "lb" }, label),
      h("span", { class: "t r", role: "img", "aria-label": `${shown(other)} → ${me} ${label} ${side(true, t)}` }, h("i", { style: { width: `${side(true, t) * 10}%` } })),
      h("b", { class: "v" }, known(true, t) ? String(side(true, t)) : "—"));
    return h("div", { class: "rb-rm" },
      h("div", { class: "rb-rm-hero" }, h("div", { class: "who" }, avatar(me, ""), h("b", null, me)), h("div", { class: "mid" }, intimRing(other, true), h("small", { class: "word" }, INTIM_WORDS[it.v] ?? "")), h("div", { class: "who" }, avatar(shown(other), ""), h("b", null, shown(other)))),
      h("div", { class: "rb-rm-rows" }, fly("affection", "인간적 호감"), fly("attraction", "이성적 호감")),
      h("small", { class: "rb-rm-leg rb-muted" }, h("span", null, `← ${subj(me)} 느끼는 마음`), h("span", null, `${subj(shown(other))} 느끼는 마음 →`)));
  };
  const feelCard = (v, other, dir) => {   // dir: 없으면 방향 바꾸기 링크, true/false면 그 방향 고정(A안 마주 보기)
    const TAGS = tagsFor(loverWith(other));   // 2.2.6 소유욕·독점욕은 애인일 때만
    const fixed = dir != null, back = fixed ? dir : !!rev[pk + "|" + other], fv = back ? v.feel.ba : v.feel.ab, a = back ? shown(other) : me, b = back ? me : shown(other);
    const edit = () => run(modal(ctx.win, (done) => {
      const ins = Object.fromEntries(TAGS.map((t) => [t, h("input", { class: "rb-input", type: "number", min: 0, max: GAUGE_MAX, placeholder: "비움", value: fv?.stored?.[t] ?? "", "aria-label": EMO_LABEL[t] })]));
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(420px,94vw)" }, h("h3", null, `${subj(a)} ${b}에게 느끼는 감정`), h("p", { class: "rb-muted" }, "0~10. 고친 값은 출발점이 되고, 이후엔 대화에 따라 AI가 이어서 바꿔요. 비우면 ‘모름’으로 돌아가요. 소유욕·독점욕은 애인 사이에서만 보여요."),
        h("div", { class: "rb-wk2-form" }, TAGS.map((t) => h("label", { class: "rb-mem-field" }, h("span", null, EMO_LABEL[t]), ins[t]))),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done(ins) })));
    }).then((ins) => ins && save((fo) => { for (const t of TAGS) { const raw = ins[t].value.trim(), cur = fv?.stored?.[t]; const val = raw === "" ? null : Math.max(0, Math.min(GAUGE_MAX, Math.round(Number(raw)))); if ((cur ?? null) !== val) setTag(fo, back ? other : me, back ? me : other, t, val); } }, "감정을 고쳤어요.")));
    const rows = fv ? TAGS.filter((t) => fv.stored[t] != null).map((t) => {
      const val = fv.tags[t], was = fv.stored[t];
      return h("div", { class: "rb-wk2-bar" }, h("i", { class: `dot e-${t}`, "aria-hidden": "true" }), h("span", null, EMO_LABEL[t]),
        h("span", { class: "track", role: "progressbar", "aria-label": EMO_LABEL[t], "aria-valuemin": 0, "aria-valuemax": GAUGE_MAX, "aria-valuenow": val }, was > val ? h("i", { class: `ghost e-${t}`, style: { width: `${(was / GAUGE_MAX) * 100}%` } }) : null, h("i", { class: `e-${t}`, style: { width: `${(val / GAUGE_MAX) * 100}%` } })),
        h("small", null, `${val}/${GAUGE_MAX}`), fv.lock?.[t] ? h("small", { class: "rb-muted", title: "직접 정한 값(잠김)" }, "🔒") : null);
    }) : [];
    // 개편: 게이지 모양을 나눈다 — 호감 둘은 큰 고리, 신뢰·존경·의존은 막대, 적대·두려움은 칸, 소유욕·독점욕은 하트
    const fancy = () => {
      const has = (t) => fv?.stored?.[t] != null, val = (t) => fv.tags[t] ?? 0;
      // 적대감이 3 이상이면 호감 고리에 금이 가고(cracked), 6 이상이면 깨진다(broken)
      const hos = fv?.tags?.hostility ?? 0, crack = hos >= 6 ? "broken" : hos >= 3 ? "cracked" : null;
      const ring = (t, label) => { const v = val(t), r = 34, c = 2 * Math.PI * r;
        return h("div", { class: ["rb-gx-ring", `e-${t}-c`, !has(t) && "empty", has(t) && crack], title: crack ? `적대감 ${hos} — 호감에 ${crack === "broken" ? "금이 크게 갔어요" : "금이 갔어요"}` : null, role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": GAUGE_MAX, "aria-valuenow": v },
          h("svg", { viewBox: "0 0 84 84", "aria-hidden": "true", ref: (el) => { el.innerHTML = `<circle cx="42" cy="42" r="${r}" class="bg"/><circle cx="42" cy="42" r="${r}" class="fg" style="stroke-dasharray:${c};--off:${c * (1 - v / GAUGE_MAX)}"/>`; } }),
          crack && has(t) ? h("span", { class: "rb-gx-crack", "aria-hidden": "true", ref: (el) => { el.innerHTML = '<svg viewBox="0 0 84 84"><path d="M44 4 L38 22 L48 30 L36 44 L46 54 L40 80"/><path d="M48 30 L60 34"/><path d="M36 44 L24 46"/></svg>'; } }) : null,
          crack && has(t) ? h("small", { class: "rb-gx-hb", "aria-hidden": "true" }, "💔") : null,
          h("div", { class: "in" }, h("b", null, has(t) ? String(v) : "—"), h("small", null, label)), fv.lock?.[t] ? h("small", { class: "lk", title: "직접 정한 값(잠김)" }, "🔒") : null); };
      const BAR = ["trust", "respect", "dependence"], PIP = ["hostility", "fear"], HEART = ["possess", "exclusive"];
      const bar = (t) => h("div", { class: "rb-gx-bar" }, h("span", null, EMO_LABEL[t]), h("span", { class: "track" }, h("i", { class: `e-${t}`, style: { width: `${val(t) * 10}%` } })), h("small", null, String(val(t))));
      const pips = (t, heart) => h("div", { class: ["rb-gx-pips", heart && "heart"] }, h("span", null, EMO_LABEL[t]), h("span", { class: "row", role: "img", "aria-label": `${EMO_LABEL[t]} ${val(t)}/${GAUGE_MAX}` }, Array.from({ length: GAUGE_MAX }, (_, i) => h("i", { class: [i < val(t) && "on", `e-${t}-c`], style: { "--i": i } }))), h("small", null, String(val(t))));
      const shownT = (list) => list.filter((t) => TAGS.includes(t) && has(t));
      return h("div", { class: "rb-gx" },
        h("div", { class: "rb-gx-rings three" }, ring("affection", "인간적 호감"), intimRing(other), ring("attraction", "이성적 호감")),
        shownT(BAR).length ? h("div", { class: "rb-gx-group" }, shownT(BAR).map(bar)) : null,
        shownT(PIP).length ? h("div", { class: "rb-gx-group" }, shownT(PIP).map((t) => pips(t))) : null,
        shownT(HEART).length ? h("div", { class: "rb-gx-group" }, shownT(HEART).map((t) => pips(t, true))) : null);
    };
    return card(`${subj(a)} ${b}에게 느끼는 감정`, [
      lay && fv ? fancy() : rows.length ? rows : h("p", { class: "rb-muted" }, "아직 기록된 감정이 없어요."),
      rows.length && rows.length < TAGS.length ? h("small", { class: "rb-muted rb-wk2-unset" }, `아직 없음 · ${TAGS.filter((t) => fv.stored[t] == null).map((t) => EMO_LABEL[t]).join(" · ")}`) : null,
      ...(fv?.cooled ?? []).map((c) => h("div", { class: "rb-wk2-note cool" }, `${subj(EMO_LABEL[c.tag])} 시간이 지나 ${c.from} → ${c.to}로 식었어요`)),
      fixed ? null : h("button", { type: "button", class: "rb-wk2-link", onClick: () => { rev[pk + "|" + other] = !back; paint(); } }, back ? `${subj(me)} ${shown(other)}에게 느끼는 감정 보기` : `${subj(shown(other))} ${me}에게 느끼는 감정 보기`)],
      btn("고치기", { size: "sm", onClick: edit }));
  };
  const talkRow = (t, from, to) => {
    const write = () => run(modal(ctx.win, (done) => {
      const call = h("input", { class: "rb-input", value: t?.call ?? "", placeholder: "예) 선배, 유나야", "aria-label": "부르는 말" });
      const tone = h("select", { class: "rb-input", "aria-label": "말투" }, Object.entries(TONE).map(([k, l]) => h("option", { value: k, selected: (t?.tone ?? "formal") === k }, l)));
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(420px,94vw)" }, h("h3", null, `${subj(shown(from))} ${obj(shown(to))} 부르는 말`), h("p", { class: "rb-muted" }, "저장하면 잠겨서 AI가 바꾸지 않아요."),
        h("label", { class: "rb-mem-field" }, h("span", null, "부르는 말"), call), h("label", { class: "rb-mem-field" }, h("span", null, "말투"), tone),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ call: call.value, tone: tone.value }) })));
    }).then((v) => v && save((fo) => { setTalk(fo, from, to, v); }, "호칭을 저장했어요.")));
    return h("div", { class: "rb-wk2-talk" },
      h("small", { class: "rb-muted" }, `${subj(shown(from))} ${obj(shown(to))}`),
      t ? h("div", { class: "rb-wk2-tline" }, h("span", { class: "rb-wk2-bubble" }, `“${t.call}”`), h("small", { class: "rb-wk2-chip" }, TONE[t.tone] ?? t.tone), t.lock ? h("small", { class: "rb-muted", title: "잠김: AI가 바꾸지 않아요" }, "🔒") : null) : h("p", { class: "rb-muted" }, "아직 기록이 없어요."),
      t?.prev ? h("div", { class: "rb-wk2-tchg" }, h("small", { class: "rb-wk2-badge" }, "바뀜"), h("s", null, `${t.prev.call} · ${TONE[t.prev.tone] ?? t.prev.tone}`), " → ", h("span", null, `${t.call} · ${TONE[t.tone] ?? t.tone}`)) : null,
      h("div", { class: "rb-wk2-acts" }, btn(t ? "고치기" : "직접 적기", { size: "sm", onClick: write }),
        t ? btn(t.lock ? "잠금 풀기" : "잠그기", { size: "sm", onClick: () => save((fo) => { toggleTalkLock(fo, t.k); }) }) : null,
        t ? btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 호칭을 지울까요?", body: `“${t.call}”`, ok: "지우기", danger: true })) save((fo) => { deleteTalk(fo, t.k); }, "지웠어요."); } }) : null));
  };
  const bondItem = (b) => h("div", { class: "rb-wk2-bond" }, h("span", { class: "t" }, b.moment), b.hook ? h("small", { class: "rb-muted" }, `떠올릴 계기 · ${b.hook}`) : null,
    h("div", { class: "rb-wk2-acts" }, btn("고치기", { size: "sm", onClick: () => run(modal(ctx.win, (done) => {
      const mo = h("input", { class: "rb-input", value: b.moment, "aria-label": "추억" }), hk = h("input", { class: "rb-input", value: b.hook ?? "", placeholder: "예) 우산, 비", "aria-label": "떠올릴 계기" });
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(440px,94vw)" }, h("h3", null, "둘만의 추억 고치기"), h("label", { class: "rb-mem-field" }, h("span", null, "추억"), mo), h("label", { class: "rb-mem-field" }, h("span", null, "떠올릴 계기"), hk),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ moment: mo.value, hook: hk.value }) })));
    }).then((v) => v && save((fo) => { editBond(fo, b.id, v); }, "고쳤어요."))) }),
      btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 추억을 지울까요?", body: b.moment, ok: "지우기", danger: true })) save((fo) => { ignoreHuman(fo, "bond", b); deleteBond(fo, b.id); }, "지웠어요."); } })));
  const beliefItem = (b) => h("div", { class: ["rb-wk2-belief", !b.open && "done"] },
    h("small", null, b.open ? `${topic(shown(b.who))} 이렇게 알고 있어요` : `${subj(shown(b.who))} 잘못 알던 것 · 풀림`), h("b", null, `“${b.thinks}”`),
    h("small", null, "실제로는"), h("span", null, b.truth), b.by ? h("small", { class: "rb-muted" }, `${subj(shown(b.by))} 그렇게 말했어요`) : null,
    h("div", { class: "rb-wk2-acts" }, btn("고치기", { size: "sm", onClick: () => editHuman("belief", b) }), b.open ? btn("진실을 알았어요", { size: "sm", onClick: () => save((fo) => { resolveBelief(fo, b.id); }, "풀린 것으로 표시했어요.") }) : null,
      btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 오해 기록을 지울까요?", body: b.thinks, ok: "지우기", danger: true })) save((fo) => { ignoreHuman(fo, "belief", b); deleteBelief(fo, b.id); }, "지웠어요."); } })));
  // ⑦ 갈등·사과·앙금
  const RIFT_STATE = { open: "안 풀림", apologized: "사과함", resolved: "화해함" };
  const riftItem = (rf) => {
    const closed = rf.state === "resolved" && (rf.grudge ?? "none") === "none";
    const grudge = rf.grudge === "deep" ? "앙금 깊음" : rf.grudge === "some" ? "앙금 조금" : "";
    return h("div", { class: ["rb-wk2-rift", closed && "done", `s-${rf.state}`] },
      h("div", { class: "rb-wk2-tline" }, h("small", { class: "rb-wk2-badge st" }, RIFT_STATE[rf.state] ?? rf.state), grudge ? h("small", { class: "rb-wk2-badge gr" }, grudge + (rf.who ? ` · ${shown(rf.who)}` : "")) : null),
      h("span", { class: "t" }, rf.about),
      h("div", { class: "rb-wk2-acts" }, btn("고치기", { size: "sm", onClick: () => editHuman("rift", rf) }), closed ? null : btn("풀렸어요", { size: "sm", onClick: () => save((fo) => { resolveRift(fo, rf.id); }, "화해한 것으로 표시했어요.") }),
        btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 갈등 기록을 지울까요?", body: rf.about, ok: "지우기", danger: true })) save((fo) => { ignoreHuman(fo, "rift", rf); deleteRift(fo, rf.id); }, "지웠어요."); } })));
  };
  // ⑧ 사람 앞에서 달라지는 태도
  const faceRow = (x, who, to) => {
    const write = () => run(modal(ctx.win, (done) => {
      const al = h("input", { class: "rb-input", value: x?.alone ?? "", placeholder: "예) 솔직하게 고마워한다", "aria-label": "둘이 있을 때" });
      const pu = h("input", { class: "rb-input", value: x?.public ?? "", placeholder: "예) 괜히 퉁명스럽게 군다", "aria-label": "다른 사람 앞에서" });
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(440px,94vw)" }, h("h3", null, `${subj(shown(who))} ${shown(to)}에게 보이는 태도`), h("p", { class: "rb-muted" }, "저장하면 잠겨서 AI가 바꾸지 않아요."),
        h("label", { class: "rb-mem-field" }, h("span", null, "둘이 있을 때"), al), h("label", { class: "rb-mem-field" }, h("span", null, "다른 사람 앞에서"), pu),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done({ alone: al.value, public: pu.value }) })));
    }).then((v) => v && save((fo) => { setFace(fo, who, to, v); }, "태도를 저장했어요.")));
    return h("div", { class: "rb-wk2-talk" },
      h("small", { class: "rb-muted" }, `${subj(shown(who))} ${shown(to)}에게`),
      x ? h("div", { class: "rb-wk2-face" }, h("small", null, "둘이 있을 때"), h("span", null, x.alone), h("small", null, "다른 사람 앞에서"), h("span", null, x.public)) : h("p", { class: "rb-muted" }, "아직 기록이 없어요."),
      h("div", { class: "rb-wk2-acts" }, btn(x ? "고치기" : "직접 적기", { size: "sm", onClick: write }), x?.lock ? h("small", { class: "rb-muted", title: "잠김: AI가 바꾸지 않아요" }, "잠김") : null,
        x ? btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 태도 기록을 지울까요?", body: x.public, ok: "지우기", danger: true })) save((fo) => { deleteFace(fo, x.k); }, "지웠어요."); } }) : null));
  };
  // 2.2.6 애인: 기록기가 남긴 관계(tie)에 연인·배우자처럼 명확한 말이 있을 때 자동으로. 직접 정하거나 끌 수도 있다.
  const loverCard = (other) => {
    const lp = loverPairs(f).find((x) => selfNames.some((n) => pairKey(x.a, x.b) === pairKey(n, other)));
    const manual = f.lovers?.[pairKey(me, other)];
    const set = (on) => save((fo) => { setLover(fo, me, other, on); }, on === true ? "애인으로 표시했어요." : on === false ? "애인이 아닌 것으로 표시했어요." : "자동 판정으로 돌렸어요.");
    if (!lp) return card("애인", [h("p", { class: "rb-muted" }, manual === false ? "애인이 아닌 것으로 직접 정해 두었어요." : "애인으로 볼 만한 명확한 근거가 아직 없어요. 대화에서 연인·배우자 관계가 분명히 드러나면 자동으로 표시돼요."),
      h("div", { class: "rb-wk2-acts" }, btn("애인으로 표시", { size: "sm", id: "rb-lover-on", onClick: () => set(true) }), manual === false ? btn("자동 판정으로", { size: "sm", onClick: () => set(null) }) : null)], null, "rb-wk2-lovercard off");
    return card("💗 애인", [h("p", { class: "rb-wk2-p" }, `${shown(lp.b)} · ${shown(lp.a)}의 ${lp.kind}`),
      h("small", { class: "rb-muted" }, lp.by === "user" ? "직접 정했어요." : "대화에서 확인된 관계예요. 소유욕·독점욕 게이지가 함께 움직여요."),
      h("div", { class: "rb-wk2-acts" }, btn(isSecret(f, me, other) ? "🤫 비밀 연애 · 풀기" : "비밀 연애로", { size: "sm", id: "rb-lover-secret", title: "비밀 연애면 남들 앞에서는 아는 사이처럼 굴어요", onClick: () => save((fo) => { setSecret(fo, me, other, !isSecret(f, me, other)); }, isSecret(f, me, other) ? "비밀 연애를 풀었어요." : "비밀 연애로 표시했어요.") }),
        btn("애인 아님", { size: "sm", id: "rb-lover-off", onClick: () => set(false) }), manual ? btn("자동 판정으로", { size: "sm", onClick: () => set(null) }) : null)], null, "rb-wk2-lovercard");
  };
  const unreqOf = (other) => unrequited(f).find((x) => selfNames.some((n) => (nk(x.from) === nk(n) && nk(x.to) === nk(other)) || (nk(x.to) === nk(n) && nk(x.from) === nk(other))));
  // 상대 한 명과의 카드 조각. 빈 칸은 null 대신 empty에 이름만 모은다(개편 A·B·C안에서 숨김).
  const pieces = (other) => {
    const v = pairView(f, selfNames, other, now), ties = tiesWith(other), empty = [];
    const hide = new Set(f.tlHide ?? []), mine = (f.tlUser ?? []).filter((e) => selfNames.some((n) => samePair(e, n, other)));
    const tl = [...selfNames.flatMap((n) => timeline(f, n, other)).filter((e, i, a) => a.indexOf(e) === i && !hide.has(tlSig(e))), ...mine].sort((x, y) => (x.at ?? -1) - (y.at ?? -1)), u = unreqOf(other);
    const ms = metrics.filter((x) => x.targets.some((t) => nk(t) === nk(other)));
    const P = {
      v, ties,
      stage: card("관계", [relMeter(v, other), ties.length ? h("div", { class: "rb-wk2-chips" }, ties.map((t) => h("span", { class: "rb-wk2-chip rb-wk2-tie" }, t.label))) : h("p", { class: "rb-muted" }, "아직 드러난 관계가 없어요. 가족·동료·주종처럼 이야기에 나오면 채워져요."),
        h("p", { class: "rb-muted" }, `함께한 장면 ${v.stage.shared}번`)], btn("고치기", { size: "sm", onClick: () => editTies(other, ties) }), "rb-wk2-stagecard rb-rm-card"),
      lover: loverCard(other),
      tl: tlCard(tl, other),
      unreq: u ? card("짝사랑", h("p", { class: "rb-wk2-p" }, `${subj(shown(u.from))} ${shown(u.to)}에게 끌리지만(끌림 ${u.v}) 상대는 아직 아니에요(끌림 ${u.back}).`), null, "rb-wk2-lovercard off") : null,
      nums: ms.length ? card("수치", [...ms.map((x) => metricRow(x, true)), h("small", { class: "rb-muted" }, "이 상대가 대상인 수치만 보여요.")]) : null,
      talk: card("호칭 · 말투", [talkRow(v.talk.ab, me, other), h("hr", { class: "rb-wk2-hr" }), talkRow(v.talk.ba, other, me)]),
      rifts: v.rifts?.length ? card("갈등", v.rifts.map(riftItem), btn("+ 추가", { size: "sm", onClick: () => addHuman("rift", other) })) : null,
      bonds: v.bonds.length ? card("둘만의 추억", v.bonds.map(bondItem), btn("+ 추가", { size: "sm", onClick: () => addHuman("bond", other) })) : null,
      exp: v.exp ? card("기대 차이", h("div", { class: "rb-wk2-exp" }, [[v.exp.a, v.exp.ae, v.exp.as], [v.exp.b, v.exp.be, v.exp.bs]].map(([n, e, said]) => h("div", null, h("small", { class: "rb-muted" }, `${topic(shown(n))}`), h("span", null, e), h("small", { class: "rb-muted" }, said ? "말로 했어요" : "말하지 않았어요")))),
        local ? h("span", { class: "rb-er-acts" }, btn("고치기", { size: "sm", onClick: () => editExp(v.exp) }), btn("지우기", { size: "sm", onClick: () => save((fo) => { for (const [k, x] of Object.entries(fo.exp ?? {})) if (x.a === v.exp.a && x.b === v.exp.b) delete fo.exp[k]; }, "지웠어요.") })) : null) : null,
      face: card("사람 앞 태도", [faceRow(v.face?.ab, me, other), h("hr", { class: "rb-wk2-hr" }), faceRow(v.face?.ba, other, me)]),
      beliefs: v.beliefs.length ? card("오해", v.beliefs.map(beliefItem), btn("+ 추가", { size: "sm", onClick: () => addHuman("belief", other) }), "warn") : null,
      ero: eroPairCard(ctx, card, ero, eroSelf(), ero ? eroPersonByName(ero, other) : null),
      empty, other,
    };
    const talkEmpty = !v.talk.ab && !v.talk.ba, faceEmpty = !v.face?.ab && !v.face?.ba;
    if (!v.bonds.length) empty.push("둘만의 추억");
    if (!v.rifts?.length) empty.push("갈등");
    if (!v.exp) empty.push("기대 차이");
    if (!v.beliefs.length) empty.push("오해");
    P.talkEmpty = talkEmpty; P.faceEmpty = faceEmpty;
    return P;
  };
  const feelOf = (v, back, t) => (back ? v.feel.ba : v.feel.ab)?.tags?.[t] ?? 0;
  const emptyRow = (P) => {
    const names = [...P.empty, ...(P.talkEmpty ? ["호칭 · 말투"] : []), ...(P.faceEmpty ? ["사람 앞 태도"] : [])];
    if (!names.length) return null;
    const key = pk + "|empty", open = !!rev[key];
    return h("div", { class: "rb-wk2-empty" }, h("small", { class: "rb-muted" }, "아직 없는 칸 · " + names.join(" · ")),
      ...[["둘만의 추억", "bond"], ["갈등", "rift"], ["오해", "belief"]].filter(([n]) => P.empty.includes(n)).map(([n, k]) => h("button", { type: "button", class: "rb-wk2-link", onClick: () => addHuman(k, P.other) }, `+ ${n}`)),
      (P.talkEmpty || P.faceEmpty) ? h("button", { type: "button", class: "rb-wk2-link", onClick: () => { rev[key] = !open; paint(); } }, open ? "접기" : "직접 적기") : null,
      open ? h("div", { class: "rb-wk2-emptybody" }, P.talkEmpty ? P.talk : null, P.faceEmpty ? P.face : null) : null);
  };
  // 아직 없는 갈등·오해를 직접 적는 줄(기본 배치용)
  const addRow = (P) => { const ks = [["갈등", "rift"], ["오해", "belief"]].filter(([n]) => P.empty.includes(n));
    return ks.length ? h("div", { class: "rb-wk2-empty" }, h("small", { class: "rb-muted" }, "직접 적기"), ...ks.map(([n, k]) => h("button", { type: "button", class: "rb-wk2-link", onClick: () => addHuman(k, P.other) }, `+ ${n}`))) : null; };
  const filled = (P) => [P.nums, P.talkEmpty ? null : P.talk, P.rifts, P.bonds, P.exp, P.faceEmpty ? null : P.face, P.beliefs, P.ero].filter(Boolean);
  // addon-rebuild: 이 상대와의 관계 지우기(잘못 붙은 관계 — 예: 스친 엑스트라). 위키 화면이 넘겨준 removeRelation이 있을 때만.
  const relDel = (other) => typeof parts.removeRelation === "function" && other ? h("div", { class: "rb-mem-sact" }, btn(`${shown(other)}와의 관계 지우기`, { size: "sm", id: "rb-wk2-reldel", title: "두 사람 사이 감정·관계 기록과 위키의 서로에 대한 항목을 지워요", onClick: () => parts.removeRelation(other) })) : null;
  const hint = () => h("p", { class: "rb-wk2-hint rb-muted" }, "이 내용은 AI가 대화할 때 참고해요. 고치면 잠겨서 AI가 바꾸지 않아요.");
  const noPeople = () => h("div", { class: "rb-wk2-pane" }, h("p", { class: "rb-muted" }, "아직 함께 기록된 인물이 없어요. 대화가 이어지면 채워져요."), ...(eroSelf() ? [h("div", { class: "rb-wk2-cards" }, eroPartnerCards(ctx, card, ero, eroSelf()))] : []));
  const curOther = () => people.find((x) => x.name === withSel[pk])?.name ?? people[0].name;
  const pickRow = (other) => h("div", { class: "rb-wk2-pick", role: "group", "aria-label": "누구와의 관계를 볼까요?" }, h("small", { class: "rb-muted" }, "누구와의 관계를 볼까요?"),
    h("div", { class: "rb-wk2-pickrow" }, people.slice(0, 12).map((x) => h("button", { type: "button", class: ["rb-wk2-who", loverWith(x.name) && "lover"], title: loverWith(x.name) ? "애인" : null, "aria-pressed": x.name === other ? "true" : "false", onClick: () => { withSel[pk] = x.name; paint(); } },
      avatar(shown(x.name), ""), h("b", null, shown(x.name)), tieText(x.name) ? h("small", null, tieText(x.name)) : null))));
  // 마주 보기 판(A안·C안 펼침): 양쪽 감정 + 가운데 관계 상태
  const duel = (other, P) => h("div", { class: "rb-wk2-duel" },
    feelCard(P.v, other, false),
    h("div", { class: "rb-wk2-duelmid" },
      h("div", { class: "rb-wk2-duelav" }, avatar(me, ""), h("span", { class: "heart", "aria-hidden": "true" }, loverWith(other) ? "💗" : u2(other) ? "💭" : "·"), avatar(shown(other), "")),
      P.stage, P.lover, P.unreq),
    feelCard(P.v, other, true));
  const u2 = (other) => !!unreqOf(other);
  const layoutA = () => {
    if (!people.length) return noPeople();
    const other = curOther(), P = pieces(other);
    return h("div", { class: "rb-wk2-pane lay-a" }, pickRow(other), duel(other, P), P.tl, h("div", { class: "rb-wk2-grid2" }, filled(P)), emptyRow(P), relDel(other), hint());
  };
  // B안: 왼쪽 상대 목록 + 접는 묶음 5개
  const accOpen = (m.wkAcc ??= { feel: true, state: true });
  const acc = (id, title, chips, kids) => {
    const list = kids.filter(Boolean);
    if (!list.length) return null;
    if (sub === "2") return h("section", { class: "rb-wk2-acc panel", "data-acc": id }, h("div", { class: "rb-wk2-acch" }, h("b", null, title), ...chips.filter(Boolean).map((c) => h("small", { class: "rb-wk2-chip" }, c))), h("div", { class: "rb-wk2-accb" }, list));
    return h("details", { class: "rb-wk2-acc", open: !!accOpen[id], "data-acc": id, onToggle: (e) => { accOpen[id] = e.target.open; } },
      h("summary", null, h("b", null, title), ...chips.filter(Boolean).map((c) => h("small", { class: "rb-wk2-chip" }, c)), h("span", { style: "flex:1" }), h("i", { class: "arr", "aria-hidden": "true" })),
      h("div", { class: "rb-wk2-accb" }, list));
  };
  const miniBars = (other) => { const v = pairView(f, selfNames, other, now); return h("span", { class: "rb-wk2-mini", "aria-hidden": "true" }, h("i", { class: "e-attraction", style: { width: feelOf(v, false, "attraction") * 6 + "px" } }), h("i", { class: "e-affection", style: { width: feelOf(v, false, "affection") * 6 + "px" } }), h("i", { class: "e-intim", style: { width: intimacyOf(f, me, other, now).v * 6 + "px" } })); };
  const layoutB = () => {
    if (!people.length) return noPeople();
    const other = curOther(), P = pieces(other), v = P.v;
    // 상대 고르기: 가로 칩 한 줄(작은 끌림·호감 막대)
    const chips = h("div", { class: "rb-wk2-bchips", role: "group", "aria-label": "누구와의 관계를 볼까요?" }, people.slice(0, 20).map((x) => h("button", { type: "button", class: ["rb-wk2-sidewho", loverWith(x.name) && "lover", gcls(x.name)], "aria-pressed": x.name === other ? "true" : "false", onClick: () => { withSel[pk] = x.name; paint(); } },
      avatar(shown(x.name), ""), h("span", { class: "t" }, h("b", null, shown(x.name), loverWith(x.name) ? " 💗" : ""), h("small", { class: "rb-muted" }, [tieText(x.name), u2(x.name) ? "짝사랑" : ""].filter(Boolean).join(" · ")), miniBars(x.name)))));
    const talkTxt = [v.talk.ab?.call, v.talk.ba?.call].filter(Boolean).map((c) => `“${c}”`).join(" · ");
    const groups = [
      acc("feel", "감정", [`${me} ↔ ${shown(other)}`], [h("div", { class: "rb-wk2-grid2" }, feelCard(v, other, false), feelCard(v, other, true))]),
      acc("state", "관계 상태", [loverWith(other) ? "💗 애인" : null, tieText(other) || null, P.unreq ? "짝사랑" : null, P.tl ? `연표 ${P.tl.querySelectorAll("li").length}` : null], [P.stage, P.lover, P.tl, P.unreq]),
      acc("talk", "말과 태도", [talkTxt || null], [P.talk, P.faceEmpty ? null : P.face]),
      acc("story", "추억 · 갈등 · 오해", [v.bonds.length ? `추억 ${v.bonds.length}` : null, v.rifts?.length ? `갈등 ${v.rifts.length}` : null, v.beliefs.length ? `오해 ${v.beliefs.length}` : null], [P.nums, P.bonds, P.rifts, P.exp, P.beliefs]),
      acc("ero", "Erosync", [], [P.ero])];
    return h("div", { class: ["rb-wk2-pane", "lay-b", `lay-b${sub}`] }, chips, h("div", { class: ["rb-wk2-bmain", sub === "2" && "panels"] }, groups, emptyRow(P)), relDel(other), hint());
  };
  // C안: 상대마다 한 줄 → 누르면 그 자리에서 펼침(마주 보기 + 나머지)
  const openRow = (m.wkOpenRow ??= {});
  const layoutCRel = () => {
    if (!people.length) return noPeople();
    return h("div", { class: "rb-wk2-crel" }, people.slice(0, 20).map((x) => {
      const k = pk + "|" + x.name, open = !!openRow[k], v = pairView(f, selfNames, x.name, now);
      const bar = (t, l) => h("div", { class: "rb-wk2-bar" }, h("i", { class: `dot e-${t}`, "aria-hidden": "true" }), h("span", null, l), h("span", { class: "track" }, h("i", { class: `e-${t}`, style: { width: feelOf(v, false, t) * 10 + "%" } })), h("small", null, `${feelOf(v, false, t)}/${GAUGE_MAX}`));
      const P = open ? pieces(x.name) : null;
      return h("section", { class: ["rb-wk2-card", "rb-wk2-crow", loverWith(x.name) && "rb-wk2-lovercard", open && "open"] },
        h("button", { type: "button", class: "rb-wk2-crowh", "aria-expanded": open ? "true" : "false", onClick: () => { openRow[k] = !open; paint(); } },
          avatar(shown(x.name), ""), h("b", null, shown(x.name), loverWith(x.name) ? " 💗" : ""),
          h("span", { class: "bars" }, bar("attraction", "이성적"), bar("affection", "인간적"), h("div", { class: "rb-wk2-bar" }, h("i", { class: "dot e-intim", "aria-hidden": "true" }), h("span", null, "친밀도"), h("span", { class: "track" }, h("i", { class: "e-intim", style: { width: intimacyOf(f, me, x.name, now).v * 10 + "%" } })), h("small", null, `${intimacyOf(f, me, x.name, now).v}/${INTIM_MAX}`))),
          tieText(x.name) ? h("small", { class: "rb-wk2-chip" }, tieText(x.name)) : null, u2(x.name) ? h("small", { class: "rb-wk2-chip" }, "짝사랑") : null, h("i", { class: "arr", "aria-hidden": "true" })),
        open ? h("div", { class: "rb-wk2-cbody" }, duel(x.name, P), P.tl, h("div", { class: "rb-wk2-grid2" }, filled(P)), emptyRow(P), relDel(x.name)) : null);
    }), hint());
  };
  // 세부 탭(PC 왼쪽 레일 · 모바일 아래 반원 다이얼). 고른 세부 탭은 인물·탭마다 기억
  const subSel = (m.wkSub ??= {});
  const sub2 = (tab, items) => subTabs(ctx, subSel, `${pk}|${tab}`, items, { label: "세부 탭" });
  const relation = () => sub2("rel", [{ id: "rel", label: "관계", icon: "💞", hint: "관계·감정·호칭·추억", n: people.length, render: relation0 }, doc && { id: "mood", label: "마음 흐름", icon: "🌊", hint: "온도 추세·보고 싶음·질투·기념일", render: () => moodCard(env, card, doc) }]);
  const relation0 = () => {
    if (lay === "A") return layoutA();
    if (fam === "B") return layoutB();
    if (!people.length) return noPeople();
    const other = curOther(), P = pieces(other), v = P.v;
    return h("div", { class: "rb-wk2-pane" }, pickRow(other),
      h("div", { class: "rb-wk2-cards" }, P.stage, P.lover, P.tl, P.unreq, feelCard(v, other), P.nums, P.talk, P.rifts,
        P.bonds ?? card("둘만의 추억", h("p", { class: "rb-muted" }, "아직 없어요. 둘에게 의미 있는 순간이 생기면 쌓여요."), btn("+ 추가", { size: "sm", onClick: () => addHuman("bond", other) })), P.exp, P.faceEmpty ? null : P.face, P.beliefs, P.ero),
      addRow(P), relDel(other), hint());
  };

  // ── 상세 정보 · 기록 ──
  const go = (tab, w) => { if (w) withSel[pk] = w; tabs[pk] = tab; paint(); root.scrollIntoView?.({ block: "start" }); };
  const info0 = () => h("div", { class: "rb-wk2-pane" }, typeof parts.info === "function" ? parts.info(go) : (parts.infoBlocks ?? []).filter(Boolean), null);
  // 상세 정보를 세부 탭으로: 성격(기본 성격·수치) / 감정 / 사람다움 / 기록(기록 묶음·비어 있는 항목·위키 패널). 카드의 data-sec로 나눈다
  const INFO_SUB = (sec) => (sec === "prof" || sec === "num" ? "prof" : sec === "emo" ? "emo" : "rec");
  // 상세 정보는 한 번만 그려서 카드를 구역별로 나눈다(예전엔 구역마다 다시 그려 같은 계산이 3번 돌았다)
  let infoCache = null;
  const infoPart = (which) => {
    if (!infoCache) {
      const el = info0(), grid = el.querySelector?.(".rb-wk3-grid"), parts = { prof: [], emo: [], rec: [] };
      if (grid) { el.querySelector(".rb-wk3-toc")?.remove(); for (const c of [...grid.children]) parts[INFO_SUB(c.getAttribute("data-sec") || "panel")].push(c); }
      infoCache = { el, grid, parts };
      queueMicrotask?.(() => { infoCache = null; });
    }
    const { el, grid, parts } = infoCache;
    if (!grid) return which === "prof" ? el : null;
    return h("div", { class: "rb-wk2-pane" }, h("div", { class: "rb-wk3 rb-wk3-solo" }, h("div", { class: "rb-wk3-grid" }, parts[which])));
  };
  const base = () => doc ? sub2("base", [meCard() && { id: "me", label: "나", icon: "🪪", hint: "페르소나 이름·설명", render: () => h("div", { class: "rb-wk2-pane" }, meCard()) }, { id: "prof", label: "성격·수치", icon: "🧭", hint: "기본 성격과 수치", render: () => infoPart("prof") },
    { id: "cond", label: "상태이상", icon: "🤒", hint: "컨디션·취함·부상·감기 등 지금 상태", render: () => statusCard(env, card, doc) },
    { id: "outfit", label: "옷차림", icon: "👗", hint: "부위별 옷·액세서리(삽화용 상세)", render: () => outfitCard(env, card, doc) },
    { id: "race", label: "종족", icon: "🧬", hint: "종족 체질·발정기·몸 모형", render: () => raceCard(env, card, doc) }].filter(Boolean)) : h("div", { class: "rb-wk2-pane" }, meCard(), info0());
  // 11-22: 나(페르소나) 위키 문서 — 설정 ‘나 위키 문서 자동 만들기’로 만든 페르소나 이름·설명(보기 전용)
  const meCard = () => { const md = f?.meDoc; if (!md || !(selfNames.some((n) => /^\{\{user\}\}$/i.test(String(n))) || /^\{\{user\}\}$/i.test(String(parts.p?.name ?? parts.r?.name ?? "")) || doc == null && parts.r?.pk === "{{user}}")) return null;
    return card("🪪 나 (페르소나)", [h("b", { class: "rb-wk2-p" }, md.name || "이름 없음"), md.desc ? h("p", { class: "rb-wk2-p", style: "white-space:pre-wrap" }, md.desc) : h("p", { class: "rb-muted" }, "페르소나 설명이 비어 있어요."),
      h("small", { class: "rb-muted" }, "리스 페르소나에서 고치면 다음 응답 때 따라 바뀌어요. 요청에는 넣지 않아요(기록 AI가 나를 대신 쓰지 않게).")], null, "rb-me-doc"); };
  const mind = () => doc ? sub2("mind", [{ id: "emo", label: "감정", icon: "💗", hint: "상대별 감정", render: () => infoPart("emo") },
    { id: "human", label: "사람다움", icon: "🧩", hint: "말버릇·습관·꿈·비밀", render: () => h("div", { class: "rb-wk2-pane" }, humanCard(env, card, doc, "human")) }]) : h("div", { class: "rb-wk2-pane" }, h("p", { class: "rb-muted" }, "인물 문서가 생기면 감정·사람다움이 여기에 보여요."));
  const tabBody = (k) => (k === "base" ? base() : k === "mind" ? mind() : k === "nsfw" ? nsfw() : k === "mem" ? log() : relation());   // Erosync 8가지 성향은 성인 탭의 Erosync 카드
  // NSFW 탭: Dusk 성인 항목(월경·임신, 성적 욕망·이상성향 후보) + Erosync 성적 항목(켜져 있을 때만). 항상 보인다.
  // 월경·임신 한눈에: 주기 띠(생리·가임기·오늘) + 다음 월경·배란까지 남은 날 / 임신이면 주차·출산 예정까지
  const dayN = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };
  const cycleViz = () => {
    const sec = (doc?.sections ?? []).find((x) => x?.provenance?.slotId === "cycle.state" || x?.heading === "월경·임신");
    const st = sec ? parseCycleBody(sec.body) : null;
    if (!st) return null;
    const stat = (big, small, cls) => h("div", { class: ["rb-cyc-stat", cls] }, h("b", null, big), h("small", null, small));
    if (st.conception) {
      const days = st.date ? dayN(st.date) - dayN(st.conception) : NaN, wk = Number.isFinite(days) && days >= 0 ? Math.floor(days / 7) + 1 : null, left = Number.isFinite(days) ? Math.max(0, 266 - days) : null;
      return h("div", { class: "rb-cyc preg" },
        h("div", { class: "rb-cyc-stats" }, stat(wk ? `${wk}주차` : "임신 중", "임신"), left != null ? stat(`D-${left}`, "출산 예정까지", "acc") : null, stat(st.known ? "알고 있음" : "아직 모름", "본인")),
        left != null ? h("div", { class: "rb-cyc-bar" }, h("i", { class: "fill", style: { width: `${Math.min(100, (days / 266) * 100)}%` } })) : null,
        st.partner ? h("small", { class: "rb-muted" }, `상대 · ${st.partner}`) : null);
    }
    const L = st.length, ov = L - 14, diff = st.start && st.date ? dayN(st.date) - dayN(st.start) : NaN;
    if (!Number.isFinite(diff) || diff < 0) return h("div", { class: "rb-cyc" }, h("div", { class: "rb-cyc-stats" }, stat(`${L}일`, "주기"), stat("—", "이야기 날짜를 기다리는 중")));
    const day = (diff % L) + 1, toNext = L - day + 1, toOv = ov - day;
    const phase = day <= 5 ? ["생리 중", "p"] : day < ov - 4 ? ["안정기", "s"] : day <= ov + 1 ? ["가임기", "f"] : day <= L - 4 ? ["황체기", "l"] : ["생리 예정 가까움", "pm"];
    const cells = Array.from({ length: L }, (_, i) => { const d = i + 1, k = d <= 5 ? "p" : d >= ov - 4 && d <= ov + 1 ? (d === ov ? "ov" : "f") : ""; return h("i", { class: [k, d === day && "now"], title: `${d}일째` }); });
    return h("div", { class: ["rb-cyc", `ph-${phase[1]}`] },
      h("div", { class: "rb-cyc-stats" }, stat(`${day}일째`, `주기 ${L}일`), stat(phase[0], "지금", "acc"), stat(`D-${toNext}`, "다음 월경까지"), stat(toOv > 0 ? `D-${toOv}` : toOv === 0 ? "오늘" : "지남", "배란일")),
      h("div", { class: "rb-cyc-strip", role: "img", "aria-label": `주기 ${L}일 중 ${day}일째` }, cells),
      h("div", { class: "rb-cyc-legend" }, h("span", { class: "p" }, "생리"), h("span", { class: "f" }, "가임기"), h("span", { class: "ov" }, "배란일"), h("small", { class: "rb-muted" }, st.date ? `${st.date} 기준` : "")));
  };
  const nsfw = () => {
    // addon-rebuild: 성인 프로필은 이 채팅 장기기억(folder.nsfw) 값만 쓴다(Erosync 프로필·요약·임시값·태그 카드는 뺌)
    const a = parts.adult ?? {};
    const cyc = a.cyc ? h("div", { class: "rb-mem-cycle", role: "note" }, h("b", null, "월경·임신 "), a.cyc.lines.join(" · "), a.cyc.date ? h("small", { class: "rb-muted" }, ` (${a.cyc.date} 기준)`) : null) : null;
    const note = (t) => h("p", { class: "rb-muted", style: "margin:0;white-space:normal" }, t);
    // 값이 없어도 기본 칸은 보인다: 월경·임신 / 성적 욕망·이상성향 후보 / 성인 프로필
    const cv = lay && a.cyc ? cycleViz() : null;
    const cycCard = card("월경·임신", [cv ?? cyc ?? note("아직 기록이 없어요. 장기 기억 설정에서 ‘월경·임신 기록’(성인 항목)을 켜면 이야기 속 날짜로 따라가요.")], null, "rb-nsfw-base");
    // 세부 탭: 상태(성욕·몸) / 몸(성감대·월경) / 취향(프로필·잠자리·후보·태그) / 장면(장면 판단)
    const pane = (...k) => h("div", { class: "rb-wk2-pane", id: "rb-wk2-nsfw" }, k.filter(Boolean));
    // 유저 줄: 위키 문서가 없으니 고정 키(actor:user) 칸으로 성인 프로필·몸 상태를 보여 주고 고친다(위키 글 칸인 후보는 뺌)
    const uNames = [userLabel(), ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.title, ...(ctx.memory?.flow?.runtime?.()?.wiki?.userIdentity?.aliases ?? [])].filter(Boolean);
    if (!doc && selfNames.some((n) => userKeySet(uNames).has(String(n).toLowerCase().replace(/\s+/g, "")))) {
      setUserNsfwNames(uNames);
      const ud = userNsfwDoc();
      return sub2("nsfw", [
        { id: "state", label: "상태", icon: "🌡️", hint: "성욕 게이지·피로·경험·월경·임신", render: () => pane(lustCard(env, card, ud, { after: fertilityCard(env, card, ud), cycle: cv ?? cyc ?? null })) },
        { id: "taste", label: "취향", icon: "🫦", hint: "프로필·잠자리·태그", render: () => pane(nsfwCard(env, card, ud), humanCard(env, card, ud, "ext"), nsfwTagsCard(env, card, ud)) },
        { id: "body", label: "몸", icon: "💋", hint: "성감대·몸 흔적", n: (env.folder?.nsfw?.[ud.id]?.zones ?? []).length, render: () => pane(bodyCard(env, card, ud), marksCard(env, card, ud)) },
        { id: "compat", label: "궁합", icon: "💞", hint: "상대와 취향이 얼마나 맞는지", render: () => pane(compatCard(env, card, ud)) }]);
    }
    if (!doc) return pane(nsfwStatusCard(env, card, doc), cycCard, adultCandCard(env, card, doc), nsfwCard(env, card, doc), nsfwTempCard(env, card, doc), nsfwTagsCard(env, card, doc));
    const zn = (env.folder?.nsfw?.[doc.id]?.zones ?? []).length;
    const el = sub2("nsfw", [
      { id: "state", label: "상태", icon: "🌡️", hint: "성욕 게이지·피로·경험·월경·임신", render: () => pane(nsfwStatusCard(env, card, doc), lustCard(env, card, doc, { after: fertilityCard(env, card, doc), cycle: cv ?? cyc ?? note("아직 월경·임신 기록이 없어요. 장기 기억 설정에서 ‘월경·임신 기록’(성인 항목)을 켜면 이야기 속 날짜로 따라가요.") }), compareCard(env, card, doc)) },
      { id: "taste", label: "취향", icon: "🫦", hint: "프로필·잠자리·후보·태그", render: () => pane(nsfwCard(env, card, doc), humanCard(env, card, doc, "ext"), adultCandCard(env, card, doc), nsfwTagsCard(env, card, doc)) },
      { id: "body", label: "몸", icon: "💋", hint: "성감대·몸 흔적", n: zn, render: () => pane(bodyCard(env, card, doc), marksCard(env, card, doc)) },
      { id: "compat", label: "궁합", icon: "💞", hint: "상대와 취향이 얼마나 맞는지", render: () => pane(compatCard(env, card, doc)) },
      { id: "scene", label: "장면", icon: "🎬", hint: "장면 판단", render: () => pane(nsfwTempCard(env, card, doc)) }]);
    // 달아오름에 따라 배경 효과(60↑ 따뜻하게, 80↑ 하트가 떠오름)
    const heat = heatOf(env, doc);
    if (heat > 0.3) { el.classList.add("rb-heat"); el.style.setProperty("--heat", heat.toFixed(2)); if (heat >= 0.8) el.classList.add("hot"); if (heat >= 0.6) el.prepend(heatFx()); }
    return el;
  };
  const log = () => {
    parts.onLog?.();   // 2.2.22: 기록 목록은 이때 처음 만든다
    const blocks = (parts.logBlocks ?? []).filter(Boolean), sum = lay === "B4" ? summary("log") : null;
    const items = [sum && { id: "sum", label: "달라진 점", icon: "✨", hint: "바뀐 것·남은 순간", render: () => h("div", { class: "rb-wk2-pane" }, summary("log")) },
      doc && { id: "rec", label: "기록 묶음", icon: "📒", hint: "기록 묶음·빈 항목", render: () => infoPart("rec") },
      doc && { id: "diary", label: "일기", icon: "📔", hint: "인물 일기 보기·고치기", render: () => h("div", { class: "rb-wk2-pane" }, diaryCard(env, card, doc)) },
      ...blocks.map((b, i) => ({ id: `b${i}`, label: b.querySelector?.("summary b, .rb-wk2-ch b, h4, summary")?.textContent?.trim()?.slice(0, 10) || (i ? "이야기 기록" : "문서 관리"), icon: i ? "📖" : "🗂️", render: () => h("div", { class: "rb-wk2-pane" }, b) }))].filter(Boolean);
    return items.length > 1 ? sub2("log", items) : h("div", { class: "rb-wk2-pane" }, sum, ...blocks);
  };

  // C안: 탭 없이 한 장. 위에 붙는 목차를 누르면 그 구역으로 스크롤.
  const onePage = () => {
    const secs = [["sum", "요약", summary()], ["base", "기본", base()], ["mind", "마음", mind()], ["rel", `관계 ${people.length || ""}`.trim(), layoutCRel()], ["mem", "기억", log()], ["nsfw", "성인", nsfw()]];
    const jump = (k) => root.querySelector(`[data-sec="${k}"]`)?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    return [h("nav", { class: "rb-wk2-toc", "aria-label": "인물 정보 목차" }, secs.map(([k, l]) => h("button", { type: "button", class: "rb-chip", onClick: () => jump(k) }, l))),
      h("div", { class: "rb-wk2-one" }, secs.map(([k, l, el]) => h("div", { class: "rb-wk2-sec", "data-sec": k }, h("h4", null, l.replace(/ \d+$/, "")), el)))];
  };
  // 개편 시안 머리: 큰 얼굴 + 이름 + 한 줄 요약 + 핵심 칩 + 핵심 수치, 인물 관리 버튼은 ‘⋯’ 안으로
  const hero = () => {
    const lv = people.filter((x) => loverWith(x.name)).map((x) => shown(x.name));
    const recs = (person.records ?? []).length;
    const kpi = metrics.slice(0, 3).map((x) => h("div", { class: "k" }, h("small", { class: "rb-muted" }, x.label), h("b", null, String(x.value)), x.stage ? h("small", { class: "rb-muted" }, x.stage) : null));
    return h("section", { class: ["rb-wk4-hero", gcls(me)] }, avatar(me, ""),
      h("div", { class: "rb-wk4-hname" }, h("div", { class: "row" }, h("h3", null, me), ...lv.map((n) => h("small", { class: "rb-wk2-chip lover" }, `💗 ${n}`)), gap ? h("small", { class: "rb-wk2-chip" }, `응답 ${gap}개 만에 다시 나옴`) : null),
        h("p", { class: "rb-muted" }, (profileText || subline || "아직 요약이 없어요.").slice(0, 120)),
        h("div", { class: "row" }, h("small", { class: "rb-wk2-chip" }, `관계 ${people.length}명`), h("small", { class: "rb-wk2-chip" }, `기억 ${recs}개`), ...attrs.slice(0, 3).map((a) => h("small", { class: "rb-wk2-chip" }, a.v)))),
      kpi.length && lay !== "B4" ? h("div", { class: "rb-wk4-kpi" }, kpi) : null,   // B4는 왼쪽 ‘수치 한눈에’와 겹쳐서 뺌
      parts.header ? h("details", { class: "rb-wk4-more" }, h("summary", { class: "rb-btn sm" }, "⋯ 인물 관리"), h("div", { class: "rb-wk4-morebox" }, parts.header)) : null);
  };
  // B3: 인물 탭 없이 요약·관계·상세·NSFW·기록을 모두 접는 묶음으로(열어 둔 것 기억)
  const allFold = () => {
    const open = (m.wkSecOpen ??= { rel: true });
    const secs = [["sum", "요약", summary], ["base", "기본", base], ["mind", "마음", mind], ["rel", `관계 · ${people.length}명`, relation], ["mem", "기억", log], ["nsfw", "성인", nsfw]];
    return h("div", { class: "rb-wk2-fold" }, secs.map(([k, l, fn]) => h("details", { class: "rb-wk2-acc big", open: !!open[k], "data-sec": k, onToggle: (e) => { if (open[k] === e.target.open) return; open[k] = e.target.open; paint(); } },
      h("summary", null, h("b", null, l), h("span", { style: "flex:1" }), h("i", { class: "arr", "aria-hidden": "true" })), open[k] ? h("div", { class: "rb-wk2-accb" }, fn()) : null)));
  };
  // B4: 왼쪽 프로필 열(머리 + 요약) 고정, 오른쪽에 탭(관계·상세·NSFW·기록)
  const infoBox = (tab) => {
    const t = tab === "sum" || tab === "sum2" ? "rel" : OLD_TAB[tab] ?? tab;   // 2.2.6 요약 탭은 없앰(내용은 왼쪽 열·기록·NSFW로) — 처음 열면 관계
    // 좁은 화면은 왼쪽 열이 위로 쌓이므로 머리만 두고 요약은 ‘요약’ 탭에 전부, 넓은 화면은 수치·관계 한눈에를 왼쪽 열에
    const narrow = !!ctx.win?.ownerDocument?.defaultView?.matchMedia?.("(max-width: 760px)")?.matches;
    return h("div", { class: "rb-wk2-ibox" },
      h("aside", { class: "rb-wk2-iside" }, hero(), narrow ? null : summary("side")),
      h("div", { class: "rb-wk2-imain" },
        h("div", { class: "rb-wk2-tabs", role: "tablist", "aria-label": "인물 정보" }, TABS.filter(([k]) => k !== "sum").map(([k, l]) => h("button", { type: "button", role: "tab", class: ["rb-wk2-tab", k === t && "pane-sel", false], "data-t": k, "aria-selected": k === t ? "true" : "false", onClick: () => { tabs[pk] = k; paint(); } }, l))),
        tabBody(t)));
  };
  function paint() {
    const tab = OLD_TAB[tabs[pk]] ?? tabs[pk] ?? "sum", paneTab = tab === "sum" ? "rel" : tab;
    root.setAttribute("data-tab", lay === "C" || lay === "B3" || lay === "B4" ? "one" : tab);
    root.setAttribute("data-lay", lay || "now");
    replace(root,
      lay === "B4" ? null : lay ? hero() : h("div", { class: "rb-wk2-head" }, avatar(me, ""), h("div", { class: "rb-wk2-name" }, h("h3", null, me), subline ? h("small", { class: "rb-muted" }, subline) : null), h("span", { style: "flex:1" }), parts.header ?? null),
      gap && !lay ? h("div", { class: "rb-wk2-gap", role: "note" }, `오랜만에 다시 나왔어요 · 응답 ${gap}개 만`) : null,
      lay === "C" ? onePage() : lay === "B3" ? allFold() : lay === "B4" ? infoBox(tab) : [
      h("div", { class: "rb-wk2-tabs", role: "tablist", "aria-label": "인물 정보" }, TABS.map(([k, l]) => h("button", { type: "button", role: "tab", class: ["rb-wk2-tab", k === paneTab && "pane-sel"], "data-t": k, "aria-selected": tab === k ? "true" : "false", onClick: () => { tabs[pk] = k; paint(); } }, l))),
      h("div", { class: "rb-wk2-body" }, summary(), tabBody(paneTab))]);
  }
  paint();
  return root;
}
