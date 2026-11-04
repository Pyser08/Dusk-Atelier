// 프로바이더 화면의 나머지 탭: 용도 · 도구·검색 · 번역기 · 규칙 · 사용량 · 비교.
import { h } from "../../dom.js";
import { btn, confirmDialog, emptyState, note, segmented, toggleRow, advFold } from "../../kit.js";
import { PURPOSES, PURPOSE_LABEL } from "../../../engine/provider/catalog.js";
import { normalizeRule } from "../../../engine/provider/profile.js";
import { summarize, budgetState } from "../../../engine/provider/cost.js";
import { currentChat } from "../../../data/memoryswitches.js";
import { field, text, num, area, select, grid, usd, kfmt } from "./ui.js";

export const MORE_TABS = [["use", "용도"], ["tool", "도구·검색"], ["tr", "번역기"], ["rule", "규칙"], ["usage", "사용량"], ["cmp", "비교"]];
const pname = (cfg, id) => cfg.profiles.find((p) => p.id === id)?.name ?? "";
const profOpts = (cfg, none = "(지정 안 함)") => [["", none], ...cfg.profiles.map((p) => [p.id, p.name])];

export async function renderMore(tab, env) {
  return ({ use, tool, tr, rule, usage, cmp })[tab]?.(env) ?? [];
}

