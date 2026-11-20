// 기억 화면 (1.8.3 목업 3): 상태 카드 하나(스위치·숫자 3·막대·범례) → 지난 대화 분석(큰 버튼) → 바로가기 4칸 → 기억 옵션 → 최근 기록.
import { maybePromptIntro } from '../promptstab.js';
// 오른쪽(PC)·아래(모바일): (PC 고급) 기억 방식 바로 보임 → 설정 한 줄 목록 → 고급 묶음(한 줄씩 접음).
import { h, replace } from "../../dom.js";
import { icon } from "../../icons.js";
import { bfAttach, bfKey, bfRun } from "./bfprogress.js";
import { advFold, btn, confirmDialog, emptyState, modal, note, openMenu, pageHead, progressBar, statusCard, switchEl, setSwitch } from "../../kit.js";
import { injectReasonText } from "../../../engine/memoryinject.js";
import { USAGE_KINDS, injectLine, usageOf, recentOf } from "../../../engine/memoryusage.js";
import { mem, fail, gradeBadge, at } from "./common.js";
import { renderModeBar } from "./modebar.js";
import { advancedGroups } from "./madv.js";
import { organizeAdv } from "./advorganize.js";
import { defHint } from "../../defhint.js";
import { builders, renderGlobalSettings } from "./settings.js";
import { tracked, scopeChip } from "./settingstools.js";
import { writerDetails } from "./advanced.js";
import { openJevModal } from "./jevmodal.js";
import { openFailLog, openEventLog, ensureFailLogStyle } from "./faillog.js";
import { takePendingReason } from "../../../data/memlog.js";
import { openEmbedModal } from "./embedmodal.js";
import { maybeAskBardWiki } from "./modebar.js";
import { gaugeMultCard } from "./gaugemultui.js";
import { aiTag, aiLegend } from "./aicost.js";
import { ensureMemAddonCss } from "./memaddoncss.js";
import { adultSeedRow } from "./adultseedmodal.js";

const hhmm = (ms) => new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

export function usageCard(u) {
  if (!u.total) return h("section", { class: "rb-card rb-mem-usage" }, h("b", null, "저장된 기록"), h("p", { class: "rb-muted" }, "아직 쌓인 기록이 없어요."));
  const bar = h("div", { class: "rb-mbar", role: "img", "aria-label": USAGE_KINDS.map(([k, l]) => `${l} ${u[k]}건`).join(", ") },
    USAGE_KINDS.filter(([k]) => u[k]).map(([k]) => h("i", { class: `u-${k}`, style: `flex:${u[k]}` })));
  const legend = h("ul", { class: "rb-mbar-legend" }, USAGE_KINDS.map(([k, l]) => h("li", null, h("i", { class: `u-${k}` }), `${l} ${u[k]}`)));
  return h("section", { class: "rb-card rb-mem-usage" }, h("b", null, `저장된 기록 ${u.total}건`), bar, legend);
}

