// 고급 모델 설정(고급 모드): 공급자 전체 · 모델 목록 불러오기 · 온도/최대 출력/문맥/제한시간 · 추론 설정 · 추가 JSON · PDF 전송 ·
// GitHub Copilot 로그인 · Vertex AI 서비스 계정. ‘내 API’의 프리셋 하나를 자세히 고친다(없으면 만들어 쓰기를 안내).
import { h, replace } from "../../dom.js";
import { btn, note, segmented } from "../../kit.js";
import { fail } from "./common.js";
import { getCfg, saveCfg, keyStore, testPreset, listModels, copilotLogin } from "../../../data/modelhub.js";
import { updatePreset, presetOf } from "../../../engine/modelcfg.js";
import { validateModelPreset } from "../../../engine/pot/model-options.js";

const PROV = [["openai", "OpenAI"], ["google", "Google"], ["claude", "Claude"], ["vertex-ai", "Vertex AI"], ["deepseek", "DeepSeek"], ["ollama", "Ollama"], ["llmgateway", "LLM Gateway"], ["openrouter", "OpenRouter"], ["copilot", "GitHub Copilot"], ["custom", "Custom"], ["custom2", "Custom 2"], ["custom3", "Custom 3"], ["custom4", "Custom 4"], ["custom5", "Custom 5"], ["custom6", "Custom 6"]];
const REASON = ["default", "disabled", "minimal", "low", "medium", "high", "xhigh", "max", "auto"];
const REASON_LABEL = { default: "기본", disabled: "끔", minimal: "아주 낮게", low: "낮게", medium: "보통", high: "높게", xhigh: "매우 높게", max: "최대", auto: "자동" };
const okWith = (p, patch) => { try { validateModelPreset({ ...p, ...patch }); return true; } catch { return false; } };
const field = (label, el) => h("label", { class: "rb-mem-field" }, h("span", null, label), el);

