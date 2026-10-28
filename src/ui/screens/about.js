// 정보 · 라이선스: 버전, AGPL-3.0 고지(무보증), 소스 위치, 포함된 외부 코드 목록.
import { h } from '../dom.js';
import { btn, modal } from '../kit.js';

var VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
export var SOURCE_URL = "https://github.com/Pyser08/Dusk-Atelier";
var PARTS = [
  ["RE2JS 2.9.0", "MIT · 정규식 시험 엔진 (봇빌더와 같은 것)"],
  ["fflate 0.8.2", "MIT · 압축"],
  ["msgpackr 1.11.9", "MIT · .risup 프리셋 읽기"],
  ["@noble/ciphers 1.3.0 · @noble/hashes 1.8.0", "MIT · .risup 복호화"],
  ["RPack 매핑 (RisuAI)", "MIT · .risup/.risum 해석"],
  ["risupot · Arcana Card · 봇빌더 · RisuTide", "원작자 허락을 받아 Dusk 방식으로 옮김 (도구 탭 크레딧)"]
];
export function openAbout(ctx) {
  return modal(ctx.win, (done) =>
    h("div", { class: "rb-dialog", role: "dialog", "aria-label": "정보 · 라이선스", style: "max-width:560px" },
      h("h3", { class: "rb-h3" }, `Dusk Atelier v${VERSION}`),
      h("p", null, "이 프로그램은 자유 소프트웨어예요. GNU Affero General Public License 버전 3(AGPL-3.0)에 따라 나누어 쓰고 고칠 수 있어요."),
      h("p", { class: "rb-muted" }, "이 프로그램은 어떠한 보증도 없이 배포돼요 (NO WARRANTY). 상품성이나 특정 목적에 맞는다는 보증도 없어요."),
      h("p", null, "소스 코드: ", h("a", { href: SOURCE_URL, target: "_blank", rel: "noopener noreferrer" }, SOURCE_URL), h("br"), h("small", { class: "rb-muted" }, "고쳐서 배포하거나 네트워크로 쓰게 할 때는 그 사람에게도 고친 소스를 공개해야 해요 (AGPL-3.0 제13조).")),
      h("h4", { class: "rb-h3", style: "font-size:14px;margin-top:14px" }, "함께 들어 있는 코드"),
      h("ul", { style: "margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px" }, PARTS.map(([a, b]) => h("li", null, h("b", null, a), h("br"), h("small", { class: "rb-muted" }, b)))),
      h("p", { class: "rb-muted", style: "margin-top:10px" }, "각 라이선스 전문은 저장소의 NOTICE.md에 있어요."),
      h("div", { class: "btns" }, btn("닫기", { kind: "primary", onClick: () => done(null) }))
    ));
}
