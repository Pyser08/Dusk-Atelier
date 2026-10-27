import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { btn, badge, chip, openMenu, promptDialog, confirmDialog, modal } from "../../kit.js";
import { mem, fail, gradeBadge, avatar, at, visibleRecords, topGrade, lastAt } from "./common.js";
import { GRADES } from "../../../engine/memorygrade.js";
import { personKey } from "../../../data/memorystore.js";
import { createRewindChat, draftFirstMessage, sceneAt } from "../../../data/memoryrewind.js";
import { isGenerating, Busy } from "../../../engine/safety.js";

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

export async function renderPeople(env, host) {
  const m = mem(env.ctx);
  const { folder, caps } = env;
  const people = Object.entries(folder.people ?? {}).filter(([, p]) => visibleRecords(p).length || p.digest);
  if (m.personKey && folder.people?.[m.personKey]) return personDetail(env, host, m.personKey);
  m.personKey = "";
  if (!people.length) return replace(host, h("div", { class: "rb-empty" }, icon("character", 24), h("div", null, "아직 기록된 인물이 없어요."),
    caps.analyze ? h("div", { class: "rb-mem-sact" }, btn("지난 대화 전체 분석하기", { kind: "primary", onClick: () => { m.settingsOpen = true; env.redraw(); } }), btn("마지막 응답만 분석", { onClick: () => analyzeNow(env) })) : h("div", { class: "rb-muted" }, "리스바드가 위키를 쌓으면 여기서 볼 수 있어요. 채팅을 열고 새로고침해 주세요.")));
  const q = m.personSearch.trim().toLowerCase();
  let rows = people.filter(([, p]) => !q || [p.name, ...(p.aliases ?? [])].some((n) => String(n).toLowerCase().includes(q)));
  rows = rows.sort(([, a], [, b]) => m.sort === "count" ? visibleRecords(b).length - visibleRecords(a).length : m.sort === "grade" ? GRADES.indexOf(topGrade(b) || "D") - GRADES.indexOf(topGrade(a) || "D") : lastAt(b) - lastAt(a));
  const grid = h("div", { class: "rb-mem-grid" }, rows.map(([k, p]) => {
    const recs = visibleRecords(p), tg = topGrade(p);
    const dist = GRADES.map((g) => recs.filter((r) => r.g === g).length);
    return h("button", { type: "button", class: "rb-mem-card", onClick: () => { m.personKey = k; m.grades = []; m.search = ""; m.page = 1; env.redraw(); } },
      avatar(p.name, tg), h("span", { class: "txt" }, h("span", { class: "name" }, p.name, " ", gradeBadge(tg)), h("span", { class: "meta" }, `기록 ${recs.length}${lastAt(p) >= 0 ? ` · 마지막 ${at(lastAt(p))}` : ""}${p.wiki ? " · 위키 요약" : ""}`),
        h("span", { class: "rb-mem-minibar", "aria-label": "등급 분포" }, GRADES.map((g, i) => h("i", { "data-g": g, style: { flex: String(Math.max(dist[i], 0.0001)) }, title: `${g} ${dist[i]}` })))));
  }));
  const menu = btn("더보기", { size: "sm", icon: "more", onClick: (e) => openMenu(env.ctx.win, e.currentTarget, [
    caps.analyze && { label: "인물 합치기", onClick: () => mergePeople(env, people) },
    caps.analyze && { label: "고아 기록 정리", onClick: () => cleanOrphans(env) },
    caps.grades === "on-demand" && { label: "등급 매기기(AI)", onClick: () => gradeNow(env) },
    env.backend.id === "bardwiki" && { label: m.showHidden ? "대체·철회 문서 숨기기" : "대체·철회 문서 보기", onClick: () => { m.showHidden = !m.showHidden; env.redraw(); } }
  ].filter(Boolean)) });
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
async function mergePeople(env, people) {
  const names = people.map(([k, p]) => `${p.name}`);
  const a = await promptDialog(env.ctx.win, { title: "인물 합치기 (1/2)", label: `남길 인물 이름 (${names.slice(0, 8).join(", ")}…)`, ok: "다음" }); if (!a) return;
  const b = await promptDialog(env.ctx.win, { title: "인물 합치기 (2/2)", label: `"${a}"에 합칠 인물 이름`, ok: "합치기" }); if (!b) return;
  await editFolder(env, (f) => {
    const ka = personKey(a), kb = personKey(b), pa = f.people[ka], pb = f.people[kb];
    if (!pa || !pb || ka === kb) throw new Error("두 이름이 서로 다른 기존 인물이어야 해요.");
    pa.aliases = [...new Set([...(pa.aliases ?? []), pb.name, ...(pb.aliases ?? [])])];
    const seen = new Set(pa.records.map((r) => r.act));
    for (const r of pb.records) if (!seen.has(r.act)) pa.records.push(r);
    pa.records.sort((x, y) => (x.at ?? -1) - (y.at ?? -1)); delete f.people[kb];
  });
}

function personDetail(env, host, key) {
  const m = mem(env.ctx), p = env.folder.people[key], { caps } = env, local = caps.analyze;
  const all = visibleRecords(p);
  let recs = all.filter((r) => (!m.grades.length || m.grades.includes(r.g)) && (!m.search || r.act.toLowerCase().includes(m.search.toLowerCase())));
  recs = recs.sort((a, b) => m.sort === "grade" ? GRADES.indexOf(b.g ?? "") - GRADES.indexOf(a.g ?? "") : (a.at ?? -1) - (b.at ?? -1));
  const shown = recs.slice(0, m.page * PAGE);
  const sceneOf = (r) => env.folder.scenes.find((s) => s.id === r.sit);
  const item = (r) => h("li", { class: "rb-mem-rec" }, gradeBadge(r.g), h("div", { class: "txt" }, h("div", null, r.act, r.pin ? " 📌" : ""),
    h("div", { class: "rb-muted" }, [r.at != null ? at(r.at) : "", r.know?.length ? `아는 사람 ${r.know.join(", ")}` : "", (r.m ?? 1) > 1 ? `×${r.m} 반복` : "", sceneOf(r) ? h("button", { type: "button", class: "rb-mem-link", onClick: () => { m.tab = "scenes"; m.focusScene = r.sit; env.redraw(); } }, sceneOf(r).place || sceneOf(r).sum.slice(0, 14)) : null, r.wiki ? "위키에서 가져온 요약" : "", r.wikiGrade ? `위키 등급 · ${r.gby === "user" ? "사용자" : "AI"}` : r.gs != null ? "AI 등급 · 플러그인 캐시" : "", r.legacy ? "이전 버전 기록" : ""].filter(Boolean).flatMap((x, i) => i ? [" · ", x] : [x]))),
    h("span", { style: "flex:1" }),
    btn("메뉴", { size: "sm", icon: "more", onClick: (e) => openMenu(env.ctx.win, e.currentTarget, [
      local && { label: "수정", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: "기록 수정", label: "행동 (80자)", value: r.act, ok: "저장" }); if (v) editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.act = v.slice(0, 80); x.user = true; }); } },
      local && { label: "등급 변경", onClick: async () => { const v = (await promptDialog(env.ctx.win, { title: "등급 변경", label: `등급 (${GRADES.join(" / ")})`, value: r.g, ok: "저장" }))?.trim().toUpperCase(); if (GRADES.includes(v)) editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.g = v; x.user = true; }); } },
      local && { label: r.pin ? "고정 해제" : "고정", onClick: () => editFolder(env, (f) => { const x = f.people[key].records.find((y) => y.id === r.id); x.pin = !x.pin; }) },
      local && { label: "삭제", danger: true, onClick: async () => { if (!(await confirmDialog(env.ctx.win, { title: "이 기록을 지울까요?", body: "지운 기록은 되돌릴 수 없어요. 남겨 두고 싶다면 등급을 D로 낮춰 보세요.", ok: "삭제", danger: true }))) return; editFolder(env, (f) => { f.people[key].records = f.people[key].records.filter((y) => y.id !== r.id); }); } },
      !local && r.docId && env.view?.live && env.ctx.memory.bardwiki.canSetGrade() && { label: "위키 등급 지정", onClick: () => setWikiGrade(env, r) },
      r.at != null && { label: "여기서 새 채팅", onClick: () => newChatFrom(env, r.at) }
    ].filter(Boolean)) }));
  replace(host,
    h("div", { class: "rb-mem-phead" }, btn("목록", { size: "sm", icon: "back", onClick: () => { m.personKey = ""; env.redraw(); } }), avatar(p.name, topGrade(p)), h("h3", null, p.name), (p.aliases ?? []).length ? h("span", { class: "rb-muted" }, `별칭: ${p.aliases.join(", ")}`) : null, h("span", { style: "flex:1" }),
      local && btn(p.pinned ? "고정됨" : "고정", { size: "sm", onClick: () => editFolder(env, (f) => { f.people[key].pinned = !f.people[key].pinned; }) }),
      local && btn({ always: "항상 포함", never: "제외", auto: "자동(관련 시)" }[p.ctx ?? (p.pinned ? "always" : "auto")], { size: "sm", title: "프롬프트 포함 방식: 자동 → 항상 → 제외", onClick: () => editFolder(env, (f) => { const q = f.people[key], c = q.ctx ?? (q.pinned ? "always" : "auto"); q.ctx = { auto: "always", always: "never", never: "auto" }[c]; }) }),
      local && btn("별칭", { size: "sm", onClick: async () => { const v = await promptDialog(env.ctx.win, { title: "별칭 편집", label: "쉼표로 구분", value: (p.aliases ?? []).join(", "), ok: "저장" }); if (v != null) editFolder(env, (f) => { f.people[key].aliases = v.split(",").map((s) => s.trim()).filter(Boolean); }); } }),
      btn("이 인물로 새 봇 만들기", { kind: "primary", size: "sm", onClick: () => { m.compose = { keys: [key] }; m.tab = "compose"; env.redraw(); } })),
    p.digest ? h("div", { class: "rb-card rb-mem-digest" }, h("b", null, "요약 "), p.digest) : null,
    h("div", { class: "rb-mem-tools" }, h("div", { class: "rb-mem-chats" }, GRADES.map((g) => chip(g, { pressed: m.grades.includes(g), onClick: () => { m.grades = m.grades.includes(g) ? m.grades.filter((x) => x !== g) : [...m.grades, g]; m.page = 1; env.redraw(); } }))),
      h("label", { class: "rb-search" }, icon("search", 16), h("input", { type: "search", placeholder: "기록 검색", value: m.search, "aria-label": "기록 검색", onInput: (e) => { m.search = e.target.value; m.page = 1; env.redraw(); } })),
      h("select", { class: "rb-input", style: "width:auto;height:36px", "aria-label": "정렬", onChange: (e) => { m.sort = e.target.value; env.redraw(); } }, [["time", "시간순"], ["grade", "등급순"]].map(([v, l]) => h("option", { value: v, selected: m.sort === v }, l)))),
    recs.length ? h("ul", { class: "rb-mem-reclist" }, shown.map(item)) : h("div", { class: "rb-empty" }, "조건에 맞는 기록이 없어요."),
    recs.length > shown.length ? btn(`더 보기 (${recs.length - shown.length})`, { onClick: () => { m.page++; env.redraw(); } }) : null);
}
