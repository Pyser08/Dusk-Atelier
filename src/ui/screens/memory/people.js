import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, chip, openMenu, promptDialog, confirmDialog, modal } from "../../kit.js";
import { guideBtn } from "./guide.js";
import { mem, fail, gradeBadge, avatar, at, visibleRecords, topGrade, lastAt } from "./common.js";
import { GRADES } from "../../../engine/memorygrade.js";
import { personKey } from "../../../data/memorystore.js";
import { createRewindChat, draftFirstMessage, sceneAt } from "../../../data/memoryrewind.js";
import { isGenerating, Busy } from "../../../engine/safety.js";
import { findDoc, stateOf, timelineOf, countsOf, filterTimeline, TL_FILTERS, cycleOf } from "../../../engine/personview.js";
import { openAITools, confirmManual } from "./aitools.js";
import { openMerge, restoreLastMerge } from "./mergeui.js";
import { openTracking } from "./trackui.js";
import { openRecords } from "./recordsui.js";
import { openFolders } from "./folderui.js";
import { openWriter } from "./writerui.js";
import { hasFolders, groupPeople } from "../../../engine/peoplegroup.js";
import { wikiPanel } from "./wikipanel.js";
import { editMetricValue, editSectionText, setPin, isPinned, sectionPinKey, metricPinKey, isPaused, setPaused } from "../../../engine/personedit.js";

const PAGE = 100;
// 폴더 수정 헬퍼(로컬 저장소만). fn(folder) 안에서 고친다.
export const editFolder = (env, fn) => env.ctx.memory.store.updateFolder(env.bot.id, env.chatItem.id, fn).then(() => env.redraw()).catch(fail(env.ctx));

export async function newChatFrom(env, atIdx) {
  const { ctx, bot, chatItem, folder } = env, M = ctx.memory;
  const scene = sceneAt(folder, atIdx);
  const draft = await draftFirstMessage(ctx.api, { name: bot.character.name, scene, model: env.idx.settings.model }).catch(() => scene?.sum ?? "");
  const res = await modal(ctx.win, (done) => {
    const nm = h("input", { class: "rb-input", value: `회귀 · ${scene?.place || bot.character.name} #${atIdx + 1}`, "aria-label": "새 채팅 이름", "data-autofocus": "1" });
    const fm = h("textarea", { class: "rb-input", style: "min-height:140px;height:auto;padding:10px", "aria-label": "첫 메시지" }); fm.value = draft;
    const cp = h("input", { type: "checkbox" });
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,94vw)" },
      h("h3", null, "여기서 새 채팅"), h("p", { class: "rb-muted" }, "저장된 기억만 이어받는 새 채팅을 만들어요. 원본 채팅은 바뀌지 않아요. 첫 메시지는 고쳐 쓸 수 있어요."), nm, fm,
      h("label", { class: "rb-mem-check" }, cp, "지점까지의 원문 메시지도 복사 (채팅 변수는 되돌리지 않고 최신값 그대로예요)"),
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("만들기", { kind: "primary", onClick: () => done({ name: nm.value.trim(), firstMessage: fm.value, copyMessages: cp.checked }) })));
  });
  if (!res) return;
  try {
    await createRewindChat(ctx.api, bot.index, chatItem.index, { at: atIdx, folder, store: M.store, isGenerating, Busy, ...res });
    ctx.memory && (mem(ctx).bots = null);
    ctx.toast("새 채팅을 만들었어요. 채팅 목록에서 열어 보세요.");
    env.redraw();
  } catch (e) { fail(ctx)(e); }
}

