// v1.8.3 인물 위키 '상세 정보' 탭(최종안): 바로가기 · 기본 성격(성향 2열) · 수치(값 있는 것만 막대, 미지정은 칩) · 감정(상대별 한 줄)
// · 내용 있는 기록 묶음만 카드 · 비어 있는 항목은 맨 아래 칩(누르면 채우기 창). 넓은 화면(@container memwrap)은 왼쪽 바로가기 + 2열.
// 기능은 예전 블록과 같다(고정·편집·삭제·AI 작성은 각 줄의 '…' 메뉴로 옮김).
import { h } from "../../dom.js";
import { userLabel } from "./username.js";
import { btn, modal, confirmDialog, openMenu } from "../../kit.js";
import { mem, fail } from "./common.js";
import { editMetric, editWikiText, policyOf } from "./people.js";
import { openRecords } from "./recordsui.js";
import { openFieldAI } from "./aitools.js";
import { gaugeSuggestBox, openCreate, openManager } from "./gaugeui.js";
import { sectionPinKey, metricPinKey, scopeKeyOf, isPinned, setPin } from "../../../engine/personedit.js";
import { deletePersonItem } from "../../../engine/pot/people-records.js";
import { EMO_TAGS, EMO_LABEL } from "../../../engine/memoryemo.js";
import { effectiveTags, nowOf } from "../../../engine/memoryhuman.js";

const SHORT = { "affinity.score": "호감도", "affinity.taste_band": "첫인상", "openness.score": "음란도", "suspicion.score": "의심도" };
const CHIP = { relationship: "관계 태도·인지 차이" };
const DESC = {
  overview: "이 인물이 어떤 사람인지 한두 줄로 소개하는 칸이에요.",
  userRelationship: "나({{user}})와 어떤 사이인지, 서로를 어떻게 생각하는지 적는 칸이에요.",
  appraisal: "상대마다 받은 첫인상을 적는 칸이에요.",
  speech: "상대마다 다르게 쓰는 말투를 적어 두는 칸이에요.",
  npc: "다른 인물들끼리 느끼는 감정과 관계를 적는 칸이에요.",
  knowledge: "이 인물이 알고 있는 정보(비밀·소문 등)를 적는 칸이에요.",
  relationship: "관계를 대하는 태도와, 서로 다르게 알고 있는 점을 적는 칸이에요.",
  behavior: "자주 보이는 행동 습관을 적는 칸이에요.",
};
const nm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const shown = (n) => (n === "{{user}}" ? userLabel() : n);   // {{user}}는 페르소나 이름으로(모르면 '나')
const pct = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / Math.max(1, max - min)) * 100));

