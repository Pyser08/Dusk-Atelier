// 프로바이더 화면의 나머지 탭: 용도 · 규칙 · 사용량 · 비교.
import { h } from "../../dom.js";
import { btn, confirmDialog, emptyState, note, segmented, toggleRow, advFold } from "../../kit.js";
import { PURPOSES, PURPOSE_LABEL } from "../../../engine/provider/catalog.js";
import { normalizeRule } from "../../../engine/provider/profile.js";
import { summarize, budgetState } from "../../../engine/provider/cost.js";
import { currentChat } from "../../../data/memoryswitches.js";
import { field, text, num, area, select, grid, usd, kfmt } from "./ui.js";

export const MORE_TABS = [["use", "용도"], ["rule", "규칙"], ["usage", "사용량"], ["cmp", "비교"]];
const pname = (cfg, id) => cfg.profiles.find((p) => p.id === id)?.name ?? "";
const profOpts = (cfg, none = "(지정 안 함)") => [["", none], ...cfg.profiles.map((p) => [p.id, p.name])];

export async function renderMore(tab, env) {
  return ({ use, rule, usage, cmp })[tab]?.(env) ?? [];
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
        field("생각 덮어쓰기", select([["", "프로필 그대로"], ["none", "끔"], ["low", "약하게"], ["medium", "중간"], ["high", "강하게"], ["xhigh", "최고"]], over.thinking?.effort ?? "", (v) => setOver("thinking", v === "" ? "" : { effort: v }), "생각"))));
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
