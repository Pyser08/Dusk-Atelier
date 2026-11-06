import { parseStatus as parseStoryStatus } from "./engine/storytime.js";
import { createAddons } from "./data/addons.js";
import { LIB as ADDON_LIB } from "./addonlib.gen.js";
import { startHostUpdateToast } from './ui/hostupdate.js';
import { createDbCache, WRITE_RE } from './data/dbcache.js';
import { createHookBus } from './data/hookbus.js';
import * as engine_exports from './engine/index.js';
import { hostBlockedMessage, isHostBlocked } from './data/modules.js';
import { createLegacy } from './ui/legacy.js';
import { h } from './ui/dom.js';
import { iconMarkup } from './ui/icons.js';
import { createApp } from './ui/app.js';
import { createHostToast } from './ui/toast.js';
import { createWatcher } from './ui/watch.js';
import { CSS2 } from './ui/styles.js';
import { applyPreset, isMobileDevice, loadPresets, pairSwitchTarget, savePresets } from './data/presets.js';
import { createLoreRuntime } from './data/lorerules.js';
import { createLoreLog } from './data/lorelog.js';
import { createTurnInfo } from './data/turninfo.js';
import { createChatMenu } from './data/chatmenu.js';
import { createStoryTime } from './data/storytime.js';
import { createFairPlay } from './data/fairplay.js';
import { createImgTagFix } from './data/imgtagfix.js';
import './data/modelhub.js';
import { createProvider } from './data/provider/index.js';
import { setDuskRoute, runAI } from './engine/runai.js';
import { setDuskServerModel } from './data/modelhub.js';
import { setSkillBlockProvider } from './engine/skillhook.js';
import { createSkillStore } from './data/skillstore.js';
import { setWebWrapProvider } from './engine/webhook.js';
import { createWebTools } from './data/webtools.js';
import { restoreActiveTheme } from './data/themes.js';
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
  // 스크립트 훅(input·output·display)은 종류마다 하나만 호스트에 달고 안에서 나눠 부른다(호스트 왕복 감소, v1.8.1)
  if (typeof raw.addRisuScriptHandler === "function" && typeof raw.removeRisuScriptHandler === "function") {
    const bus = createHookBus(raw);
    wrapped.addRisuScriptHandler = (...a) => bus.add(...a);
    wrapped.removeRisuScriptHandler = (...a) => bus.remove(...a);
  }
  // 화면 목록용 getDatabase 짧은 캐시(getDatabaseCached): 쓰기 계열 호출이 있으면 바로 비운다. Dusk 창을 열 때도 비운다.
  const dbc = createDbCache(raw);
  wrapped.getDatabaseCached = (keys, opts) => dbc.get(keys, opts);
  wrapped.getDatabaseWarm = (keys) => dbc.warm(keys);   // 감시가 읽은 것도 캐시에 넣어 탭을 처음 열 때 다시 읽지 않게(1.8.3)
  wrapped.hasDbCache = (keys) => dbc.has(keys);
  wrapped.storeDbCache = (keys, value) => dbc.store(keys, value);
  wrapped.invalidateDbCache = (opts) => (opts?.soft ? dbc.soften(opts.maxAge) : dbc.invalidate());
  for (const name of ["setCharacterToIndex", "setDatabaseLite"]) {
    const f = wrapped[name];
    wrapped[name] = async (...a) => { dbc.invalidate(); try { return await f(...a); } finally { dbc.invalidate(); } };
  }
  const api = new Proxy(raw, {
    get: (t, k) => {
      if (k in wrapped) return wrapped[k];
      const v = t[k];
      if (typeof v === "function" && typeof k === "string" && WRITE_RE.test(k)) {
        return async (...a) => { dbc.invalidate(); try { return await v.apply(t, a); } finally { dbc.invalidate(); } };
      }
      return v;
    }
  });
  console.log(`[${TITLE}] 진입 경로`, globalThis.__RBM_ENTRY__ ?? "normal");
  const memoryRef = { toast: null };
  const storyTime = createStoryTime(api);
  storyTime.start().catch((e) => console.log(`[${TITLE}] 이야기 시간 시작 실패: ${e?.message ?? e}`));
  const chatRef = { of: null };   // 주사위 기록에 붙일 지금 채팅(장기 기억이 만들어진 뒤 연결)
  const fairPlay = createFairPlay(api, { chatOf: () => chatRef.of?.() ?? null });
  fairPlay.start().catch((e) => console.log(`[${TITLE}] 공정한 전개 시작 실패: ${e?.message ?? e}`));
  const imgFix = createImgTagFix(api);
  imgFix.start().catch((e) => console.log(`[${TITLE}] 이미지 태그 교정 시작 실패: ${e?.message ?? e}`));
  // 장기기억·관계도는 애드온(addons/memory, 2.0.0). 코어는 등록된 서비스가 있을 때만 쓴다.
  const mem = () => app?.ctx?.ext?.get("svc", "memory") ?? null;
  chatRef.of = () => mem()?.switches?.currentChat?.() ?? null;
  const skills = createSkillStore(api);   // 스킬 라이브러리·주입 (꺼짐이 기본, v1.8.1)
  setSkillBlockProvider((stage) => skills.blockFor(stage));
  const web = createWebTools(api);   // 웹 검색·가져오기 도구 (꺼짐이 기본, v1.8.1)
  setWebWrapProvider((stage, prompt, call) => web.wrap(stage, prompt, call));
  // Dusk 프로바이더 (1.9.3): 리스 모델 목록에 Dusk 자동·프로필 등록, 쓰기 도구 확인은 창이 닫혀 있어도 뜬다
  const providerRef = { confirm: null, exp: () => false };
  const provider = createProvider(api, {
    notify: (t) => memoryRef.toast?.(t),
    confirm: (o) => (providerRef.confirm ? providerRef.confirm(o) : Promise.resolve(false)),
    memory: { search: async (q) => {
      const memory = mem(); const cur = await memory?.switches?.currentChat?.(); if (!cur) return [];
      const f = await memory.store.getFolder(cur.chaId, cur.chatId), want = String(q ?? "").trim().toLowerCase(); if (!f?.people || !want) return [];
      return Object.values(f.people).filter((p) => String(p.name ?? "").toLowerCase().includes(want) || JSON.stringify(p.records ?? []).toLowerCase().includes(want)).slice(0, 5).map((p) => ({ name: p.name, records: (p.records ?? []).slice(-6).map((r) => (typeof r === "string" ? r : r?.text ?? r?.summary ?? JSON.stringify(r)).slice(0, 300)) }));
    } },
    allowed: () => providerRef.exp(),
    createStore: engine_exports.createStore,
    backupSnapshot: engine_exports.backupSnapshot,
    log: (m) => console.log(`[${TITLE}] ${m}`)
  });
  setDuskRoute(() => provider.analysisPick(), (a, msgs, pick, signal) => provider.run(msgs, pick, signal));
  setDuskServerModel((id) => provider.serverModel(id));
  provider.store.get().then(() => provider.sync()).catch((e) => console.log(`[${TITLE}] 프로바이더 시작 실패: ${e?.message ?? e}`));
  provider.store.subscribe(() => provider.sync().catch(() => {}));
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
  // 로어북 규칙(조건·확률·중복 금지·연쇄): 관리 항목이 있는 봇에서만 요청 훅을 건다
  const loreRuntime = createLoreRuntime(api);
  loreRuntime.start().catch((e) => console.log(`[${TITLE}] 로어북 규칙 시작 실패: ${e?.message ?? e}`));
  // 로어북 로그: 응답마다 들어간 로어북을 남기고, 응답 아래에 버튼을 붙인다
  const loreLog = createLoreLog(api, { loreRuntime, above: (t) => mem()?.gauge?.onDisplay?.(t) ?? "" });
  loreLog.start().catch((e) => console.log(`[${TITLE}] 로어북 로그 시작 실패: ${e?.message ?? e}`));
  const turnInfo = createTurnInfo(api, { diceSource: () => fairPlay.lastDice(), loreFor: (t) => loreLog.recordFor(t), loreLast: () => loreLog.last() });   // 주사위 결과·모델 호출 표시 (1.8.3)
  turnInfo.start().catch((e) => console.log(`[${TITLE}] 호출 표시 시작 실패: ${e?.message ?? e}`));
  // 채팅 입력창 옆 메뉴의 빠른 설정 (1.8.3). 어디서 바꾸든(홈·시작 안내·메뉴) 버튼 이름이 따라 바뀌게 설정 함수를 감싼다.
  const chatMenu = createChatMenu(api, { fairPlay, turnInfo });   // 맨 위 '장기 기억'·'회귀' 바로가기는 장기기억 애드온이 addLink로 붙인다
  for (const [obj, names] of [[fairPlay, ["set", "setDice"]], [turnInfo, ["setDiceShow"]]]) for (const n of names) {
    const f = obj[n]; obj[n] = async (...a) => { const r = await f(...a); chatMenu.refresh().catch(() => {}); return r; };
  }
  chatMenu.start().catch((e) => console.log(`[${TITLE}] 채팅 메뉴 빠른 설정 실패: ${e?.message ?? e}`));
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
  app.ctx.loreRuntime = loreRuntime;
  app.ctx.loreLog = loreLog;
  app.ctx.turnInfo = turnInfo;
  app.ctx.chatMenu = chatMenu;
  for (const [k, id] of [["memory", "memory"], ["affhud", "affhud"], ["memoryButton", "memoryButton"]]) Object.defineProperty(app.ctx, k, { configurable: true, get: () => app.ctx.ext.get("svc", id) ?? null });
  app.ctx.provider = provider;
  providerRef.confirm = (o) => app.ctx.confirmAnywhere(o);
  providerRef.exp = () => !!app?.ctx?.prefs?.ui?.experimental;
  provider.sync().catch(() => {});   // 실험 기능이 켜져 있으면 이제 등록
  // 위젯 홈(v1.9.2): 기본 꺼짐. 켜져 있으면 시작해서 메뉴 버튼을 달고, Dusk 창을 열 땐 먼저 닫아 같은 플러그인 화면을 번갈아 쓴다
  // ProtLink+(v1.9.2): 기본 켜짐. Proton Drive 링크를 캐릭터·모듈·플러그인에 연결해 두고 새 파일을 받아 Dusk 업데이트로 넘긴다.
  // ProtLink+는 애드온(addons/protlink, 2.0.0). 위젯 홈 등은 ctx.protlink가 없으면 그 칸을 숨긴다.
  Object.defineProperty(app.ctx, "protlink", { configurable: true, get: () => app.ctx.ext.get("svc", "protlink") ?? null });
  // Dusk Cellar 플러그인 편집이 켜져 있으면 플러그인 코드를 바로 바꾼다(ProtLink+ 애드온이 쓴다). 못 하면 false.
  app.ctx.updatePluginScript = async (name, script) => {
    const { createCellar } = await import("./data/cellar.js"), { createCellarPlugins, hasPluginEdit } = await import("./data/cellarplugins.js");
    const cel = app.ctx.cellar ?? (app.ctx.cellar = createCellar(api));
    const st = await cel.status?.().catch(() => null);
    if (!hasPluginEdit(st)) return false;
    const cp = createCellarPlugins(api, { url: st.url, via: st.via }), cur = await cp.get(name);
    await cp.apply([{ name, ...(cur.index === undefined ? {} : { index: cur.index }), expectSha: cur.sha256, script }]);
    return true;
  };
  // 위젯 홈은 애드온(addons/widgets). 코어는 켜져 있을 때만 그 기능을 부른다.
  const wh = () => app.ctx.ext.get("svc", "widgethome") ?? null;
  Object.defineProperty(app.ctx, "widgetHome", { configurable: true, get: wh });
  app.ctx.openWidgetHome = async () => { const w = wh(); if (!w) return false; try { await app.close(); } catch { /* 이미 닫힘 */ } return w.open(); };
  const duskOpen = app.open;
  app.open = async (o) => { await wh()?.yieldToDusk?.().catch(() => {}); app.ctx.addons?.checkSoon?.().catch?.(() => {}); return duskOpen(o); };   // 창을 열 때 애드온 업데이트도 확인(10분 넘었으면)
  app.ctx.onClosed = () => wh()?.resume?.();   // Dusk 창을 닫으면 떠 있던 위젯 홈을 다시 띄운다
  // Erosync는 애드온(addons/erosync, 2.0.0). 기억 화면들은 ctx.erosync가 없으면 Erosync 칸을 숨긴다.
  Object.defineProperty(app.ctx, "erosync", { configurable: true, get: () => app.ctx.ext.get("svc", "erosync") ?? null });
  // 애드온(2.0.0): 받아 둔 애드온을 같은 창에서 불러온다. 리스 플러그인 목록에는 안 뜬다.
  globalThis.__duskLib = ADDON_LIB; globalThis.__duskVersion = VERSION;   // 애드온이 코어 모듈을 다시 넣지 않고 함께 쓴다(tools/build-addons.mjs)
  // 훅 있는 애드온(장기기억·Erosync) 업데이트를 받아 두면 새로고침을 부탁한다: 리스 화면 알림 → 못 띄우면 Dusk 창 안 알림
  const pendingNames = new Set();
  const askRefresh = ({ name, version }) => {
    pendingNames.add(`${name} v${version}`);
    const text = `${[...pendingNames].join(", ")} 업데이트를 받았어요. 리스를 새로고침하면 적용돼요.`;
    toast.show({ title: "새로고침해 주세요", text, action: "눌러서 닫기", ms: 60e3 }).then((ok) => { if (!ok) app?.ctx?.toast?.(text, { seconds: 15 }); }).catch(() => app?.ctx?.toast?.(text, { seconds: 15 }));
  };
  const addons = createAddons(api, { core: VERSION, onPendingRestart: askRefresh, ctx: { ext: app.ctx.ext, app: app.ctx, toast: (t, o) => { app.ctx.toast?.(t, o); }, openDusk: async (tab) => { await app.open(tab ? { tab } : undefined).catch(() => {}); } } });   // 반환값 없음: 애드온 콜백이 그대로 돌려주면 호스트로 복제가 안 돼요
  app.ctx.addons = addons;
  // 2.0.0으로 올라온 기존 사용자: 쓰던 기능(장기기억·기억카드·Erosync·위젯)의 애드온을 자동으로 받아 그대로 쓰게 한다.
  const rawOf = async (k) => { try { const v = await api.pluginStorage.getItem(k); return v == null || v === "" ? null : v; } catch { return null; } };
  const on = (v) => v === true || v === "on" || v === "true";
  const ADOPT = [
    // 관리(캐릭터·모듈·플러그인): 예전 버전을 쓰던 사람이면(화면 설정이 있으면) 받는다
    ["manage", async () => !!(await rawOf("rbm:ui:v1"))],
    ["memory", async () => !!((await rawOf("dusk.mem.v3.index")) || (await rawOf("dusk.mem.v2.index")) || (await rawOf("risupot.settings")))],
    ["cards", async () => { const v = await rawOf("dusk.mem.v2.cardidx"); try { return (typeof v === "string" ? JSON.parse(v) : v)?.list?.length > 0; } catch { return false; } }],
    ["erosync", async () => on(await rawOf("dusk.erosync.on"))],
    ["widgets", async () => on(await rawOf("dusk.widgethome.on"))],
    // ProtLink+: 연결해 둔 링크가 있으면
    ["protlink", async () => { const v = await rawOf("dusk.protlink.links.v1"); try { const d = typeof v === "string" ? JSON.parse(v) : v; return (Array.isArray(d) ? d : d?.links ?? []).length > 0; } catch { return false; } }]
  ];
  addons.boot().then(() => addons.adopt(ADOPT)).then((r) => { if (r?.got?.length) console.log(`[${TITLE}] 쓰던 기능 애드온을 받았어요: ${r.got.join(", ")}`); })
    .catch((e) => console.log(`[${TITLE}] 애드온 시작 실패 ${e?.message ?? e}`));
  // Cellar 연결: 장기기억 애드온이 있으면 그쪽에서 찾은 것을, 없으면 화면이 직접 만든다(plugins·settingstab의 createCellar)
  Object.defineProperty(app.ctx, "cellar", { configurable: true, get: () => app.ctx._cellar ?? mem()?.cellar ?? null, set: (v) => { app.ctx._cellar = v; } });
  app.ctx.skills = skills;
  app.ctx.web = web;
  app.ctx.storyTime = storyTime;
  app.ctx.fairPlay = fairPlay;
  app.ctx.imgFix = imgFix;
  memoryRef.toast = (t) => app.ctx.toast(t, { seconds: 8 });
  refreshPersonaHandlers().catch(() => {
  });
  // 새 버전이 있으면 메인 화면 오른쪽 위에 큰 알림 (켜질 때 한 번)
  setTimeout(() => startHostUpdateToast(api, { version: VERSION, log: (m) => console.log(`[${TITLE}] ${m}`) }).catch(() => {}), 4000);
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
  await api.registerButton({ name: TITLE, icon: ICON, iconType: "html", location: "hamburger", id: "dusk-atelier-open" }, open);
  await api.registerSetting(TITLE, open, ICON, "html");
}
if (typeof globalThis.__RBU_TEST__ !== "undefined") globalThis.__RBU_TEST__.RBU = { ...engine_exports };
else start().catch((e) => console.log(`[${TITLE}] 초기화 실패: ${e?.message ?? e}`));
