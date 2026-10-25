//@name dusk_update_size_2mb
//@display-name Dusk Update Size Probe 2 MB
//@api 3.0
//@version 0.1.0
//@update-url https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/test/update-size-probe/tests/update-size-probe/hosted/probe-2mb.js
//@link https://github.com/Pyser08/Dusk-Atelier/tree/test/update-size-probe/tests/update-size-probe
(async () => {
  const api = globalThis.risuai ?? globalThis.Risuai;
  if (!api) return;
  const label = "Dusk Update Size Probe 2 MB v0.1.0 (seed)";
  try {
    await api.registerSetting(label, async () => {
      console.log('[Dusk Update Size Probe] seed loaded: ' + label);
    }, '🧪', 'text');
  } catch (e) {
    console.log('[Dusk Update Size Probe] seed registerSetting failed', e);
  }
  console.log('[Dusk Update Size Probe] seed loaded: ' + label);
})();