// ── 용도: 메인·번역·감정·기억·보조·분석에 어떤 프로필을 쓸지 + 사슬(대체) + 봇별 + 예산 ──
async function use({ ctx, cfg, mutate, draw, toast }) {
  const out = [];
  if (!cfg.profiles.length) return [emptyState({ icon: "sliders", title: "먼저 프로필을 만들어 주세요", text: "‘연결’ → 모델 불러오기 → 모델 누르기로 만들 수 있어요." })];
  const rows = PURPOSES.map((p) => {
    const cur = cfg.purposes[p] ?? { profileId: "", over: {} }, over = cur.over ?? {};
    const mix = (k, key) => (v) => { const o = { ...(over[k] ?? {}) }; if (v === null || v === "" || v === undefined) delete o[key]; else o[key] = v; setOver(k, Object.keys(o).length ? o : ""); };
    const setOver = (k, v) => mutate((x) => { const o = (x.purposes[p].over ??= {}); if (v === "" || v === null) delete o[k]; else o[k] = v; });
    return h("section", { class: "rb-pcard", dataset: { purpose: p } },
      h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, PURPOSE_LABEL[p]), h("small", { class: "rb-muted" }, p === "main" ? "리스 대화·재생성에 쓰여요" : p === "analysis" ? "Dusk가 직접 AI를 부르는 일(기억 분석·관계도 등)에 쓰여요" : "비워 두면 메인 프로필을 따라요"))),
      grid(
        field("프로필", select(profOpts(cfg, p === "main" ? "(없음)" : "(메인과 같게)"), cur.profileId, async (v) => { await mutate((x) => { x.purposes[p].profileId = v; }); draw(); }, "프로필")),
        field("온도 덮어쓰기", num(over.sampling?.temperature, mix("sampling", "temperature"))),
        field("최대 토큰 덮어쓰기", num(over.sampling?.maxTokens, mix("sampling", "maxTokens"), { step: "1" })),
        field("생각 덮어쓰기", select([["", "프로필 그대로"], ["budget", "예산"], ["adaptive", "알아서"]], over.thinking?.mode ?? "", (v) => setOver("thinking", v === "" ? "" : { ...(over.thinking ?? {}), mode: v }), "생각"))));
  });
  out.push(note("info", "‘Dusk 자체 AI’에 프로필을 지정하면, 보조 모델로 보내던 Dusk의 AI 작업(지난 대화 분석 등)이 이 프로필로 돌고 Cellar 서버 분석에도 그대로 쓰여요. 내 API 모델을 따로 고른 작업은 그대로예요."), ...rows);
  // 사슬
  const chain = cfg.chain ?? [];
  out.push(h("section", { class: "rb-pcard" },
    toggleRow("실패하면 다음 프로필로 넘기기", "차단·한도·서버 오류일 때 아래 순서대로 시도해요. 글이 나오기 시작한 뒤에는 넘기지 않아요.", cfg.chainOn, async (v) => { await mutate((x) => { x.chainOn = v; }); draw(); }),
    h("div", { class: "rb-pkeys" }, chain.map((id, i) => h("div", { class: "rb-pkey" }, h("span", { class: "n" }, `${i + 1}. ${pname(cfg, id)}`), btn("", { icon: "up", size: "sm", title: "위로", onClick: async () => { await mutate((x) => { if (i > 0) [x.chain[i - 1], x.chain[i]] = [x.chain[i], x.chain[i - 1]]; }); draw(); } }), btn("", { icon: "trash", size: "sm", title: "빼기", onClick: async () => { await mutate((x) => { x.chain.splice(i, 1); }); draw(); } })))),
    field("사슬에 더하기", select([["", "(고르기)"], ...cfg.profiles.filter((p) => !chain.includes(p.id)).map((p) => [p.id, p.name])], "", async (v) => { if (!v) return; await mutate((x) => { x.chain.push(v); }); draw(); }, "사슬 추가"))));
  // 봇별 프로필
  const cur = await currentChat(ctx.api);
  let names = {}; try { for (const c of (await ctx.api.getDatabase(["characters"]))?.characters ?? []) names[c.chaId] = c.name; } catch { /* 이름은 없어도 된다 */ }
  const per = Object.entries(cfg.perChar ?? {});
  out.push(h("section", { class: "rb-pcard" }, h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "봇마다 다른 프로필"), h("small", { class: "rb-muted" }, "이 봇과 대화할 때는 지정한 프로필을 우선 써요(번역 같은 보조 요청은 용도 설정)."))),
    h("div", { class: "rb-pkeys" }, per.map(([id, v]) => h("div", { class: "rb-pkey" }, h("span", { class: "n" }, `${names[id] ?? id} → ${pname(cfg, v.profileId)}`), btn("", { icon: "trash", size: "sm", title: "해제", onClick: async () => { await mutate((x) => { delete x.perChar[id]; }); draw(); } })))),
    cur ? field(`지금 열린 봇: ${cur.botName || cur.chaId}`, select(profOpts(cfg, "(지정 안 함)"), cfg.perChar?.[cur.chaId]?.profileId ?? "", async (v) => { await mutate((x) => { if (v) x.perChar[cur.chaId] = { profileId: v }; else delete x.perChar[cur.chaId]; }); draw(); }, "이 봇의 프로필")) : h("small", { class: "rb-muted" }, "리스에서 채팅을 연 뒤 이 화면을 열면 지정할 수 있어요.")));
  // 예산
  const b = cfg.budget;
  out.push(h("section", { class: "rb-pcard" }, h("div", { class: "top" }, h("div", { class: "t" }, h("b", null, "예산"), h("small", { class: "rb-muted" }, "프로필에 단가를 적어 두면 쓴 돈을 계산해요(0이면 제한 없음)."))),
    grid(field("하루 한도($)", num(b.dailyUsd, (v) => mutate((x) => { x.budget.dailyUsd = v ?? 0; }))), field("한 달 한도($)", num(b.monthlyUsd, (v) => mutate((x) => { x.budget.monthlyUsd = v ?? 0; }))),
      field("넘으면", select([["warn", "알려만 주기"], ["switch", "싼 프로필로 바꾸기"], ["block", "막기"]], b.action, async (v) => { await mutate((x) => { x.budget.action = v; }); draw(); }, "예산 초과 동작")),
      b.action === "switch" ? field("바꿀 프로필", select(profOpts(cfg), b.switchProfileId, (v) => mutate((x) => { x.budget.switchProfileId = v; }), "바꿀 프로필")) : null)));
  return out;
}

