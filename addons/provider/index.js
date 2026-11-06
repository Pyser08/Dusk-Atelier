// 프로바이더 애드온(2.0.0, 실험 기능): 리스 모델 목록에 'Dusk 자동'·프로필을 등록하고, 키 보관·모델 고르기·리스 도구 확인을 해요.
// 리스에 등록한 프로바이더는 빼는 방법이 없어 업데이트·끄기는 다음 시작부터(hooks:true). 설정(dusk.provider.*)은 그대로예요.
import { createProvider } from "../../src/data/provider/index.js";
import { setDuskRoute } from "../../src/engine/runai.js";
import { setDuskServerModel } from "../../src/data/modelhub.js";
import { createStore, backupSnapshot } from "../../src/engine/index.js";
import { renderProvider } from "../../src/ui/screens/provider.js";

export async function activate(api, ctx) {
  const ext = ctx.ext, app = ctx.app;
  if (!ext || !app) throw new Error("Dusk가 애드온 자리(ext)를 지원하지 않아요 — Dusk를 업데이트해 주세요");
  const log = (m) => console.log(`[Dusk Atelier] ${m}`);
  const provider = app.providerForTest ?? createProvider(api, {
    notify: (t) => app.toast?.(t, { seconds: 8 }),
    confirm: app.confirmAnywhere ? (o) => app.confirmAnywhere(o) : undefined,   // 없으면 MCP 쓰기·창구 허용은 거절로 처리
    // 장기기억 애드온이 있으면 리스 도구 '기억 찾기'에 쓴다
    memory: { search: async (q) => {
      const memory = app.memory; const cur = await memory?.switches?.currentChat?.(); if (!cur) return [];
      const f = await memory.store.getFolder(cur.chaId, cur.chatId), want = String(q ?? "").trim().toLowerCase(); if (!f?.people || !want) return [];
      return Object.values(f.people).filter((p) => String(p.name ?? "").toLowerCase().includes(want) || JSON.stringify(p.records ?? []).toLowerCase().includes(want)).slice(0, 5).map((p) => ({ name: p.name, records: (p.records ?? []).slice(-6).map((r) => (typeof r === "string" ? r : r?.text ?? r?.summary ?? JSON.stringify(r)).slice(0, 300)) }));
    } },
    allowed: () => !!app.prefs?.ui?.experimental,
    createStore, backupSnapshot, log
  });
  setDuskRoute(() => provider.analysisPick(), (a, msgs, pick, signal) => provider.run(msgs, pick, signal));
  setDuskServerModel((id) => provider.serverModel(id));
  const unsub = provider.store.subscribe(() => provider.sync().catch(() => {}));
  provider.store.get().then(() => provider.sync()).catch((e) => log(`프로바이더 시작 실패: ${e?.message ?? e}`));
  provider.mailbox?.start().catch((e) => log(`다른 플러그인 창구 시작 실패: ${e?.message ?? e}`));   // 설정에서 켠 경우에만 살핀다(기본 꺼짐)
  const off = [ext.add("svc", "provider", provider), ext.add("tab", "provider", renderProvider)];
  return { async deactivate() { off.forEach((f) => f()); try { provider.mailbox?.stop(); } catch { /* 이미 멈춤 */ } try { await provider.progress?.stop?.(); } catch { /* 창 없음 */ } try { unsub?.(); } catch { /* 이미 해제 */ } setDuskRoute(null, null); setDuskServerModel(null); } };
}