// 설정 카드(한 줄 요약 목록 + 기억 옵션 3개). 열린 채팅이 없어도 쓸 수 있게 따로 뺐다(전체 설정이라 채팅과 무관).
async function settingsCards(ctx, M, idx, redraw, cur = null, sw = null) {
  let embedLine = "뜻이 비슷한 기억 찾기", jevLine = "원문 회상 후보를 골라 토큰 줄이기 · 비싼 모델용";
  try { if (M.jev) { await M.jev.load(); const j = M.jev.status(); jevLine += j.on ? (j.hasKey ? " · 켜짐" : " · 키 없음") : " · 꺼짐"; } } catch { /* 요약 없이 */ }
  try { if (M.embedder) { await M.embedder.load(); embedLine += M.embedder.status().on ? " · 켜짐" : " · 꺼짐"; } } catch { /* 요약 없이 */ }
  const srow = (title, sub, onClick, extra = {}) => h("button", { type: "button", class: "rb-srow", onClick, ...extra }, h("span", { class: "t" }, title, h("small", null, sub)), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
  const memorySettings = h("section", { class: "rb-card bordered rb-scard rb-mem-integrated-settings" },
    h("span", { class: "h" }, "설정"),
    srow("기억·인물 위키 프롬프트", "앞·중간·뒤에 덧붙일 프롬프트", () => ctx.go("settings", "prompts")),
    srow(h("span", null, "임베딩 (의미 검색)", aiTag("embed")), embedLine, () => { if (M.embedder) openEmbedModal(ctx); else ctx.toast("기억 기능을 쓸 수 없는 상태예요.", { error: true }); }, { "data-tour": "mem-embed" }),
    // 2.2.0 자동 기록 세부(인물 위키 설정 값): 임베딩 아래 줄 → 누르면 창으로
    M.flow ? srow("자동 기록 세부", "장면 정리 역할 · 최근 대화 턴 · 서사관계 전용 모드", () => openWriterDetails(ctx).catch(fail(ctx)), { id: "rb-mem-writer-row" }) : null,
    M.jev ? srow(h("span", null, "Jev 재정렬 (선택)", aiTag("jev")), jevLine, () => openJevModal(ctx).catch(fail(ctx)), { id: "rb-mem-jev-row" }) : null);

  // 기억 옵션 3개(고급 모드 '대화에 넣기'와 같은 설정)
  const { S, save, num } = builders(ctx, idx, redraw, "");
  const inj = S.inject ?? {};
  const orow = (title, text, v0, set, cost) => h("div", { class: "rb-srow" }, h("span", { class: "t" }, h("span", null, title, cost ? aiTag(cost) : null), h("small", null, text)),
    switchEl(v0, { label: title, onChange: (v, el) => { setSwitch(el, v); save((st) => { st.inject ??= {}; set(st.inject, v); }); } }));
  const orowS = (title, text, v0, set, cost) => h("div", { class: "rb-srow" }, h("span", { class: "t" }, h("span", null, title, cost ? aiTag(cost) : null), h("small", null, text)),
    switchEl(v0, { label: title, onChange: (v, el) => { setSwitch(el, v); save((st) => set(st, v)); } }));
  ensureMemAddonCss(ctx);
  const memOptions = h("section", { class: "rb-card bordered rb-scard rb-mem-options" }, h("span", { class: "h" }, "기억 옵션"), aiLegend(),
    orow("사람다운 기억", "관계 진도·호칭·말투·둘만의 추억 등을 기억해요.", inj.human !== false, (o, v) => { o.human = v; }, "human"),
    orow("감정이 시간이 지나면 식어요", "적대·두려움은 빨리, 애정은 천천히 누그러져요.", inj.cool !== false, (o, v) => { o.cool = v; }, "cool"),
    orow("거짓말·오해 추적", "누가 무엇을 잘못 믿는지 기억해요. 분석 모델이 약하면 틀릴 수 있어요.", inj.beliefs === true, (o, v) => { o.beliefs = v; }, "beliefs"));
  // 2.2.4 기억 토큰 절약: 칸별 예산을 줄여 기억 블록 약 4,100 → 2,900토큰(LoCoMo 정답률 약 1~2점 손해)
  memOptions.append(orow("세계 탭 (장소·물건·세력·목표·소문)", "기록 보기에 ‘세계’ 탭이 생기고, 응답에 나온 장소·물건·세력, 인물 목표, 누가 누구에게 무엇을 들었는지 기록해 장면에 맞는 것만 넣어요.", inj.world === true, (o, v) => { o.world = v; }, "world"));
  memOptions.append(orow("상태이상", "취함·부상·감기·최음제·수면 부족처럼 인물에게 생긴 상태를 기록하고, 나을 때까지(또는 정한 날만큼) 행동에 반영해요. 인물 위키와 이름 상태창에 보여요.", inj.status !== false, (o, v) => { o.status = v; }, "status"));
  memOptions.append(orow("옷차림·액세서리", "인물이 부위별로 입은 옷과 액세서리를 기록해요(간단히 + 삽화용 상세). 장면에 넣고 캐릭터 상태창·인물 위키에서 봐요.", inj.outfit !== false, (o, v) => { o.outfit = v; }, "outfit"));
  memOptions.append(orow("종족", "인물의 종족(엘프·수인·서큐버스 등)을 기록해 체질·발정기·임신·성감대·몸 모형에 반영해요. 성격·말투는 바꾸지 않아요. 인물 위키 › 관계 › 종족에서 고칠 수 있어요.", inj.race !== false, (o, v) => { o.race = v; }, "race"));
  memOptions.append(orow("캐릭터 상태창 (본문 이름 링크)", "응답 본문에 나온 인물 이름을 누르면 그 인물의 캐릭터 상태창(사진·수치·상태·옷차림·요약·NSFW)이 떠요. 끄면 이름이 그대로 보여요.", inj.nameLinks !== false, (o, v) => { o.nameLinks = v; }, "namelinks"));
  memOptions.append(orow("장면 상태창 (응답 아래)", "응답 아래 로어북 버튼 위에 날짜·시간·장소·날씨·등장인물을 날씨에 맞게 움직이는 배경으로 보여 줘요. 날씨 줄을 기록기에 더해요.", inj.scenePanel !== false, (o, v) => { o.scenePanel = v; }, "scenepanel"));
  memOptions.append(orow("기억 토큰 절약", "기억에 넣는 양을 약 30% 줄여요(약 4,100 → 2,900토큰). 정확도는 조금(1~2%) 떨어져요. 비싼 모델은 ‘Jev 재정렬’과 함께 켜면 더 아껴요.", inj.saver !== false, (o, v) => { o.saver = v; }, "saver"));
  memOptions.append(orow("분기한 채팅에 기억 이어받기", "채팅을 분기·복사하면 갈라지기 전까지의 기억을 원래 채팅에서 이어받아요(기억이 빈 채팅만). 갈라진 뒤의 기록은 들어오지 않아요.", inj.forkInherit !== false, (o, v) => { o.forkInherit = v; }, "fork"));
  // 요약된 옛 대화 빼고 보내기(2.0.1): 하이파처럼 전체 문맥을 줄인다. 기본 켜짐(끈 사람만 false)
  memOptions.append(orow("요약된 옛 대화 빼고 보내기", "장기 기억에 이미 정리된 옛 대화는 모델에 보내지 않아 전체 토큰이 줄어요. 최근 대화와 아직 정리 안 된 대화는 그대로 보내요. 매 턴이 아니라 남길 턴만큼 쌓일 때마다 한꺼번에 빼서 그 사이엔 프롬프트 캐시가 그대로 맞아요.", inj.trimOld !== false, (o, v) => { o.trimOld = v; }, "trim"));
  memOptions.append(orowS("지난 대화 분석에 함께 기록", "지난 대화 분석 때 인물 위키도 함께 채워요. 묶음마다 AI 호출이 1번쯤 더 들어요.", S.backfillExtras !== false, (st, v) => { st.backfillExtras = v; }, "backfill"));
  // 2.2.11 지난 대화 분석 속도: 묶음 크기(한 번에 묻는 AI 응답 수)·동시 처리(요청 한도가 나면 자동으로 줄임)
  const selS = (label, v0, opts, set) => h("select", { class: "rb-input", "aria-label": label, style: "width:auto", onChange: (e) => save((st) => set(st, Number(e.target.value))) }, opts.map(([v, l]) => h("option", { value: v, selected: v === v0 }, l)));
  memOptions.append(h("div", { class: "rb-srow", id: "rb-mem-bfspeed" }, h("span", { class: "t" }, "지난 대화 분석 속도", h("small", null, "묶음을 크게 하면 호출 수가 줄고, 동시에 2~3개를 보내면 빨라져요. 요청 한도(429)가 나면 동시 처리를 자동으로 줄여요. 동시 처리는 앞 묶음 결과를 모른 채 읽어 기록이 조금 덜 이어질 수 있어요.")),
    h("div", { class: "rb-bfsel" },
      selS("묶음 크기", Number(S.backfillBatch) || 3, [[1, "1개씩"], [2, "2개씩"], [3, "3개씩(기본)"], [5, "5개씩"], [8, "8개씩"]], (st, v) => { st.backfillBatch = v; }),
      selS("동시 처리", Number(S.backfillParallel) || 1, [[1, "하나씩(기본)"], [2, "2개 동시"], [3, "3개 동시"]], (st, v) => { st.backfillParallel = v; }))));
  // addon-rebuild: ‘지난 대화 분석에 Erosync도’는 뺐다 — 성인 프로필은 장기기억이 기본 성격과 함께 만든다
  memOptions.append(adultSeedRow(ctx));   // 2.2.6 처음 등장 때 성인 항목 무작위로(누르면 설정 창, 기본 꺼짐)
  // 숫자 칸(기억 넣기 토큰·남길 최근 턴)은 맨 아래(2.1.5). 리수폿 일괄 사용은 리수폿 화면에 있어 여기선 뺐다.
  memOptions.append(h("div", { class: "rb-srow rb-mem-tokens", id: "rb-mem-tokens" }, h("span", { class: "t" }, "기억 넣기 토큰", h("small", null, "응답마다 넣는 기억의 양이에요. 목표만큼 채우고, 중요한 게 많으면 상한까지 늘어나요.")),
    h("div", { class: "rb-mem-tokpair", style: "display:flex;gap:8px;flex-wrap:wrap" },
      num("목표(최소)", () => inj.targetTokens ?? 2000, (s, v) => { s.inject ??= {}; s.inject.targetTokens = v; if ((s.inject.capTokens ?? 0) < v) s.inject.capTokens = v; }, { min: 200, max: 100000, step: 100, def: 2000 }),
      num("상한(최대)", () => inj.capTokens ?? 8000, (s, v) => { s.inject ??= {}; s.inject.capTokens = Math.max(v, s.inject.targetTokens ?? 0); }, { min: 200, max: 100000, step: 100, def: 8000 }))));
  // 2.2.0 자동 기록 입력 예산(인물 위키 설정 값 writerInputBudgetTokens)은 ‘기억 넣기 토큰’ 바로 밑. 인물 위키 설정을 읽을 수 있을 때만 보인다.
  const budgetRow = h("div", { class: "rb-srow rb-mem-wbudget", id: "rb-mem-wbudget", hidden: true });
  memOptions.append(budgetRow);
  if (M.flow) (async () => {
    const st = tracked(ctx, await M.flow.settings());
    if (st.status().blocked) return;
    const inp = h("input", { class: "rb-input", type: "number", min: 1000, max: 1000000, step: 1000, value: st.rawSnapshot().writerInputBudgetTokens ?? 96000, "aria-label": "자동 기록 입력 예산(토큰)", style: "width:120px",
      onChange: (e) => { const n = Math.min(1000000, Math.max(1000, Math.round(Number(e.target.value) || 96000))); e.target.value = n; try { st.update((x) => { x.writerInputBudgetTokens = n; }); } catch (er) { fail(ctx)(er); } } });
    replace(budgetRow, h("span", { class: "t" }, "자동 기록 입력 예산", defHint(96000, "토큰"), h("small", null, "인물 위키 자동 기록이 한 번에 읽는 글의 양(토큰)이에요. 기본값이면 충분해요.")), inp);
    budgetRow.hidden = false;
  })().catch(() => {});
  memOptions.append(h("div", { class: "rb-srow rb-mem-trimkeep", id: "rb-mem-trimkeep" }, h("span", { class: "t" }, "남길 최근 턴", h("small", null, "‘요약된 옛 대화 빼고 보내기’를 켰을 때 이만큼의 최근 대화(내 말 기준)는 늘 그대로 보내요. 두 배가 쌓이면 이만큼으로 한 번에 줄여요.")),
    num("턴", () => inj.trimKeep ?? 10, (s, v) => { s.inject ??= {}; s.inject.trimKeep = v; }, { min: 4, max: 200, step: 1 })));

  return { memorySettings, memOptions };
}

// Erosync 한 줄 카드: 인물 관계도 줄과 같은 모양. 누르면 켜기·설정 화면(page "erosync")
// 장기 기억 머리(파일 내보내기·불러오기는 인물 위키의 ‘더보기’로 옮겼다)
function memHead() {
  return pageHead("장기 기억");
}

// 리수폿 한 줄 카드(2.0.0): Erosync 줄과 같은 모양. 누르면 리수폿 화면(page "pot": 개요·설정·자동 기록·고급)
function potRow(ctx, m, redraw) {
  return h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-pot", "data-tour": "mem-pot", onClick: () => { m.page = "pot"; redraw(); } },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("book", 18)),
    h("span", { class: "t" }, "인물 위키 설정", h("small", null, "응답마다 인물 위키를 자동으로 쌓아요. 무엇을 얼마나 자세히 기억할지(추적 수준·기능 카드)는 ‘설정’ 탭, 기록에 쓸 AI 모델·인물 추적·저장 위치·되돌리기는 ‘고급’ 탭에서 바꿔요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
}
function erosyncRow(ctx, m, redraw) {
  if (!ctx.erosync) return null;
  return h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-erosync", onClick: () => { m.page = "erosync"; redraw(); } },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("shield", 18)),
    h("span", { class: "t" }, "NSFW 설정", h("small", null, `${ctx.erosync.on() ? "켜져 있어요." : "꺼져 있어요."} Erosync가 인물마다 성향·관계·목표를 읽어 두고, 다음 응답의 장면 계획을 요청에 넣어요. 켜기·user에게도 적용은 위에서, 수위·동작은 ‘장면·수위’, 인물 분석·프롬프트는 ‘분석·관리’ 탭에서 바꿔요.`)),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));
}

// 2.2.0 B안 칸 단추 + 패널. 고른 칸은 m.memTab에 기억(없는 칸이면 첫 칸).
function memTabs(m, list, panels) {
  const cur = list.some(([k]) => k === m.memTab) ? m.memTab : list[0][0];   // 채팅 없을 때 '기록'을 골라 뒀어도 기억은 그대로 둔다
  const btns = list.map(([k, l]) => h("button", { type: "button", role: "tab", id: `rb-mem-tab-${k}`, class: "rb-mem4-tab", "aria-selected": String(cur === k), onClick: () => pick(k) }, l));
  const pick = (k) => { m.memTab = k; btns.forEach((b, i) => b.setAttribute("aria-selected", String(list[i][0] === k))); for (const [id, el] of Object.entries(panels)) el.hidden = id !== k; };
  for (const [id, el] of Object.entries(panels)) { el.setAttribute("role", "tabpanel"); el.dataset.memtab = id; el.hidden = id !== cur; }
  return { tabs: h("div", { class: "rb-mem4-tabs", role: "tablist", "aria-label": "장기 기억 칸" }, ...btns), panels: Object.values(panels) };
}

export async function renderMemoryHome(ctx, host, { redraw }) {
  const m = mem(ctx), M = ctx.memory;
  // 열린 채팅 확인(호스트 왕복)을 안내·모드 막대 읽기와 동시에 시작한다(1.8.3 속도). 위치가 같으면 직전 값을 바로 쓴다.
  const curP = Promise.resolve().then(() => (M.switches.peekCurrent ? M.switches.peekCurrent({ onChange: () => { if (ctx.state.tab === "memory" && mem(ctx) === m) redraw(); } }) : M.switches.currentChat()));
  curP.catch(() => {});
  await maybeAskBardWiki(ctx).catch(() => {});
  const modeHost = h("div");
  await renderModeBar(ctx, modeHost, { redraw });  // 간단 모드에서는 저장소를 자동으로 맞추기만 한다
  const cur = await curP;
  if (!cur) {
    // 열린 채팅이 없어도 전체 설정(기억 옵션·임베딩·프롬프트·고급)은 바꿀 수 있다
    const idx0 = await M.store.getIndex();
  const { memorySettings, memOptions } = await settingsCards(ctx, M, idx0, redraw);
    const gHost = h("div");
    if (ctx.prefs.advanced) {
      const body = h("div");
      await renderGlobalSettings(ctx, body, { redraw, bare: true }).catch(() => {});
      organizeAdv(body);
      gHost.append(h("section", { class: "rb-mem-folds", "aria-label": "고급" }, h("h3", { class: "rb-h3" }, "고급"),
        h("details", { class: ["rb-card", "bordered", "rb-mem-grp"], dataset: { g: "store" } }, h("summary", null, h("span", { class: "t" }, h("b", null, "고급: 기록·기억 넣기 세부 설정"), h("small", null, "저장소·분석·넣기·임베딩·가져오기")), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))), h("div", { class: "rb-mem-foldbody" }, body))));
    }
    // 2.2.0: 채팅이 없어도 같은 칸 나누기(한눈에·옵션·설정). 기록 칸은 채팅이 있어야 해서 뺀다.
    const empty = emptyState({ icon: "brain", title: "열린 채팅이 없어요", text: "채팅을 열면 그 채팅의 기억을 보여 줘요. 설정은 채팅 없이도 바꿀 수 있어요.",
      actions: [{ label: "다른 채팅 보기", icon: "list", onClick: () => { m.page = "bots"; redraw(); } }] });
    const { tabs: tabRow, panels: panelEls } = memTabs(m, [["glance", "한눈에"], ["opt", "설정"]], {
      glance: h("div", { class: "rb-mem4-col" }, empty),
      opt: h("div", { class: "rb-mem4-col rb-mem4-set" }, h("div", { class: "rb-mem4-two rb-mem4-optrow" }, h("div", { class: "rb-mem4-col" }, memOptions), h("div", { class: "rb-mem4-col rb-mem4-side" }, potRow(ctx, m, redraw), erosyncRow(ctx, m, redraw), gaugeMultCard(ctx), memorySettings)), ctx.prefs.advanced ? gHost : advFold(ctx, "memory", true)),
    });
    return replace(host, h("div", { class: "rb-mem3 rb-mem4-wrap" }, h("div", { class: "rb-mem2-main rb-mem4" }, memHead(ctx, redraw), tabRow, ...panelEls)));
  }
  // 채팅 본문은 느릴 수 있으므로 화면을 먼저 그리고, 백필 분석용 데이터는 백그라운드에서 읽는다.
  const cacheKey = `${cur.chaId}:${cur.chatId}:${cur.ci}:${cur.ti}`;
  const hasCachedPlan = m.homeChatPlan?.key === cacheKey && Date.now() - m.homeChatPlan.t < 20000;
  const cachedPlan = hasCachedPlan ? m.homeChatPlan.plan : null;
  let chatPromise = Promise.resolve(null);
  if (!hasCachedPlan) {
    if (m.homeChatPromise?.key === cacheKey) chatPromise = m.homeChatPromise.promise;
    else {
      chatPromise = ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      m.homeChatPromise = { key: cacheKey, promise: chatPromise };
    }
  }
  const [sw, idx, folder] = await Promise.all([M.switches.state(cur.chaId), M.store.getIndex(), M.store.getFolder(cur.chaId, cur.chatId).catch(() => null)]);
  const caps = M.capabilities(M.backend(idx.settings).id), msgs = [];
  if (!hasCachedPlan) chatPromise.then((loaded) => {
    if (!loaded) return;
    const loadedMsgs = loaded.message ?? [];
    const nextPlan = caps.analyze && M.runner ? M.runner.planBackfill(loadedMsgs, { from: 0, to: Math.max(0, loadedMsgs.length - 1), size: idx.settings?.backfillBatch }, folder) : null;
    m.homeChatPlan = { key: cacheKey, plan: nextPlan, t: Date.now() };
    if (m.homeChatPromise?.key === cacheKey) m.homeChatPromise = null;
    if (ctx.state.tab === "memory" && mem(ctx) === m) redraw();
  }).catch(() => {});
  const botCfg = idx.bots[cur.chaId] ?? {}, last = M.injector?.lastRequest?.() ?? null;
  const on = sw.memory.on;

  const setOn = async (v) => {
    try { await M.switches.setMemory(cur.chaId, v); if (v) await M.store.updateIndex((i) => { const b = i.bots[cur.chaId]; if (b) { b.paused = false; b.fails = 0; } }); if (v) maybePromptIntro(ctx); ctx.toast(v ? "이 채팅에서 기억을 켰어요. 다음 응답부터 기록돼요." : "이 채팅에서 기억을 껐어요."); } catch (e) { fail(ctx)(e); }
    redraw();
  };
  // 상태 카드: 꺼짐 / 문제(연속 실패로 멈춤) / 준비 중(아직 요청 없음·안 넣음) / 사용 중
  let status;
  const chatLabel = `${cur.botName || "이름 없는 캐릭터"} · ${cur.chatName || "이 채팅"}`;
  if (!on) status = statusCard("off", `${chatLabel} · ${sw.memory.reason === "bot-off" ? "이 채팅에서는 꺼 두었어요." : "기억이 꺼져 있어요."}`);
  else if (botCfg.paused) status = statusCard("err", "연속으로 실패해서 자동 기록이 멈췄어요.", { label: "다시 켜기", kind: "primary", onClick: () => setOn(true) });
  else {
    const line = injectLine(last, last ? hhmm(last.at) : "", injectReasonText(last?.reason));
    status = statusCard(last?.injected ? "on" : "prep", `${chatLabel} · ${line}`);
  }

  // 지난 대화 분석 (미처리만)
  const plan = caps.analyze && M.runner ? cachedPlan : null;
  const prog = h("div"); bfAttach(bfKey(cur.ci, cur.ti), prog);   // 분석 중에 화면을 다시 열어도 진행 표시를 잇는다
  const analyze = async () => {
    let activeChat = null, activeMsgs = [], activePlan = plan;
    if (!activePlan || !activePlan.todo) {
      activeChat = await chatPromise;
      if (!activeChat) activeChat = await ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      activeMsgs = activeChat?.message ?? [];
      activePlan = activeChat && M.runner ? M.runner.planBackfill(activeMsgs, { from: 0, to: Math.max(0, activeMsgs.length - 1), size: idx.settings?.backfillBatch }, folder) : activePlan;
    } else {
      activeChat = await ctx.api.getChatFromIndex(cur.ci, cur.ti).catch(() => null);
      activeMsgs = activeChat?.message ?? [];
    }
    let redo = false;
    if (!activePlan?.todo) {
      // 새로 분석할 응답이 없어도, 눌렀다면 처음부터 다시 분석할지 묻는다
      const all = activeMsgs.length && M.runner ? M.runner.planBackfill(activeMsgs, { from: 0, to: Math.max(0, activeMsgs.length - 1), all: true, size: idx.settings?.backfillBatch }, folder) : null;
      if (!all?.total) return ctx.toast("분석할 AI 응답이 없어요.");
      const again = await confirmDialog(ctx.win, { title: "미분석 응답이 없어요", body: `AI 응답 ${all.total}개가 모두 분석돼 있어서 전체를 다시 분석해요. 호출 ${all.calls}회 · 대략 ${all.tokens.toLocaleString()} 토큰이 들어요. 기존 기록은 지워지지 않고, 새로 확인된 내용이 더해지거나 바뀔 수 있어요.`, ok: "전체 분석" });
      if (!again) return;
      redo = true;
    } else {
      const ok = await confirmDialog(ctx.win, { title: "지난 대화 분석", body: `미분석 AI 응답 ${activePlan.todo}개만 분석해요. 호출 ${activePlan.calls}회 · 대략 ${activePlan.tokens.toLocaleString()} 토큰이 들어요.`, ok: "분석하기" });
      if (!ok) return;
    }
    const ctrl = new AbortController();
    try {
      const r = await bfRun(bfKey(cur.ci, cur.ti), ctrl, prog, (onProgress) => M.runner.backfill(cur.ci, cur.ti, { from: 0, to: Math.max(0, activeMsgs.length - 1) }, { signal: ctrl.signal, redo, onProgress }));
      ctx.toast(`지난 대화 분석이 끝났어요${r.server ? " (서버)" : ""} (${r.total - r.failed.length}/${r.total}).${r.reasons?.length ? ` 실패 이유: ${r.reasons[0]}` : ""}`, r.failed.length ? { error: true } : undefined);
    } catch (e) { fail(ctx)(e); }
    redraw();
  };
  const openDetail = (tab = "people") => { m.botId = cur.chaId; m.chatIndex = cur.ti; m.tab = tab; m.personKey = ""; m.page = "detail"; redraw(); };
  const u = usageOf(folder, last?.manifest);

  // ── 상태 카드: 상태·스위치·숫자 3·막대·범례 (머리 스위치와 합침) ──
  const onSw = switchEl(on, { label: "이 채팅에서 사용", onChange: (v, el) => { setSwitch(el, v); setOn(v); } });
  const num = (n, lab) => h("div", { class: "rb-hnum" }, h("b", null, String(n)), h("small", null, lab));
  const bar = u.total ? h("div", { class: "rb-mbar", role: "img", "aria-label": USAGE_KINDS.map(([k, l]) => `${l} ${u[k]}건`).join(", ") }, USAGE_KINDS.filter(([k]) => u[k]).map(([k]) => h("i", { class: `u-${k}`, style: `flex:${u[k]}` }))) : null;
  const legend = u.total ? h("ul", { class: "rb-mbar-legend" }, USAGE_KINDS.map(([k, l]) => h("li", null, h("i", { class: `u-${k}` }), `${l} ${u[k]}`))) : null;
  const statusBox = h("section", { class: "rb-card bordered rb-mem-statuscard" },
    h("div", { class: "rb-mem-statushead" }, status, onSw),
    h("div", { class: "rb-hnums rb-mem-nums" }, num(u.total, "저장된 기록"), num(last?.injected ? u.used : 0, "이번에 넣음"), num(plan ? plan.todo : "–", "미처리")),
    bar, legend);

  // ── 큰 버튼 하나 + 바로가기 4칸 ──
  const bigAct = caps.analyze && M.runner
    ? btn(plan ? `지난 대화 분석 · 미처리 ${plan.todo}개` : "지난 대화 분석", { kind: "primary", icon: "sparkle", onClick: analyze, id: "rb-mem-analyze" })
    : btn("기록 보기", { kind: "primary", icon: "brain", onClick: () => openDetail(), id: "rb-mem-analyze" });
  bigAct.classList.add("rb-bigbtn");
  const tile = (ic, name, onClick, id) => h("button", { type: "button", class: "rb-htile", onClick, id }, h("span", { class: "ico" }, icon(ic, 20)), h("span", { class: "t" }, h("b", null, name)));
  const shortcuts = h("section", { class: "rb-hdo rb-hdo-sm rb-mem-short", "aria-label": "바로가기" }, h("h2", null, "바로가기"), h("div", { class: "rb-hgrid" },
    tile("character", "인물 위키", () => openDetail("people"), "rb-mem-go-wiki"),
    tile("list", "기록 보기", () => openDetail("scenes"), "rb-mem-go-detail"),
    tile("image", "카드로 만들기", () => ctx.go("cards"), "rb-mem-go-cards"),
    tile("message", "다른 채팅", () => { m.page = "bots"; redraw(); }, "rb-mem-go-bots")));

  // '나' 한 줄 카드 (1.8.3): 다른 인물들이 나를 어떻게 기억하는지
  const meRow = h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-me", onClick: () => { m.page = "me"; redraw(); } },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, "나"),
    h("span", { class: "t" }, "나에 대한 기억", h("small", null, "다른 인물들이 나를 어떻게 보고 부르는지 모아 봐요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));

  // 인물 관계도 한 줄 카드 (1.9.3): '나에 대한 기억' 바로 아래. 누르면 관계도 탭으로 바로
  const npcN = Object.values(folder?.people ?? {}).filter((p) => p && String(p.name).toLowerCase().replace(/\s+/g, "") !== "{{user}}" && (p.records ?? []).some((r) => !r.orphan)).length;
  const mapRow = h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-relmap", onClick: () => ctx.go("relmap") },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("network", 18)),
    h("span", { class: "t" }, "인물 관계도", h("small", null, npcN ? `인물 ${npcN}명의 거리와 관계를 한눈에 봐요.` : "인물이 쌓이면 거리와 관계를 한눈에 볼 수 있어요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));

  // 갈래 보기 한 줄 카드(장기기억 0.3.20): 분기한 채팅들을 나무로, 갈래별 호감 비교
  const branchRow = h("button", { type: "button", class: "rb-card bordered rb-srow rb-me-entry", id: "rb-mem-go-branches", onClick: () => ctx.go("branches") },
    h("span", { class: "rb-mem-av rb-me-av sm", "aria-hidden": "true" }, icon("split", 18)),
    h("span", { class: "t" }, "갈래 보기", h("small", null, "분기한 채팅들을 나무로 보고 갈래마다 호감을 비교해요.")),
    h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16)));

  const { memorySettings, memOptions } = await settingsCards(ctx, M, idx, redraw, cur, sw);

  // ── 고급: 한 줄씩 접은 묶음. PC에서는 기억 방식을 접지 않고 오른쪽 맨 위에 둔다 ──
  const wide = (ctx.win?.ownerDocument?.defaultView?.innerWidth ?? 1280) >= 1000;
  const fold = (g) => h("details", { class: ["rb-card", "bordered", "rb-mem-grp", g.danger && "is-danger"], dataset: { g: g.id }, onToggle: (e) => { if (e.target.open) g.onOpen?.(); } },
    h("summary", null, h("span", { class: "t" }, h("b", null, g.title), h("small", null, g.sub)), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))), h("div", { class: "rb-mem-foldbody" }, ...g.kids));
  // 2.2.0: 설정 칸을 옵션 칸으로 합침. 기억 방식은 플러그인 기본(화면에서 뺌, renderModeBar는 저장소 맞추기만),
  // 자동 기록·인물 추적은 리수폿에 있어 뺌, 저장·기록·대화에 넣기 + 세부 설정은 ‘고급: 기록·기억 넣기 세부 설정’ 하나로.
  let advEl;
  if (ctx.prefs.advanced) {
    const gs = advancedGroups(ctx, { cur, idx, redraw }), by = Object.fromEntries(gs.map((g) => [g.id, g]));
    const merged = { id: "store", title: "고급: 기록·기억 넣기 세부 설정", sub: "분석 시점·모델·넣는 항목·로어·추적 수준·기능 카드", kids: [...(by.store?.kids ?? []), ...(by.more?.kids ?? [])], onOpen: by.more?.onOpen };
    advEl = h("section", { class: "rb-mem-folds", "aria-label": "고급" }, h("h3", { class: "rb-h3" }, "고급"), ...[merged, by.diag, by.danger].filter(Boolean).map(fold));
    const sb = advEl.querySelector(".rb-mem-grp[data-g=store] .rb-mem-foldbody"); if (sb) organizeAdv(sb);
  } else advEl = advFold(ctx, "memory", true);
  void modeHost; void wide;

  // 2.2.0 B안: 상태·분석은 늘 위, 아래는 [한눈에 · 기록 · 옵션 · 설정] 칸. 리수폿·Erosync는 옵션 칸.
  const recAll = recentOf(folder, 12);
  ensureFailLogStyle();
  let failCount = 0, failLast = "";
  try { const fl = M.failLog ? await M.failLog.list() : []; failCount = fl.length; failLast = fl[0] ? `${fl[0].area} · ${fl[0].title}` : ""; } catch { /* 목록 없이 */ }
  // 오른쪽 아래 알림의 '이유 보기'로 열렸으면 그 항목을 바로 띄운다
  const pendingReason = takePendingReason();
  if (pendingReason) setTimeout(() => openFailLog(ctx, { focus: pendingReason }).catch(() => {}), 80);
  const recFull = h("section", { class: "rb-card bordered rb-mem-recentbox rb-mem-recfull" }, h("div", { class: "rb-mem-rechead" }, h("b", null, "최근 기록"), recAll.length ? h("button", { type: "button", class: "rb-textlink", onClick: () => openDetail() }, "전체 보기") : null),
    h("ul", { class: "rb-mem-reclist rb-mem-recent" }, recAll.length
      ? recAll.map((r) => h("li", { class: "rb-mem-rec" }, h("div", { class: "txt" }, h("div", null, h("b", null, r.who), " ", r.act), h("div", { class: "rb-muted" }, at(r.at))), gradeBadge(r.g)))
      : h("li", { class: "rb-muted" }, "아직 쌓인 기록이 없어요.")));
  // 2.2.4 실패 기록 보기(한눈에: 바로가기·인물과 최근 기록 사이, 전체 폭). 실패가 있으면 개수와 마지막 실패를 보여 준다
  const failBtn = M.failLog ? h("button", { type: "button", class: "rb-card bordered rb-mem-failbtn", id: "rb-mem-failbtn", onClick: () => openFailLog(ctx).then(() => redraw()).catch(fail(ctx)) },
    h("span", { class: "t" }, h("b", null, "실패 기록 보기"), h("small", { class: "rb-muted" }, failCount ? `최근 실패 ${failCount}건 · 마지막: ${failLast}` : "실패한 기록이 없어요")),
    failCount ? h("span", { class: "rb-mem-failn" }, String(failCount)) : null, h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))) : null;
  // addon-rebuild 전체 기록 보기(실패 기록 보기 바로 아래, 디버깅용)
  const allBtn = M.eventLog ? h("button", { type: "button", class: "rb-card bordered rb-mem-failbtn", id: "rb-mem-allbtn", onClick: () => openEventLog(ctx).catch(fail(ctx)) },
    h("span", { class: "t" }, h("b", null, "전체 기록 보기"), h("small", { class: "rb-muted" }, "성공·실패·건너뜀을 모두 시간순으로 (디버깅용)")), h("span", { class: "go", "aria-hidden": "true" }, icon("chevron", 16))) : null;
  const TABS4 = [["glance", "한눈에"], ["opt", "설정"]];
  const panels = {
    // 기록 칸은 없앰: 한눈에 위쪽 = 바로가기 | 나·관계도, 아래 = 최근 기록(12건) 전체 폭
    // 나·관계도는 바로가기와 같은 칸 모양(조금 더 넓게, 설명 읽기)
    glance: h("div", { class: "rb-mem4-col" }, h("div", { class: "rb-mem4-top" }, shortcuts, h("section", { class: "rb-mem4-wide", "aria-label": "인물" }, h("h2", null, "인물"), h("div", { class: "rb-mem4-widegrid" }, meRow, mapRow, branchRow))), failBtn, allBtn, recFull),
    opt: h("div", { class: "rb-mem4-col rb-mem4-set" }, h("div", { class: "rb-mem4-two rb-mem4-optrow" }, h("div", { class: "rb-mem4-col" }, memOptions), h("div", { class: "rb-mem4-col rb-mem4-side" }, potRow(ctx, m, redraw), erosyncRow(ctx, m, redraw), gaugeMultCard(ctx), memorySettings)), advEl),
  };
  const { tabs: tabRow, panels: panelEls } = memTabs(m, TABS4, panels);
  const main = h("div", { class: "rb-mem2-main rb-mem4" },
    memHead(ctx, redraw),
    statusBox, bigAct, prog,
    !caps.analyze ? note("warn", "이 저장소에서는 분석을 BardWiki가 해요. 기록 보기만 쓸 수 있어요.") : null,
    tabRow, ...panelEls);
  replace(host, h("div", { class: "rb-mem3 rb-mem4-wrap" }, main));
  // 1.8.3: 임베딩 안내 창은 자동으로 띄우지 않는다(시작 안내 3단계에서 설정, 필요하면 설정 줄의 '임베딩'에서)
}

// 2.2.0 자동 기록 세부 창(장기 기억 → 설정 → 임베딩 아래 줄)
async function openWriterDetails(ctx) {
  const st = tracked(ctx, await ctx.memory.flow.settings());
  if (st.status().blocked) return ctx.toast("인물 위키 설정을 읽지 못했어요.", { error: true });
  await modal(ctx.win, (done) => h("div", { class: "rb-dialog", role: "dialog", "aria-modal": "true", "aria-label": "자동 기록 세부", id: "rb-mem-writer", style: "width:min(620px,94vw);max-height:86vh;overflow:auto" },
    h("h3", { class: "rb-h3" }, "자동 기록 세부", scopeChip("all")),
    h("p", { class: "rb-muted" }, "기본값이면 충분해요. 바꾸면 바로 저장되고 다음 응답부터 적용돼요."),
    writerDetails(ctx, st),
    h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(null) }))));
}
