import * as engine_exports from './engine/index.js';
import { hostBlockedMessage, isHostBlocked } from './data/modules.js';
import { createLegacy } from './ui/legacy.js';
import { h } from './ui/dom.js';
import { iconMarkup } from './ui/icons.js';
import { createApp } from './ui/app.js';
import { createHostToast } from './ui/toast.js';
import { createWatcher } from './ui/watch.js';
import { createQuickImport } from './ui/quickimport.js';
import { CSS2, loadUiCss } from './ui/styles.js';
import { applyPreset, isMobileDevice, loadPresets, pairSwitchTarget, savePresets } from './data/presets.js';
import { createLoreRuntime } from './data/lorerules.js';
import { createLoreLog } from './data/lorelog.js';
import { restoreActiveTheme } from './ui/screens/themestudio.js';
import { hasPersonaLinks, loadPersonaMap, resetPersonaSyncCache, syncPersonaModules } from './data/persona.js';

var VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
var TITLE = "Dusk Atelier";
async function start() {
  const raw = globalThis.risuai ?? globalThis.Risuai;
  if (!raw) return;
  const friendly = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (isHostBlocked(e) && !e?.hostBlocked) {
        const err = new Error(hostBlockedMessage);
        err.hostBlocked = true;
        err.cause = e;
        throw err;
      }
      throw e;
    }
  };
  const wrapped = { setCharacterToIndex: friendly((...a) => raw.setCharacterToIndex(...a)), setDatabaseLite: friendly((...a) => raw.setDatabaseLite(...a)) };
  const api = new Proxy(raw, { get: (t, k) => k in wrapped ? wrapped[k] : t[k] });
  const ICON = iconMarkup("module", 20);
  if (globalThis.__RBM_ENTRY__ === "legacy") {
    if (!document.getElementById("rb-style")) document.head.appendChild(h("style", { id: "rb-style" }, CSS2));
    loadUiCss(api).catch(() => {});
    const legacy2 = await createLegacy(api);
    await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger" }, () => legacy2.open());
    await api.registerSetting(TITLE, () => legacy2.open(), ICON, "html");
    return;
  }
  let app = null;
  const hooks = {};
  const legacy = await createLegacy(api, {
    hooks,
    onExit: () => {
      // Dusk 창이 닫힌 채로 감지 알림만 띄웠던 경우: 리스 화면을 가리지 않게 플러그인 화면도 닫는다
      const r = app?.ctx.root;
      if (!app || !r || r.hidden) return api.hideContainer();
      app.ctx.state.modDirty = true;
      app.ctx.refresh();
    },
    host: () => app?.ctx.root,
    links: {
      get: (k) => app?.ctx.prefs.meta?.links?.[k],
      set: (k, id) => {
        app?.ctx.svc.meta((m) => {
          m.links ??= {};
          m.links[k] = id;
        }).catch(() => {
        });
      }
    }
  });
  // 새로 가져온 봇 감지 (+ 메뉴 버튼 포함). 설정에서 끌 수 있다.
  // 리스에서 가져오자마자 잡히도록 다른 준비(화면·버튼 등록·프리셋)보다 먼저 시작한다. 콜백은 감지될 때 불리므로 app은 그때 쓴다.
  const toast = createHostToast(() => watcher.doc);
  const watcher = createWatcher(api, {
    // 리스 쪽에서 모듈이 바뀌면 목록 캐시를 비운다
    onModChanged: () => app?.ctx.svc.invalidate(),
    onDetected: (items) => legacy.offerCopies(items).catch(() => {
    }),
    onModules: (items) => legacy.offerModules(items).catch(() => {
    }),
    // 새 봇(업데이트 후보는 아님): 메인 화면 오른쪽 위 알림 → 누르면 합칠 봇 고르기. 권한이 없으면 바로 창으로
    onNew: async (items) => {
      const n = legacy.queueNew(items);
      const first = items[0]?.copyName || "새 봇";
      const shown = await toast.show({
        title: n > 1 ? `새 봇 ${n}개를 가져왔어요` : `새 봇 '${first}'`,
        text: "다른 봇과 합칠까요? 그냥 두셔도 돼요.",
        action: "합칠 봇 고르기",
        onClick: () => legacy.openNew().catch(() => {
        })
      });
      if (!shown) legacy.openNew().catch(() => {
      });
    },
    onOpenUpdater: () => legacy.open().catch(() => {
    }),
    isBusy: () => legacy.busy
  });
  hooks.created = (id) => watcher.markKnown(id);
  hooks.modulesChanged = () => watcher.snapshotModules();
  watcher.start().catch((e) => console.log(`[${TITLE}] 새 봇 감지 시작 실패: ${e?.message ?? e}`));
  // PC 메인 화면 오른쪽 아래 '빠른 가져오기' 상자: 누르면 Dusk 가져오기 화면(동시 업로드)을 연다
  const quickImport = createQuickImport(api, { getDoc: () => watcher.doc, onOpen: () => legacy.open().catch(() => {
  }) });
  quickImport.start().catch((e) => console.log(`[${TITLE}] 빠른 가져오기 상자 실패: ${e?.message ?? e}`));
  // 로어북 규칙(조건·확률·중복 금지·연쇄): 관리 항목이 있는 봇에서만 요청 훅을 건다
  const loreRuntime = createLoreRuntime(api);
  loreRuntime.start().catch((e) => console.log(`[${TITLE}] 로어북 규칙 시작 실패: ${e?.message ?? e}`));
  // 로어북 로그: 응답마다 들어간 로어북을 남기고, 응답 아래에 버튼을 붙인다
  const loreLog = createLoreLog(api, { loreRuntime });
  loreLog.start().catch((e) => console.log(`[${TITLE}] 로어북 로그 시작 실패: ${e?.message ?? e}`));
  let handlers = null, timer = null;
  const sync = () => app?.ctx.svc.serial(() => syncPersonaModules(api)).catch((e) => console.log("[Dusk Atelier] 페르소나 동기화 실패", e?.message ?? e));
  const onInput = async (text) => {
    await sync();
    return text;
  };
  const onDisplay = async (text) => {
    clearTimeout(timer);
    timer = setTimeout(sync, 250);
    return text;
  };
  async function refreshPersonaHandlers() {
    const on = hasPersonaLinks(await loadPersonaMap(api).catch(() => ({ map: {} })));
    if (on && !handlers) {
      await api.addRisuScriptHandler("input", onInput);
      await api.addRisuScriptHandler("display", onDisplay);
      handlers = true;
    }
    if (!on && handlers) {
      try {
        await api.removeRisuScriptHandler("input", onInput);
        await api.removeRisuScriptHandler("display", onDisplay);
      } catch {
      }
      handlers = null;
    }
    resetPersonaSyncCache();
    if (on) sync();
  }
  app = createApp(api, { legacy, version: VERSION, onPersonaChanged: () => refreshPersonaHandlers().catch(() => {
  }) });
  app.ctx.watcher = watcher;
  app.ctx.quickImport = quickImport;
  app.ctx.loreRuntime = loreRuntime;
  app.ctx.loreLog = loreLog;
  refreshPersonaHandlers().catch(() => {
  });
  (async () => {
    const data = await loadPresets(api);
    const device = isMobileDevice() ? "mobile" : "desktop";
    const target = pairSwitchTarget(data, device);
    if (target) await app.ctx.svc.serial(() => applyPreset(api, target));
    const fresh = await loadPresets(api);
    if (fresh.lastDeviceType !== device && (fresh.defaultMobile || fresh.defaultDesktop || target)) {
      fresh.lastDeviceType = device;
      await savePresets(api, fresh);
    }
    if (target) console.log(`[Dusk Atelier] ${device === "mobile" ? "모바일" : "데스크탑"} 감지 → '${target}' 프리셋으로 전환`);
  })().catch((e) => console.log("[Dusk Atelier] 디바이스 페어 확인 실패", e?.message ?? e));
  restoreActiveTheme(api).catch((e) => console.log("[Dusk Atelier] 테마 적용 실패", e?.message ?? e));
  const open = () => app.open().catch((e) => console.log(`[${TITLE}] 열기 실패: ${e?.message ?? e}`));
  await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger" }, open);
  await api.registerSetting(TITLE, open, ICON, "html");
}
if (typeof globalThis.__RBU_TEST__ !== "undefined") globalThis.__RBU_TEST__.RBU = { ...engine_exports };
else start().catch((e) => console.log(`[${TITLE}] 초기화 실패: ${e?.message ?? e}`));
