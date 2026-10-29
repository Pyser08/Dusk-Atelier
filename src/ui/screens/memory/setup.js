// 처음 설정하기: 3단계(AI 고르기 → 무엇을 기억할까요 → 켜기). 읽을 글은 한 줄씩, 버튼은 크게.
import { h, replace } from "../../dom.js";
import { btn, modal, optionCards, note } from "../../kit.js";
import { fail } from "./common.js";
import { LEVELS, applyLevel, levelOf } from "../../../engine/trackpreset.js";
import { WIZARD, firstRunFeatures, potInstalled, wizardSummary } from "../../../engine/firstrun.js";
import { getCfg, saveCfg, keyStore } from "../../../data/modelhub.js";
import { addPreset, updatePreset, presetOf } from "../../../engine/modelcfg.js";

const PROVIDERS = [["openai", "OpenAI"], ["claude", "Claude"], ["google", "Google"], ["deepseek", "DeepSeek"], ["openrouter", "OpenRouter"], ["ollama", "Ollama"], ["custom", "직접 입력(OpenAI 호환)"]];
const NEEDS_URL = new Set(["ollama", "custom"]);

export async function openSetup(ctx) {
  const M = ctx.memory, st = await M.flow.settings(), idx = await M.store.getIndex(), cfg0 = await getCfg(ctx.api);
  const db = await ctx.api.getDatabase(["plugins"]).catch(() => null);
  const s = { step: 0, kind: cfg0.easy.kind === "api" ? "api" : "risuai", level: levelOf(firstRunFeatures(st.rawSnapshot().features)), mode: idx.settings.flow?.mode === "accurate" ? "accurate" : "fast", pot: potInstalled(db?.plugins) };
  if (s.level === "custom") s.level = "basic";
  const cur = cfg0.easy.kind === "api" ? presetOf(cfg0, cfg0.easy.presetId) : null;
  const keys = await keyStore(ctx.api);
  const f = { provider: cur?.provider ?? "openai", model: cur?.model ?? "", baseUrl: cur?.baseUrl ?? "", key: "" };

  return modal(ctx.win, (done) => {
    const body = h("div", { class: "rb-wiz-body" }), dots = h("ol", { class: "rb-wiz-dots", "aria-label": "진행" });
    const box = h("div", { class: "rb-dialog rb-wiz", role: "dialog", "aria-modal": "true", "aria-label": "기억 처음 설정" }, dots, body);
    const finish = async () => {
      try {
        let c = await getCfg(ctx.api);
        if (s.kind === "api") {
          if (!f.model.trim()) throw new Error("모델 이름을 적어 주세요.");
          const over = { provider: f.provider, model: f.model.trim(), baseUrl: NEEDS_URL.has(f.provider) ? f.baseUrl.trim() : "" };
          let id = c.easy.presetId;
          if (id && presetOf(c, id)) c = updatePreset(c, id, { ...presetOf(c, id), ...over });
          else { const r = addPreset(c, "내 API", over.model, over); c = r.cfg; id = r.id; }
          if (f.key.trim()) await keys.set(f.provider, f.key.trim());
          c = { ...c, easy: { kind: "api", presetId: id } };
        } else c = { ...c, easy: { kind: "risuai", presetId: "" } };
        await saveCfg(ctx.api, c);
        st.update((x) => { x.features = applyLevel(x.features, s.level); });
        await M.store.updateIndex((i) => { i.settings.flow = { ...(i.settings.flow ?? {}), on: true, mode: s.mode, setupDone: true }; });
        const ok = await M.flow.apply();
        if (!ok) throw new Error("기억을 켜지 못했어요. 리스를 다시 불러온 뒤 다시 해 주세요.");
        ctx.toast("기억을 켰어요. 다음 응답부터 기록돼요.");
        done(true);
      } catch (e) { fail(ctx)(e); }
    };
    const field = (label, el) => h("label", { class: "rb-mem-field" }, h("span", null, label), el);
    const draw = () => {
      replace(dots, WIZARD.map((w, i) => h("li", { class: i === s.step ? "on" : i < s.step ? "done" : "", "aria-current": i === s.step ? "step" : null }, h("i", { "aria-hidden": "true" }, String(i + 1)), h("span", null, w.title))));
      const w = WIZARD[s.step], next = () => { s.step++; draw(); }, back = () => { s.step--; draw(); };
      const nav = (...kids) => h("div", { class: "btns" }, s.step ? btn("이전", { onClick: back }) : btn("나중에", { onClick: () => done(null) }), ...kids);
      if (s.step === 0) {
        const prov = h("select", { class: "rb-input", "aria-label": "공급자", onChange: (e) => { f.provider = e.target.value; draw(); } }, PROVIDERS.map(([v, l]) => h("option", { value: v, selected: f.provider === v }, l)));
        const api = s.kind === "api" ? h("div", { class: "rb-mem-apiform" }, field("공급자", prov),
          field("모델", h("input", { class: "rb-input", placeholder: "예: gpt-4o-mini", value: f.model, onInput: (e) => { f.model = e.target.value; } })),
          NEEDS_URL.has(f.provider) ? field("주소", h("input", { class: "rb-input", placeholder: "https://api.example.com/v1", value: f.baseUrl, onInput: (e) => { f.baseUrl = e.target.value; } })) : null,
          field("API 키", h("input", { class: "rb-input", type: "password", autocomplete: "off", placeholder: keys.has(f.provider) ? "저장된 키가 있어요" : "API 키", onInput: (e) => { f.key = e.target.value; } })),
          h("p", { class: "rb-muted" }, "키는 이 기기에만 저장돼요.")) : null;
        replace(body, h("h3", { class: "rb-h3" }, w.title), h("p", { class: "rb-p" }, w.text),
          optionCards([{ value: "risuai", label: "리스 보조 모델 (권장)", text: "키를 넣을 필요가 없어요." }, { value: "api", label: "내 API", text: "OpenAI·Claude 등 키를 직접 넣어요." }], s.kind, (v) => { s.kind = v; draw(); }, "AI 모델"), api,
          nav(btn("다음", { kind: "primary", onClick: () => { if (s.kind === "api" && !f.model.trim()) return fail(ctx)(new Error("모델 이름을 적어 주세요.")); next(); } })));
      } else if (s.step === 1) {
        replace(body, h("h3", { class: "rb-h3" }, w.title), h("p", { class: "rb-p" }, w.text),
          optionCards(LEVELS.map((l) => ({ value: l.id, label: l.id === "basic" ? `${l.label} (권장)` : l.label, text: l.text })), s.level, (v) => { s.level = v; }, "추적 수준"),
          nav(btn("다음", { kind: "primary", onClick: next })));
      } else {
        replace(body, h("h3", { class: "rb-h3" }, w.title), h("p", { class: "rb-p" }, w.text),
          h("div", { class: "rb-wiz-sum" }, wizardSummary({ easyKind: s.kind, level: s.level, mode: s.mode })),
          optionCards([{ value: "fast", label: "빠르게 (권장)", text: "응답 뒤 호출 1회." }, { value: "accurate", label: "더 정확하게", text: "호출이 늘어요." }], s.mode, (v) => { s.mode = v; draw(); }, "기억 방식"),
          s.pot ? note("warn", "리수폿 플러그인이 같이 켜져 있어요. 기록이 두 번 쌓이지 않게, 데이터를 가져온 뒤 리수폿은 꺼 주세요. (설정 → 가져오기)") : null,
          nav(btn("켜기", { kind: "primary", icon: "brain", onClick: finish })));
      }
    };
    draw();
    return box;
  });
}
