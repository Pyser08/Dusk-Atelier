//@name dusk_import_test
//@display-name Dusk 모듈로 받기 시험
//@api 3.0
//@version 1.0.0

// Dusk 2.0.6이 쓰는 '모듈로 받기'를 그대로 시험해요. 켜면 잠시 뒤 결과 창이 떠요. 끝나면 지워도 돼요.
// 목록(addons.json.mjs)과 애드온 10개를 jsDelivr에서 import()로 받아, 목록에 적힌 sha256과 맞는지 확인해요.
(async () => {
  const api = globalThis.risuai ?? globalThis.Risuai;
  const CDN = "https://cdn.jsdelivr.net/gh/Pyser08/Dusk-Atelier@addons/addons/";
  const sha256 = async (t) => {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  const load = async (url) => {
    const m = await import(/* @vite-ignore */ url + "?t=" + Date.now());
    return typeof m.default === "string" ? m.default : null;
  };
  const out = [];
  let list = null;
  try {
    const t = await load(CDN + "addons.json.mjs");
    if (t == null) throw new Error("export default 가 문자열이 아니에요");
    list = JSON.parse(t).addons;
    out.push(`목록: ${t.length}자 · 애드온 ${list.length}개 → 정상`);
  } catch (e) { out.push(`목록: 오류 ${String(e?.message ?? e).slice(0, 100)}`); }

  let good = 0;
  for (const a of list ?? []) {
    const url = `${CDN}dist/${a.id}.${a.sha256.slice(0, 12)}.mjs`;
    try {
      const t = await load(url);
      if (t == null) { out.push(`${a.id}: 문자열이 아니에요`); continue; }
      let s = "?";
      try { s = await sha256(t); } catch { /* crypto 없음 */ }
      const ok = s === a.sha256;
      if (ok) good++;
      out.push(`${a.id} v${a.version}: ${t.length}자 · ${s.slice(0, 8)}/${a.sha256.slice(0, 8)} → ${ok ? "정상" : "확인값 다름"}`);
    } catch (e) { out.push(`${a.id}: 오류 ${String(e?.message ?? e).slice(0, 100)}`); }
  }
  const head = list ? `결과: ${good}/${list.length}개 정상` : "결과: 목록을 못 받음";
  const msg = `Dusk 모듈로 받기 시험\n${head}\n\n${out.join("\n")}`;
  console.log("[dusk_import_test]\n" + msg);
  try { await api?.alert(msg); } catch { /* 콘솔에만 */ }
})().catch((e) => console.log("[dusk_import_test] 실패", e?.message ?? e));
