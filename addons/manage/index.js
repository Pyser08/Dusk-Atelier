// 관리 애드온(2.0.0): 캐릭터(폴더·에셋·로어북)·모듈(켜기·순서·연결)·플러그인(목록·새 버전 확인·프리셋) 화면.
// 가져오기·편집기·백업은 코어에 남아 있어서 이 애드온이 없어도 봇·모듈 가져오기는 돼요. 저장 값(폴더·연결·프리셋)은 그대로예요.
// 0.1.2: 모듈 탭 위에 ‘모듈 / 모듈 병합’ 전환(모듈 병합 = 모듈 호환 애드온 화면, svc "modcompat").
import { renderCharacters } from "../../src/ui/screens/characters.js";
import { renderModules } from "../../src/ui/screens/modules.js";
import { renderPlugins } from "../../src/ui/screens/plugins.js";
import { h, replace } from "../../src/ui/dom.js";
import { segmented, btn, emptyState } from "../../src/ui/kit.js";

const VIEWS = [["list", "📦 모듈"], ["merge", "🧩 모듈 병합"]];
const CSS = `.rb-modsw{padding:12px 16px 4px;flex:none}
.rb-modsw .rb-seg{width:100%;max-width:520px}
.rb-modsw .rb-seg button{flex:1;font-size:15px;font-weight:700;padding:11px 14px;min-height:44px}
.rb-modsw-body{flex:1;min-height:0;display:flex;flex-direction:column}`;

// 모듈 탭: 위에 크게 전환, 아래는 고른 화면. 모듈 목록 화면은 그대로 쓰고 그릴 자리만 아래 칸으로 바꾼다.
export function renderModulesTab(ctx) {
  const st = ctx.state;
  st.modView ??= "list";
  const body = h("div", { class: "rb-modsw-body" });
  const bar = h("div", { class: "rb-modsw" }, segmented(VIEWS, st.modView, (v) => { st.modView = v; renderModulesTab(ctx); }, "모듈 보기"));
  replace(ctx.main, h("style", {}, CSS), bar, body);
  if (st.modView === "merge") {
    const merge = ctx.ext?.get?.("svc", "modcompat");
    if (merge?.render) return merge.render(body);
    replace(body, h("div", { class: "rb-section rb-scroll", style: "flex:1;min-height:0" },
      emptyState({ title: "모듈 병합은 애드온이에요", text: "홈 → 애드온에서 ‘모듈 호환’을 받으면, 여러 모듈을 켜도 모듈 이미지가 봇 이미지처럼 나오게 맞춰요." }),
      h("p", { style: "text-align:center" }, btn("애드온 보러 가기", { kind: "primary", onClick: () => ctx.go?.("home") }))));
    return;
  }
  const sub = Object.create(ctx);
  sub.main = body;
  return renderModules(sub);
}

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const off = [ext.add("svc", "manage", { open: (tab) => ctx.openDusk?.(tab ?? "characters") }), ext.add("tab", "characters", renderCharacters), ext.add("tab", "modules", renderModulesTab), ext.add("tab", "plugins", renderPlugins)];
  return { async deactivate() { off.forEach((f) => f()); } };
}
