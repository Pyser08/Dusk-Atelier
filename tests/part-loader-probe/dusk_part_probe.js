//@name dusk_atelier_part_probe
//@display-name Dusk Atelier Part Probe
//@api 3.0
//@version 0.1.0
//@link https://github.com/Pyser08/Dusk-Atelier

// TEMPORARY DIAGNOSTIC PLUGIN.
// It uses only documented RisuAI API methods. It intentionally DOES NOT execute
// downloaded JavaScript, use eval/new Function, or bypass the plugin sandbox.
(async () => {
  const api = globalThis.risuai ?? globalThis.Risuai;
  if (!api) return;

  const JSON_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/data/part-loader-probe.json";
  const JS_URL = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/main/data/part-loader-probe.js";
  const CACHE_KEY = "dusk_atelier:partprobe:test:v1";
  let root = null;
  const logLines = [];

  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function log(title, detail, status = "info") {
    const time = new Date().toLocaleTimeString();
    logLines.unshift({ time, title, detail: String(detail ?? ""), status });
    if (logLines.length > 40) logLines.length = 40;
    renderLog();
  }
  function button(label, fn) {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", () => Promise.resolve(fn()).catch((e) => log("오류", e?.stack || e?.message || e, "fail")));
    return b;
  }
  function section(title, desc, ...children) {
    const s = document.createElement("section");
    const h = document.createElement("h3");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = desc;
    s.append(h, p, ...children);
    return s;
  }
  function renderLog() {
    const out = root?.querySelector("#probe-log");
    if (!out) return;
    out.innerHTML = logLines.map((x) =>
      '<article class="entry ' + esc(x.status) + '"><b>' + esc(x.time + " · " + x.title) +
      '</b><pre>' + esc(x.detail) + '</pre></article>'
    ).join("");
  }
  function show() {
    if (root) root.remove();
    root = document.createElement("main");
    root.id = "dusk-part-probe";
    root.innerHTML = `
      <header><div><small>DUSK ATELIER · TEMPORARY TEST</small><h1>파츠 로더 기능 검증</h1></div></header>
      <div class="warning">진단용 임시 플러그인입니다. 다운로드한 JS는 텍스트로만 검사하며 실행하지 않습니다.</div>
      <div class="grid" id="probe-actions"></div>
      <section><h3>API 기능 존재 여부</h3><p>존재 여부만 검사합니다. 전체 플러그인 재로드 등 상태 변경 API는 호출하지 않습니다.</p><div id="probe-api"></div></section>
      <section><h3>테스트 로그</h3><div id="probe-log"></div></section>
      <footer><button id="probe-close">닫기</button></footer>`;
    const style = document.createElement("style");
    style.textContent = `
      #dusk-part-probe{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#15151b;color:#eeeef5;font:14px/1.55 system-ui,sans-serif;padding:22px;box-sizing:border-box}
      #dusk-part-probe *{box-sizing:border-box}#dusk-part-probe header{display:flex;justify-content:space-between;align-items:center}
      #dusk-part-probe h1{font-size:24px;margin:4px 0 16px}#dusk-part-probe h3{font-size:16px;margin:0 0 6px}
      #dusk-part-probe small{color:#b5a5ff;font-weight:700;letter-spacing:.08em}
      #dusk-part-probe p{margin:0 0 12px;color:#b9b9ca}
      #dusk-part-probe section{border:1px solid #393944;border-radius:12px;padding:14px;margin:12px 0;background:#202029}
      #dusk-part-probe .warning{padding:12px;border-radius:9px;background:#44351a;color:#ffe2a2;margin:8px 0 14px}
      #dusk-part-probe .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
      #dusk-part-probe button{border:1px solid #5d557d;background:#302a43;color:#fff;border-radius:8px;padding:10px 12px;cursor:pointer;margin:3px}
      #dusk-part-probe button:hover{background:#42365e}
      #dusk-part-probe .entry{padding:10px;border-top:1px solid #393944}
      #dusk-part-probe .entry.ok b{color:#8de0ad}#dusk-part-probe .entry.fail b{color:#ff9a9a}
      #dusk-part-probe pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 0;color:#d2d2df;font-size:12px}
      #dusk-part-probe footer{text-align:right;padding:8px 0}
      #dusk-part-probe .api-row{display:flex;gap:10px;justify-content:space-between;border-top:1px solid #393944;padding:5px 0}
      #dusk-part-probe .yes{color:#8de0ad}#dusk-part-probe .no{color:#ffbc8b}
    `;
    root.prepend(style);
    document.body.append(root);

    const actions = root.querySelector("#probe-actions");
    actions.append(
      section("1 · 원격 JSON", "GET으로 외부 JSON을 읽고 버전/메시지를 확인합니다. 결과를 캐시에 저장합니다.",
        button("JSON 가져오기 + 캐시 저장", testJson)),
      section("2 · 원격 JS 파일", "파일 다운로드 가능 여부만 확인합니다. 코드는 절대 실행하지 않습니다.",
        button("JS 텍스트 가져오기", testJs)),
      section("3 · 로컬 Ping", "메인 번들 안에 있는 가짜 파츠 핸들러로 UI 신호 전달을 검증합니다. 원격 파츠 실행 테스트는 아닙니다.",
        button("로컬 파츠에 Ping 보내기", testLocalPing)),
      section("4 · 캐시", "이전에 저장한 JSON 결과를 읽습니다.",
        button("캐시 읽기", testCache),
        button("테스트 캐시 삭제", clearCache))
    );
    root.querySelector("#probe-close").addEventListener("click", async () => {
      root?.remove();
      root = null;
      await api.hideContainer();
    });
    renderApi();
    renderLog();
  }
  function renderApi() {
    const out = root?.querySelector("#probe-api");
    if (!out) return;
    const checks = [
      ["nativeFetch", typeof api.nativeFetch === "function"],
      ["pluginStorage.getItem", typeof api.pluginStorage?.getItem === "function"],
      ["pluginStorage.setItem", typeof api.pluginStorage?.setItem === "function"],
      ["loadPlugins (전체 플러그인 재로드)", typeof api.loadPlugins === "function"],
      ["postPluginChannelMessage (플러그인 간 IPC)", typeof api.postPluginChannelMessage === "function"],
      ["addPluginChannelListener (플러그인 간 IPC)", typeof api.addPluginChannelListener === "function"],
      ["loadExternalModule (가정한 외부 로더)", typeof api.loadExternalModule === "function"],
      ["importPlugin (가정한 공식 플러그인 import API)", typeof api.importPlugin === "function"]
    ];
    out.innerHTML = checks.map(([name, yes]) =>
      '<div class="api-row"><span>' + esc(name) + '</span><b class="' + (yes ? "yes" : "no") + '">' + (yes ? "있음" : "없음") + '</b></div>'
    ).join("");
  }
  async function testJson() {
    if (typeof api.nativeFetch !== "function") throw new Error("nativeFetch API가 없습니다.");
    const res = await api.nativeFetch(JSON_URL + "?_probe=" + Date.now(), { method: "GET", headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
    if (!res || res.status < 200 || res.status >= 300) throw new Error("JSON 요청 실패: HTTP " + (res?.status ?? "unknown"));
    const text = await res.text();
    const data = JSON.parse(text);
    if (data.schemaVersion !== 1 || !data.dataVersion) throw new Error("JSON 스키마가 예상과 다릅니다.");
    const record = { savedAt: Date.now(), dataVersion: data.dataVersion, title: data.title, message: data.message, rules: data.rules };
    await api.pluginStorage.setItem(CACHE_KEY, JSON.stringify(record));
    log("원격 JSON 성공", JSON.stringify(record, null, 2), "ok");
  }
  async function testJs() {
    if (typeof api.nativeFetch !== "function") throw new Error("nativeFetch API가 없습니다.");
    const res = await api.nativeFetch(JS_URL + "?_probe=" + Date.now(), { method: "GET", headers: { Accept: "text/javascript, text/plain", "Cache-Control": "no-cache" } });
    if (!res || res.status < 200 || res.status >= 300) throw new Error("JS 파일 요청 실패: HTTP " + (res?.status ?? "unknown"));
    const text = await res.text();
    const markerFound = text.includes("PART_PROBE_EXECUTION_MARKER");
    log("원격 JS 다운로드 성공 (실행 안 함)", JSON.stringify({
      httpStatus: res.status,
      characters: text.length,
      markerFound,
      executionAttempted: false,
      note: "다운로드한 문자열을 실행하지 않았습니다. 이 결과는 독립 실행 지원을 증명하지 않습니다."
    }, null, 2), markerFound ? "ok" : "fail");
  }
  async function testCache() {
    const value = await api.pluginStorage.getItem(CACHE_KEY);
    if (!value) {
      log("캐시 없음", "먼저 'JSON 가져오기 + 캐시 저장'을 실행하세요.", "fail");
      return;
    }
    log("캐시 읽기 성공", typeof value === "string" ? value : JSON.stringify(value, null, 2), "ok");
  }
  async function clearCache() {
    if (typeof api.pluginStorage?.removeItem !== "function") throw new Error("pluginStorage.removeItem API가 없습니다.");
    await api.pluginStorage.removeItem(CACHE_KEY);
    log("캐시 삭제 성공", "진단용 캐시 키만 삭제했습니다.", "ok");
  }
  async function testLocalPing() {
    const part = {
      handle: async (msg) => ({ ok: true, source: "same-bundle-stub", echo: msg, reply: "PONG_FROM_EMBEDDED_PART" })
    };
    const request = { type: "PING", nonce: Date.now() };
    const reply = await part.handle(request);
    log("로컬 Ping 성공", JSON.stringify({ request, reply, note: "같은 플러그인 안의 함수 호출입니다. 원격 JS 또는 별도 파츠 호출을 검증하지 않습니다." }, null, 2), "ok");
  }

  await api.registerSetting("Dusk Atelier Part Probe", async () => {
    await api.showContainer("fullscreen");
    show();
  }, "🧪", "html", "dusk-atelier-part-probe");
  console.log("[Dusk Atelier Part Probe] loaded; use RisuAI plugin settings to open the diagnostic UI.");
})();