export async function advancedModel(ctx, host, { apply, repaint }) {
  const cfg = await getCfg(ctx.api), id = cfg.easy.kind === "api" ? cfg.easy.presetId : "", cur = id ? presetOf(cfg, id) : null;
  if (!cur) return replace(host, h("details", { class: "rb-mem-man rb-mem-advfold" }, h("summary", null, "고급: 모델 세부 설정"), note("info", "위에서 ‘내 API’를 고르고 저장하면 여기서 자세히 고칠 수 있어요.")));
  const keys = await keyStore(ctx.api);
  const d = { ...cur };  // 편집 초안
  const out = h("div", { class: "rb-muted", role: "status" });
  const set = (k) => (e) => { d[k] = e.target.value; };
  const numIn = (k, min, max, step = 1) => h("input", { class: "rb-input", type: "number", min, max, step, value: d[k], onChange: (e) => { d[k] = Number(e.target.value); } });
  const prov = h("select", { class: "rb-input", "aria-label": "공급자", onChange: (e) => { d.provider = e.target.value; paint(); } }, PROV.map(([v, l]) => h("option", { value: v, selected: d.provider === v }, l)));
  const modelIn = h("input", { class: "rb-input", value: d.model ?? "", "aria-label": "모델", onChange: set("model") });
  const listHost = h("div");
  const loadList = btn("모델 목록 불러오기", { size: "sm", onClick: async () => {
    try { out.textContent = "불러오는 중…"; await persist({ quiet: true }); const r = await listModels(ctx.api, id); const arr = (Array.isArray(r) ? r : r?.models ?? []).map((m) => (typeof m === "string" ? m : m?.id ?? m?.name)).filter(Boolean);
      out.textContent = `${arr.length}개 모델을 찾았어요.`;
      replace(listHost, h("select", { class: "rb-input", "aria-label": "모델 고르기", onChange: (e) => { if (e.target.value) { d.model = e.target.value; modelIn.value = d.model; } } }, h("option", { value: "" }, "목록에서 고르기"), arr.slice(0, 400).map((m) => h("option", { value: m, selected: m === d.model }, m))));
    } catch (e) { out.textContent = `실패: ${e?.message ?? e}`; }
  } });
  async function persist({ quiet = false } = {}) {
    const c = await getCfg(ctx.api);
    const next = updatePreset(c, id, { ...presetOf(c, id), ...d });
    await saveCfg(ctx.api, next); await apply();
    if (!quiet) ctx.toast("모델 설정을 저장했어요.");
  }
  const copilot = () => {
    const box = h("div"); let login = null;
    const show = () => replace(box, login ? h("div", null, h("p", null, "아래 주소를 열고 코드를 입력한 뒤, ‘승인 확인’을 눌러 주세요."), h("p", null, h("b", { style: "font-size:1.2em;letter-spacing:.1em" }, login.userCode), " · ", h("a", { href: login.url, target: "_blank", rel: "noopener noreferrer" }, login.url)),
      h("div", { class: "rb-mem-sact" }, btn("승인 확인", { kind: "primary", onClick: async () => { try { const tok = await copilotLogin(ctx.api, { login }); await keys.set("copilot", tok); login = null; show(); ctx.toast("Copilot에 연결했어요."); } catch (e) { out.textContent = e?.message ?? String(e); } } }))) : btn("Copilot 로그인 시작", { onClick: async () => { try { login = await copilotLogin(ctx.api, { engine: d.copilotEngine ?? "vscode" }); show(); } catch (e) { out.textContent = e?.message ?? String(e); } } }));
    show();
    return h("div", null, field("연결 방식", segmented([["vscode", "VSCode 호환"], ["opencode", "OpenCode 호환"]], d.copilotEngine ?? "vscode", (v) => { d.copilotEngine = v; }, "Copilot 연결 방식")),
      field("요청 형식", h("select", { class: "rb-input", onChange: set("copilotFormat") }, [["auto", "자동"], ["openai", "OpenAI"], ["responses", "Responses"], ["anthropic", "Anthropic"]].map(([v, l]) => h("option", { value: v, selected: (d.copilotFormat ?? "auto") === v }, l)))), box,
      keys.has("copilot") ? h("p", { class: "rb-muted" }, "저장된 인증 정보 있음 (내용은 표시하지 않아요)") : null);
  };
  const vertex = () => { const ta = h("textarea", { class: "rb-input", rows: 4, placeholder: "서비스 계정 JSON을 붙여넣으면 이 기기에만 저장돼요", autocomplete: "off", "aria-label": "서비스 계정 JSON" });
    return h("div", null, field("서비스 계정", ta), btn("키 저장", { size: "sm", onClick: async () => { try { JSON.parse(ta.value); await keys.set("vertex-ai", ta.value.trim()); ta.value = ""; ctx.toast("키를 저장했어요."); } catch (e) { fail(ctx)(new Error("JSON 형식이 아니에요.")); } } }),
      keys.has("vertex-ai") ? h("p", { class: "rb-muted" }, "저장된 인증 정보 있음") : null, field("요금 등급(Vertex)", h("input", { class: "rb-input", value: d.vertexPaygoTier ?? "default", onChange: set("vertexPaygoTier") }))); };
  const paint = () => {
    const reasons = REASON.filter((r) => okWith(d, { reasoningQuickSetting: r })), pdfOk = ["reference", "full"].some((m) => okWith(d, { pdfMode: m }));
    replace(host, h("details", { class: "rb-mem-man rb-mem-advfold", open: true }, h("summary", null, "고급: 모델 세부 설정"),
      h("p", { class: "rb-muted" }, "여기서 바꾼 값은 ‘내 API’ 프리셋에 저장돼요. 키는 이 기기에만 두고 공유·백업에 넣지 않아요."),
      field("공급자", prov), field("모델", modelIn), loadList, listHost,
      field("주소(Base URL)", h("input", { class: "rb-input", value: d.baseUrl ?? "", placeholder: "비우면 기본 주소", onChange: set("baseUrl") })),
      h("div", { class: "rb-mem-grid" }, field("온도 (0~2)", numIn("temperature", 0, 2, 0.1)), field("최대 출력 토큰", numIn("maxTokens", 256, 200000, 256)), field("문맥 (턴)", numIn("contextWindow", 0, 200)), field("호출 제한시간(초)", numIn("timeoutSeconds", 10, 900, 10))),
      reasons.length > 1 ? field("추론 설정", h("select", { class: "rb-input", onChange: set("reasoningQuickSetting") }, reasons.map((r) => h("option", { value: r, selected: d.reasoningQuickSetting === r }, REASON_LABEL[r] ?? r)))) : null,
      pdfOk ? field("PDF 전송 (Gemini)", segmented([["none", "없음"], ["reference", "참고자료만"], ["full", "전문"]], d.pdfMode ?? (d.receiveContextAsPdf ? "reference" : "none"), (v) => { d.pdfMode = v; d.receiveContextAsPdf = v !== "none"; }, "PDF 전송")) : null,
      field("추가 JSON body (고급)", h("textarea", { class: "rb-input", rows: 3, "aria-label": "추가 JSON body", onChange: set("extraBodyJson") }, d.extraBodyJson ?? "")),
      d.provider === "copilot" ? copilot() : null, d.provider === "vertex-ai" ? vertex() : null,
      h("div", { class: "rb-mem-sact" }, btn("저장", { kind: "primary", onClick: () => persist().then(repaint).catch((e) => fail(ctx)(e)) }), btn("연결 시험", { onClick: async () => { try { out.textContent = "시험하는 중…"; await persist({ quiet: true }); const r = await testPreset(ctx.api, id); out.textContent = r?.ok === false ? `실패: ${r.message ?? "응답 없음"}` : "연결됐어요."; } catch (e) { out.textContent = `실패: ${e?.message ?? e}`; } } })), out));
  };
  paint();
}
