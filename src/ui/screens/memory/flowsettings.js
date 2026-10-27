// 기억 탭 설정: 추적 수준 3종 · 기능 카드 6장 · AI 모델(쉬운/고급) · 가져오기·사용량.
// 리수폿 기능과 Dusk 기능을 구분 없이 "무엇을 기억하나"로 보여 준다. 저장 버튼 없이 바로 저장, 다음 턴부터 적용.
import { h, replace, pickFiles } from "../../dom.js";
import { btn, switchEl, setSwitch, segmented, optionCards, toggleRow, note, confirmDialog } from "../../kit.js";
import { fail } from "./common.js";
import { guideBtn } from "./guide.js";
import { LEVELS, FEATURE_CARDS, applyLevel, levelOf, levelPatch, summaryOf, needsOf } from "../../../engine/trackpreset.js";
import { getCfg, saveCfg, keyStore, testPreset, listModels, getUsage, resetUsage } from "../../../data/modelhub.js";
import { addPreset, updatePreset, removePreset, presetOf, STAGES, STAGE_LABEL } from "../../../engine/modelcfg.js";

const PROVIDERS = [["openai", "OpenAI"], ["claude", "Claude"], ["google", "Google"], ["deepseek", "DeepSeek"], ["openrouter", "OpenRouter"], ["ollama", "Ollama"], ["custom", "직접 입력(OpenAI 호환)"]];
const NEEDS_URL = new Set(["ollama", "custom"]);
const fmt = (n) => Number(n ?? 0).toLocaleString();