// ── 도구·검색 ──
async function tool({ cfg, mutate, draw, toast }) {
  const t = cfg.tools, set = (fn) => mutate((x) => { fn(x.tools); });
  const tg = (title, desc, key, redraw = true) => toggleRow(title, desc, !!t[key], async (v) => { await set((q) => { q[key] = v; }); if (redraw) draw(); });
  const out = [note("info", "도구는 메인 대화에서만 쓰이고, 도구가 켜지면 답을 한번에 받아요(스트림 아님).")];
  out.push(tg("도구 사용", "모델이 필요할 때 아래 도구를 부를 수 있어요.", "enabled"));
  if (!t.enabled) return out;
  out.push(tg("날짜·시간", "지금 날짜와 시간을 알려 줘요.", "datetime", false), tg("계산기", "수식을 안전하게 계산해요.", "calculator", false), tg("주사위", "예: 2d6+3", "dice", false));
  out.push(tg("웹 검색", "모델이 직접 검색해요. 아래에서 검색 공급자를 정해요.", "webSearch"), tg("주소 내용 가져오기", "모델이 준 주소의 글을 읽어요. 내부망 주소는 막혀요.", "fetchUrl", false));
  if (t.webSearch) out.push(h("section", { class: "rb-pcard" }, grid(
    field("검색 공급자", select([["brave", "Brave"], ["serpapi", "SerpAPI"], ["google-cse", "Google CSE"], ["custom", "직접 주소"]], t.search.provider, async (v) => { await set((q) => { q.search.provider = v; }); draw(); }, "검색 공급자")),
    field("검색 키", text(t.search.key, (v) => set((q) => { q.search.key = v.trim(); }), { type: "password", ph: "API 키" }), "이 키는 설정에 저장돼요(기기 간 동기화될 수 있어요)"),
    t.search.provider === "google-cse" ? field("검색 엔진 ID(cx)", text(t.search.cx, (v) => set((q) => { q.search.cx = v.trim(); }))) : null,
    t.search.provider === "custom" ? field("주소 ({q} 자리에 검색어)", text(t.search.url, (v) => set((q) => { q.search.url = v.trim(); })), "", true) : null)));
  out.push(toggleRow("미리 검색해 두기", "도구 호출 없이 마지막 메시지로 먼저 검색해 결과를 프롬프트에 끼워 줘요(도구를 못 쓰는 모델용).", !!t.prefetch.enabled, async (v) => { await set((q) => { q.prefetch.enabled = v; }); draw(); }));
  if (t.prefetch.enabled) out.push(h("section", { class: "rb-pcard" }, grid(field("결과 개수", num(t.prefetch.maxResults, (v) => set((q) => { q.prefetch.maxResults = v ?? 3; }), { step: "1" })), field("검색 단어 조건(쉼표, 비우면 항상)", text(t.prefetch.keywords, (v) => set((q) => { q.prefetch.keywords = v; })), "들어 있을 때만 검색해요"))));
  out.push(tg("리스 정보 읽기", "캐릭터 설정·최근 채팅·로어북·페르소나·노트를 모델이 읽어 볼 수 있어요.", "risuRead", false), tg("장기기억 검색", "Dusk 기억에서 인물·사건을 찾아요.", "memoryTools", false));
  out.push(h("section", { class: "rb-pcard" }, toggleRow("리스 정보 고치기 (위험)", "모델이 캐릭터 정보·로어북·채팅 노트를 바꾸자고 요청할 수 있어요.", !!t.risuWrite, async (v) => { await set((q) => { q.risuWrite = v; }); draw(); }),
    h("div", { class: "rb-pwarn" }, "안전장치: ① 이 스위치를 켠 때만 쓰기 도구가 보여요 ② 바꿀 때마다 확인창이 떠요 ③ 바꾸기 전에 자동 백업(‘기록 · 되돌리기’에서 복구, 백업이 안 되면 바꾸지 않아요) ④ 한 요청에 최대 3번까지만 바꿔요."),
    t.risuWrite ? h("div", { class: "rb-pwarn" }, "웹 검색·주소 가져오기와 함께 켜면, 웹 글 속 지시가 모델을 거쳐 쓰기를 요청할 수 있어요. 확인창에서 내용을 꼭 읽고 허락해 주세요.") : null));
  out.push(grid(field("도구 연속 호출 최대", num(t.maxDepth, (v) => set((q) => { q.maxDepth = v ?? 4; }), { step: "1" }), "한 답에서 도구를 이어 부르는 횟수 상한"), field("도구 제한 시간(초)", num(t.timeoutSec, (v) => set((q) => { q.timeoutSec = v ?? 30; }), { step: "1" }))));
  return out;
}

