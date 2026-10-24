//@name dusk_atelier_theme_builder
//@display-name Dusk Atelier 테마 빌더
//@api 3.0
//@version 0.1.0
//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/parts/theme-builder.js
//@allowed-ipc dusk_atelier

import { renderThemeBuilder } from '../../src/ui/screens/themebuilder.js';
import { CSS2, FONT_LINK } from '../../src/ui/styles.js';

const HOST = 'dusk_atelier';
const CHANNEL = 'dusk-atelier-parts-v1';
const api = globalThis.risuai ?? globalThis.Risuai;
let active = false;

if (typeof document !== 'undefined') {
  document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONT_LINK }));
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS2 }));
}

const toast = (message) => api.log(`[Dusk Theme Builder] ${message}`).catch(() => {});
const close = async () => {
  active = false;
  document.body.replaceChildren();
  await api.hideContainer();
  await api.postPluginChannelMessage(HOST, CHANNEL, { protocol: 1, type: 'closed', part: 'theme-builder' });
};
const open = async () => {
  active = true;
  await api.showContainer('fullscreen');
  const ctx = {
    api,
    main: document.body,
    win: globalThis,
    state: {},
    toast,
    go: async (_tab, sub) => {
      if (sub === 'themestudio') {
        await api.postPluginChannelMessage(HOST, CHANNEL, { protocol: 1, type: 'open-studio', part: 'theme-builder' });
      }
      await close();
    }
  };
  await renderThemeBuilder(ctx);
};

(async () => {
  if (!api) return;
  await api.addPluginChannelListener(CHANNEL, async (message, meta) => {
    if (meta?.sender !== HOST || message?.protocol !== 1 || message?.part !== 'theme-builder') return;
    if (message.type === 'open') await open();
    if (message.type === 'close' && active) await close();
  });
})().catch((error) => api?.log(`[Dusk Theme Builder] 초기화 실패: ${error?.message ?? error}`));
