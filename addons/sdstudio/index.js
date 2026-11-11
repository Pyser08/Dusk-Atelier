// 에셋 제작(SDStudio 이식) 애드온: 개발 탭 버튼 줄 아래에 폭 가득 '에셋 제작' 버튼 → NovelAI로 그림을 만들어 그 봇·모듈 에셋에 넣는다.
// 코어 자리 slot "dev.actions"(부품 (ctx, { kind, id, index? }))가 있어야 보인다 — 없는 코어에서는 조용히 아무것도 안 보임.
import { btn } from "../../src/ui/kit.js";
import { createSdStudio } from "../../src/data/sdstudio.js";
import { openAssetMaker } from "../../src/ui/screens/sdstudio.js";

export async function activate(api, ctx) {
  const ext = ctx.ext;
  if (!ext) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const sd = createSdStudio(api);
  const off = ext.add("slot", "dev.actions", (c, info) => {
    if (!info?.id || (info.kind === "character" && !Number.isInteger(info.index))) return null;
    const b = btn("에셋 제작", { size: "lg", icon: "sparkle", id: "rb-sd-make", onClick: () => openAssetMaker(c, info, sd).catch((e) => c.toast(e?.message ?? String(e), { error: true })) });
    b.style.width = "100%";
    return b;
  });
  return { deactivate() { off(); } };
}