// 인물 목록 ‘더보기’ 메뉴: 합치기·폴더·추적·정리 등. 위키 화면에서도 같이 쓴다.
export function peopleMenuItems(env, people) {
  const m = mem(env.ctx), { caps } = env;
  return [
    caps.analyze && { label: "인물 합치기", onClick: () => openMerge(env, people).catch(fail(env.ctx)) },
    caps.analyze && { label: "RP 붙여넣어 분석 (수동 Writer)", onClick: () => openWriter(env).catch(fail(env.ctx)) },
    wikiEditable(env) && { label: "인물 폴더 정리", onClick: () => openFolders(env, people).catch(fail(env.ctx)) },
    caps.analyze && env.backend.id === "local" && { label: "추적 인물 고르기", onClick: () => openTracking(env).catch(fail(env.ctx)) },
    caps.analyze && { label: "합치기 되돌리기", onClick: () => restoreLastMerge(env).catch(fail(env.ctx)) },
    caps.analyze && { label: "고아 기록 정리", onClick: () => cleanOrphans(env) },
    caps.grades === "on-demand" && { label: "등급 매기기(AI)", onClick: () => gradeNow(env) },
    env.backend.id === "bardwiki" && { label: m.showHidden ? "대체·철회 문서 숨기기" : "대체·철회 문서 보기", onClick: () => { m.showHidden = !m.showHidden; env.redraw(); } }
    ].filter(Boolean);
}

export async function renderPeople(env, host) {
  const m = mem(env.ctx);
  const { folder, caps } = env;
  const people = Object.entries(folder.people ?? {}).filter(([, p]) => visibleRecords(p).length || p.digest);
  if (m.personKey && folder.people?.[m.personKey]) return personDetail(env, host, m.personKey);
  m.personKey = "";
  if (!people.length) return replace(host, h("div", { class: "rb-empty" }, icon("character", 24), h("div", null, "아직 기록된 인물이 없어요."),
    caps.analyze ? h("div", { class: "rb-mem-sact" }, btn("지난 대화 전체 분석하기", { kind: "primary", onClick: () => { m.settingsOpen = true; env.redraw(); } }), btn("마지막 응답만 분석", { onClick: () => analyzeNow(env) }), btn("RP 붙여넣어 분석", { onClick: () => openWriter(env).catch(fail(env.ctx)) })) : h("div", { class: "rb-muted" }, "리스바드가 위키를 쌓으면 여기서 볼 수 있어요. 채팅을 열고 새로고침해 주세요.")));
  const q = m.personSearch.trim().toLowerCase();
  let rows = people.filter(([, p]) => !q || [p.name, ...(p.aliases ?? [])].some((n) => String(n).toLowerCase().includes(q)));
  rows = rows.sort(([, a], [, b]) => m.sort === "count" ? visibleRecords(b).length - visibleRecords(a).length : m.sort === "grade" ? GRADES.indexOf(topGrade(b) || "D") - GRADES.indexOf(topGrade(a) || "D") : lastAt(b) - lastAt(a));
  const card = ([k, p]) => {
    const recs = visibleRecords(p), tg = topGrade(p);
    const dist = GRADES.map((g) => recs.filter((r) => r.g === g).length);
    return h("button", { type: "button", class: "rb-mem-card", onClick: () => { m.personKey = k; m.grades = []; m.search = ""; m.page = 1; env.redraw(); } },
      avatar(p.name, tg), h("span", { class: "txt" }, h("span", { class: "name" }, p.name, " ", gradeBadge(tg)), h("span", { class: "meta" }, `기록 ${recs.length}${lastAt(p) >= 0 ? ` · 마지막 ${at(lastAt(p))}` : ""}${p.wiki ? " · 위키 요약" : ""}`),
        h("span", { class: "rb-mem-minibar", "aria-label": "등급 분포" }, GRADES.map((g, i) => h("i", { "data-g": g, style: { flex: String(Math.max(dist[i], 0.0001)) }, title: `${g} ${dist[i]}` })))));
  };
  const wk = env.folder.wiki, grouped = wikiEditable(env) && hasFolders(wk);
  const grid = grouped
    ? h("div", { class: "rb-mem-pgroups" }, groupPeople(rows, wk).filter((g) => g.rows.length || g.id).map((g) => h("details", { class: "rb-mem-pgroup", open: !(m.foldClosed ?? {})[g.id] ? true : null, onToggle: (e) => { (m.foldClosed ??= {})[g.id] = !e.currentTarget.open; } },
        h("summary", null, icon("folder", 14), " ", g.name, h("small", { class: "rb-muted" }, ` ${g.rows.length}명`)), h("div", { class: "rb-mem-grid" }, g.rows.map(card)))))
    : h("div", { class: "rb-mem-grid" }, rows.map(card));
  const menu = btn("더보기", { size: "sm", icon: "more", onClick: (e) => openMenu(env.ctx.win, e.currentTarget, peopleMenuItems(env, people)) });
  replace(host, h("div", { class: "rb-mem-tools" },
    h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "인물 검색", value: m.personSearch, "aria-label": "인물 검색", onInput: (e) => { m.personSearch = e.target.value; env.redraw(); } })),
    h("select", { class: "rb-input", style: "width:auto;height:36px", "aria-label": "정렬", onChange: (e) => { m.sort = e.target.value; env.redraw(); } }, [["time", "최근 등장"], ["count", "기록 많은 순"], ["grade", "최고 등급"]].map(([v, l]) => h("option", { value: v, selected: m.sort === v }, l))),
    caps.analyze ? btn("지난 대화 분석", { size: "sm", icon: "refresh", onClick: () => { m.settingsOpen = true; env.redraw(); } }) : btn("새로고침", { size: "sm", icon: "refresh", onClick: () => env.redraw() }), menu), grid);
}