const GK = { "무엇을 기억할까요?": "level", "기억 방식": "mode", "AI 모델": "model" };
export async function flowSections(ctx, host, { redraw }) {
  const M = ctx.memory;
  if (!M.flow) return replace(host);
  const st = await M.flow.settings(), blocked = st.status().blocked;
  const idx = await M.store.getIndex(), flow = idx.settings.flow ?? {};
  const apply = () => M.flow.apply().catch(fail(ctx));
  const sec = (title, desc, ...kids) => h("section", { class: "rb-card rb-mem-sec" }, h("h3", null, title, GK[title] ? guideBtn(ctx, GK[title], { redraw }) : null), desc ? h("p", { class: "rb-muted" }, desc) : null, ...kids);
  if (blocked) return replace(host, sec("기억 설정", null, note("warn", "저장된 리수폿 설정을 읽지 못했어요. 원본은 그대로 보관돼 있어요. 설정 가져오기를 다시 해 보거나 개발자에게 알려 주세요.")));

  // ---- 1) 추적 수준 + 기능 카드
  const featHost = h("div", { class: "rb-mem-feats" }), lvHost = h("div");
  const edit = (fn) => { st.update((s) => fn(s)); paint(); };
  const paint = () => {
    const snap = st.rawSnapshot(), f = snap.features, lv = levelOf(f);
    replace(lvHost, optionCards(LEVELS.map((l) => ({ value: l.id, label: l.label, text: l.text })), lv, (v) => edit((s) => { s.features = applyLevel(s.features, v); }), "추적 수준"),
      lv === "custom" ? h("p", { class: "rb-muted" }, "직접 고른 ‘맞춤’ 상태예요. 위에서 하나를 누르면 그 수준으로 맞춰져요.") : null);
    replace(featHost, FEATURE_CARDS.map((c) => featureCard(c, snap, edit)));
  };
  const featureCard = (c, snap, edit) => {
    const f = snap.features[c.id] ?? {}, needs = f.enabled ? needsOf(c.id, snap) : [];
    const body = detailRows(c, f, edit);
    const sw = switchEl(f.enabled === true, { label: c.label, onChange: (v, el) => { setSwitch(el, v); edit((s) => { s.features[c.id].enabled = v; }); } });
    return h("article", { class: ["rb-card", "rb-mem-feat", f.enabled && "on"] },
      h("div", { class: "rb-mem-shead" }, h("b", null, c.label), h("span", { style: "flex:1" }), sw),
      h("p", { class: "rb-muted" }, c.desc), h("div", { class: "rb-mem-featsum" }, summaryOf(c.id, f)),
      needs.map((n) => h("div", { class: "rb-note warn" }, n.label, " ", btn("켜기", { size: "sm", onClick: () => edit((s) => n.fix(s)) }))),
      body ? h("details", { class: "rb-mem-man" }, h("summary", null, "세부 설정"), body, btn("기본값으로", { size: "sm", onClick: () => edit((s) => { s.features[c.id] = { ...levelPatch("basic")[c.id], enabled: s.features[c.id].enabled }; }) })) : null);
  };
  const numRow = (label, v, set, { min = 0, max = 5, step = 1 } = {}) => h("label", { class: "rb-mem-field" }, h("span", null, label), h("input", { class: "rb-input", type: "number", min, max, step, value: v, onChange: (e) => { const n = Math.min(max, Math.max(min, Number(e.target.value) || 0)); set(n); } }));
  const detailRows = (c, f, edit) => {
    const set = (k, v) => edit((s) => { s.features[c.id][k] = v; });
    if (c.detail === "numbers") return h("div", null,
      toggleRow("숫자 표시", "점수를 숫자로도 보여 줘요.", f.numbers === true, (v) => set("numbers", v)),
      numRow("한 번에 오르는 폭", f.increase ?? 1, (n) => set("increase", n), { min: 1, max: 5 }), numRow("한 번에 내리는 폭", f.decrease ?? 1, (n) => set("decrease", n), { min: 1, max: 5 }),
      c.id === "openness" ? h("div", null, toggleRow("주기·월경·임신 기록", "성인 항목이에요. 켜려면 ‘욕구 기록’이 먼저 필요해요.", f.cycle === true, (v) => set("cycle", v)), f.cycle ? numRow("임신 확률 배수(0.5~3)", f.cycleRate ?? 1, (n) => set("cycleRate", n), { min: 0.5, max: 3, step: 0.5 }) : null) : null);
    if (c.detail === "register") return h("div", null,
      h("div", { class: "rb-mem-field" }, h("span", null, "말투가 바뀌면"), segmented([["ask", "확인 후 적용"], ["auto", "자동 적용"]], f.change ?? "ask", (v) => set("change", v), "말투 변경")),
      h("div", { class: "rb-mem-field" }, h("span", null, "말투 다변화"), segmented([["off", "끔"], ["on", "켬"]], f.variety === "off" || !f.variety ? "off" : "on", (v) => set("variety", v === "off" ? "off" : "on"), "말투 다변화")),
      numRow("조짐 횟수", f.signLimit ?? 3, (n) => set("signLimit", n), { min: 1, max: 10 }));
    if (c.detail === "perception") return h("div", { class: "rb-mem-field" }, h("span", null, "정체·비밀 인식"), segmented([["off", "끔"], ["light", "라이트"], ["on", "켬"]], f.mode ?? "on", (v) => set("mode", v), "인식"));
    return null;
  };
  paint();

  // ---- 2) 모델
  const cfgHost = h("div");
  let apiOpen = null;
  const paintModel = async () => {
    const cfg = await getCfg(ctx.api), keys = await keyStore(ctx.api), usage = await getUsage(ctx.api);
    const easy = cfg.easy, cur = easy.kind === "api" ? presetOf(cfg, easy.presetId) : null;
    apiOpen ??= easy.kind === "api";
    const prov = h("select", { class: "rb-input", "aria-label": "공급자" }, PROVIDERS.map(([v, l]) => h("option", { value: v, selected: (cur?.provider ?? "openai") === v }, l)));
    const model = h("input", { class: "rb-input", placeholder: "모델 이름 (예: gpt-4o-mini)", "aria-label": "모델 이름", value: cur?.model ?? "" });
    const url = h("input", { class: "rb-input", placeholder: "주소 (예: https://api.example.com/v1)", "aria-label": "주소", value: cur?.baseUrl ?? "" });
    const key = h("input", { class: "rb-input", type: "password", autocomplete: "off", placeholder: keys.has(cur?.provider ?? "openai") ? "저장된 키가 있어요(바꾸려면 새로 입력)" : "API 키", "aria-label": "API 키" });
    const urlRow = h("label", { class: "rb-mem-field" }, h("span", null, "주소"), url);
    const syncUrl = () => { urlRow.hidden = !NEEDS_URL.has(prov.value); key.placeholder = keys.has(prov.value) ? "저장된 키가 있어요(바꾸려면 새로 입력)" : "API 키"; };
    prov.addEventListener("change", syncUrl); syncUrl();
    const out = h("div", { class: "rb-muted", role: "status" });
    const saveApi = async () => {
      let c = await getCfg(ctx.api);
      const over = { provider: prov.value, model: model.value.trim(), baseUrl: NEEDS_URL.has(prov.value) ? url.value.trim() : "" };
      if (!over.model) throw new Error("모델 이름을 적어 주세요.");
      let id = c.easy.presetId;
      if (id && presetOf(c, id)) c = updatePreset(c, id, { ...presetOf(c, id), ...over });
      else { const r = addPreset(c, "내 API", over.model, over); c = r.cfg; id = r.id; }
      if (key.value.trim()) await keys.set(prov.value, key.value.trim());
      c = { ...c, easy: { kind: "api", presetId: id } };
      await saveCfg(ctx.api, c); key.value = ""; return id;
    };
    const useApi = btn("저장하고 쓰기", { kind: "primary", onClick: async () => { try { await saveApi(); await apply(); ctx.toast("내 API로 바꿨어요."); paintModel(); } catch (e) { fail(ctx)(e); } } });
    const test = btn("연결 시험", { onClick: async () => { try { out.textContent = "시험하는 중…"; const id = await saveApi(); const r = await testPreset(ctx.api, id); out.textContent = r?.ok === false ? `실패: ${r.message ?? "응답 없음"}` : "연결됐어요."; } catch (e) { out.textContent = `실패: ${e?.message ?? e}`; } } });
    const stageRows = STAGES.map((s) => {
      const sel = h("select", { class: "rb-input", "aria-label": STAGE_LABEL[s], onChange: async (e) => { const c = await getCfg(ctx.api); await saveCfg(ctx.api, { ...c, stages: { ...c.stages, [s]: e.target.value ? { mode: "dedicated", presetId: e.target.value } : { mode: "shared", presetId: "" } } }); await apply(); } },
        h("option", { value: "" }, "공통 모델 쓰기"), cfg.presets.map((p) => h("option", { value: p.id, selected: cfg.stages[s].mode === "dedicated" && cfg.stages[s].presetId === p.id }, p.name)));
      return h("label", { class: "rb-mem-field" }, h("span", null, `${STAGE_LABEL[s]}`, h("small", { class: "rb-muted" }, ` (${{ router: "Router", director: "Director", writer: "Writer" }[s]})`)), sel);
    });
    const used = usage.total;
    replace(cfgHost,
      segmented([["risuai", "리스 보조 모델"], ["api", "내 API"]], apiOpen ? "api" : "risuai", async (v) => {
        const c = await getCfg(ctx.api), id = c.easy.presetId || c.presets[0]?.id || "";
        apiOpen = v === "api";
        await saveCfg(ctx.api, { ...c, easy: { kind: apiOpen && id ? "api" : "risuai", presetId: apiOpen ? id : "" } }); await apply(); paintModel();
      }, "AI 모델"),
      !apiOpen ? h("p", { class: "rb-muted" }, "RisuAI 설정의 보조 모델을 그대로 써요. 따로 키를 넣을 필요가 없어요.") : null,
      apiOpen && h("div", { class: "rb-mem-apiform" }, h("label", { class: "rb-mem-field" }, h("span", null, "공급자"), prov), h("label", { class: "rb-mem-field" }, h("span", null, "모델"), model), urlRow, h("label", { class: "rb-mem-field" }, h("span", null, "API 키"), key),
        h("p", { class: "rb-muted" }, "키는 이 기기의 플러그인 저장소에만 두고, 설정 내보내기·백업·공유 코드에는 넣지 않아요."), h("div", { class: "rb-mem-sact" }, useApi, test), out),
      h("details", { class: "rb-mem-man" }, h("summary", null, "고급: 단계별 모델"), h("p", { class: "rb-muted" }, "단계마다 다른 모델을 쓸 수 있어요. 비워 두면 위 설정을 같이 써요."), stageRows,
        cfg.presets.length ? h("div", { class: "rb-mem-chats" }, cfg.presets.map((p) => h("button", { type: "button", class: "rb-chip", title: "눌러서 삭제", onClick: async () => { if (!(await confirmDialog(ctx.win, { title: `‘${p.name}’ 모델을 지울까요?`, body: "이 모델을 쓰던 단계는 공통 모델로 돌아가요.", ok: "지우기", danger: true }))) return; await saveCfg(ctx.api, removePreset(await getCfg(ctx.api), p.id)); await apply(); paintModel(); } }, p.name, " ✕"))) : null),
      h("div", { class: "rb-muted" }, `모델 호출 ${fmt(used.calls)}회 · 입력 ${fmt(used.input)} · 출력 ${fmt(used.output)} 토큰 `, btn("집계 지우기", { size: "sm", onClick: async () => { await resetUsage(ctx.api); paintModel(); } })));
  };
  paintModel().catch(fail(ctx));

  // ---- 3) 흐름 방식
  const modeHost = h("div");
  const paintMode = () => replace(modeHost, optionCards([{ value: "fast", label: "빠르게", text: "응답 뒤 모델 호출 1회. 키워드로 인물을 골라요." }, { value: "accurate", label: "더 정확하게", text: "고르기·정리 노트를 더해 기억을 더 잘 찾아요. 호출이 늘어요." }], flow.mode === "accurate" ? "accurate" : "fast", async (v) => { await M.store.updateIndex((i) => { i.settings.flow = { ...(i.settings.flow ?? {}), mode: v }; }); flow.mode = v; await apply(); }, "기억 방식"));
  paintMode();

  // ---- 4) 가져오기·관리
  const importBtn = btn("리수폿 데이터 가져오기", { icon: "upload", onClick: async () => {
    const [file] = await pickFiles({ accept: ".json,.txt" }); if (!file) return;
    try {
      const r = await M.store.importPot(await file.text());
      ctx.toast(`가져왔어요 · 인물 문서 ${r.scopes}개${r.skipped ? ` · 이미 더 새로운 ${r.skipped}개는 건너뜀` : ""}${r.keysIgnored ? " · API 키는 받지 않았어요" : ""}`); await apply(); redraw();
    } catch (e) { fail(ctx)(e); }
  } });

  replace(host,
    sec("무엇을 기억할까요?", "수준을 고르면 아래 카드가 같이 바뀌어요. 바로 저장되고 다음 응답부터 적용돼요.", lvHost, featHost),
    sec("기억 방식", null, modeHost),
    sec("AI 모델", "기록과 정리를 맡길 모델이에요. 모르겠으면 ‘리스 보조 모델’로 두세요.", cfgHost),
    sec("가져오기", "기존에 쓰던 리수폿의 백업 파일(.json)을 불러와요. 인물 문서와 설정만 받고, API 키는 받지 않아요.", importBtn));
}
