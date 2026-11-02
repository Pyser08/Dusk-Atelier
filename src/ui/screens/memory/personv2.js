// v1.8.3 인물 위키 개편: 머리 + 탭(요약 / 관계 / 상세 정보 / 기록). 넓은 화면(@container memwrap ≥1100px)은 요약을 왼쪽에 고정하고 오른쪽에 탭.
// 관계 탭은 상대를 고르면 그 둘 사이의 관계 진도·감정·호칭과 말투·둘만의 추억·기대 차이·오해를 카드로 모아 보여 주고 고치게 한다.
// 기존 위키 블록(기본 성격·수치·항목 묶음·위키 패널)은 '상세 정보', 문서 관리·이야기 기록은 '기록' 탭으로 옮긴다(기능은 그대로).
import { h, replace } from "../../dom.js";
import { btn, modal, confirmDialog } from "../../kit.js";
import { mem, avatar, fail } from "./common.js";
import { editFolder } from "./people.js";
import { EMO_TAGS, EMO_LABEL, GAUGE_MAX, setTag } from "../../../engine/memoryemo.js";
import { nowOf, counterparts, pairView, changesOf, currentAttrs, momentsOf, returnGap, setTalk, toggleTalkLock, deleteTalk, editBond, deleteBond, resolveBelief, deleteBelief } from "../../../engine/memoryhuman.js";

const STAGES = [["just met", "처음 봄"], ["acquaintances", "아는 사이"], ["close", "친한 사이"], ["very close", "아주 가까움"]];
const stageIdx = (s) => Math.max(0, STAGES.findIndex(([k]) => k === s));
const stageName = (s) => STAGES[stageIdx(s)][1];
const TONE = { formal: "존댓말", casual: "반말", mixed: "섞어 씀" };
const TABS = [["sum", "요약"], ["rel", "관계"], ["info", "상세 정보"], ["log", "기록"]];
const GRADE_TIP = { A: "가장 중요한 순간", B: "중요한 순간", C: "보통", D: "사소한 일" };
const batchim = (w) => { const c = String(w ?? "").trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const subj = (name) => name + (batchim(name) ? "이" : "가");   // 받침 따라 이/가
const topic = (name) => name + (batchim(name) ? "은" : "는");   // 은/는
const obj = (name) => { const c = String(name ?? "").trim().slice(-1).charCodeAt(0); return name + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "을" : "를"); };
const shown = (n) => (n === "{{user}}" ? "나" : n);

const nk = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const pct = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / Math.max(1, max - min)) * 100));

