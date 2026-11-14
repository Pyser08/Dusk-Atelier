// 프로바이더 (v1.9.3): 리스 모델 목록에 'Dusk 자동'과 'Dusk · 프로필' 을 더한다. 연결(키) → 프로필(모델·생각·캐시) → 용도별 지정.
// 설정은 pluginStorage(키 값 제외), 키 값은 이 기기의 로컬 저장소에만 있다. 계산은 data/provider, 여기서는 그리기만 한다.
import { h, replace } from "../dom.js";
import { icon } from "../icons.js";
import { btn, confirmDialog, emptyState, openMenu, pageHead, segmented, statusCard, switchEl, advFold, note } from "../kit.js";
import { KINDS, kindOf, isReasoningModel } from "../../engine/provider/catalog.js";
import { normalizeConnection, normalizeProfile } from "../../engine/provider/profile.js";
import { field, text, num, area, select, grid } from "./provider/ui.js";
import { presetsFor, isOn, apply } from "../../engine/provider/presets.js";
import { renderMore, MORE_TABS } from "./provider/more.js";
import { glancePanel } from "./provider/glance.js";

const TABS = [["home", "한눈에"], ["conn", "연결"], ["prof", "프로필"], ...MORE_TABS];
const uid = () => Math.random().toString(36).slice(2, 10);