async function analyzeNow(env) {
  const { ctx, bot, chatItem } = env;
  try { ctx.toast("분석하는 중이에요…"); await ctx.memory.runner.analyzeLatest(bot.index, chatItem.index); ctx.toast("분석이 끝났어요."); env.redraw(); } catch (e) { fail(ctx)(e); }
}
async function gradeNow(env) {
  const B = env.ctx.memory.bardwiki, model = env.idx.settings.model;
  const report = (g) => g.wrote === g.total ? `${g.total}개를 매기고 위키에 저장했어요.` : `${g.total}개를 매겼어요. 위키 저장 ${g.wrote}개 · 플러그인 캐시만 ${g.cacheOnly}개 — ` + ({ "no-api": "이 리스바드에 setGrade가 없어요(패치 적용·클라이언트 재빌드 확인).", denied: "쓰기 권한이 거부됐거나 허용되지 않았어요(플러그인 권한 초기화 후 다시 시도).", failed: "저장 실패: " + g.error }[g.reason] ?? "");
  try {
    env.ctx.toast("등급을 매기는 중이에요…");
    let r = await B.gradeOnDemand(env.bot.id, env.chatItem.id, model);
    if (r?.lastGrade?.total === 0) {  // 매길 게 없음 → 다시 매길지 묻기
      const again = await confirmDialog(env.ctx.win, { title: "이미 모두 등급이 있어요", body: "AI가 매긴 등급까지 다시 매길까요? 사용자가 직접 지정한 등급은 그대로 둬요.", ok: "다시 매기기" });
      if (!again) return;
      env.ctx.toast("다시 매기는 중이에요…"); r = await B.gradeOnDemand(env.bot.id, env.chatItem.id, model, undefined, { regrade: true });
    }
    if (r?.lastGrade?.total) env.ctx.toast(report(r.lastGrade)); else env.ctx.toast("매길 항목이 없었어요.");
    env.redraw();
  } catch (e) { fail(env.ctx)(e); }
}
const GRADE_SCORE = { D: 3, C: 5, B: 6, A: 7, S: 8, EX: 9 };
async function setWikiGrade(env, r) {
  const v = (await promptDialog(env.ctx.win, { title: "위키 등급 지정", label: `등급 (${GRADES.join(" / ")}), 0~9 점수, 또는 '해제'. 이 사건 문서 전체에 적용돼요.`, value: r.g ?? "", ok: "저장" }))?.trim().toUpperCase();
  if (!v) return;
  const score = v === "해제" ? null : v in GRADE_SCORE ? GRADE_SCORE[v] : /^\d$/.test(v) ? Number(v) : undefined;
  if (score === undefined) return env.ctx.toast("등급은 D/C/B/A/S/EX, 0~9, 해제 중 하나예요.");
  try { const ok = await env.ctx.memory.bardwiki.setGradeByUser(env.bot.id, env.chatItem.id, r.docId, score); env.ctx.toast(ok ? "위키에 등급을 저장했어요." : "쓰기 권한이 거부되어 저장하지 못했어요."); env.redraw(); } catch (e) { fail(env.ctx)(e); }
}
async function cleanOrphans(env) {
  const ok = await confirmDialog(env.ctx.win, { title: "고아 기록 정리", body: "다시 생성되거나 삭제된 응답에 연결된 기록을 지워요.", ok: "정리", danger: true }); if (!ok) return;
  await editFolder(env, (f) => { for (const p of Object.values(f.people)) p.records = p.records.filter((r) => !r.orphan); f.scenes = f.scenes.filter((s) => !s.orphan); });
}
export function personDetail(env, host, key, embedded = false) {
  const m = mem(env.ctx), p = env.folder.people[key], { caps } = env, local = caps.analyze;
  const all = visibleRecords(p);
  const doc = findDoc(env.folder.wiki, p), state = stateOf(doc), tl = timelineOf(env.folder, p, doc), counts = countsOf(tl);
  m.tlFilter ??= "all";
  const evOk = (x) => x.kind !== "event" || ((!m.grades.length || m.grades.includes(x.g)) && (!m.search || x.text.toLowerCase().includes(m.search.toLowerCase())));
  let recs = filterTimeline(tl, embedded ? "all" : m.sort === "grade" ? "event" : m.tlFilter).filter(evOk);
  recs = m.sort === "grade" ? recs.sort((a, b) => GRADES.indexOf(b.g ?? "") - GRADES.indexOf(a.g ?? "")) : recs;
  const shown = recs.slice(0, m.spage * PAGE);
  const sceneOf = (r) => env.folder.scenes.find((s) => s.id === r.sit);
  const eventItem = (r) => h("li", { class: "rb-mem-rec" }, gradeBadge(r.g), h("div", { class: "txt" }, h("div", null, r.act, r.pin ? " 📌" : ""),
    h("div", { class: "rb-muted" }, [r.at != null ? at(r.at) : "", r.know?.length ? `아는 사람 ${r.know.join(", ")}` : "", (r.m ?? 1) > 1 ? `×${r.m} 반복` : "", sceneOf(r) ? h("button", { type: "button", class: "rb-mem-link", onClick: () => { m.tab = "scenes"; m.focusScene = r.sit; env.redraw(); } }, sceneOf(r).place || sceneOf(r).sum.slice(0, 14)) : null, r.wiki ? "위키에서 가져온 요약" : "", r.wikiGrade ? `위키 등급 · ${r.gby === "user" ? "사용자" : "AI"}` : r.gs != null ? "AI 등급 · 플러그인 캐시" : "", r.legacy ? "이전 버전 기록" : ""].filter(Boolean).flatMap((x, i) => i ? [" · ", x] : [x]))),
    h("span", { style: "flex:1" }),
    btn("수정", { size: "sm", icon: "more", onClick: (e) => openMenu(env.ctx.win, e.currentTarget, [
      local && { label: "수정", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: "기록 수정", label: "행동 (80자)", value: r.act, ok: "저장" }); if (v) editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.act = v.slice(0, 80); x.user = true; }); } },
      local && { label: "등급 변경", onClick: async () => { const v = (await promptDialog(env.ctx.win, { title: "등급 변경", label: `등급 (${GRADES.join(" / ")})`, value: r.g, ok: "저장" }))?.trim().toUpperCase(); if (GRADES.includes(v)) editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.g = v; x.user = true; }); } },
      local && { label: r.pin ? "고정 해제" : "고정", onClick: () => editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.pin = !x.pin; }) },
      local && { label: "삭제", danger: true, onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 기록을 지울까요?", body: "지운 기록은 되돌릴 수 없어요. 남겨 두고 싶다면 등급을 D로 낮춰 보세요.", ok: "삭제", danger: true }))) return; editFolder(env, (f) => { f.people[key].records = f.people[key].records.filter((y) => y.id !== r.id); }); } },
      !local && r.docId && env.view?.live && env.ctx.memory.bardwiki.canSetGrade() && { label: "위키 등급 지정", onClick: () => setWikiGrade(env, r) },
      r.at != null && { label: "여기서 새 채팅", onClick: () => newChatFrom(env, r.at) }
    ].filter(Boolean)) }));
  replace(host,
    embedded ? null : h("div", { class: "rb-mem-phead" }, btn("목록", { size: "sm", icon: "back", onClick: () => { m.personKey = ""; env.redraw(); } }), avatar(p.name, topGrade(p)), h("h3", null, p.name, guideBtn(env.ctx, "person")), (p.aliases ?? []).length ? h("span", { class: "rb-muted" }, `별칭: ${p.aliases.join(", ")}`) : null, h("span", { style: "flex:1" }),
      local && btn(p.pinned ? "고정됨" : "고정", { size: "sm", onClick: () => editFolder(env, (f) => { f.people[key].pinned = !f.people[key].pinned; }) }),
      local && btn({ always: "항상 포함", never: "제외", auto: "자동(관련 시)" }[p.ctx ?? (p.pinned ? "always" : "auto")], { size: "sm", title: "프롬프트 포함 방식: 자동 → 항상 → 제외", onClick: () => editFolder(env, (f) => { const q = f.people[key], c = q.ctx ?? (q.pinned ? "always" : "auto"); q.ctx = { auto: "always", always: "never", never: "auto" }[c]; }) }),
      local && btn(isPaused(env.idx.bots?.[env.bot.id]?.ignore, p) ? "⏸ 기록 쉬는 중" : "⏸ 기록 쉬기", { size: "sm", title: "이 인물의 사건 기록을 새로 만들지 않아요. 이미 쌓인 기록은 그대로고, 인물 위키 수치는 계속 갱신될 수 있어요.", onClick: () => pausePerson(env, p) }),
      local && btn("별칭", { size: "sm", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: "별칭 편집", label: "쉼표로 구분", value: (p.aliases ?? []).join(", "), ok: "저장" }); if (v != null) editFolder(env, (f) => { f.people[key].aliases = v.split(",").map((s) => s.trim()).filter(Boolean); }); } }),
      local && doc && wikiEditable(env) && btn("항목 관리", { size: "sm", title: "항목 직접 추가·고치기·지우기 · NPC 감정", onClick: () => openRecords(env, doc).catch(fail(env.ctx)) }),
      env.advanced && local && doc && btn("AI 도구", { size: "sm", title: "전체 다시 정리 · 직접 지시 · 항목 AI 작성 · 수치 제안", onClick: () => openAITools(env, doc, p).catch(fail(env.ctx)) }),
      btn("이 인물로 새 봇 만들기", { kind: "primary", size: "sm", onClick: () => { m.compose = { keys: [key] }; m.ctab = "compose"; env.ctx.go("cards"); } })),
    p.digest ? h("div", { class: "rb-card rb-mem-digest" }, h("b", null, "요약 "), p.digest) : null,
    !embedded && state ? stateCard(env, state, env.cycleOn ? cycleOf(doc) : null) : null,
    !embedded && env.advanced && doc && wikiEditable(env) ? wikiPanel(env, doc) : null,
    embedded ? null : h("div", { class: "rb-mem-chats rb-mem-tlchips", role: "tablist", "aria-label": "이야기 걸러 보기" }, TL_FILTERS.map(([id, label]) => chip(label, { pressed: m.tlFilter === id && m.sort !== "grade", count: id === "all" ? counts.all : counts[id] ?? 0, onClick: () => { m.tlFilter = id; m.sort = m.sort === "grade" ? "time" : m.sort; m.spage = 1; env.redraw(); } }))),
    h("div", { class: "rb-mem-tools" }, embedded || m.tlFilter === "all" || m.tlFilter === "event" ? h("div", { class: "rb-mem-chats" }, GRADES.map((g) => chip(g, { pressed: m.grades.includes(g), onClick: () => { m.grades = m.grades.includes(g) ? m.grades.filter((x) => x !== g) : [...m.grades, g]; m.spage = 1; env.redraw(); } }))) : null,
      h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "기록 검색", value: m.search, "aria-label": "기록 검색", onInput: (e) => { m.search = e.target.value; m.spage = 1; env.redraw(); } })),
      h("select", { class: "rb-input", style: "width:auto;height:36px", "aria-label": "정렬", onChange: (e) => { m.sort = e.target.value; env.redraw(); } }, [["time", "시간순"], ["grade", "등급순"]].map(([v, l]) => h("option", { value: v, selected: m.sort === v }, l)))),
    recs.length ? h("ul", { class: "rb-mem-reclist rb-mem-story" }, shown.map((x) => x.kind === "event" ? eventItem(x.rec) : storyItem(env, x))) : h("div", { class: "rb-empty" }, "조건에 맞는 이야기가 없어요."),
    recs.length > shown.length ? btn(`더 보기 (${recs.length - shown.length})`, { onClick: () => { m.spage++; env.redraw(); } }) : null);
}