// parts: { r, doc, p, header(액션 버튼 묶음 또는 null), metrics:[{label,slot,value,min,max,stage,targets}], gauges:()=>Promise<[{name,icon,hue,v,min,max}]>, infoBlocks:[], logBlocks:[] }
export function personTabs(env, parts) {
  const { ctx } = env, m = mem(ctx), f = env.folder;
  const { r, doc, p } = parts;
  const selfNames = [...new Set([r.name, doc?.title, ...(doc?.aliases ?? []), p?.name, ...(p?.aliases ?? [])].filter(Boolean))];
  const me = selfNames[0], now = nowOf(f), pk = r.id;
  const root = h("div", { class: "rb-wk2" });
  const tabs = (m.wkTab2 ??= {}), withSel = (m.wkWith ??= {}), rev = (m.wkFeelRev ??= {});
  const run = (pr) => Promise.resolve(pr).catch(fail(ctx));
  const save = (fn, ok) => editFolder(env, fn).then(() => ok && ctx.toast(ok));

  const people = counterparts(f, selfNames, now);
  const person = p ?? { name: me, records: [] };
  const gap = returnGap(person, f.scenes ?? [], now + 1);
  const attrs = currentAttrs(person);
  const subline = attrs.slice(0, 2).map((a) => a.v).join(" · ") || (doc?.tags ?? []).slice(0, 2).join(" · ");

  // ── 요약 ──
  const card = (title, kids, extra, cls) => h("section", { class: ["rb-wk2-card", cls] }, h("div", { class: "rb-wk2-ch" }, h("b", null, title), h("span", { style: "flex:1" }), extra ?? null), kids);
  const profileText = (env.folder.wiki?.people?.profiles?.[doc?.id]?.summary) || p?.digest || "";
  const track = (s, small) => h("span", { class: ["rb-wk2-trk", small && "sm"], role: "img", "aria-label": `관계 진도 ${stageName(s)}` }, STAGES.map((_, i) => h("i", { class: i <= stageIdx(s) ? "on" : "" })));
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
    h("button", { type: "button", class: "rb-wk2-link", onClick: () => { tabs[pk] = "info"; paint(); } }, "자세히"));
  numCard.hidden = !metrics.length;
  if (parts.gauges) Promise.resolve().then(parts.gauges).then((g) => { gauges = g ?? []; fillGauges(); }).catch(() => {});
  const summary = () => h("div", { class: "rb-wk2-sum" },
    card(`지금의 ${me}`, [profileText ? h("p", { class: "rb-wk2-p" }, profileText) : h("p", { class: "rb-muted" }, "아직 요약이 없어요. 상세 정보에서 기본 성격을 만들거나 ‘요약 정리’를 눌러 보세요."),
      attrs.length ? h("div", { class: "rb-wk2-chips" }, attrs.map((a) => h("span", { class: "rb-wk2-chip" }, h("small", null, a.label), " ", a.v))) : null]),
    numCard,
    changesOf(person).length ? card("이전과 달라진 점", h("div", { class: "rb-wk2-chg" }, changesOf(person).map((c) => [h("small", null, c.label), h("span", null, h("s", null, c.from), h("i", { class: "arr", "aria-hidden": "true" }, "→"), h("b", null, c.to))]).flat())) : null,
    people.length ? card("관계 한눈에", h("div", { class: "rb-wk2-glance" }, people.slice(0, 6).map((x) => h("button", { type: "button", class: "rb-wk2-gl", onClick: () => goPair(x.name) }, avatar(shown(x.name), ""), h("b", null, shown(x.name)), track(x.stage, true), h("small", { class: `st-${stageIdx(x.stage)}` }, stageName(x.stage)))))) : null,
    p ? card("기억에 남은 순간", h("div", { class: "rb-wk2-mom" }, momentsOf(person, now).map(({ r: rec, earlier, vague }) => h("div", { class: ["rb-wk2-mrow", vague && "vague"] }, h("span", { class: `rb-wk2-g g-${rec.g}`, title: GRADE_TIP[rec.g] ?? "" }, rec.g ?? "-"),
      h("span", { class: "t" }, rec.act, earlier ? h("small", { class: "tag old" }, "예전 모습") : null, vague ? h("small", { class: "tag" }, "흐릿한 기억 · 곧 잊혀요") : null)))),
      null, "rb-wk2-moments") : null);

  // ── 관계 ──
  const feelCard = (v, other) => {
    const back = !!rev[pk + "|" + other], fv = back ? v.feel.ba : v.feel.ab, a = back ? shown(other) : me, b = back ? me : shown(other);
    const edit = () => run(modal(ctx.win, (done) => {
      const ins = Object.fromEntries(EMO_TAGS.map((t) => [t, h("input", { class: "rb-input", type: "number", min: 0, max: GAUGE_MAX, placeholder: "비움", value: fv?.stored?.[t] ?? "", "aria-label": EMO_LABEL[t] })]));
      return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(420px,94vw)" }, h("h3", null, `${subj(a)} ${b}에게 느끼는 감정`), h("p", { class: "rb-muted" }, "0~10. 고친 값은 잠겨서 AI가 바꾸지 않아요. 비우면 ‘모름’으로 돌아가요."),
        h("div", { class: "rb-wk2-form" }, EMO_TAGS.map((t) => h("label", { class: "rb-mem-field" }, h("span", null, EMO_LABEL[t]), ins[t]))),
        h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done(ins) })));
    }).then((ins) => ins && save((fo) => { for (const t of EMO_TAGS) { const raw = ins[t].value.trim(), cur = fv?.stored?.[t]; const val = raw === "" ? null : Math.max(0, Math.min(GAUGE_MAX, Math.round(Number(raw)))); if ((cur ?? null) !== val) setTag(fo, back ? other : me, back ? me : other, t, val); } }, "감정을 고쳤어요.")));
    const rows = fv ? EMO_TAGS.filter((t) => fv.stored[t] != null).map((t) => {
      const val = fv.tags[t], was = fv.stored[t];
      return h("div", { class: "rb-wk2-bar" }, h("i", { class: `dot e-${t}`, "aria-hidden": "true" }), h("span", null, EMO_LABEL[t]),
        h("span", { class: "track", role: "progressbar", "aria-label": EMO_LABEL[t], "aria-valuemin": 0, "aria-valuemax": GAUGE_MAX, "aria-valuenow": val }, was > val ? h("i", { class: `ghost e-${t}`, style: { width: `${(was / GAUGE_MAX) * 100}%` } }) : null, h("i", { class: `e-${t}`, style: { width: `${(val / GAUGE_MAX) * 100}%` } })),
        h("small", null, `${val}/${GAUGE_MAX}`), fv.lock?.[t] ? h("small", { class: "rb-muted", title: "직접 정한 값(잠김)" }, "🔒") : null);
    }) : [];
    return card(`${subj(a)} ${b}에게 느끼는 감정`, [
      rows.length ? rows : h("p", { class: "rb-muted" }, "아직 기록된 감정이 없어요."),
      rows.length && rows.length < EMO_TAGS.length ? h("small", { class: "rb-muted rb-wk2-unset" }, `아직 없음 · ${EMO_TAGS.filter((t) => fv.stored[t] == null).map((t) => EMO_LABEL[t]).join(" · ")}`) : null,
      ...(fv?.cooled ?? []).map((c) => h("div", { class: "rb-wk2-note cool" }, `${subj(EMO_LABEL[c.tag])} 시간이 지나 ${c.from} → ${c.to}로 식었어요`)),
      h("button", { type: "button", class: "rb-wk2-link", onClick: () => { rev[pk + "|" + other] = !back; paint(); } }, back ? `${subj(me)} ${shown(other)}에게 느끼는 감정 보기` : `${subj(shown(other))} ${me}에게 느끼는 감정 보기`)],
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
      btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 추억을 지울까요?", body: b.moment, ok: "지우기", danger: true })) save((fo) => { deleteBond(fo, b.id); }, "지웠어요."); } })));
  const beliefItem = (b) => h("div", { class: ["rb-wk2-belief", !b.open && "done"] },
    h("small", null, b.open ? `${topic(shown(b.who))} 이렇게 알고 있어요` : `${subj(shown(b.who))} 잘못 알던 것 · 풀림`), h("b", null, `“${b.thinks}”`),
    h("small", null, "실제로는"), h("span", null, b.truth), b.by ? h("small", { class: "rb-muted" }, `${subj(shown(b.by))} 그렇게 말했어요`) : null,
    h("div", { class: "rb-wk2-acts" }, b.open ? btn("진실을 알았어요", { size: "sm", onClick: () => save((fo) => { resolveBelief(fo, b.id); }, "풀린 것으로 표시했어요.") }) : null,
      btn("지우기", { size: "sm", onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 오해 기록을 지울까요?", body: b.thinks, ok: "지우기", danger: true })) save((fo) => { deleteBelief(fo, b.id); }, "지웠어요."); } })));
  const relation = () => {
    if (!people.length) return h("div", { class: "rb-wk2-pane" }, h("p", { class: "rb-muted" }, "아직 함께 기록된 인물이 없어요. 대화가 이어지면 채워져요."));
    const other = people.find((x) => x.name === withSel[pk])?.name ?? people[0].name;
    const v = pairView(f, selfNames, other, now), si = stageIdx(v.stage.stage);
    return h("div", { class: "rb-wk2-pane" },
      h("div", { class: "rb-wk2-pick", role: "group", "aria-label": "누구와의 관계를 볼까요?" }, h("small", { class: "rb-muted" }, "누구와의 관계를 볼까요?"),
        h("div", { class: "rb-wk2-pickrow" }, people.slice(0, 12).map((x) => h("button", { type: "button", class: "rb-wk2-who", "aria-pressed": x.name === other ? "true" : "false", onClick: () => { withSel[pk] = x.name; paint(); } }, avatar(shown(x.name), ""), h("b", null, shown(x.name)), h("small", { class: `st-${stageIdx(x.stage)}` }, stageName(x.stage)))))),
      h("div", { class: "rb-wk2-cards" },
        card("관계 진도", [h("div", { class: "rb-wk2-steps", role: "img", "aria-label": `지금 ${STAGES[si][1]}` }, STAGES.map(([, l], i) => h("span", { class: ["st", i < si && "past", i === si && "now"] }, h("i", null), h("small", null, l)))),
          h("p", { class: "rb-muted" }, `함께한 장면 ${v.stage.shared}번${si <= 1 ? " · 아직 가깝지 않아서, AI가 갑자기 너무 친해지지 않게 해요." : ""}`)]),
        feelCard(v, other),
        ((ms) => ms.length ? card("수치", ms.map((x) => metricRow(x, true))) : null)(metrics.filter((x) => x.targets.some((t) => nk(t) === nk(other)))),
        card("호칭 · 말투", [talkRow(v.talk.ab, me, other), h("hr", { class: "rb-wk2-hr" }), talkRow(v.talk.ba, other, me)]),
        card("둘만의 추억", v.bonds.length ? v.bonds.map(bondItem) : h("p", { class: "rb-muted" }, "아직 없어요. 둘에게 의미 있는 순간이 생기면 쌓여요.")),
        v.exp ? card("기대 차이", h("div", { class: "rb-wk2-exp" }, [[v.exp.a, v.exp.ae, v.exp.as], [v.exp.b, v.exp.be, v.exp.bs]].map(([n, e, said]) => h("div", null, h("small", { class: "rb-muted" }, `${topic(shown(n))}`), h("span", null, e), h("small", { class: "rb-muted" }, said ? "말로 했어요" : "말하지 않았어요"))))) : null,
        v.beliefs.length ? card("오해", v.beliefs.map(beliefItem), null, "warn") : null),
      h("p", { class: "rb-wk2-hint rb-muted" }, "이 내용은 AI가 대화할 때 참고해요. 고치면 잠겨서 AI가 바꾸지 않아요."));
  };

  // ── 상세 정보 · 기록 ──
  const info = () => h("div", { class: "rb-wk2-pane" }, ...(parts.infoBlocks ?? []).filter(Boolean));
  const log = () => h("div", { class: "rb-wk2-pane" }, ...(parts.logBlocks ?? []).filter(Boolean));

  function paint() {
    const tab = tabs[pk] ?? "sum", paneTab = tab === "sum" ? "rel" : tab;
    root.setAttribute("data-tab", tab);
    replace(root,
      h("div", { class: "rb-wk2-head" }, avatar(me, ""), h("div", { class: "rb-wk2-name" }, h("h3", null, me), subline ? h("small", { class: "rb-muted" }, subline) : null), h("span", { style: "flex:1" }), parts.header ?? null),
      gap ? h("div", { class: "rb-wk2-gap", role: "note" }, `오랜만에 다시 나왔어요 · 응답 ${gap}개 만`) : null,
      h("div", { class: "rb-wk2-tabs", role: "tablist", "aria-label": "인물 정보" }, TABS.map(([k, l]) => h("button", { type: "button", role: "tab", class: ["rb-wk2-tab", k === paneTab && "pane-sel"], "data-t": k, "aria-selected": tab === k ? "true" : "false", onClick: () => { tabs[pk] = k; paint(); } }, l))),
      h("div", { class: "rb-wk2-body" }, summary(), paneTab === "rel" ? relation() : paneTab === "info" ? info() : log()));
  }
  paint();
  return root;
}