export async function renderProvider(ctx) {
  const P = ctx.provider;
  const host = h("div", { class: "rb-section rb-scroll rb-prov" });
  replace(ctx.main, host);
  if (!P) { replace(host, emptyState({ icon: "alert", title: "프로바이더를 쓸 수 없어요", text: "이 환경에서는 프로바이더 기능이 준비되지 않았어요." })); return; }
  const st = (ctx.state.prov ??= { tab: "home", models: {}, busy: "" });
  const token = ctx.state.tab;
  const alive = () => ctx.state.tab === token && host.isConnected;
  let cfg = await P.store.get();
  const mutate = async (fn) => { cfg = await P.store.update(fn); await P.sync().catch(() => {}); return cfg; };
  const toast = (t, o) => ctx.toast(t, o);
  const fail = (e) => toast(e?.message ?? String(e), { error: true });
  const draw = async () => {
    if (!alive()) return;
    cfg = await P.store.get();
    const sup = P.supported(), names = P.names();
    if (st.tab === "home" && !cfg.connections.length) st.tab = "conn";   // 연결이 없으면 연결부터
    const body = h("div", { class: "rb-prov-body", style: "display:flex;flex-direction:column;gap:14px" });
    const tabs = segmented(TABS, st.tab, (v) => { st.tab = v; draw(); }, "프로바이더 메뉴");
    tabs.style.cssText = "flex-wrap:wrap";
    if (st.tab === "home") body.append(...(await glancePanel({ P, cfg, mutate, draw, st })));
    else if (st.tab === "conn") body.append(...connPanel());
    else if (st.tab === "prof") body.append(...profPanel());
    else body.append(...(await renderMore(st.tab, { ctx, P, cfg, mutate, draw, toast, fail })));
    replace(host,
      pageHead("프로바이더", { sub: "리스 모델 목록에 Dusk를 더해요", sw: { on: cfg.enabled, text: "사용", label: "프로바이더 사용", onChange: async (v) => { try { await mutate((c) => { c.enabled = v; }); toast(v ? "켰어요. 리스 모델 목록에서 ‘Dusk 자동’을 골라 보세요." : "껐어요. 이미 등록된 이름은 다음에 열 때 사라져요."); } catch (e) { fail(e); } draw(); } } }),
      !sup ? statusCard("err", "이 호스트는 모델 목록에 직접 더하는 기능(addProvider)을 지원하지 않는 것 같아요. 설정은 해 둘 수 있지만 리스에서 고를 수 없을 수 있어요.") : cfg.enabled ? statusCard("on", names.length ? `리스 모델 목록: ${names.join(" · ")}` : "곧 등록돼요") : statusCard("off", "위 스위치를 켜면 리스 모델 목록에 나타나요."),
      !cfg.profiles.length && cfg.enabled ? note("warn", "프로필이 아직 없어요. ‘연결’에서 키를 넣고 모델을 골라 프로필을 만들어 주세요.") : null,
      tabs, body);
  };

  // ───────── 연결 ─────────
  function connPanel() {
    const out = [];
    out.push(h("div", { class: "rb-actions" }, btn("연결 추가", { kind: "primary", icon: "plus", id: "rb-prov-addconn", onClick: (e) => openMenu(host, e.currentTarget, Object.entries(KINDS).map(([k, v]) => ({ label: v.label, onClick: async () => { const c = normalizeConnection({ kind: k, name: v.label }); await mutate((x) => { x.connections.push(c); }); st.open = c.id; draw(); } }))) })));
    if (!cfg.connections.length) out.push(emptyState({ icon: "network", title: "연결이 없어요", text: "OpenAI·Anthropic·Gemini·OpenRouter 등을 추가하고 키를 넣어요. 키는 이 기기에만 저장돼요." }));
    for (const c of cfg.connections) out.push(connCard(c));
    return out;
  }
  function connCard(c) {
    const k = kindOf(c.kind), open = st.open === c.id, models = st.models[c.id] ?? [];
    const keyBox = h("div", { class: "rb-pkeys" });
    (async () => {
      const all = await P.vault.list(); if (!alive()) return;
      const mine = all.filter((x) => c.keyIds.includes(x.id));
      replace(keyBox, ...mine.map((x) => h("div", { class: "rb-pkey" }, h("span", { class: "n" }, x.label), h("code", null, x.tail), btn("", { icon: "trash", size: "sm", title: "키 지우기", onClick: async () => { if (!await confirmDialog(ctx.win, { title: "이 키를 지울까요?", body: `${x.label} ${x.tail}`, ok: "지우기", danger: true })) return; try { await P.vault.remove(x.id); await mutate((cc) => { for (const q of cc.connections) q.keyIds = q.keyIds.filter((i) => i !== x.id); }); draw(); } catch (e) { fail(e); } } }))));
      if (!mine.length && !k.keyOptional) keyBox.append(h("small", { class: "rb-muted" }, c.kind === "vertex" ? "서비스 계정 JSON을 통째로 붙여 넣어요." : "아직 키가 없어요."));
    })();
    const keyIn = h("input", { class: "rb-input", type: "password", placeholder: c.kind === "vertex" ? "서비스 계정 JSON" : c.kind === "copilot" ? "GitHub 토큰" : "API 키 붙여 넣기", "aria-label": "API 키", autocomplete: "off" });
    const addKey = async () => { const v = keyIn.value.trim(); if (!v) return; try { const id = await P.vault.add(`${c.name} 키`, v); keyIn.value = ""; await mutate((x) => { x.connections.find((q) => q.id === c.id)?.keyIds.push(id); }); toast("키를 이 기기에 저장했어요"); draw(); } catch (e) { fail(e); } };
    keyIn.addEventListener("keydown", (e) => { if (e.key === "Enter") addKey(); });
    const set = (patch) => mutate((x) => { Object.assign(x.connections.find((q) => q.id === c.id) ?? {}, patch); });
    const bal = h("small", { class: "rb-muted" });
    const card = h("section", { class: "rb-pvcard", dataset: { conn: c.id } },
      h("div", { class: "top" }, h("span", { class: "ico" }, icon("network", 18)), h("div", { class: "t" }, h("b", null, c.name), h("small", { class: "rb-muted" }, `${k.label} · ${c.format}`)), btn("", { icon: open ? "up" : "down", size: "sm", title: open ? "접기" : "펼치기", onClick: () => { st.open = open ? "" : c.id; draw(); } })),
      h("div", { class: "sec" }, h("span", { class: "rb-label" }, k.keyOptional ? "API 키 (없어도 돼요)" : "API 키"), keyBox, h("div", { class: "rb-pkeyadd" }, keyIn, btn("키 추가", { icon: "plus", onClick: addKey }))));
    if (open) {
      card.append(grid(
        field("이름", text(c.name, async (v) => { await set({ name: v || k.label }); draw(); })),
        (!k.baseUrl || ["custom", "wellspring", "ollama"].includes(c.kind) || c.kind === "copilot") ? field("주소", text(c.baseUrl, (v) => set({ baseUrl: v.trim() }), { ph: k.baseUrl || "https://…/v1" }), "OpenAI 호환은 …/v1 까지") : null,
        c.kind === "custom" ? field("요청 형식", select([["openai", "OpenAI 호환"], ["responses", "OpenAI Responses"], ["anthropic", "Anthropic"], ["gemini", "Gemini"]], c.format, async (v) => { await set({ format: v }); draw(); }, "요청 형식")) : null,
        c.kind === "bedrock" ? field("지역", text(c.region, (v) => set({ region: v.trim() }), { ph: "us-east-1" }), "주소를 비워 두면 이 지역의 Bedrock 주소를 써요(API 키 방식)") : null,
        P.hasBalance(c.kind) ? field("잔액 확인용 토큰(선택)", h("input", { class: "rb-input", type: "password", placeholder: c.balanceKeyId ? "저장됨 — 새로 붙여 넣으면 바뀌어요" : "잔액만 볼 수 있는 토큰", "aria-label": "잔액 확인용 토큰", autocomplete: "off", onchange: async (e) => { const v = e.target.value.trim(); if (!v) return; try { const id = await P.vault.add(`${c.name} 잔액 토큰`, v); e.target.value = ""; await set({ balanceKeyId: id }); toast("잔액 확인용 토큰을 저장했어요"); draw(); } catch (er) { fail(er); } } }), "비워 두면 위 API 키로 조회해요") : null,
        c.kind === "vertex" ? field("프로젝트 ID", text(c.vertex.projectId, (v) => set({ vertex: { ...c.vertex, projectId: v.trim() } }))) : null,
        c.kind === "vertex" ? field("위치", text(c.vertex.location, (v) => set({ vertex: { ...c.vertex, location: v.trim() || "global" } }), { ph: "global" })) : null,
        c.kind === "copilot" ? field("Copilot 방식", select([["vscode", "VS Code"], ["opencode", "opencode"]], c.copilotEngine, (v) => set({ copilotEngine: v }), "Copilot 방식")) : null,
        c.keyIds.length > 1 ? field("키 쓰는 방식", select([["random", "무작위"], ["rotate", "돌아가며"], ["affinity", "봇마다 고정"], ["on-error", "실패한 뒤에만 다음 키"]], c.keyMode, (v) => set({ keyMode: v }), "키 방식"), "한 키가 막히면 잠시 쉬고 다른 키로 넘어가요") : null));
      if (P.hasBalance(c.kind)) card.append(h("div", { class: "acts" }, btn("잔액 보기", { size: "sm", onClick: async () => { bal.textContent = "확인하는 중…"; try { const b = await P.balance(c); bal.textContent = `${b.label}: ${Number.isFinite(b.value) ? b.value.toFixed(2) : "?"} ${b.unit}`; } catch (e) { bal.textContent = ""; fail(e); } } }), bal));
      // 모델: 불러오기 → 검색 → 누르면 프로필. 목록에 없으면 빈 프로필을 만들어 이름을 적는다.
      const modelSec = h("div", { class: "sec" }, h("div", { class: "sech" }, h("span", { class: "rb-label" }, models.length ? `모델 ${models.length}개 — 누르면 프로필이 만들어져요` : "모델"), btn(models.length ? "다시 불러오기" : "모델 불러오기", { size: "sm", icon: "refresh", onClick: async () => { try { st.models[c.id] = await P.models(c); toast(`모델 ${st.models[c.id].length}개를 불러왔어요`); draw(); } catch (e) { fail(e); } } })));
      if (models.length) {
        const chips = h("div", { class: "rb-pvchips" }), cnt = h("small", { class: "rb-muted" });
        const paint = (q) => { const w = q.trim().toLowerCase().split(/\s+/).filter(Boolean), list = models.filter((m) => w.every((x) => m.toLowerCase().includes(x))); cnt.textContent = q.trim() ? `찾은 모델 ${list.length}개` : ""; replace(chips, ...(list.length ? list.slice(0, 300).map((m) => h("button", { type: "button", class: "rb-chip", onClick: () => newProfile(c, m) }, m)) : [h("small", { class: "rb-muted" }, "맞는 모델이 없어요. 아래 ‘빈 프로필 추가’로 만든 뒤 모델 이름을 적을 수 있어요.")])); };
        const q = h("input", { class: "rb-input", type: "search", placeholder: "모델 검색 (예: claude opus, gpt-5, flash)", "aria-label": "모델 검색", value: st.modelQ?.[c.id] ?? "", autocomplete: "off", spellcheck: "false" });
        q.addEventListener("input", () => { (st.modelQ ??= {})[c.id] = q.value; paint(q.value); });
        paint(q.value);
        modelSec.append(q, cnt, chips);
      } else modelSec.append(h("small", { class: "rb-muted" }, "키를 넣고 ‘모델 불러오기’를 누르면 고를 수 있는 모델이 떠요."));
      modelSec.append(h("div", { class: "acts" }, btn("빈 프로필 추가", { size: "sm", icon: "plus", onClick: () => newProfile(c, "") })));
      card.append(modelSec);
      card.append(advFold(ctx, "provconn", grid(
        field("프록시 주소", text(c.proxyUrl, (v) => set({ proxyUrl: v.trim() }), { ph: "https://…{url}" }), "CORS가 막히는 곳용. {url} 자리에 주소가 들어가요", true),
        field("추가 헤더(JSON)", area(JSON.stringify(c.headers ?? {}), (v) => { try { set({ headers: JSON.parse(v || "{}") }); } catch { toast("JSON 모양이 아니에요", { error: true }); } }, { rows: 2 }), "모델·메시지·인증 헤더는 바꿀 수 없어요", true),
        field("추가 요청 값(JSON)", area(JSON.stringify(c.params ?? {}), (v) => { try { set({ params: JSON.parse(v || "{}") }); } catch { toast("JSON 모양이 아니에요", { error: true }); } }, { rows: 2 }), "", true),
        field("직접 적은 모델(쉼표)", text((c.userModels ?? []).join(", "), (v) => set({ userModels: v.split(",").map((s) => s.trim()).filter(Boolean) })), "", true),
        field("목록에서 숨길 모델(쉼표)", text((c.hidden ?? []).join(", "), (v) => set({ hidden: v.split(",").map((s) => s.trim()).filter(Boolean) })), "", true))));
      card.append(h("div", { class: "foot" }, h("span", { class: "res" }, "이 연결을 쓰는 프로필도 함께 지워져요."), btn("연결 지우기", { kind: "danger", icon: "trash", onClick: async () => { if (!await confirmDialog(ctx.win, { title: "이 연결을 지울까요?", body: "이 연결을 쓰는 프로필도 함께 지워져요. 키는 따로 지워야 해요.", ok: "지우기", danger: true })) return; await mutate((x) => { x.connections = x.connections.filter((q) => q.id !== c.id); }); draw(); } })));
    }
    return card;
  }
  async function newProfile(c, model) {
    const p = normalizeProfile({ name: model || `${c.name} 프로필`, connectionId: c.id, model });
    await mutate((x) => { x.profiles.push(p); if (!x.purposes.main.profileId) x.purposes.main.profileId = p.id; });
    st.tab = "prof"; st.openProf = p.id; toast("프로필을 만들었어요"); draw();
  }

  // ───────── 프로필 ─────────
  function profPanel() {
    if (!cfg.profiles.length) return [emptyState({ icon: "sliders", title: "프로필이 없어요", text: cfg.connections.length ? "‘연결’에서 모델을 누르면 바로 만들어져요. 아래 버튼으로 빈 프로필을 만들 수도 있어요." : "먼저 ‘연결’에서 연결을 추가하고 키를 넣어 주세요.", actions: cfg.connections.length ? [{ label: "프로필 추가", kind: "primary", onClick: () => newProfile(cfg.connections[0], "") }] : [] })];
    return [h("div", { class: "rb-actions" }, btn("프로필 추가", { kind: "primary", icon: "plus", onClick: () => newProfile(cfg.connections[0], "") })), ...cfg.profiles.map(profCard)];
  }
  function profCard(p) {
    const conn = cfg.connections.find((c) => c.id === p.connectionId), open = st.openProf === p.id, kind = conn?.kind;
    const set = (fn) => mutate((x) => { const q = x.profiles.find((r) => r.id === p.id); if (q) fn(q); });
    const lst = st.models[p.connectionId] ?? [];
    const dl = h("datalist", { id: `rb-pm-${p.id}` }, lst.slice(0, 300).map((m) => h("option", { value: m })));
    const card = h("section", { class: "rb-pvcard", dataset: { prof: p.id } },
      h("div", { class: "top" }, h("span", { class: "ico" }, icon("sliders", 18)), h("div", { class: "t" }, h("b", null, p.name), h("small", { class: "rb-muted" }, `${conn?.name ?? "연결 없음"} · ${p.model || "모델 미정"}`)), btn("", { icon: open ? "up" : "down", size: "sm", title: open ? "접기" : "펼치기", onClick: () => { st.openProf = open ? "" : p.id; draw(); } })));
    if (!open) return card;
    const th = p.thinking, reasoning = isReasoningModel(p.model);
    card.append(dl, grid(
      field("이름", text(p.name, async (v) => { await set((q) => { q.name = v || "프로필"; }); draw(); }), "리스에는 ‘Dusk · 이름’으로 보여요"),
      field("연결", select(cfg.connections.map((c) => [c.id, c.name]), p.connectionId, async (v) => { await set((q) => { q.connectionId = v; }); draw(); }, "연결")),
      field("모델", (() => { const i = text(p.model, async (v) => { await set((q) => { q.model = v.trim(); }); draw(); }, { ph: "모델 이름" }); i.setAttribute("list", `rb-pm-${p.id}`); return i; })(), lst.length ? "목록에서 고르거나 직접 적어요" : "‘연결’에서 모델 불러오기를 하면 목록이 떠요", true),
      field("온도", num(p.sampling.temperature, (v) => set((q) => { q.sampling.temperature = v; })), "비우면 리스 설정을 따라요"),
      field("최대 출력 토큰", num(p.sampling.maxTokens, (v) => set((q) => { q.sampling.maxTokens = v; }), { step: "1" })),
      field("Top P", num(p.sampling.topP, (v) => set((q) => { q.sampling.topP = v; }))),
      field("Top K", num(p.sampling.topK, (v) => set((q) => { q.sampling.topK = v; }), { step: "1" }))));
    card.append(grid(
      field("생각(추론)", segmented([["", "기본"], ["none", "끔"], ["low", "약하게"], ["medium", "중간"], ["high", "강하게"], ["xhigh", "최고"]], th.effort || "", (v) => set((q) => { q.thinking.effort = v; if (v) q.thinking.mode = q.thinking.mode === "budget" ? "budget" : ""; }), "생각 강도"), reasoning ? "추론 모델이에요. ‘기본’은 모델 기본값을 따라요." : "지원하는 모델에서만 먹혀요. ‘기본’은 아무것도 보내지 않아요(none·low·medium·high·xhigh)", true),
      field("답 속 생각 보이기", segmented([["off", "숨김"], ["on", "보임"]], th.showThinking ? "on" : "off", (v) => set((q) => { q.thinking.showThinking = v === "on"; }), "생각 보이기"), "보이면 <Thoughts>…</Thoughts> 로 감싸서 줘요", true),
      kind === "anthropic" || kind === "vertex" ? field("추론 과정 받는 방식(Claude)", segmented([["", "기본"], ["summarized", "요약"], ["omitted", "생략"]], th.display || "", (v) => set((q) => { q.thinking.display = v; }), "추론 표시"), "생략하면 추론 글을 안 받아서 더 빨리 시작해요. 요약은 짧게 정리된 글만 와요", true) : null,
      kind === "google" || kind === "geminiexpress" || kind === "vertex" ? field("이미지·PDF 해상도(Gemini)", segmented([["", "기본"], ["low", "낮음"], ["medium", "중간"], ["high", "높음"]], p.mediaResolution || "", (v) => set((q) => { q.mediaResolution = v; }), "미디어 해상도"), "높을수록 자세히 읽지만 토큰을 더 써요", true) : null,
      kind === "anthropic" ? field("배치로 보내기(값 절반)", segmented([["off", "끔"], ["wait", "끝날 때까지 기다리기"], ["create", "만들고 끝내기"]], p.batch || "off", (v) => set((q) => { q.batch = v; }), "배치"), "몇 분~최대 24시간 걸려요. ‘만들고 끝내기’는 일단 실패로 알리고, 같은 메시지로 다시 보내면 결과를 가져와요. 스트림은 안 돼요", true) : null,
      field("받는 방식", segmented([["", "기본"], ["stream", "스트림"], ["buffered", "한번에"]], p.stream, (v) => set((q) => { q.stream = v; }), "받는 방식"), "메인 대화에만 적용돼요. 보조 요청은 한번에 받아요", true),
      field("웹 검색(모델 내장)", segmented([["off", "끔"], ["auto", "켬"]], p.search, (v) => set((q) => { q.search = v; }), "내장 웹 검색"), "Claude·Gemini만 지원해요", true)));
    if (kind === "openrouter") {
      const pv = p.params?.provider ?? {}, order = Array.isArray(pv.order) ? pv.order : [];
      const setPv = (fn) => set((q) => { const o = { ...(q.params?.provider ?? {}) }; fn(o); q.params ??= {}; if (Object.keys(o).length) q.params.provider = o; else delete q.params.provider; });
      card.append(grid(
        field("공급자 순서", area(order.join("\n"), (v) => setPv((o) => { const l = v.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean); if (l.length) o.order = l; else delete o.order; }), { rows: 3, ph: "parasail/fp8\nvenice/fp8\nnovita/fp8" }), "한 줄에 하나(쉼표도 돼요). 위에서부터 시도하고, 폴백이 켜져 있으면 모두 막혔을 때 다른 공급자로 넘어가요. 아래 ‘빠른 설정’의 폴백·정렬과 함께 쓸 수 있어요.", true),
        field("폴백", segmented([["", "기본"], ["on", "켬"], ["off", "끔"]], pv.allow_fallbacks === true ? "on" : pv.allow_fallbacks === false ? "off" : "", (v) => setPv((o) => { if (v === "") delete o.allow_fallbacks; else o.allow_fallbacks = v === "on"; }), "공급자 폴백"), "", true)));
    }
    const pre = presetsFor(kind);
    if (pre.length) card.append(h("div", { class: "rb-pfield wide" }, h("span", { class: "rb-label" }, "빠른 설정"), h("div", { style: "display:flex;flex-wrap:wrap;gap:6px" }, pre.map((x) => h("button", { type: "button", class: "rb-chip", title: x.desc, "aria-pressed": isOn(p, x) ? "true" : "false", dataset: { preset: x.id }, onClick: async () => { const on = !isOn(p, x); await mutate((c) => { const i = c.profiles.findIndex((r) => r.id === p.id); if (i >= 0) c.profiles[i] = apply(c.profiles[i], x, on); }); draw(); } }, x.label))), h("small", { class: "rb-muted" }, "누르면 켜지고 다시 누르면 꺼져요. 설명은 마우스를 올리면 보여요. 세부 값은 고급의 ‘추가 요청 값’에서 볼 수 있어요.")));
    const cacheOpts = kind === "anthropic" || kind === "vertex" || kind === "openrouter" ? field("Claude 캐시", segmented([["off", "끔"], ["5m", "5분"], ["1h", "1시간"]], p.cache.claude, (v) => set((q) => { q.cache.claude = v; }), "Claude 캐시"), "반복되는 앞부분을 싸게 읽어요", true) : kind === "google" ? field("Gemini 캐시", segmented([["off", "끔"], ["observe", "관찰"], ["auto", "자동"], ["manual", "수동"]], p.cache.gemini, (v) => set((q) => { q.cache.gemini = v; }), "Gemini 캐시"), "자동은 같은 앞부분이 반복되면 캐시를 만들어요", true) : kind === "openai" ? field("OpenAI 캐시", segmented([["off", "끔"], ["in_memory", "메모리"], ["24h", "24시간"]], p.cache.openai, (v) => set((q) => { q.cache.openai = v; }), "OpenAI 캐시"), "", true) : null;
    if (cacheOpts) card.append(grid(cacheOpts));
    // 캐시 고급(Claude): 격자 지점·학습 — 긴 대화에서 캐시가 덜 깨지게
    if ((kind === "anthropic" || kind === "vertex") && p.cache.claude !== "off") card.append(grid(
      field("격자 캐시 포인트(메시지 간격)", num(p.cache.grid || null, (v) => set((q) => { q.cache.grid = v ?? 0; }), { step: "1" }), "예: 10 → 10개 메시지마다 한 곳을 고정해요. 비우면 끔. 긴 대화에서 앞부분이 안 바뀌면 캐시가 이어져요"),
      field("캐시 학습", segmented([["off", "끔"], ["on", "켬"]], p.cache.learn ? "on" : "off", (v) => set((q) => { q.cache.learn = v === "on"; }), "캐시 학습"), "직전 요청과 똑같았던 앞부분의 끝에 표시를 붙여요(앱을 켜 둔 동안만 기억해요)", true)));
    card.append(grid(
      field("반복 감지", segmented([["inherit", "기본"], ["on", "켬"], ["off", "끔"]], p.repetition, (v) => set((q) => { q.repetition = v; }), "반복 감지"), "같은 말이 끝없이 이어지면 거기서 잘라요", true),
      field("프리필(답 앞부분)", area(p.prefill, (v) => set((q) => { q.prefill = v; }), { rows: 2 }), "모델이 이 글에 이어서 쓰게 해요. 지원하는 곳에서만 돼요", true)));
    card.append(advFold(ctx, "provprof", grid(
      field("입력 단가 ($/100만 토큰)", num(p.pricing.input, (v) => set((q) => { q.pricing.input = v ?? 0; }))), field("출력 단가", num(p.pricing.output, (v) => set((q) => { q.pricing.output = v ?? 0; }))),
      field("캐시 읽기 단가", num(p.pricing.cached, (v) => set((q) => { q.pricing.cached = v; }))), field("캐시 쓰기 단가", num(p.pricing.cwrite, (v) => set((q) => { q.pricing.cwrite = v; }))),
      field("생각 토큰 예산(직접)", num(p.thinking.budget, (v) => set((q) => { q.thinking.budget = v; q.thinking.mode = v ? "budget" : ""; }), { step: "1" }), "Claude(1024 이상)·Gemini 2.5용. 있으면 강도보다 먼저 쓰여요(Claude는 ‘끔’이면 안 써요)"),
      field("재시도 횟수", num(p.retry, (v) => set((q) => { q.retry = v; }), { step: "1" }), "비우면 공통 값"), field("서비스 등급(tier)", text(p.tier, (v) => set((q) => { q.tier = v.trim(); })), "예: priority, flex"),
      field("안전 필터", text(p.safety, (v) => set((q) => { q.safety = v.trim(); })), "Gemini: off · BLOCK_NONE 등"), field("Frequency / Presence", h("div", { style: "display:flex;gap:8px" }, num(p.sampling.frequencyPenalty, (v) => set((q) => { q.sampling.frequencyPenalty = v; }), { ph: "freq" }), num(p.sampling.presencePenalty, (v) => set((q) => { q.sampling.presencePenalty = v; }), { ph: "pres" }))),
      field("추가 요청 값(JSON)", area(JSON.stringify(p.params ?? {}), (v) => { try { set((q) => { q.params = JSON.parse(v || "{}"); }); } catch { toast("JSON 모양이 아니에요", { error: true }); } }, { rows: 2 }), "", true))));
    const res = h("span", { class: "res" });
    card.append(h("div", { class: "foot" },
      btn("연결 시험", { icon: "zap", onClick: async () => { res.textContent = "시험하는 중…"; try { const r = await P.test(p.id); res.textContent = r.ok ? `성공: ${r.text.slice(0, 80)}` : `실패: ${r.text.slice(0, 160)}`; } catch (er) { res.textContent = `실패: ${er?.message ?? er}`; } } }),
      btn("복제", { icon: "split", onClick: async () => { const c = normalizeProfile({ ...p, id: "", name: `${p.name} 복사` }); await mutate((x) => { x.profiles.push(c); }); st.openProf = c.id; draw(); } }),
      res,
      btn("프로필 지우기", { kind: "danger", icon: "trash", onClick: async () => { if (!await confirmDialog(ctx.win, { title: "이 프로필을 지울까요?", body: "용도·사슬에 지정된 곳은 비워져요.", ok: "지우기", danger: true })) return; await mutate((x) => { x.profiles = x.profiles.filter((q) => q.id !== p.id); }); draw(); } })));
    return card;
  }

  await draw();
}