const KIND_LABEL = { rel: "관계", state: "상태", open: "약속" };
// 관계·상태·약속 한 줄: 사건과 같이 오른쪽 메뉴에서 고치거나 지운다. (상태는 위키 이력 요약만 고칠 수 있고, 이력 자체는 지우지 않는다.)
const storyItem = (env, x) => {
  const local = env.caps.analyze, ctx = env.ctx;
  const ask = (title, label, value) => promptDialog(ctx.win, { title, label, value, ok: "저장" });
  const items = [];
  if (local && x.kind === "rel") items.push(
    { label: "수정", onClick: async () => { const v = await ask("관계 변화 수정", "내용 (80자)", x.raw ?? ""); if (v?.trim()) editFolder(env, (f) => { const it = f.rels?.[x.relKey]?.items?.[x.relIdx]; if (it) it.d = v.trim().slice(0, 80); }); } },
    { label: "삭제", danger: true, onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 관계 변화를 지울까요?", body: "지운 항목은 되돌릴 수 없어요.", ok: "삭제", danger: true })) editFolder(env, (f) => { f.rels?.[x.relKey]?.items?.splice(x.relIdx, 1); }); } });
  if (local && x.kind === "open") items.push(
    { label: "수정", onClick: async () => { const v = await ask("약속·열린 항목 수정", "내용 (80자)", x.text); if (v?.trim()) editFolder(env, (f) => { const o = f.open?.find((y) => y.id === x.id); if (o) o.text = v.trim().slice(0, 80); }); } },
    { label: "해결로 표시", onClick: () => editFolder(env, (f) => { const o = f.open?.find((y) => y.id === x.id); if (o) { o.closed = true; o.closedAt = f.cursor?.at ?? null; } }) },
    { label: "삭제", danger: true, onClick: async () => { if (await confirmDialog(ctx.win, { title: "이 항목을 지울까요?", body: "해결된 일이라면 지우지 말고 ‘해결로 표시’를 써 보세요.", ok: "삭제", danger: true })) editFolder(env, (f) => { f.open = (f.open ?? []).filter((y) => y.id !== x.id); }); } });
  if (local && x.kind === "state" && x.histId) items.push(
    { label: "수정", onClick: async () => { const v = await ask("상태 변화 설명 수정", "내용 (240자)", x.text); if (v?.trim()) editFolder(env, (f) => { const e = f.wiki?.history?.find((y) => y.id === x.histId); if (e) e.summary = v.trim().slice(0, 240); }); } });
  return h("li", { class: ["rb-mem-rec", "rb-mem-story-row", `k-${x.kind}`] }, h("span", { class: ["rb-mem-kind", `k-${x.kind}`], title: KIND_LABEL[x.kind] }, KIND_LABEL[x.kind] ?? x.kind),
    h("div", { class: "txt" }, h("div", null, x.text), h("div", { class: "rb-muted" }, [x.at != null ? at(x.at) : "", x.ms ? new Date(x.ms).toLocaleString() : ""].filter(Boolean).join(" · "))),
    h("span", { style: "flex:1" }), items.length ? btn("수정", { size: "sm", icon: "more", onClick: (e) => openMenu(ctx.win, e.currentTarget, items) }) : null);
};

// 지금 상태 카드(위키 문서): 수치 막대 + 호칭·관계 등 글. 숫자를 누르면 ‘상태’ 줄로 걸러 본다.
// 위키 범위(가져오기·저장된 인물 위키)를 플러그인 저장소에서 직접 고칠 수 있을 때만 ✎·📌을 보여 준다.
export const wikiEditable = (env) => env.backend.id === "local" && env.caps.analyze && !env.view?.snapshot && env.folder.wiki?.documents;
export const wikiEdit = (env, fn, okText) => editFolder(env, (f) => { f.wiki = fn(f.wiki); }).then(() => okText && env.ctx.toast(okText));
export async function pausePerson(env, p) {
  const on = !isPaused(env.idx.bots?.[env.bot.id]?.ignore, p);
  await env.ctx.memory.store.updateIndex((i) => { const b = i.bots[env.bot.id] ??= { on: true, ignore: [], fails: 0 }; b.ignore = setPaused(b.ignore, p, on); }).catch(fail(env.ctx));
  env.ctx.toast(on ? `${p.name}의 사건 기록을 쉬어요. 이미 쌓인 기록은 그대로예요.` : `${p.name}의 기록을 다시 시작해요.`);
  env.redraw();
}
export const policyOf = (env, slot) => { try { return JSON.parse(env.ctx.memory.lib.base.policies).policies[slot] ?? null; } catch { return null; } };
// 수치 직접 수정(정책): 고정된 수치도 덮어씀(고정은 유지) · 숫자와 이유를 적고 · 한 번 더 확인한 뒤 바꾼다. 이유는 위키에 남는다.
export async function editMetric(env, st, x) {
  const v = await promptDialog(env.ctx.win, { title: `${x.label} 직접 고치기`, label: `새 값 (${x.min}~${x.max}, 지금 ${x.value})`, value: String(x.value), ok: "다음" }); if (v == null || v.trim() === "") return;
  const n = Number(v); if (!Number.isFinite(n)) return env.ctx.toast("숫자를 적어 주세요.", { error: true });
  const why = await promptDialog(env.ctx.win, { title: "고치는 이유", label: "기록에 남겨요 (비우면 ‘사용자 직접 수정’)", value: "", ok: "저장" }); if (why == null) return;
  if (!(await confirmManual(env, `${x.label}을 ${x.value} → ${n}(으)로 바꿀까요?`, `AI가 쌓은 수치를 직접 덮어써요.${isPinned(env.folder.wiki, st.docId, metricPinKey(x.metricId)) ? " 고정(📌)돼 있어도 바뀌고, 고정은 그대로 남아요." : ""} 앞으로의 변화는 이 값에서 이어져요.`))) return;
  await wikiEdit(env, (w) => editMetricValue(w, st.docId, x.metricId, n, why, policyOf(env, x.slotId)), "수치를 바꿨어요.");
}
export async function editWikiText(env, st, t) {
  const text = await modal(env.ctx.win, (done) => {
    const ta = h("textarea", { class: "rb-input", style: "min-height:160px;height:auto;padding:10px", "aria-label": t.label, "data-autofocus": "1" }); ta.value = t.body;
    return h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", style: "width:min(560px,94vw)" },
      h("h3", null, `${t.label} 고치기`), h("p", { class: "rb-muted" }, "AI가 쓴 글을 직접 고쳐요. 고친 글은 다음 응답부터 반영되고, 📌으로 고정하면 AI가 다시 덮어쓰지 않아요."), ta,
      h("div", { class: "rb-dialog-actions" }, btn("취소", { onClick: () => done(null) }), btn("저장", { kind: "primary", onClick: () => done(ta.value) })));
  });
  if (text == null || text.trim() === t.body) return;
  await wikiEdit(env, (w) => editSectionText(w, st.docId, t.sectionId, text), "고쳤어요.");
}
export const pinBtn = (env, st, key) => {
  const on = isPinned(env.folder.wiki, st.docId, key);
  const b = btn(on ? "📌" : "📍", { size: "sm", title: on ? "고정됨 — 눌러서 해제" : "고정하면 AI가 이 항목을 고치지 않아요", "aria-pressed": on ? "true" : "false", onClick: () => { b.textContent = on ? "📍" : "📌"; b.disabled = true; wikiEdit(env, (w) => setPin(w, st.docId, key, !on)); } });
  return b;
};

// 지금 상태 카드(위키 문서): 수치 막대 + 호칭·관계 등 글. 숫자를 누르면 ‘상태’ 줄로 걸러 본다.
function stateCard(env, st, cyc) {
  const m = mem(env.ctx), editable = wikiEditable(env);
  const meter = (x) => h("div", { class: "rb-mem-meterrow" }, h("button", { type: "button", class: "rb-mem-meter", title: `${x.label} ${x.value} (${x.min}~${x.max}) — 눌러서 바뀐 기록 보기`, onClick: () => { m.tlFilter = "state"; m.sort = "time"; m.page = 1; env.redraw(); } },
    h("span", { class: "l" }, x.label), h("span", { class: "bar", role: "progressbar", "aria-valuemin": x.min, "aria-valuemax": x.max, "aria-valuenow": x.value }, h("i", { style: { width: `${Math.round(((x.value - x.min) / Math.max(1, x.max - x.min)) * 100)}%` } })),
    h("span", { class: "v" }, String(x.value), x.delta ? h("small", null, x.delta > 0 ? ` ↑${x.delta}` : ` ↓${-x.delta}`) : null)), editable && x.metricId ? h("span", { class: "rb-mem-rowact" }, x.slotId && policyOf(env, x.slotId) ? btn("✎", { size: "sm", title: `${x.label} 직접 고치기`, "aria-label": `${x.label} 직접 고치기`, onClick: () => editMetric(env, st, x).catch(fail(env.ctx)) }) : null, pinBtn(env, st, metricPinKey(x.metricId))) : null);
  const textRows = (t) => [h("dt", null, t.label, editable && t.sectionId ? h("span", { class: "rb-mem-rowact" }, btn("✎", { size: "sm", title: `${t.label} 직접 고치기`, "aria-label": `${t.label} 직접 고치기`, onClick: () => editWikiText(env, st, t).catch(fail(env.ctx)) }), pinBtn(env, st, sectionPinKey(t.sectionId))) : null),
    h("dd", null, t.body.length > 220 ? t.body.slice(0, 220) + "…" : t.body)];
  return h("section", { class: "rb-card rb-mem-state" }, h("h4", null, "지금 상태", st.updatedAt ? h("small", { class: "rb-muted" }, ` · ${new Date(st.updatedAt).toLocaleDateString()}`) : null),
    st.meters.length ? h("div", { class: "rb-mem-meters" }, st.meters.map(meter)) : null,
    cyc ? h("div", { class: "rb-mem-cycle", role: "note" }, h("b", null, "월경·임신 "), cyc.lines.join(" · "), cyc.date ? h("small", { class: "rb-muted" }, ` (${cyc.date} 기준)`) : null) : null,
    st.texts.length ? h("dl", { class: "rb-mem-texts" }, st.texts.flatMap(textRows)) : null);
}
