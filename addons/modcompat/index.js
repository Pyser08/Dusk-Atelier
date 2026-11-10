// 모듈 호환 애드온(2.1.0): 봇이 어떻게 만들어졌든 켜 둔 모듈의 이미지가 봇 이미지처럼 나오게 한다.
// 리스 훅 셋(output·display·process) + 요청 안내(beforeRequest). 훅은 끌 때 Dusk가 자동으로 뗀다(addonscope).
import { createModCompat } from "../../src/data/modcompat.js";
import { renderModCompat } from "../../src/ui/screens/modcompat.js";

export async function activate(api, ctx) {
  const dusk = ctx.dusk;
  const log = (...a) => console.log("[Dusk 모듈 호환]", ...a);
  const mc = createModCompat(api, { storage: dusk.storage, log });
  await mc.loadSettings();
  const hook = async (fn) => { try { await fn(); } catch (e) { log("훅 등록 실패", e?.message ?? e); } };
  await hook(() => api.addRisuScriptHandler("output", mc.onOutput));
  await hook(() => api.addRisuScriptHandler("display", mc.onDisplay));
  await hook(() => api.addRisuScriptHandler("process", mc.onProcess));
  await hook(() => api.addRisuReplacer("beforeRequest", mc.beforeRequest));
  mc.current().catch(() => {});
  dusk.addPage({ title: "모듈 호환", render: (el) => renderModCompat(el, dusk, mc) });
  return { deactivate() {} };
}
