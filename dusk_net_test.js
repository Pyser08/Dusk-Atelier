//@name dusk_net_test
//@display-name Dusk 받기 종합 시험
//@api 3.0
//@version 1.0.0

// Dusk 애드온 받기가 막히는 환경에서 어떤 길이 열려 있는지 한 번에 보는 시험. 켜면 잠시 뒤 결과 창이 떠요. 끝나면 지워도 돼요.
// 기대값: manage.js = 67620자 · a3bd9a81, 목록(addons.json) = 4399자
(async () => {
  const api = globalThis.risuai ?? globalThis.Risuai;
  const RAW = "https://raw.githubusercontent.com/Pyser08/Dusk-Atelier/addons/addons/";
  const CDN = "https://cdn.jsdelivr.net/gh/Pyser08/Dusk-Atelier@addons/addons/";
  const SHA12 = "a3bd9a811bc0";
  const bust = (u) => u + "?t=" + Date.now() + Math.floor(Math.random() * 1e6);
  const sha8 = async (t) => {
    try { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(h)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join(""); }
    catch { return "?"; }
  };
  const textOf = async (res) => {
    if (res == null) return null;
    if (typeof res === "string") return res;
    if (typeof res.text === "function") return await res.text();
    const d = res.data ?? res.body;
    if (typeof d === "string") return d;
    if (d instanceof Uint8Array || d instanceof ArrayBuffer) return new TextDecoder().decode(d);
    if (Array.isArray(d)) return new TextDecoder().decode(Uint8Array.from(d));
    return null;
  };
  const judge = async (t) => {
    if (typeof t !== "string") return "못 받음";
    const s = await sha8(t);
    const what = t.length === 4399 ? "목록이 왔어요" : t.length === 67620 && s === "a3bd9a81" ? "정상" : `다른 내용: ${t.slice(0, 50).replace(/\s+/g, " ")}`;
    return `${t.length}자 · ${s} → ${what}`;
  };
  const run = async (name, fn) => {
    try { return `${name}: ${await judge(await fn())}`; }
    catch (e) { return `${name}: 오류 ${String(e?.message ?? e).slice(0, 90)}`; }
  };
  const out = [];

  // 이 창의 보안 정책(CSP) 내용 — 무엇이 막히는지 단서
  try {
    const meta = [...document.querySelectorAll("meta")].map((m) => m.getAttribute("http-equiv") && m.getAttribute("content")).filter(Boolean).join(" | ");
    out.push("CSP(meta): " + (meta ? meta.slice(0, 300) : "없음"));
  } catch { out.push("CSP(meta): 읽지 못함"); }
  out.push("주소: " + String(location?.href ?? "").slice(0, 40) + " · 창 안: " + (window.top !== window ? "iframe" : "최상위"));

  out.push(await run("1) nativeFetch 목록(raw)", () => api.nativeFetch(bust(RAW + "addons.json"), { method: "GET" }).then(textOf)));
  out.push(await run("2) nativeFetch 파일(raw)", () => api.nativeFetch(bust(RAW + "dist/manage.js"), { method: "GET" }).then(textOf)));
  out.push(await run("3) nativeFetch 다른 주소(example.com)", () => api.nativeFetch("https://example.com/", { method: "GET" }).then(textOf)));
  out.push(await run("4) risuFetch 파일(raw)", async () => textOf(await api.risuFetch(RAW + "dist/manage.js", { method: "GET", rawResponse: true }))));
  out.push(await run("5) import() jsDelivr 모듈", async () => {
    const m = await import(/* @vite-ignore */ CDN + "dist/manage." + SHA12 + ".mjs?t=" + Date.now());
    return typeof m.default === "string" ? m.default : null;
  }));
  out.push(await run("6) import() 목록 모듈", async () => {
    const m = await import(/* @vite-ignore */ CDN + "addons.json.mjs?t=" + Date.now());
    return typeof m.default === "string" ? m.default : null;
  }));
  out.push(await run("7) 일반 fetch jsDelivr 파일", async () => textOf(await fetch(CDN + "dist/manage.js", { cache: "no-store" }))));
  out.push(await run("8) 일반 fetch raw 파일", async () => textOf(await fetch(bust(RAW + "dist/manage.js"), { cache: "no-store" }))));

  const msg = "Dusk 받기 종합 시험\n기대: manage.js 67620자 · a3bd9a81 → 정상 / 목록은 4399자\n\n" + out.join("\n");
  console.log("[dusk_net_test]\n" + msg);
  try { await api.alert(msg); } catch { /* 콘솔에만 */ }
})().catch((e) => console.log("[dusk_net_test] 실패", e?.message ?? e));
