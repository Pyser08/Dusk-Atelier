//@name da_parts_test_part
//@display-name DA Parts Test Part
//@api 3.0
//@version 0.1.0
//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/tests/parts-update/part.js

(() => {
  const HOST = 'da_parts_test_host';
  const CHANNEL = 'dusk-parts-test-part';
  const VERSION = '0.1.0';
  let root;

  const show = async () => {
    await risuai.showContainer('fullscreen');
    if (!root) {
      root = document.createElement('main');
      root.style.cssText = 'font:16px system-ui,sans-serif;padding:24px;color:inherit';
      root.innerHTML = `<h1>Parts update test · Part v${VERSION}</h1><p>이 화면의 버전이 RisuAI 업데이트로 바뀌는지 확인합니다.</p><button id="return">Host로 응답 보내기</button> <button id="close">닫기</button>`;
      document.body.replaceChildren(root);
      root.querySelector('#return').onclick = async () => {
        await risuai.postPluginChannelMessage(HOST, 'dusk-parts-test-host', { type: 'pong', nonce: `${Date.now()}`, partVersion: VERSION });
        await risuai.hideContainer();
      };
      root.querySelector('#close').onclick = () => risuai.hideContainer();
    }
  };

  (async () => {
    await risuai.addPluginChannelListener(CHANNEL, async (message) => {
      if (message?.type === 'ping') {
        await risuai.postPluginChannelMessage(HOST, 'dusk-parts-test-host', { type: 'pong', nonce: message.nonce, partVersion: VERSION });
        await show();
      }
    });
    await risuai.registerSetting('DA Parts Test Part', show, '🧪', 'html', 'da-parts-test-part-setting');
    await risuai.registerButton({ name: 'DA Parts Test Part', icon: '🧪', iconType: 'html', location: 'hamburger', id: 'da-parts-test-part-button' }, show);
  })();
})();