// ── 번역기 ──
async function tr({ cfg, mutate, draw }) {
  const t = cfg.translator, set = (fn) => mutate((x) => { fn(x.translator); });
  const out = [note("info", "리스의 번역 요청(번역 용도)에만 적용돼요. ‘용도’에서 번역용 프로필을 따로 지정해 두면 좋아요.")];
  out.push(toggleRow("번역 다듬기", "서식 보호·용어집·안내문을 붙여 번역 품질을 올려요.", t.enabled, async (v) => { await set((q) => { q.enabled = v; }); draw(); }));
  if (!t.enabled) return out;
  out.push(toggleRow("서식 보호", "HTML 태그·{{변수}}·코드·링크를 번역 전에 가렸다가 되돌려요.", t.protect, (v) => set((q) => { q.protect = v; })));
  out.push(toggleRow("용어집 사용", "아래 용어집을 번역 요청에 붙여요.", t.glossary, (v) => set((q) => { q.glossary = v; })));
  out.push(h("section", { class: "rb-pcard" }, grid(field("용어집 (한 줄에 ‘원문 = 번역’)", area(t.glossaryText, (v) => set((q) => { q.glossaryText = v; }), { rows: 6, ph: "Dusk = 더스크" }), "", true), field("번역 안내문", area(t.guide, (v) => set((q) => { q.guide = v; }), { rows: 4, ph: "예: 존댓말로, 고유명사는 그대로 두기" }), "", true), field("붙일 최대 크기(바이트)", num(t.maxBytes, (v) => set((q) => { q.maxBytes = v ?? 8192; }), { step: "1" })))));
  return out;
}

// ── 규칙(프롬프트 주입) ──
async function rule({ ctx, cfg, mutate, draw, toast }) {
  const rules = cfg.transforms.rules, out = [];
  out.push(note("info", "모든 요청(또는 고른 용도·모델·봇)에 글을 끼워 넣어요. 예: 항상 한국어로, 검열 우회 문구, 모델별 지시."));
  out.push(h("div", { class: "rb-actions" }, btn("규칙 추가", { icon: "plus", kind: "primary", onClick: async () => { await mutate((x) => { x.transforms.rules.push(normalizeRule({ name: "새 규칙", text: "" })); }); draw(); } })));
  out.push(toggleRow("캐시에 맞게 앞부분 고정", "바뀌지 않는 앞부분을 앞쪽으로 모아 캐시 적중률을 높여요(실험).", cfg.transforms.cacheOrder, (v) => mutate((x) => { x.transforms.cacheOrder = v; })));
  for (const r of rules) {
    const set = (fn) => mutate((x) => { const q = x.transforms.rules.find((k) => k.id === r.id); if (q) fn(q); });
    out.push(h("section", { class: "rb-pcard", dataset: { rule: r.id } },
      toggleRow(r.name, `${r.position === "start" ? "맨 앞" : r.position === "end" ? "맨 뒤" : r.position === "beforeLast" ? "마지막 메시지 앞" : "첫 메시지 뒤"} · ${r.role}`, r.enabled, (v) => set((q) => { q.enabled = v; })),
      grid(field("이름", text(r.name, async (v) => { await set((q) => { q.name = v || "규칙"; }); draw(); })), field("역할", select([["system", "system"], ["user", "user"]], r.role, (v) => set((q) => { q.role = v; }), "역할")),
        field("넣을 위치", select([["start", "맨 앞"], ["afterFirst", "첫 메시지 뒤"], ["beforeLast", "마지막 메시지 앞"], ["end", "맨 뒤"]], r.position, async (v) => { await set((q) => { q.position = v; }); draw(); }, "위치")),
        field("내용", area(r.text, (v) => set((q) => { q.text = v; }), { rows: 4 }), "{{char}} 같은 리스 매크로는 리스가 이미 바꿔 줘요", true)),
      advFold(ctx, `rule${r.id}`, grid(field("모델 이름 조건(정규식)", text(r.modelRegex, (v) => set((q) => { q.modelRegex = v; })), "맞을 때만"), field("봇 이름 조건(정규식)", text(r.charRegex, (v) => set((q) => { q.charRegex = v; })))), field("적용 용도", h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, PURPOSES.map((p) => h("button", { type: "button", class: "rb-chip", "aria-pressed": r.purposes.includes(p) ? "true" : "false", onClick: async () => { await set((q) => { q.purposes = q.purposes.includes(p) ? q.purposes.filter((z) => z !== p) : [...q.purposes, p]; }); draw(); } }, PURPOSE_LABEL[p]))), "아무것도 안 고르면 모든 용도", true)),
      h("div", { class: "acts" }, btn("지우기", { kind: "danger", icon: "trash", onClick: async () => { await mutate((x) => { x.transforms.rules = x.transforms.rules.filter((k) => k.id !== r.id); }); draw(); } }))));
  }
  return out;
}