// B: { doc, p, r, ed, profile, groups, commit, K:{ORDER,MEMBERS,ALWAYS,LABEL,SUB,AXES,AXIS_LABEL,band,METER_SLOTS,TEXT_FIELDS}, nameOf,
//      aiNew(g), addMetricFlow(slot,label), editProfileAll(), makeProfile(), makeDoc(), plan, askFill(), gauges(), panel, go(tab, with) }
export function infoTab(env, B) {
  const { ctx } = env, m = mem(ctx), { doc, p, ed, profile, groups, commit, K } = B;
  const run = (pr) => Promise.resolve(pr).catch(fail(ctx));
  const redraw = () => (env.redrawView ?? env.redraw)();
  const st = { docId: doc?.id };
  const card = (sec, title, kids, extra, cls) => h("section", { class: ["rb-wk2-card", "rb-wk3-card", cls], "data-sec": sec }, h("div", { class: "rb-wk2-ch" }, h("b", null, title), h("span", { style: "flex:1" }), extra ?? null), kids);
  const more = (label, items) => (ed ? btn("…", { size: "sm", title: `${label} 메뉴`, "aria-label": `${label} 메뉴`, onClick: (e) => openMenu(ctx.win, e.currentTarget, items) }) : null);
  const pinItem = (key) => { const on = isPinned(env.folder.wiki, doc.id, key); return { label: on ? "고정 풀기" : "고정 (AI가 고치지 않게)", onClick: () => commit((w) => setPin(w, doc.id, key, !on), on ? "고정을 풀었어요." : "고정했어요.") }; };
  const pinMark = (key) => (isPinned(env.folder.wiki, doc?.id, key) ? h("small", { class: "rb-wk3-pinned", title: "고정됨: AI가 고치지 않아요" }, "고정") : null);

  if (!doc) return h("div", { class: "rb-wk3 rb-wk3-solo" }, h("div", { class: "rb-wk3-grid" }, card("none", "상세 정보", [h("p", { class: "rb-muted" }, "이 인물은 아직 위키 문서가 없어요. 문서를 만들면 기본 성격·수치·기록 항목을 채울 수 있어요."),
    B.makeDoc ? btn("위키 문서 만들기", { kind: "primary", onClick: B.makeDoc }) : null])));

  // ── 기본 성격 ──
  const openMore = (m.wk3More ??= {});
  const profileCard = () => {
    if (!profile) return card("prof", "기본 성격", [h("p", { class: "rb-muted" }, "아직 기본 성격이 없어요. 만든 뒤 직접 쓰거나 AI로 채워요."),
      ed ? h("div", { class: "rb-wk2-acts" }, btn("기본 성격 만들기", { size: "sm", kind: "primary", onClick: B.makeProfile })) : null], null, "rb-wk3-prof");
    const open = !!openMore[doc.id];
    const axes = h("div", { class: "rb-wk3-axes" }, K.AXES.map((a) => { const v = profile.axes?.[a] ?? 50; return h("div", { class: "rb-wk3-ax" },
      h("div", { class: "l" }, h("span", null, K.AXIS_LABEL[a]), pinMark(`axis:${a}`), h("b", null, String(v))),
      h("span", { class: "track", role: "progressbar", "aria-label": K.AXIS_LABEL[a], "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v }, h("i", { style: { width: `${v}%` } })),
      h("small", { class: "band" }, K.band(a, v))); }));
    const pins = ed ? h("div", { class: "rb-wk3-pins" }, h("small", { class: "rb-muted" }, "고정하면 AI가 그 칸을 고치지 않아요."),
      h("div", { class: "rb-wk2-chips" }, [["summary", "성격 요약"], ["coreTraits", "핵심 기질"], ...K.AXES.map((a) => [`axis:${a}`, K.AXIS_LABEL[a]]), ["values", "중요 가치"], ...K.TEXT_FIELDS.map(([k, l]) => [k, l])].map(([key, label]) => {
        const on = isPinned(env.folder.wiki, doc.id, key);
        return h("button", { type: "button", class: ["rb-wk3-chip", on && "on"], "aria-pressed": on ? "true" : "false", onClick: () => commit((w) => setPin(w, doc.id, key, !on)) }, (on ? "고정됨 · " : "") + label);
      }))) : null;
    return card("prof", "기본 성격", [
      h("p", { class: "rb-wk2-p" }, profile.summary || "미작성", pinMark("summary")),
      (profile.coreTraits ?? []).length ? h("div", { class: "rb-wk2-chips" }, profile.coreTraits.map((t) => h("span", { class: "rb-wk2-chip" }, t))) : null,
      axes,
      h("details", { class: "rb-wk3-more", open, onToggle: (e) => { openMore[doc.id] = e.target.open; e.target.closest(".rb-wk3-prof")?.classList.toggle("more", e.target.open); } },
        h("summary", null, "성향 설명 · 더 보기"),
        h("div", { class: "rb-wk3-morebody" },
          (profile.values ?? []).length ? h("div", null, h("small", { class: "rb-muted" }, "중요 가치"), h("p", null, profile.values.join(" · "))) : null,
          K.TEXT_FIELDS.filter(([k]) => profile[k]).map(([k, l]) => h("div", null, h("small", { class: "rb-muted" }, l), h("p", null, profile[k]))),
          pins,
          profile.updatedAt ? h("small", { class: "rb-muted" }, `마지막 갱신 ${new Date(Date.parse(profile.updatedAt)).toLocaleString()}`) : null))],
      ed ? h("span", { class: "rb-mem-rowact" }, btn("고치기", { size: "sm", onClick: () => run(B.editProfileAll()) }), btn("AI 작성", { size: "sm", onClick: () => run(openFieldAI(env, doc, "profile:personality", "기본 성격 AI 작성")) })) : null,
      ["rb-wk3-prof", open && "more"]);
  };

  // ── 수치 ──
  const numCard = () => {
    const known = new Set(K.METER_SLOTS.map(([s]) => s));
    const rows = doc.metrics.map((x) => {
      const label = SHORT[x.slotId] ?? x.slotId, min = x.minimum ?? 0, max = x.maximum ?? 100;
      const tg = (x.targetRefs ?? []).map(B.nameOf).filter(Boolean).map(shown).join(" → ");
      const item = { label, value: x.value, min, max, metricId: x.id, slotId: x.slotId };
      const items = [policyOf(env, x.slotId) ? { label: "값 고치기", onClick: () => run(editMetric(env, st, item)) } : null, pinItem(metricPinKey(x.id)),
        { label: "삭제", danger: true, onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 수치를 지울까요?", body: label, ok: "삭제", danger: true }))) return; commit((w) => deletePersonItem(w, doc.id, { id: x.id, kind: "metric", expected: JSON.stringify(doc.metrics.find((y) => y.id === x.id)), scopeKey: scopeKeyOf(w) }), "지웠어요."); } }];
      const inner = [h("span", { class: "n" }, label, tg || x.stageLabel ? h("small", { class: "rb-muted" }, ` · ${[tg, x.stageLabel].filter(Boolean).join(" · ")}`) : null, pinMark(metricPinKey(x.id))),
        x.lastDelta ? h("small", { class: ["d", x.lastDelta > 0 ? "up" : "down"] }, `최근 ${x.lastDelta > 0 ? "+" : ""}${x.lastDelta}`) : h("span"),
        h("b", { class: "v" }, String(x.value), h("small", { class: "rb-muted" }, `/${max}`)),
        h("span", { class: "track", role: "progressbar", "aria-label": label, "aria-valuemin": min, "aria-valuemax": max, "aria-valuenow": x.value }, h("i", { style: { width: `${pct(x.value, min, max)}%` } }))];
      return ed ? h("button", { type: "button", class: "rb-wk3-num", title: "눌러서 고치기·고정·삭제", onClick: (e) => openMenu(ctx.win, e.currentTarget, items) }, inner) : h("div", { class: "rb-wk3-num" }, inner);
    });
    const unset = K.METER_SLOTS.filter(([s]) => !doc.metrics.some((x) => x.slotId === s));
    const gbox = h("div", { class: "rb-wk3-nums" });
    Promise.resolve().then(B.gauges).then((gs) => {
      gbox.replaceChildren(...(gs ?? []).map((g) => h("button", { type: "button", class: "rb-wk3-num g", title: "게이지 관리 열기", onClick: () => run(openManager(env).then(redraw)) },
        h("span", { class: "n" }, g.icon ? g.icon + " " : "", g.name, h("small", { class: "rb-muted" }, " · 직접 만든 게이지")), h("span"),
        h("b", { class: "v" }, String(g.v), h("small", { class: "rb-muted" }, `/${g.max}`)),
        h("span", { class: "track", role: "progressbar", "aria-label": g.name, "aria-valuemin": g.min, "aria-valuemax": g.max, "aria-valuenow": g.v }, h("i", { style: { width: `${pct(g.v, g.min, g.max)}%`, background: `hsl(${g.hue} 70% 58%)` } })))));
    }).catch(() => {});
    const gaugeOn = !!ctx.memory?.gauge;
    return card("num", "수치", [
      rows.length ? h("div", { class: "rb-wk3-nums" }, rows) : null, gbox,
      unset.length ? h("div", { class: "rb-wk3-unset" }, h("small", { class: "rb-muted" }, "미지정"), unset.map(([s, label]) => ed && policyOf(env, s)
        ? h("button", { type: "button", class: "rb-wk3-chip dash", title: `${label} 직접 지정`, onClick: () => run(B.addMetricFlow(s, label)) }, `${SHORT[s] ?? s} +`)
        : h("span", { class: "rb-wk3-chip dash" }, SHORT[s] ?? s))) : null,
      ed && rows.length ? h("small", { class: "rb-muted" }, "줄을 누르면 고치기·고정·삭제") : null,
      gaugeOn ? gaugeSuggestBox(env, redraw) : null],
      gaugeOn ? h("span", { class: "rb-mem-rowact" }, btn("+ 게이지", { size: "sm", onClick: () => run(openCreate(env).then((ok) => ok && redraw())) }), btn("게이지 관리", { size: "sm", onClick: () => run(openManager(env).then(redraw)) })) : null);
  };

  // ── 감정(상대별 한 줄) ──
  const mine = new Set([doc.title, ...(doc.aliases ?? []), p?.name, ...(p?.aliases ?? [])].map(nm).filter(Boolean)), now = nowOf(env.folder);
  const pairs = Object.values(env.folder.emo ?? {}).filter((x) => mine.has(nm(x.from)) && EMO_TAGS.some((t) => x.tags?.[t] != null)).sort((a, b) => (nm(b.to) === "{{user}}") - (nm(a.to) === "{{user}}"));
  const emoCard = () => card("emo", "감정", pairs.length ? h("div", { class: "rb-wk3-emo" }, pairs.map((x) => { const eff = effectiveTags(x, now);
    return h("button", { type: "button", class: "rb-wk3-emorow", title: "관계 탭에서 보기", onClick: () => B.go("rel", x.to) }, h("span", { class: "to" }, `→ ${shown(x.to)}`),
      h("span", null, EMO_TAGS.filter((t) => x.tags[t] != null).map((t, i) => [i ? " · " : "", EMO_LABEL[t], " ", h("b", null, String(eff[t] ?? x.tags[t]))]).flat())); }))
    : h("p", { class: "rb-muted" }, "아직 기록된 감정이 없어요. 대화가 이어지면 기억 분석이 채워 줘요."),
  h("button", { type: "button", class: "rb-wk2-link", onClick: () => B.go("rel") }, "관계 탭에서 보기 ›"));

  // ── 기록 묶음 ──
  const secItem = (s) => {
    const targets = (s.provenance?.targetRefs ?? []).map(B.nameOf).filter(Boolean).map(shown).join(", ");
    return h("div", { class: "rb-wk3-item" }, h("div", { class: "txt" }, s.heading || s.title ? h("b", null, s.heading || s.title, pinMark(sectionPinKey(s.id))) : pinMark(sectionPinKey(s.id)), targets ? h("small", { class: "rb-muted" }, `대상 · ${targets}`) : null, h("p", null, s.body)),
      more(s.heading || "항목", [{ label: "고치기", onClick: () => run(editWikiText(env, st, { label: s.heading || "항목", body: s.body, sectionId: s.id })) }, pinItem(sectionPinKey(s.id)),
        { label: "AI로 다시 쓰기", onClick: () => run(openFieldAI(env, doc, `section:${s.id}`, `${s.heading || "항목"} AI 작성`)) },
        { label: "삭제", danger: true, onClick: async () => { if (!(await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: s.heading || "", ok: "삭제", danger: true }))) return; commit((w) => deletePersonItem(w, doc.id, { id: s.id, kind: "section", expected: JSON.stringify(doc.sections.find((x) => x.id === s.id)), scopeKey: scopeKeyOf(w) }), "지웠어요."); } }]));
  };
  const addFor = (g) => ed ? btn("추가", { size: "sm", onClick: (e) => openMenu(ctx.win, e.currentTarget, [{ label: "직접 적기", onClick: () => run(openRecords(env, doc, { group: g })) }, { label: "AI가 대화 보고 채우기", onClick: () => run(B.aiNew(g)) }]) }) : null;
  const recIds = K.ORDER.filter((id) => id !== "PROFILE" && id !== "METRICS");
  const secsOf = (id) => (K.MEMBERS[id] ?? [id]).flatMap((g) => groups[g] ?? []);
  const filled = recIds.filter((id) => secsOf(id).length), empty = recIds.filter((id) => !secsOf(id).length && K.ALWAYS.has(id));
  const speechOpen = (m.wkSpeech ??= {});
  const recCards = filled.map((id, i) => {
    let list = secsOf(id), foot = null;
    if (id === "speech") {
      const mineS = list.filter((s) => (s.provenance?.targetRefs ?? []).includes("actor:user")), rest = list.filter((s) => !mineS.includes(s)), open = !!speechOpen[doc.id];
      if (rest.length && mineS.length) { list = open ? [...mineS, ...rest] : mineS; foot = h("button", { type: "button", class: "rb-wk2-link", onClick: () => { speechOpen[doc.id] = !open; redraw(); } }, open ? "다른 인물 대상 말투 접기" : `다른 인물 대상 말투 ${rest.length}개 펼치기`); }
    }
    return card(i === 0 ? "rec" : "rec-" + id, h("span", null, K.LABEL[id], h("small", { class: "rb-muted" }, ` ${secsOf(id).length}`)), [K.SUB[id] ? h("small", { class: "rb-muted" }, K.SUB[id]) : null, ...list.map(secItem), foot], addFor(id === "npc" ? "npc" : id));
  });

  // ── 비어 있는 항목 ──
  const fill = (id) => run(modal(ctx.win, (done) => h("div", { class: "rb-dialog rb-wk3-sheet", role: "dialog", "aria-modal": "true", "aria-label": `${K.LABEL[id]} 채우기` },
    h("h3", null, CHIP[id] ?? K.LABEL[id]), h("p", { class: "rb-muted" }, DESC[id] ?? ""),
    h("div", { class: "rb-wk3-sheetacts" }, btn("직접 적기", { onClick: () => done("hand") }), btn("AI가 대화 보고 채우기", { kind: "primary", onClick: () => done("ai") })),
    h("div", { class: "rb-dialog-actions" }, btn("닫기", { onClick: () => done(null) })))).then((how) => how === "hand" ? openRecords(env, doc, { group: id === "npc" ? "npc" : id }) : how === "ai" ? B.aiNew(id) : null));
  const emptyCard = () => (empty.length || (ed && B.plan?.total)) ? h("section", { class: "rb-wk3-empty", "data-sec": "empty" },
    h("div", { class: "rb-wk2-ch" }, h("b", null, "비어 있는 항목", h("small", { class: "rb-muted" }, ` ${empty.length}`)), h("span", { style: "flex:1" }), ed && empty.length ? h("small", { class: "rb-muted" }, "눌러서 채우기") : null),
    h("div", { class: "rb-wk2-chips" }, empty.map((id) => ed ? h("button", { type: "button", class: "rb-wk3-chip", onClick: () => fill(id) }, `${CHIP[id] ?? K.LABEL[id]} +`) : h("span", { class: "rb-wk3-chip" }, CHIP[id] ?? K.LABEL[id]))),
    ed && B.plan?.total ? h("div", null, btn("AI로 빈칸 채우기", { size: "sm", kind: "primary", title: "비어 있는 수치(와 본문·성격까지 빈 경우)를 채워요. 실행 전에 확인해요.", onClick: () => run(B.askFill()) })) : null) : null;

  // ── 바로가기 ──
  const root = h("div", { class: "rb-wk3" });
  const jump = (sec) => root.querySelector(`[data-sec="${sec}"]`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const nums = doc.metrics.length;
  const toc = h("nav", { class: "rb-wk3-toc", "aria-label": "바로가기" }, h("small", { class: "rb-muted lbl" }, "바로가기"),
    [["prof", "기본 성격", null], ["num", "수치", nums || null], ["emo", "감정", pairs.length || null], ["rec", "기록", filled.length || null], ["empty", "비어 있음", empty.length || null]]
      .filter(([sec]) => sec !== "rec" || filled.length).filter(([sec]) => sec !== "empty" || empty.length || (ed && B.plan?.total))
      .map(([sec, label, n]) => h("button", { type: "button", class: "rb-wk3-tocb", onClick: () => jump(sec) }, h("span", null, label), n ? h("small", null, String(n)) : null)));
  root.append(toc, h("div", { class: "rb-wk3-grid" }, profileCard(), numCard(), emoCard(), ...recCards, emptyCard(), B.panel ? h("div", { class: "rb-wk3-panel" }, B.panel) : null));
  return root;
}
