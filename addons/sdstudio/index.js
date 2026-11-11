// 에셋 제작(SDStudio 이식) 애드온: 봇·모듈 편집 화면 '적용' 아래 줄('에셋' 옆)에 '에셋 제작' → 플러그인 창을 화면 가득 채운 SDStudio 모양 에셋 제작.
// 캐릭터 카드·폴더(복장·소속) → 씬(표정·포즈) 조합·예약·생성 → 고른 그림을 그 봇(감정 이미지·추가 에셋)·모듈 에셋에 넣는다.
// 코어 자리 slot "editor.actions"(부품 (ctx, { kind, id, index? }))가 있어야 보인다 — 없는 코어에서는 조용히 아무것도 안 보임.
import { btn } from "../../src/ui/kit.js";
import { createSdStudio } from "../../src/data/sdstudio.js";
import { openAssetStudio } from "../../src/ui/screens/sdstudio.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const sd = createSdStudio(api);
  const off = ext.add("slot", "editor.actions", (c, target) => {
    if (!target?.id || (target.kind === "character" && !Number.isInteger(target.index))) return null;
    return btn("에셋 제작", { size: "sm", kind: "primary", icon: "sparkle", id: "rb-sd-make", onClick: () => openAssetStudio(c, target, sd).catch((e) => c.toast(e?.message ?? String(e), { error: true })) });
  });
  return { deactivate() { off(); } };
}
