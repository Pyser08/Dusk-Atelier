import * as engine_exports from './engine/index.js';
import { hostBlockedMessage, isHostBlocked } from './data/modules.js';
import { createLegacy } from './ui/legacy.js';
import { h } from './ui/dom.js';
import { iconMarkup } from './ui/icons.js';
import { createApp } from './ui/app.js';
import { createWatcher } from './ui/watch.js';
import { CSS2 } from './ui/styles.js';
import { applyPreset, isMobileDevice, loadPresets, pairSwitchTarget, savePresets } from './data/presets.js';
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
      if (app) {
        app.ctx.state.modDirty = true;
        app.ctx.refresh();
      }
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
  const open = () => app.open().catch((e) => console.log(`[${TITLE}] 열기 실패: ${e?.message ?? e}`));
  await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger" }, open);
  await api.registerSetting(TITLE, open, ICON, "html");
  // 새로 가져온 봇 감지 (+ 메뉴 버튼 포함). 설정에서 끌 수 있다.
  const watcher = createWatcher(api, {
    onDetected: (items) => legacy.offerCopies(items).catch(() => {
    }),
    onModules: (items) => legacy.offerModules(items).catch(() => {
    }),
    onOpenUpdater: () => legacy.open().catch(() => {
    }),
    isBusy: () => legacy.busy
  });
  app.ctx.watcher = watcher;
  hooks.created = (id) => watcher.markKnown(id);
  hooks.modulesChanged = () => watcher.snapshotModules();
  watcher.start().catch((e) => console.log(`[${TITLE}] 새 봇 감지 시작 실패: ${e?.message ?? e}`));
}
if (typeof globalThis.__RBU_TEST__ !== "undefined") globalThis.__RBU_TEST__.RBU = { ...engine_exports };
else start().catch((e) => console.log(`[${TITLE}] 초기화 실패: ${e?.message ?? e}`));
