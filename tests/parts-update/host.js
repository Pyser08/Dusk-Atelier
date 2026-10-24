//@name da_parts_test_host
//@display-name DA Parts Test Host
//@api 3.0
//@version 0.1.0
//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/tests/parts-update/host.js
//@allowed-ipc da_parts_test_part

(() => {
  const PART = 'da_parts_test_part';
  const CHANNEL = 'dusk-parts-test-v1';
  const MANIFEST_URL = 'https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/parts-updates/tests/parts-update/manifest.json';
  let root;

  const loadManifest = async () => {
    const area = root?.querySelector('#manifest');
    if (!area) return;
    area.textContent = 'manifest.json 불러오는 중…';
    try {
      // RisuAI nativeFetch에서는 요청 방식을 명시해야 빈 요청 본문 오류가 나지 않는다.
      const url = `${MANIFEST_URL}?t=${Math.floor(Date.now() / 60000)}`;
      const response = await risuai.nativeFetch(url, { method: 'GET', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      area.replaceChildren();
      for (const part of manifest.parts ?? []) {
        const row = document.createElement('p');
        row.textContent = `${part.displayName} · v${part.version} · `;
        const link = document.createElement('a');
        link.href = part.pluginUrl;
        link.textContent = 'pluginUrl';
        link.target = '_blank';
        row.append(link);
        area.append(row);
      }
    } catch (error) {
      area.textContent = `manifest 읽기 실패: ${String(error?.message ?? error)}`;
    }
  };

  const show = async () => {
    await risuai.showContainer('fullscreen');
    if (!root) {
      root = document.createElement('main');
      root.style.cssText = 'font:16px system-ui,sans-serif;padding:24px;color:inherit';
      root.innerHTML = '<h1>Parts update test · Host v0.1.0</h1><p>manifest.json에서 파츠 목록을 읽고 독립 업데이트를 확인합니다.</p><section id="manifest"></section><p id="status">Part 응답 대기 중</p><button id="ping">Part에 ping 보내기</button> <button id="close">닫기</button>';
      document.body.replaceChildren(root);
      root.querySelector('#ping').onclick = async () => {
        const nonce = `${Date.now()}`;
        root.querySelector('#status').textContent = `ping 전송: ${nonce}`;
        await risuai.postPluginChannelMessage(PART, CHANNEL, { protocol: 1, type: 'open', nonce });
        await risuai.hideContainer();
      };
      root.querySelector('#close').onclick = () => risuai.hideContainer();
    }
    await loadManifest();
  };

  (async () => {
    await risuai.addPluginChannelListener(CHANNEL, async (message, meta) => {
      if (meta?.sender !== PART || message?.protocol !== 1) return;
      if (message.type === 'opened' || message.type === 'pong') {
        const status = root?.querySelector('#status');
        if (status) status.textContent = `pong 수신: ${message.nonce} · Part v${message.partVersion}`;
      } else if (message.type === 'closed') {
        await risuai.showContainer('fullscreen');
        const status = root?.querySelector('#status');
        if (status) status.textContent = `Part가 닫혔습니다 · Part v${message.partVersion}`;
      }
    });
    await risuai.registerSetting('DA Parts Test Host', show, '🧩', 'html', 'da-parts-test-host-setting');
    await risuai.registerButton({ name: 'DA Parts Test Host', icon: '🧩', iconType: 'html', location: 'hamburger', id: 'da-parts-test-host-button' }, show);
  })();
})();
