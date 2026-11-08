// ProtLink+ 애드온(2.0.0): Proton Drive 공유 링크를 캐릭터·모듈·플러그인에 연결해 두고, 새 파일이 올라오면 알려 주고 받아서 Dusk 업데이트로 넘겨요.
// 링크·설정 저장(dusk.protlink.*)은 그대로라 애드온을 다시 받으면 이어서 써요.
import { createProtLink } from "../../src/data/protlink.js";
import { createUpdateToast } from "../../src/data/updatetoast.js";
import { updateMessage } from "../../src/engine/protlink.js";
import { renderProtLink } from "../../src/ui/screens/protlink.js";
import { download as downloadFile } from "../../src/ui/dom.js";

export async function activate(api, ctx) {
  const ext = ctx.ext, app = ctx.app;
  if (!ext || !app) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const log = (m) => console.log(`[Dusk Atelier] ${m}`);
  const updateToast = createUpdateToast(api, { onOpen: () => Promise.resolve(ctx.openDusk?.("protlink")).catch(() => {}) });
  const pl = app.protlinkForTest ?? createProtLink(api, { log, hooks: {
    importFiles: (files, opts) => app.legacy.startWithFiles(files, opts),
    saveFile: (name, bytes) => downloadFile(name, new Blob([bytes])),
    // Dusk Cellar 플러그인 편집이 켜져 있으면 연결한 플러그인 코드를 바로 바꾼다(없으면 false → 파일 저장)
    updatePlugin: (name, script) => app.updatePluginScript?.(name, script) ?? false,
    onChecked: async (rows) => {
      const msg = updateMessage(rows); if (!msg) return;
      // 리스 화면(플러그인 밖) 알림. 권한이 없거나 못 띄우면 플러그인 안 알림으로 대신한다.
      if (!(await updateToast.show(msg).catch(() => false))) app.toast?.(`ProtLink+: ${msg}`);
    } } });
  const off = [ext.add("svc", "protlink", pl), ext.add("tab", "protlink", renderProtLink)];
  pl.boot().catch((e) => log(`ProtLink+ 시작 실패 ${e?.message ?? e}`));
  return { async deactivate() { off.forEach((f) => f()); await pl.stop?.().catch?.(() => {}); } };
}