// ── 사용량 ──
async function usage({ ctx, P, cfg, draw, toast }) {
  const log = await P.store.usage(), sum = summarize(log), bs = budgetState(sum, cfg.budget), tot = sum.total;
  const out = [];
  if (bs.state !== "ok") out.push(note(bs.state === "over" ? "err" : "warn", bs.why));
  out.push(h("div", { class: "rb-pstat" }, [["오늘", usd(tot.today)], ["이번 달", usd(tot.month)], ["호출", String(tot.calls)], ["입력 토큰", kfmt(tot.input)], ["출력 토큰", kfmt(tot.output)], ["캐시로 아낀 돈", usd(tot.saved)]].map(([l, v]) => h("div", null, h("b", null, v), h("span", null, l)))));
  const grp = (by, label, nameOf) => { const s = summarize(log, { by }).groups, rows = Object.entries(s).sort((a, b) => b[1].cost - a[1].cost); return rows.length ? h("section", { class: "rb-pcard" }, h("b", null, label), h("table", { class: "rb-ptable" }, h("tr", null, ...["", "호출", "입력", "출력", "비용"].map((x) => h("th", null, x))), ...rows.map(([k, g]) => h("tr", null, h("td", null, nameOf(k)), h("td", null, String(g.calls)), h("td", null, kfmt(g.input)), h("td", null, kfmt(g.output)), h("td", null, usd(g.cost)))))) : null; };
  out.push(grp("purpose", "용도별", (k) => PURPOSE_LABEL[k] ?? k), grp("profile", "프로필별", (k) => pname(cfg, k) || k || "-"), grp("model", "모델별", (k) => k || "-"));
  if (!log.length) out.push(emptyState({ icon: "info", title: "아직 기록이 없어요", text: "Dusk 프로바이더로 요청하면 여기에 쌓여요. 비용은 프로필의 단가를 적었을 때만 계산돼요." }));
  out.push(h("div", { class: "acts" }, btn("기록 지우기", { kind: "danger", icon: "trash", onClick: async () => { if (!await confirmDialog(ctx.win, { title: "사용량 기록을 지울까요?", ok: "지우기", danger: true })) return; await P.store.clearUsage(); draw(); } })));
  out.push(toggleRow("요청 미리보기 알림", "요청을 보낼 때 모델·메시지 수를 알림으로 보여요(문제 확인용).", cfg.debug.preview, (v) => P.store.update((x) => { x.debug.preview = v; })));
  return out.filter(Boolean);
}

// ── 비교: 같은 말을 두 프로필에 보내 나란히 보기 ──
async function cmp({ P, cfg, toast }) {
  if (cfg.profiles.length < 2) return [emptyState({ icon: "split", title: "프로필이 2개 이상 필요해요", text: "모델을 비교하려면 프로필을 하나 더 만들어 주세요." })];
  let a = cfg.profiles[0].id, b = cfg.profiles[1].id, msg = "";
  const ra = h("pre", null, "—"), rb = h("pre", null, "—"), run = async (pid, el) => { el.textContent = "기다리는 중…"; const t0 = Date.now(); try { const r = await P.runner.handle({ mode: "other", prompt_chat: [{ role: "user", content: msg }], max_tokens: 800, __profile: pid }); const body = typeof r.content === "string" ? r.content : "(스트림)"; el.textContent = `${r.success ? "" : "실패: "}${body}\n\n— ${((Date.now() - t0) / 1000).toFixed(1)}초`; } catch (e) { el.textContent = `실패: ${e?.message ?? e}`; } };
  return [note("info", "같은 질문을 두 프로필에 동시에 보내요. 쓴 토큰은 사용량에 기록돼요."),
    grid(field("왼쪽", select(profOpts(cfg, "(고르기)").slice(1), a, (v) => { a = v; }, "왼쪽 프로필")), field("오른쪽", select(profOpts(cfg, "(고르기)").slice(1), b, (v) => { b = v; }, "오른쪽 프로필")),
      field("보낼 말", area("", (v) => { msg = v; }, { rows: 3, ph: "예: 비 오는 날 첫 만남 장면을 세 문장으로 써 줘" }), "", true)),
    h("div", { class: "rb-actions" }, btn("둘 다 보내기", { kind: "primary", icon: "zap", onClick: () => { if (!msg.trim()) return toast("보낼 말을 적어 주세요", { error: true }); run(a, ra); run(b, rb); } })),
    h("div", { class: "rb-pdiff" }, ra, rb)];
}
